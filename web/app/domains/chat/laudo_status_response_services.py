"""Serviços de leitura e projeção do status do laudo no portal inspetor."""

from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.domains.chat.laudo_access_helpers import obter_laudo_do_inspetor
from app.domains.chat.laudo_state_helpers import (
    laudo_tem_interacao,
    obter_guided_inspection_draft_laudo,
    serializar_card_laudo,
)
from app.domains.chat.laudo_workflow_support import logger, request_base_url
from app.domains.chat.report_pack_helpers import (
    atualizar_report_pack_draft_laudo,
    build_pre_laudo_summary,
    obter_pre_laudo_outline_report_pack,
    obter_report_pack_draft_laudo,
)
from app.domains.chat.session_helpers import estado_relatorio_sanitizado
from app.v2.adapters.inspector_status import adapt_inspector_case_view_projection_to_legacy_status
from app.v2.case_runtime import build_technical_case_runtime_bundle
from app.v2.contracts.inspector_document import build_inspector_document_view_projection
from app.v2.contracts.projections import build_inspector_case_view_projection
from app.v2.provenance import (
    build_inspector_content_origin_summary,
    load_message_origin_counters,
)
from app.v2.runtime import actor_role_from_user
from app.v2.runtime import v2_case_core_acl_enabled
from app.v2.runtime import v2_document_facade_enabled
from app.v2.runtime import v2_document_shadow_enabled
from app.v2.runtime import v2_inspector_projection_enabled
from app.v2.runtime import v2_policy_engine_enabled
from app.v2.runtime import v2_provenance_enabled
from app.v2.shadow import run_inspector_case_status_shadow
from app.shared.database import StatusRevisao, Usuario
from app.shared.official_issue_package import build_official_issue_summary
from app.shared.public_verification import build_public_verification_payload
from app.shared.tenant_entitlement_guard import tenant_access_policy_for_user


