"""Helpers compartilhados do ciclo de laudo usados por múltiplos casos de uso."""

from __future__ import annotations

from urllib.parse import urlsplit
from typing import Any, Literal

from fastapi import Request
from sqlalchemy.orm import Session

from app.domains.chat.app_context import logger
from app.domains.chat.core_helpers import agora_utc
from app.domains.chat.gate_helpers import normalize_human_override_case_key
from app.v2.case_runtime import (
    build_legacy_case_status_payload_from_laudo,
    build_technical_case_runtime_bundle,
)
from app.v2.document import (
    build_document_hard_gate_decision,
    build_document_hard_gate_enforcement_result,
    build_document_soft_gate_route_context,
    build_document_soft_gate_trace,
    record_document_hard_gate_result,
    record_document_soft_gate_trace,
)
from app.v2.provenance import (
    build_inspector_content_origin_summary,
    load_message_origin_counters,
)
from app.v2.runtime import v2_document_hard_gate_enabled, v2_document_soft_gate_enabled
from app.shared.database import Laudo, Usuario
from app.shared.operational_memory import registrar_evento_operacional
from app.shared.operational_memory_contracts import OperationalEventInput

_QUALITY_GATE_OVERRIDE_BLOCK_KEY = "quality_gate_override"
_QUALITY_GATE_OVERRIDE_REASON_MIN_LENGTH = 12


def alinhar_status_canonico_nr35_persistido(laudo: Laudo) -> None:
    family_key = str(getattr(laudo, "catalog_family_key", "") or "").strip().lower()
    if family_key not in {"nr35_inspecao_linha_de_vida", "nr35_inspecao_ponto_ancoragem"}:
        return

    payload = getattr(laudo, "dados_formulario", None)
    if not isinstance(payload, dict):
        return
    conclusao = payload.get("conclusao")
    if not isinstance(conclusao, dict):
        return

    status_operacional = str(conclusao.get("status_operacional") or "").strip().lower()
    status_map = {
        "bloqueio": "bloqueio",
        "ajuste": "ajuste",
        "conforme": "conforme",
        "liberado": "conforme",
        "avaliacao_complementar": "pendente",
    }
    status_canonico = status_map.get(status_operacional)
    if not status_canonico:
        return

    conclusao["status"] = status_canonico
    if not str(conclusao.get("status_final") or "").strip():
        conclusao["status_final"] = status_canonico


def aplicar_binding_familia_padrao_laudo(
    *,
    laudo: Laudo,
    tipo_template: str | None,
    force_update: bool = False,
) -> None:
    from app.domains.chat.normalization import resolver_familia_padrao_template

    binding = resolver_familia_padrao_template(tipo_template)
    family_key = str(binding.get("family_key") or "").strip() or None
    if family_key is None:
        return
    if getattr(laudo, "catalog_selection_token", None) and not force_update:
        return
    if force_update or not str(getattr(laudo, "catalog_family_key", "") or "").strip():
        laudo.catalog_family_key = family_key
    family_label = str(binding.get("family_label") or "").strip() or None
    if family_label and (
        force_update or not str(getattr(laudo, "catalog_family_label", "") or "").strip()
    ):
        laudo.catalog_family_label = family_label


def request_base_url(request: Request | None) -> str | None:
    if request is None:
        return None
    try:
        raw = str(getattr(request, "base_url", "") or "").strip()
    except Exception:
        raw = ""
    if not raw:
        return None
    parsed = urlsplit(raw)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def review_mode_final_from_report_pack(laudo: Laudo, *, fallback: str | None = None) -> str | None:
    report_pack = getattr(laudo, "report_pack_draft_json", None)
    if isinstance(report_pack, dict):
        quality_gates = report_pack.get("quality_gates")
        if isinstance(quality_gates, dict):
            review_mode = str(quality_gates.get("final_validation_mode") or "").strip()
            if review_mode:
                return review_mode
    return fallback


def texto_curto_limpo(valor: Any, *, limite: int) -> str:
    texto = " ".join(str(valor or "").strip().split())
    if not texto:
        return ""
    return texto[:limite]


def bool_request_flag(valor: Any) -> bool:
    if isinstance(valor, bool):
        return valor
    texto = str(valor or "").strip().lower()
    return texto in {"1", "true", "on", "yes", "sim"}


def lista_request_textos(valor: Any) -> list[str]:
    if isinstance(valor, list):
        candidatos = valor
    else:
        candidatos = str(valor or "").split(",")

    vistos: set[str] = set()
    resultado: list[str] = []
    for item in candidatos:
        texto = texto_curto_limpo(item, limite=160).lower()
        if not texto or texto in vistos:
            continue
        vistos.add(texto)
        resultado.append(texto)
    return resultado


def lista_request_override_cases(valor: Any) -> list[str]:
    vistos: set[str] = set()
    resultado: list[str] = []
    for item in lista_request_textos(valor):
        chave = normalize_human_override_case_key(item)
        if not chave or chave in vistos:
            continue
        vistos.add(chave)
        resultado.append(chave)
    return resultado


