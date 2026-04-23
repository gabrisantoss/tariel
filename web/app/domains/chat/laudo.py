"""Rotas de ciclo de laudo (inspetor)."""

from __future__ import annotations

import os
import re
from typing import Annotated

from fastapi import Depends, Form, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session

from app.domains.chat.core_helpers import agora_utc, resposta_json_ok
from app.domains.chat.laudo_access_helpers import obter_laudo_do_inspetor
from app.domains.chat.laudo_state_helpers import laudo_permite_exclusao_inspetor
from app.domains.chat.laudo_service import (
    RESPOSTA_DOCUMENT_HARD_GATE_BLOQUEADO,
    RESPOSTA_GATE_QUALIDADE_REPROVADO,
    RESPOSTA_LAUDO_NAO_ENCONTRADO,
    iniciar_relatorio_resposta,
    obter_gate_qualidade_laudo_resposta,
    obter_status_relatorio_resposta,
)
from app.domains.chat.report_pack_helpers import (
    atualizar_selecao_fotos_emissao_report_pack,
    obter_report_pack_draft_laudo,
)
from app.domains.chat.report_template_compatibility import (
    analisar_compatibilidade_template_laudo,
)
from app.domains.chat.laudo_decision_services import (
    executar_comando_revisao_mobile_resposta,
    finalizar_relatorio_resposta,
    obter_previa_finalizacao_laudo_resposta,
    reabrir_laudo_resposta,
)
from app.domains.chat.normalization import ALIASES_TEMPLATE
from app.domains.chat.request_parsing_helpers import InteiroOpcionalNullish
from app.domains.chat.revisao_helpers import (
    _gerar_diff_revisoes,
    _obter_revisao_por_versao,
    _resumo_diff_revisoes,
    _serializar_revisao_laudo,
)
from app.domains.chat.session_helpers import (
    exigir_csrf,
    laudo_id_sessao,
    limpar_contexto_laudo_ativo,
    contexto_base,
)
from app.domains.chat.app_context import templates
from app.domains.chat.schemas import (
    DadosEmissaoOficialInspetor,
    DadosIssuedPhotoSelection,
    DadosMobileReviewCommand,
    DadosPin,
    DadosReabrirLaudo,
)
from app.domains.chat.auth import pagina_inicial, pagina_planos
from app.shared.backend_hotspot_metrics import observe_backend_hotspot
from app.shared.database import (
    Laudo,
    LaudoRevisao,
    StatusRevisao,
    Usuario,
    obter_banco,
)
from app.shared.security import exigir_inspetor
from app.shared.official_issue_package import (
    OfficialIssueConflictError,
    build_official_issue_package,
    load_active_official_issue_record,
)
from app.shared.official_issue_transaction import emitir_oficialmente_transacional
from app.shared.tenant_entitlement_guard import (
    ensure_tenant_capability_for_user,
    tenant_access_policy_for_user,
)

PADRAO_TIPO_TEMPLATE_FORM = "^(?:" + "|".join(re.escape(item) for item in sorted(ALIASES_TEMPLATE)) + ")$"


