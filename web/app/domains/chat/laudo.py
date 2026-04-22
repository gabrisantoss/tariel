"""Rotas de ciclo de laudo (inspetor)."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import Depends, Form, HTTPException, Query, Request
from fastapi.responses import JSONResponse
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
from app.domains.chat.laudo_decision_services import (
    executar_comando_revisao_mobile_resposta,
    finalizar_relatorio_resposta,
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
)
from app.domains.chat.schemas import (
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
    "/api/laudo/{laudo_id}/gate-qualidade",
    api_obter_gate_qualidade_laudo,
    methods=["GET"],
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, **RESPOSTA_GATE_QUALIDADE_REPROVADO},
)
roteador_laudo.add_api_route(
    "/api/laudo/{laudo_id}/issued-photo-selection",
    api_salvar_selecao_fotos_emissao_laudo,
    methods=["POST"],
    responses={**RESPOSTA_LAUDO_NAO_ENCONTRADO, 400: {"description": "Seleção de fotos indisponível."}},
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