async def ler_payload_request_tolerante(request: Request) -> dict[str, Any]:
    cache = getattr(request.state, "_tariel_request_payload_cache", None)
    if isinstance(cache, dict):
        return cache

    payload: dict[str, Any] = {}
    try:
        form = await request.form()
        if form:
            for chave, valor in form.multi_items():
                if chave in payload:
                    atual = payload[chave]
                    if isinstance(atual, list):
                        atual.append(valor)
                    else:
                        payload[chave] = [atual, valor]
                else:
                    payload[chave] = valor
    except Exception:
        payload = {}

    if not payload:
        try:
            json_payload = await request.json()
        except Exception:
            json_payload = {}
        if isinstance(json_payload, dict):
            payload = dict(json_payload)

    request.state._tariel_request_payload_cache = payload
    return payload


async def resolver_intencao_override_gate_qualidade(
    request: Request,
) -> dict[str, Any]:
    payload = await ler_payload_request_tolerante(request)
    requested = bool_request_flag(
        payload.get("quality_gate_override")
        or payload.get("human_override_quality_gate")
        or payload.get("override_gate_qualidade")
    )
    return {
        "requested": requested,
        "reason": texto_curto_limpo(
            payload.get("quality_gate_override_reason")
            or payload.get("human_override_reason")
            or payload.get("override_gate_qualidade_justificativa"),
            limite=2000,
        ),
        "requested_cases": lista_request_override_cases(
            payload.get("quality_gate_override_cases")
            or payload.get("human_override_cases")
        ),
    }


def registrar_override_humano_gate_qualidade(
    *,
    banco: Session,
    laudo: Laudo,
    usuario: Usuario,
    final_validation_mode: str,
    gate_override_request: dict[str, Any],
) -> dict[str, Any] | None:
    from app.domains.chat.report_pack_helpers import obter_report_pack_draft_laudo

    if not isinstance(gate_override_request, dict):
        return None

    reason = texto_curto_limpo(gate_override_request.get("reason"), limite=2000)
    if not reason:
        return None

    policy = (
        dict(gate_override_request.get("human_override_policy") or {})
        if isinstance(gate_override_request.get("human_override_policy"), dict)
        else {}
    )
    now = agora_utc()
    actor_user_id = int(getattr(usuario, "id", 0) or 0) or None
    actor_name = texto_curto_limpo(
        getattr(usuario, "nome_completo", None) or getattr(usuario, "nome", None),
        limite=160,
    )
    matched_cases = lista_request_override_cases(
        gate_override_request.get("requested_cases")
        or policy.get("matched_override_cases")
    )
    matched_case_labels = [
        texto_curto_limpo(item, limite=160)
        for item in list(policy.get("matched_override_case_labels") or [])
        if texto_curto_limpo(item, limite=160)
    ]
    overrideable_item_ids = [
        texto_curto_limpo(item.get("id"), limite=120)
        for item in list(policy.get("overrideable_items") or [])
        if isinstance(item, dict) and texto_curto_limpo(item.get("id"), limite=120)
    ]
    entry = {
        "scope": "quality_gate",
        "applied_at": now.isoformat(),
        "actor_user_id": actor_user_id,
        "actor_name": actor_name or None,
        "reason": reason,
        "matched_override_cases": matched_cases,
        "matched_override_case_labels": matched_case_labels,
        "overrideable_item_ids": overrideable_item_ids,
        "final_validation_mode": texto_curto_limpo(final_validation_mode, limite=80),
        "responsibility_notice": texto_curto_limpo(
            policy.get("responsibility_notice")
            or "A responsabilidade final permanece com a validação e assinatura humana.",
            limite=400,
        ),
    }

    draft = dict(obter_report_pack_draft_laudo(laudo) or {})
    quality_gates = dict(draft.get("quality_gates") or {})
    history = [
        dict(item)
        for item in list(quality_gates.get("human_override_history") or [])
        if isinstance(item, dict)
    ]
    history.append(entry)
    history = history[-5:]
    quality_gates["human_override"] = entry
    quality_gates["human_override_history"] = history
    quality_gates["human_override_count"] = len(history)
    draft["quality_gates"] = quality_gates
    laudo.report_pack_draft_json = draft

    try:
        registrar_evento_operacional(
            banco,
            OperationalEventInput(
                laudo_id=int(laudo.id),
                event_type="evidence_conclusion_conflict",
                event_source="inspetor",
                severity="warning",
                actor_user_id=actor_user_id,
                block_key=_QUALITY_GATE_OVERRIDE_BLOCK_KEY,
                event_metadata=entry,
            ),
        )
    except Exception:
        logger.warning(
            "Falha ao registrar trilha operacional do override humano do gate | laudo_id=%s",
            int(getattr(laudo, "id", 0) or 0),
            exc_info=True,
        )

    return entry


def build_legacy_case_status_payload_for_document_mutation(
    *,
    banco: Session,
    laudo: Laudo,
) -> dict[str, Any]:
    return build_legacy_case_status_payload_from_laudo(
        banco=banco,
        laudo=laudo,
        include_entry_mode_context=True,
    )