async def api_status_relatorio(
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    with observe_backend_hotspot(
        "inspector_case_status",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        route_path="/app/api/laudo/status",
        method="GET",
    ) as hotspot:
        payload, status_code = await obter_status_relatorio_resposta(
            request=request,
            usuario=usuario,
            banco=banco,
        )
        hotspot.laudo_id = payload.get("laudo_id")
        hotspot.outcome = "active_case" if payload.get("laudo_id") else "idle_workspace"
        hotspot.response_status_code = status_code
        hotspot.detail.update(
            {
                "tem_interacao": bool(payload.get("tem_interacao")),
                "estado": str(payload.get("estado") or ""),
                "entry_mode_effective": str(payload.get("entry_mode_effective") or ""),
            }
        )
        return resposta_json_ok(payload, status_code=status_code)


async def api_status_relatorio_delete_nao_suportado(
    usuario: Usuario = Depends(exigir_inspetor),
):
    raise HTTPException(
        status_code=405,
        detail="Method Not Allowed",
        headers={"Allow": "GET"},
    )


async def api_rota_laudo_post_nao_suportado(
    usuario: Usuario = Depends(exigir_inspetor),
):
    raise HTTPException(
        status_code=405,
        detail="Method Not Allowed",
        headers={"Allow": "POST"},
    )


async def api_iniciar_relatorio(
    request: Request,
    tipo_template: str | None = Form(default=None),
    tipotemplate: str | None = Form(default=None),
    entry_mode_preference: str | None = Form(default=None),
    cliente: str | None = Form(default=None),
    unidade: str | None = Form(default=None),
    local_inspecao: str | None = Form(default=None),
    objetivo: str | None = Form(default=None),
    nome_inspecao: str | None = Form(default=None),
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    with observe_backend_hotspot(
        "inspector_case_start",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        route_path="/app/api/laudo/iniciar",
        method="POST",
        detail={
            "requested_template": str(tipo_template or tipotemplate or ""),
            "entry_mode_preference": str(entry_mode_preference or ""),
        },
    ) as hotspot:
        payload, status_code = await iniciar_relatorio_resposta(
            request=request,
            tipo_template=tipo_template,
            tipotemplate=tipotemplate,
            entry_mode_preference=entry_mode_preference,
            cliente=cliente,
            unidade=unidade,
            local_inspecao=local_inspecao,
            objetivo=objetivo,
            nome_inspecao=nome_inspecao,
            usuario=usuario,
            banco=banco,
        )
        hotspot.laudo_id = payload.get("laudo_id")
        hotspot.outcome = "case_started"
        hotspot.response_status_code = status_code
        hotspot.detail.update(
            {
                "resolved_template": str(payload.get("tipo_template") or ""),
                "entry_mode_effective": str(payload.get("entry_mode_effective") or ""),
                "catalog_governed_mode": bool(payload.get("catalog_governed_mode")),
            }
        )
        return resposta_json_ok(payload, status_code=status_code)


async def api_finalizar_relatorio(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    with observe_backend_hotspot(
        "inspector_case_finalize",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        laudo_id=laudo_id,
        route_path=f"/app/api/laudo/{laudo_id}/finalizar",
        method="POST",
    ) as hotspot:
        payload, status_code = await finalizar_relatorio_resposta(
            laudo_id=laudo_id,
            request=request,
            usuario=usuario,
            banco=banco,
        )
        hotspot.outcome = str(payload.get("status") or payload.get("estado") or "finalized")
        hotspot.response_status_code = status_code
        hotspot.detail.update(
            {
                "quality_gate_passed": bool(payload.get("quality_gate_passed")),
                "review_mode_final": str(payload.get("review_mode_final") or ""),
            }
        )
        return resposta_json_ok(payload, status_code=status_code)


async def api_previa_finalizacao_relatorio(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    payload, status_code = obter_previa_finalizacao_laudo_resposta(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
    )
    return resposta_json_ok(payload, status_code=status_code)


async def api_obter_gate_qualidade_laudo(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    with observe_backend_hotspot(
        "inspector_case_quality_gate",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        laudo_id=laudo_id,
        route_path=f"/app/api/laudo/{laudo_id}/gate-qualidade",
        method="GET",
    ) as hotspot:
        payload, status_code = obter_gate_qualidade_laudo_resposta(
            laudo_id=laudo_id,
            usuario=usuario,
            banco=banco,
        )
        hotspot.outcome = "gate_approved" if bool(payload.get("aprovado")) else "gate_blocked"
        hotspot.response_status_code = status_code
        hotspot.detail.update(
            {
                "aprovado": bool(payload.get("aprovado")),
                "pendencias_total": int(payload.get("pendencias_total", 0) or 0),
            }
        )
        return JSONResponse(payload, status_code=status_code)


async def api_salvar_selecao_fotos_emissao_laudo(
    laudo_id: int,
    dados: DadosIssuedPhotoSelection,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    if not isinstance(getattr(laudo, "report_pack_draft_json", None), dict):
        raise HTTPException(
            status_code=400,
            detail="O report pack ainda não está disponível para este laudo.",
        )
    if not isinstance((laudo.report_pack_draft_json or {}).get("analysis_basis"), dict):
        raise HTTPException(
            status_code=400,
            detail="A base analítica do laudo ainda não está pronta para selecionar fotos.",
        )
    if not list(((laudo.report_pack_draft_json or {}).get("analysis_basis") or {}).get("photo_evidence") or []):
        raise HTTPException(
            status_code=400,
            detail="Ainda não há evidências fotográficas estruturadas para emissão.",
        )

    draft = atualizar_selecao_fotos_emissao_report_pack(
        laudo=laudo,
        selected_photo_keys=list(dados.selected_photo_keys or []),
        actor_user_id=int(getattr(usuario, "id", 0) or 0) or None,
        actor_name=getattr(usuario, "nome_completo", None) or getattr(usuario, "nome", None),
        selection_source=dados.selection_source,
    )
    if draft is None:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível atualizar a seleção de fotos para emissão.",
        )
    banco.flush()
    return resposta_json_ok(
        {
            "ok": True,
            "laudo_id": int(laudo_id),
            "report_pack_draft": obter_report_pack_draft_laudo(laudo),
        }
    )


async def api_analisar_compatibilidade_template_laudo(
    laudo_id: int,
    request: Request,
    tipo_template: Annotated[str, Query(pattern=PADRAO_TIPO_TEMPLATE_FORM)] = "nr35_linha_vida",
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    with observe_backend_hotspot(
        "inspector_template_compatibility",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        laudo_id=laudo_id,
        route_path=f"/app/api/laudo/{laudo_id}/compatibilidade-template",
        method="GET",
        detail={"target_template": str(tipo_template or "")},
    ) as hotspot:
        laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
        payload = analisar_compatibilidade_template_laudo(
            laudo,
            target_template=tipo_template,
        )
        hotspot.outcome = "compatible" if payload.get("compatible") else "missing_evidence"
        hotspot.response_status_code = 200
        hotspot.detail.update(
            {
                "current_template": str(payload.get("current_template") or ""),
                "target_template": str(payload.get("target_template") or ""),
                "missing_total": len(payload.get("missing_evidence") or []),
            }
        )
        return resposta_json_ok(payload)


async def api_reabrir_laudo(
    laudo_id: int,
    request: Request,
    dados: DadosReabrirLaudo | None = None,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    with observe_backend_hotspot(
        "inspector_case_reopen",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        laudo_id=laudo_id,
        route_path=f"/app/api/laudo/{laudo_id}/reabrir",
        method="POST",
        detail={
            "issued_document_policy": (
                str(dados.issued_document_policy or "") if dados is not None else ""
            )
        },
    ) as hotspot:
        payload, status_code = await reabrir_laudo_resposta(
            laudo_id=laudo_id,
            request=request,
            usuario=usuario,
            banco=banco,
            issued_document_policy=(
                dados.issued_document_policy if dados is not None else None
            ),
        )
        hotspot.outcome = "case_reopened"
        hotspot.response_status_code = status_code
        hotspot.detail.update(
            {
                "issued_document_visibility": str(payload.get("issued_document_visibility") or ""),
                "estado": str(payload.get("estado") or ""),
            }
        )
        return resposta_json_ok(payload, status_code=status_code)


def _resumo_template_emissao_laudo(laudo: Laudo) -> dict[str, str | None]:
    snapshot = getattr(laudo, "pdf_template_snapshot_json", None)
    if not isinstance(snapshot, dict):
        snapshot = {}
    template_ref = snapshot.get("template_ref")
    if not isinstance(template_ref, dict):
        template_ref = snapshot
    return {
        "codigo": str(template_ref.get("codigo_template") or "").strip() or None,
        "nome": str(template_ref.get("nome") or template_ref.get("template_name") or "").strip() or None,
        "versao": str(template_ref.get("versao") or "").strip() or None,
        "familia": str(
            template_ref.get("family_key")
            or getattr(laudo, "catalog_family_key", None)
            or getattr(laudo, "tipo_template", None)
            or ""
        ).strip() or None,
    }


def _resumo_estado_preparo_emissao(emissao_oficial: dict) -> dict[str, str]:
    issue_status = str(emissao_oficial.get("issue_status") or "").strip()
    signature_status = str(emissao_oficial.get("signature_status") or "").strip()
    if bool(emissao_oficial.get("already_issued")) and not bool(emissao_oficial.get("reissue_recommended")):
        return {
            "status": "issued",
            "label": "Emitido oficialmente",
            "detail": "O pacote oficial esta congelado e disponivel para download.",
            "tone": "success",
        }
    if issue_status == "awaiting_approval":
        return {
            "status": "awaiting_approval",
            "label": "Aguardando aprovacao",
            "detail": "A Mesa precisa aprovar o laudo antes da assinatura e emissao oficial.",
            "tone": "warning",
        }
    if signature_status not in {"ready", "attention"}:
        return {
            "status": "signature_required",
            "label": "Assinatura pendente",
            "detail": "Configure um signatario governado elegivel para liberar a emissao.",
            "tone": "warning",
        }
    if bool(emissao_oficial.get("issue_action_enabled")):
        return {
            "status": "ready_for_issue",
            "label": "Pronto para emissao",
            "detail": "Template, assinatura e pacote tecnico estao prontos para congelar a emissao oficial.",
            "tone": "success",
        }
    if bool(emissao_oficial.get("reissue_recommended")):
        return {
            "status": "reissue_recommended",
            "label": "Reemissao recomendada",
            "detail": "Existe emissao ativa, mas o pacote atual recomenda uma nova emissao.",
            "tone": "warning",
        }
    return {
        "status": "blocked",
        "label": str(emissao_oficial.get("issue_status_label") or "Bloqueado por governanca"),
        "detail": "Resolva os bloqueios listados antes de emitir oficialmente.",
        "tone": "danger",
    }


async def pagina_preparar_emissao_laudo(
    laudo_id: int,
    request: Request,
    tool: str = Query(default=""),
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
) -> HTMLResponse:
    ensure_tenant_capability_for_user(
        usuario,
        capability="reviewer_issue",
    )
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    anexo_pack, emissao_oficial = build_official_issue_package(banco, laudo=laudo)
    current_issue = emissao_oficial.get("current_issue") if isinstance(emissao_oficial.get("current_issue"), dict) else {}
    contexto = {
        **contexto_base(request),
        "usuario": usuario,
        "laudos_mes_usados": 0,
        "laudos_mes_limite": None,
        "plano_upload_doc": True,
        "deep_research_disponivel": False,
        "estado_relatorio": None,
        "tenant_access_policy": tenant_access_policy_for_user(usuario),
        "laudo": laudo,
        "tool": str(tool or "").strip().lower(),
        "template_emissao": _resumo_template_emissao_laudo(laudo),
        "estado_preparo_emissao": _resumo_estado_preparo_emissao(emissao_oficial),
        "anexo_pack": anexo_pack,
        "emissao_oficial": emissao_oficial,
        "current_issue": current_issue,
        "download_emissao_url": f"/app/api/laudo/{int(laudo.id)}/emissao-oficial/download",
        "emitir_emissao_url": f"/app/api/laudo/{int(laudo.id)}/emissao-oficial",
        "pacote_pdf_url": f"/revisao/api/laudo/{int(laudo.id)}/pacote/exportar-pdf",
        "templates_url": "/revisao/templates-laudo",
        "editor_url": "/revisao/templates-laudo/editor",
        "mesa_url": f"/revisao?laudo_id={int(laudo.id)}",
    }
    return templates.TemplateResponse(
        request,
        "inspetor/preparar_emissao.html",
        contexto,
    )


async def pagina_assinatura_digital_laudo(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
) -> HTMLResponse:
    return await pagina_preparar_emissao_laudo(
        laudo_id=laudo_id,
        request=request,
        tool="assinatura",
        usuario=usuario,
        banco=banco,
    )


async def api_emitir_oficialmente_laudo_inspetor(
    laudo_id: int,
    dados: DadosEmissaoOficialInspetor,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
) -> JSONResponse:
    exigir_csrf(request)
    ensure_tenant_capability_for_user(usuario, capability="reviewer_issue")
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    with observe_backend_hotspot(
        "inspector_official_issue",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        laudo_id=laudo_id,
        case_id=laudo_id,
        route_path=f"/app/api/laudo/{laudo_id}/emissao-oficial",
        method="POST",
    ) as hotspot:
        try:
            resultado = emitir_oficialmente_transacional(
                banco,
                laudo=laudo,
                actor_user=usuario,
                signatory_id=int(dados.signatory_id or 0) or None,
                expected_active_issue_id=int(dados.expected_current_issue_id or 0) or None,
                expected_active_issue_number=str(dados.expected_current_issue_number or "").strip() or None,
            )
        except OfficialIssueConflictError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        record_payload = resultado.get("record_payload") if isinstance(resultado, dict) else None
        hotspot.outcome = "issue_recorded"
        hotspot.response_status_code = 200
        return JSONResponse(
            jsonable_encoder(
                {
                    "success": True,
                    "laudo_id": int(laudo.id),
                    "issue_number": (record_payload or {}).get("issue_number"),
                    "issue_state": (record_payload or {}).get("issue_state"),
                    "package_sha256": (record_payload or {}).get("package_sha256"),
                    "idempotent_replay": bool((resultado or {}).get("idempotent_replay")),
                    "reissued": bool((record_payload or {}).get("reissue_of_issue_id")),
                    "superseded_issue_number": (record_payload or {}).get("reissue_of_issue_number"),
                    "reissue_reason_codes": list((record_payload or {}).get("reissue_reason_codes") or []),
                    "reissue_reason_summary": (record_payload or {}).get("reissue_reason_summary"),
                    "download_url": f"/app/api/laudo/{laudo_id}/emissao-oficial/download",
                    "record": record_payload,
                }
            )
        )


async def api_baixar_emissao_oficial_inspetor(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
) -> FileResponse:
    ensure_tenant_capability_for_user(usuario, capability="reviewer_issue")
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    with observe_backend_hotspot(
        "inspector_official_issue_download",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        laudo_id=laudo_id,
        case_id=laudo_id,
        route_path=f"/app/api/laudo/{laudo_id}/emissao-oficial/download",
        method="GET",
    ) as hotspot:
        record = load_active_official_issue_record(banco, laudo=laudo)
        path = str(getattr(record, "package_storage_path", "") or "").strip() if record is not None else ""
        if not path or not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="Emissao oficial congelada nao encontrada.")
        filename = str(
            getattr(record, "package_filename", "")
            or getattr(record, "issue_number", "")
            or "emissao_oficial.zip"
        )
        hotspot.outcome = "file_response"
        hotspot.response_status_code = 200
        return FileResponse(
            path=path,
            filename=filename,
            media_type="application/zip",
        )


async def api_executar_comando_revisao_mobile(
    laudo_id: int,
    dados: DadosMobileReviewCommand,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    with observe_backend_hotspot(
        "inspector_mobile_review_command",
        request=request,
        surface="inspetor",
        tenant_id=getattr(usuario, "empresa_id", None),
        user_id=getattr(usuario, "id", None),
        laudo_id=laudo_id,
        route_path=f"/app/api/laudo/{laudo_id}/mobile-review-command",
        method="POST",
        detail={
            "command": str(dados.command or ""),
            "block_key": str(dados.block_key or ""),
            "evidence_key": str(dados.evidence_key or ""),
        },
    ) as hotspot:
        payload, status_code = await executar_comando_revisao_mobile_resposta(
            laudo_id=laudo_id,
            request=request,
            usuario=usuario,
            banco=banco,
            command=dados.command,
            block_key=dados.block_key,
            evidence_key=dados.evidence_key,
            title=dados.title,
            reason=dados.reason,
            summary=dados.summary,
            required_action=dados.required_action,
            failure_reasons=dados.failure_reasons,
        )
        hotspot.outcome = str(payload.get("status") or dados.command or "mobile_review_command")
        hotspot.response_status_code = status_code
        hotspot.detail.update(
            {
                "review_status": str(payload.get("review_status") or ""),
                "required_action": str(payload.get("required_action") or ""),
            }
        )
        return resposta_json_ok(payload, status_code=status_code)


async def api_cancelar_relatorio(
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)

    laudo_id = laudo_id_sessao(request)
    if laudo_id:
        laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)

        if laudo.status_revisao != StatusRevisao.RASCUNHO.value:
            raise HTTPException(
                status_code=400,
                detail="Apenas relatórios em rascunho podem ser cancelados.",
            )

        banco.delete(laudo)
        banco.flush()

    limpar_contexto_laudo_ativo(request)

    return resposta_json_ok({"success": True, "message": "❌ Relatório cancelado"})


async def api_desativar_relatorio_ativo(
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    """
    Remove apenas o contexto de "laudo ativo" da sessão.
    Não exclui o laudo em rascunho do banco.
    """
    exigir_csrf(request)

    laudo_id_atual = laudo_id_sessao(request)
    laudo_existente = False

    if laudo_id_atual:
        laudo_existente = bool(
            banco.query(Laudo)
            .filter(
                Laudo.id == laudo_id_atual,
                Laudo.empresa_id == usuario.empresa_id,
                Laudo.usuario_id == usuario.id,
            )
            .first()
        )

    limpar_contexto_laudo_ativo(request)

    return resposta_json_ok(
        {
            "success": True,
            "message": "Sessão ativa removida da central.",
            "laudo_id": int(laudo_id_atual) if laudo_id_atual else None,
            "laudo_preservado": laudo_existente,
        }
    )


async def listar_revisoes_laudo(
    laudo_id: int,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    _ = obter_laudo_do_inspetor(banco, laudo_id, usuario)

    revisoes = banco.query(LaudoRevisao).filter(LaudoRevisao.laudo_id == laudo_id).order_by(LaudoRevisao.numero_versao.asc(), LaudoRevisao.id.asc()).all()

    ultima = revisoes[-1] if revisoes else None
    return resposta_json_ok(
        {
            "laudo_id": laudo_id,
            "total_revisoes": len(revisoes),
            "ultima_versao": int(ultima.numero_versao) if ultima else None,
            "revisoes": [_serializar_revisao_laudo(item) for item in revisoes],
        }
    )


async def obter_diff_revisoes_laudo(
    laudo_id: int,
    base: Annotated[InteiroOpcionalNullish, Query()] = None,
    comparar: Annotated[InteiroOpcionalNullish, Query()] = None,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    _ = obter_laudo_do_inspetor(banco, laudo_id, usuario)

    revisoes_desc = (
        banco.query(LaudoRevisao).filter(LaudoRevisao.laudo_id == laudo_id).order_by(LaudoRevisao.numero_versao.desc(), LaudoRevisao.id.desc()).all()
    )
    if len(revisoes_desc) < 2:
        raise HTTPException(
            status_code=400,
            detail="É necessário ao menos duas versões para comparar o diff.",
        )

    if base is None and comparar is None:
        revisar_comparar = revisoes_desc[0]
        revisao_base = revisoes_desc[1]
    else:
        versao_base = int(base or 0)
        versao_comparar = int(comparar or 0)
        if versao_base <= 0 or versao_comparar <= 0:
            raise HTTPException(status_code=400, detail="Informe versões positivas para base e comparar.")
        if versao_base == versao_comparar:
            raise HTTPException(status_code=400, detail="As versões base e comparar precisam ser diferentes.")

        revisao_base = _obter_revisao_por_versao(banco, laudo_id, versao_base)
        revisar_comparar = _obter_revisao_por_versao(banco, laudo_id, versao_comparar)
        if not revisao_base or not revisar_comparar:
            raise HTTPException(status_code=404, detail="Versão de revisão não encontrada.")

    diff_texto = _gerar_diff_revisoes(revisao_base.conteudo or "", revisar_comparar.conteudo or "")
    resumo_diff = _resumo_diff_revisoes(diff_texto)

    return resposta_json_ok(
        {
            "laudo_id": laudo_id,
            "base": _serializar_revisao_laudo(revisao_base),
            "comparar": _serializar_revisao_laudo(revisar_comparar),
            "resumo_diff": resumo_diff,
            "diff_unificado": diff_texto,
        }
    )


async def rota_pin_laudo(
    laudo_id: int,
    request: Request,
    dados: DadosPin,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)

    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    laudo.pinado = dados.pinado
    laudo.pinado_em = agora_utc() if dados.pinado else None
    laudo.atualizado_em = agora_utc()
    banco.flush()

    return resposta_json_ok(
        {
            "pinado": laudo.pinado,
            "pinado_em": laudo.pinado_em.isoformat() if laudo.pinado_em else None,
        }
    )


async def rota_deletar_laudo(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)

    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)

    if not laudo_permite_exclusao_inspetor(banco, laudo):
        raise HTTPException(
            status_code=400,
            detail="Esse laudo não pode ser excluído no estado atual.",
        )

    if laudo_id_sessao(request) == laudo_id:
        limpar_contexto_laudo_ativo(request)

    banco.delete(laudo)
    banco.flush()

    return resposta_json_ok({"ok": True})


pinar_laudo = rota_pin_laudo
excluir_laudo = rota_deletar_laudo
api_gate_qualidade_laudo = api_obter_gate_qualidade_laudo

roteador_laudo = APIRouter()

roteador_laudo.add_api_route(
    "/api/laudo/status",
    api_status_relatorio,
    methods=["GET"],
)
roteador_laudo.add_api_route(
    "/api/laudo/status",
    api_status_relatorio_delete_nao_suportado,
    methods=["DELETE"],
    include_in_schema=False,
)
roteador_laudo.add_api_route(
    "/api/laudo/iniciar",
    api_iniciar_relatorio,
    methods=["POST"],
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, 400: {"description": "Requisição inválida."}},
)
roteador_laudo.add_api_route(
    "/api/laudo/iniciar",
    api_rota_laudo_post_nao_suportado,
    methods=["DELETE"],
    include_in_schema=False,
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/finalizar",
    api_finalizar_relatorio,
    methods=["POST"],
    responses={
        **RESPOSTA_LAUDO_NAO_ENCONTRADO,
        400: {"description": "Laudo em estado inválido para finalização."},
        **RESPOSTA_DOCUMENT_HARD_GATE_BLOQUEADO,
        **RESPOSTA_GATE_QUALIDADE_REPROVADO,
    },
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/finalizacao-preview",
    api_previa_finalizacao_relatorio,
    methods=["GET"],
    responses={
        **RESPOSTA_LAUDO_NAO_ENCONTRADO,
        403: {"description": "Finalizacao desabilitada para a empresa."},
    },
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/gate-qualidade",
    api_obter_gate_qualidade_laudo,
    methods=["GET"],
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, **RESPOSTA_GATE_QUALIDADE_REPROVADO},
)
roteador_laudo.add_api_route(
    "/laudo/{laudo_id}/preparar-emissao",
    pagina_preparar_emissao_laudo,
    methods=["GET"],
    response_class=HTMLResponse,
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, 403: {"description": "Emissão não contratada."}},
)
roteador_laudo.add_api_route(
    "/laudo/{laudo_id}/assinatura",
    pagina_assinatura_digital_laudo,
    methods=["GET"],
    response_class=HTMLResponse,
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, 403: {"description": "Assinatura não contratada."}},
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/emissao-oficial",
    api_emitir_oficialmente_laudo_inspetor,
    methods=["POST"],
    responses={
        **RESPOSTA_LAUDO_NAO_ENCONTRADO,
        403: {"description": "Emissão não contratada ou CSRF inválido."},
        409: {"description": "A emissão oficial ativa mudou durante a tentativa de reemissão."},
        422: {"description": "Bloqueio de governança para emissão oficial."},
    },
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/emissao-oficial/download",
    api_baixar_emissao_oficial_inspetor,
    methods=["GET"],
    response_class=FileResponse,
    responses={
        **RESPOSTA_LAUDO_NAO_ENCONTRADO,
        403: {"description": "Emissão não contratada."},
        404: {"description": "Emissão oficial congelada não encontrada."},
    },
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/issued-photo-selection",
    api_salvar_selecao_fotos_emissao_laudo,
    methods=["POST"],
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, 400: {"description": "Seleção de fotos indisponível."}},
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/compatibilidade-template",
    api_analisar_compatibilidade_template_laudo,
    methods=["GET"],
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, 400: {"description": "Template inválido."}},
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/reabrir",
    api_reabrir_laudo,
    methods=["POST"],
    responses={
        **RESPOSTA_LAUDO_NAO_ENCONTRADO,
        400: {"description": "Laudo sem ajustes liberados para reabertura."},
    },
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/mobile-review-command",
    api_executar_comando_revisao_mobile,
    methods=["POST"],
    responses={
        **RESPOSTA_LAUDO_NAO_ENCONTRADO,
        400: {"description": "Comando móvel inválido para o estado atual do laudo."},
        **RESPOSTA_DOCUMENT_HARD_GATE_BLOQUEADO,
        **RESPOSTA_GATE_QUALIDADE_REPROVADO,
        422: {"description": "Política ou revisão móvel bloquearam o comando solicitado."},
    },
)
roteador_laudo.add_api_route(
    "/api/laudo/cancelar",
    api_cancelar_relatorio,
    methods=["POST"],
    responses={400: {"description": "Requisição inválida."}},
)
roteador_laudo.add_api_route(
    "/api/laudo/cancelar",
    api_rota_laudo_post_nao_suportado,
    methods=["DELETE"],
    include_in_schema=False,
)
roteador_laudo.add_api_route(
    "/api/laudo/desativar",
    api_desativar_relatorio_ativo,
    methods=["POST"],
    responses={400: {"description": "Requisição inválida."}},
)
roteador_laudo.add_api_route(
    "/api/laudo/desativar",
    api_rota_laudo_post_nao_suportado,
    methods=["DELETE"],
    include_in_schema=False,
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/revisoes",
    listar_revisoes_laudo,
    methods=["GET"],
    responses=RESPOSTA_LAUDO_NAO_ENCONTRADO,
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/revisoes/diff",
    obter_diff_revisoes_laudo,
    methods=["GET"],
    responses=RESPOSTA_LAUDO_NAO_ENCONTRADO,
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/pin",
    rota_pin_laudo,
    methods=["PATCH"],
    responses=RESPOSTA_LAUDO_NAO_ENCONTRADO,
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}",
    rota_deletar_laudo,
    methods=["DELETE"],
    responses={
        **RESPOSTA_LAUDO_NAO_ENCONTRADO,
        400: {"description": "Laudo em estado inválido para exclusão."},
    },
)

__all__ = [
    "roteador_laudo",
    "api_status_relatorio",
    "api_iniciar_relatorio",
    "api_finalizar_relatorio",
    "api_obter_gate_qualidade_laudo",
    "api_gate_qualidade_laudo",
    "pagina_preparar_emissao_laudo",
    "api_emitir_oficialmente_laudo_inspetor",
    "api_baixar_emissao_oficial_inspetor",
    "api_reabrir_laudo",
    "api_executar_comando_revisao_mobile",
    "api_cancelar_relatorio",
    "api_desativar_relatorio_ativo",
    "listar_revisoes_laudo",
    "obter_diff_revisoes_laudo",
    "pinar_laudo",
    "excluir_laudo",
    "pagina_inicial",
    "pagina_planos",
]