def _build_status_base_payload(
    *,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> tuple[dict[str, Any], Any | None]:
    payload = estado_relatorio_sanitizado(
        request,
        banco,
        usuario,
        mutar_sessao=False,
    )

    laudo_card = None
    laudo = None
    laudo_id = payload.get("laudo_id")
    if laudo_id:
        laudo = obter_laudo_do_inspetor(banco, int(laudo_id), usuario)
        atualizar_report_pack_draft_laudo(banco=banco, laudo=laudo)
        if laudo_tem_interacao(banco, laudo.id) or laudo.status_revisao != StatusRevisao.RASCUNHO.value:
            laudo_card = serializar_card_laudo(banco, laudo)

    resposta = {
        **payload,
        "tenant_access_policy": tenant_access_policy_for_user(usuario),
        "laudo_card": laudo_card,
        "guided_inspection_draft": obter_guided_inspection_draft_laudo(laudo),
        "report_pack_draft": obter_report_pack_draft_laudo(laudo),
        "pre_laudo_summary": build_pre_laudo_summary(
            obter_pre_laudo_outline_report_pack(obter_report_pack_draft_laudo(laudo))
        ),
        "public_verification": (
            build_public_verification_payload(
                laudo=laudo,
                base_url=request_base_url(request),
            )
            if laudo is not None
            else None
        ),
        "emissao_oficial": (
            build_official_issue_summary(
                banco,
                laudo=laudo,
            )
            if laudo is not None
            else None
        ),
    }
    return resposta, laudo


def _build_provenance_summary(
    *,
    request: Request,
    banco: Session,
    laudo: Any | None,
    has_active_report: bool,
):
    if not v2_provenance_enabled():
        return None

    try:
        message_counters = load_message_origin_counters(
            banco,
            laudo_id=int(laudo.id) if laudo is not None and getattr(laudo, "id", None) else None,
        )
        provenance_summary = build_inspector_content_origin_summary(
            laudo=laudo,
            message_counters=message_counters,
            has_active_report=has_active_report,
        )
    except Exception:
        logger.debug("Falha ao derivar provenance do inspetor no V2.", exc_info=True)
        provenance_summary = build_inspector_content_origin_summary(
            laudo=laudo,
            message_counters=None,
            has_active_report=has_active_report,
        )

    request.state.v2_content_provenance_summary = provenance_summary.model_dump(mode="python")
    return provenance_summary


async def obter_status_relatorio_resposta(
    *,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> tuple[dict[str, Any], int]:
    resposta, laudo = _build_status_base_payload(
        request=request,
        usuario=usuario,
        banco=banco,
    )

    case_snapshot = None
    policy_decision = None
    document_facade = None
    runtime_bundle = None
    provenance_summary = _build_provenance_summary(
        request=request,
        banco=banco,
        laudo=laudo,
        has_active_report=bool(resposta.get("laudo_id")),
    )

    if (
        v2_case_core_acl_enabled()
        or v2_inspector_projection_enabled()
        or v2_policy_engine_enabled()
        or v2_document_facade_enabled()
    ):
        runtime_bundle = build_technical_case_runtime_bundle(
            request=request,
            banco=banco,
            usuario=usuario,
            laudo=laudo,
            legacy_payload=resposta,
            source_channel="web_app",
            template_key=getattr(laudo, "tipo_template", None),
            family_key=getattr(laudo, "catalog_family_key", None),
            variant_key=getattr(laudo, "catalog_variant_key", None),
            laudo_type=getattr(laudo, "tipo_template", None),
            document_type=getattr(laudo, "tipo_template", None),
            provenance_summary=provenance_summary,
            current_review_status=getattr(laudo, "status_revisao", None),
            has_form_data=bool(getattr(laudo, "dados_formulario", None)),
            has_ai_draft=bool(str(getattr(laudo, "parecer_ia", "") or "").strip()),
            report_pack_draft=getattr(laudo, "report_pack_draft_json", None),
            include_full_snapshot=bool(laudo is not None and getattr(laudo, "id", None)),
            include_policy_decision=bool(v2_policy_engine_enabled()),
            include_document_facade=bool(v2_document_facade_enabled()),
            attach_document_shadow=bool(v2_document_shadow_enabled()),
            allow_partial_failures=True,
        )
        case_snapshot = runtime_bundle.case_snapshot

    if v2_policy_engine_enabled() and case_snapshot is not None:
        policy_decision = runtime_bundle.policy_decision if runtime_bundle is not None else None

    if v2_document_facade_enabled() and case_snapshot is not None:
        document_facade = runtime_bundle.document_facade if runtime_bundle is not None else None

    actor_role = actor_role_from_user(usuario)
    if document_facade is not None and case_snapshot is not None:
        try:
            inspector_document_projection = build_inspector_document_view_projection(
                case_snapshot=case_snapshot,
                document_facade=document_facade,
                actor_id=usuario.id,
                actor_role=actor_role,
                source_channel="web_app",
            )
            request.state.v2_inspector_document_projection_result = {
                "projection": inspector_document_projection.model_dump(mode="python"),
                "document_facade": document_facade.model_dump(mode="python"),
                "document_shadow": (
                    document_facade.legacy_pipeline_shadow.model_dump(mode="python")
                    if document_facade.legacy_pipeline_shadow is not None
                    else None
                ),
            }
        except Exception:
            logger.debug(
                "Falha ao derivar projecao documental do inspetor no V2.",
                exc_info=True,
            )

    resposta_publica = resposta
    if v2_inspector_projection_enabled() and case_snapshot is not None:
        inspector_projection = build_inspector_case_view_projection(
            case_snapshot=case_snapshot,
            actor_id=usuario.id,
            actor_role=actor_role,
            source_channel="web_app",
            allows_edit=bool(resposta.get("permite_edicao")),
            has_interaction=bool(resposta.get("tem_interacao")),
            report_types=dict(resposta.get("tipos_relatorio") or {}),
            laudo_card=resposta.get("laudo_card"),
            public_verification=resposta.get("public_verification"),
            emissao_oficial=resposta.get("emissao_oficial"),
            policy_decision=policy_decision,
            document_facade=document_facade,
        )
        adapted = adapt_inspector_case_view_projection_to_legacy_status(
            projection=inspector_projection,
            expected_legacy_payload=resposta,
        )
        request.state.v2_inspector_projection_result = {
            "projection": inspector_projection.model_dump(mode="python"),
            "compatible": adapted.compatible,
            "divergences": adapted.divergences,
            "used_projection": adapted.compatible,
            "provenance": (
                provenance_summary.model_dump(mode="python")
                if provenance_summary is not None
                else None
            ),
            "policy": (
                policy_decision.summary.model_dump(mode="python")
                if policy_decision is not None
                else None
            ),
            "document_facade": (
                document_facade.model_dump(mode="python")
                if document_facade is not None
                else None
            ),
            "document_shadow": (
                document_facade.legacy_pipeline_shadow.model_dump(mode="python")
                if document_facade is not None and document_facade.legacy_pipeline_shadow is not None
                else None
            ),
        }
        if adapted.compatible:
            resposta_publica = {
                **adapted.payload,
                "status_visual_label": resposta.get("status_visual_label"),
                "tenant_access_policy": resposta.get("tenant_access_policy"),
                "tipo_template_options": resposta.get("tipo_template_options"),
                "catalog_governed_mode": resposta.get("catalog_governed_mode"),
                "catalog_state": resposta.get("catalog_state"),
                "catalog_permissions": resposta.get("catalog_permissions"),
                "entry_mode_preference": resposta.get("entry_mode_preference"),
                "entry_mode_effective": resposta.get("entry_mode_effective"),
                "entry_mode_reason": resposta.get("entry_mode_reason"),
                "guided_inspection_draft": resposta.get("guided_inspection_draft"),
                "report_pack_draft": resposta.get("report_pack_draft"),
                "pre_laudo_summary": resposta.get("pre_laudo_summary"),
            }
        else:
            logger.debug(
                "V2 inspector projection divergiu | divergences=%s",
                ",".join(adapted.divergences),
            )

    run_inspector_case_status_shadow(
        request=request,
        usuario=usuario,
        legacy_payload=resposta_publica,
        case_snapshot=case_snapshot,
    )

    return resposta_publica, 200


__all__ = ["obter_status_relatorio_resposta"]