def build_case_lifecycle_response_fields(
    contexto: dict[str, Any] | None,
) -> dict[str, Any]:
    contexto_resolvido = contexto if isinstance(contexto, dict) else {}
    return {
        "case_lifecycle_status": contexto_resolvido.get("case_lifecycle_status"),
        "case_workflow_mode": contexto_resolvido.get("case_workflow_mode"),
        "active_owner_role": contexto_resolvido.get("active_owner_role"),
        "allowed_next_lifecycle_statuses": list(
            contexto_resolvido.get("allowed_next_lifecycle_statuses") or []
        ),
        "allowed_lifecycle_transitions": list(
            contexto_resolvido.get("allowed_lifecycle_transitions") or []
        ),
        "allowed_surface_actions": list(
            contexto_resolvido.get("allowed_surface_actions") or []
        ),
    }


def avaliar_gate_documental_finalizacao(
    *,
    request: Request,
    usuario: Usuario,
    banco: Session,
    laudo: Laudo,
    route_name: str = "finalizar_relatorio_resposta",
    route_path: str | None = None,
    source_channel: str = "web_app",
    operation_kind: Literal["report_finalize", "report_finalize_stream"] = "report_finalize",
    legacy_pipeline_name: str = "legacy_report_finalize",
) -> tuple[Any | None, Any | None]:
    soft_gate_enabled = v2_document_soft_gate_enabled()
    hard_gate_enabled = v2_document_hard_gate_enabled()
    if not soft_gate_enabled and not hard_gate_enabled:
        return None, None

    provenance_summary = None
    try:
        message_counters = load_message_origin_counters(
            banco,
            laudo_id=int(laudo.id),
        )
        provenance_summary = build_inspector_content_origin_summary(
            laudo=laudo,
            message_counters=message_counters,
            has_active_report=True,
        )
        request.state.v2_content_provenance_summary = provenance_summary.model_dump(mode="python")
    except Exception:
        logger.debug("Falha ao derivar provenance da finalizacao documental.", exc_info=True)

    runtime_bundle = build_technical_case_runtime_bundle(
        request=request,
        banco=banco,
        usuario=usuario,
        laudo=laudo,
        legacy_payload=build_legacy_case_status_payload_for_document_mutation(
            banco=banco,
            laudo=laudo,
        ),
        source_channel=source_channel,
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
    )
    case_snapshot = runtime_bundle.case_snapshot
    document_facade = runtime_bundle.document_facade
    if case_snapshot is None or document_facade is None:
        return None, None

    soft_gate_trace = build_document_soft_gate_trace(
        case_snapshot=case_snapshot,
        document_facade=document_facade,
        route_context=build_document_soft_gate_route_context(
            route_name=route_name,
            route_path=str(
                route_path
                or request.scope.get("path")
                or "/app/api/laudo/{laudo_id}/finalizar"
            ),
            http_method=str(request.method or "POST"),
            source_channel=source_channel,
            operation_kind=operation_kind,
            side_effect_free=False,
            legacy_pipeline_name=legacy_pipeline_name,
        ),
        correlation_id=case_snapshot.correlation_id,
        request_id=(
            request.headers.get("X-Request-ID")
            or request.headers.get("X-Correlation-ID")
            or case_snapshot.correlation_id
        ),
    )
    request.state.v2_document_soft_gate_decision = soft_gate_trace.decision.model_dump(mode="python")
    request.state.v2_document_soft_gate_trace = soft_gate_trace.model_dump(mode="python")
    if soft_gate_enabled:
        record_document_soft_gate_trace(soft_gate_trace)

    hard_gate_result = None
    if hard_gate_enabled:
        hard_gate_result = build_document_hard_gate_enforcement_result(
            decision=build_document_hard_gate_decision(
                soft_gate_trace=soft_gate_trace,
                remote_host=getattr(getattr(request, "client", None), "host", None),
            )
        )
        request.state.v2_document_hard_gate_decision = hard_gate_result.decision.model_dump(mode="python")
        request.state.v2_document_hard_gate_enforcement = hard_gate_result.model_dump(mode="python")
        record_document_hard_gate_result(hard_gate_result)

    return soft_gate_trace, hard_gate_result


__all__ = [
    "_QUALITY_GATE_OVERRIDE_REASON_MIN_LENGTH",
    "alinhar_status_canonico_nr35_persistido",
    "aplicar_binding_familia_padrao_laudo",
    "avaliar_gate_documental_finalizacao",
    "bool_request_flag",
    "build_case_lifecycle_response_fields",
    "build_legacy_case_status_payload_for_document_mutation",
    "ler_payload_request_tolerante",
    "lista_request_override_cases",
    "lista_request_textos",
    "logger",
    "registrar_override_humano_gate_qualidade",
    "request_base_url",
    "resolver_intencao_override_gate_qualidade",
    "review_mode_final_from_report_pack",
    "texto_curto_limpo",
]
