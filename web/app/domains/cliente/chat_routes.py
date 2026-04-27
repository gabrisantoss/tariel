"""Sub-roteador de chat e mesa do portal admin-cliente."""

from __future__ import annotations

import os
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.cliente.common import (
    garantir_csrf_cliente,
    exigir_admin_cliente_com_acoes_casos,
    exigir_admin_cliente_com_visibilidade_casos,
)
from app.domains.cliente.dashboard import (
    listar_laudos_chat_usuario as _listar_laudos_chat_usuario,
    listar_laudos_mesa_empresa as _listar_laudos_mesa_empresa,
)
from app.domains.cliente.portal_bridge import (
    DadosChat,
    DadosPendenciaMesa,
    DadosRespostaChat,
    InteiroOpcionalNullish,
    RESPOSTA_GATE_QUALIDADE_REPROVADO,
    RESPOSTA_LAUDO_NAO_ENCONTRADO,
    RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR,
    api_finalizar_relatorio_cliente,
    api_iniciar_relatorio_cliente,
    api_obter_gate_qualidade_laudo_cliente,
    api_reabrir_laudo_cliente,
    api_status_relatorio_cliente,
    atualizar_pendencia_mesa_cliente,
    avaliar_laudo_cliente,
    baixar_anexo_mesa_cliente,
    marcar_whispers_lidos_cliente,
    obter_historico_chat_revisor_cliente,
    obter_laudo_completo_cliente,
    obter_mensagens_laudo_cliente,
    obter_pacote_mesa_laudo_cliente,
    responder_chat_campo_cliente,
    responder_chat_campo_com_anexo_cliente,
    rota_chat_cliente,
    rota_upload_doc_cliente,
)
from app.domains.cliente.route_support import (
    _payload_json_resposta,
    _rebase_urls_anexos_cliente,
    _registrar_auditoria_cliente_segura,
    _resumir_texto_auditoria,
    _titulo_laudo_cliente,
)
from app.domains.chat.schemas import DadosReabrirLaudo
from app.shared.database import Laudo, Usuario, obter_banco
from app.shared.official_issue_download_audit import registrar_auditoria_download_emissao_oficial
from app.shared.official_issue_package import (
    load_active_official_issue_record,
    resolve_official_issue_primary_pdf_artifact,
)
roteador_cliente_chat = APIRouter()


def _dict_payload_or_none(value: object) -> dict[str, Any] | None:
    return dict(value) if isinstance(value, dict) else None


RESPOSTAS_CHAT_CLIENTE = {
    **RESPOSTA_LAUDO_NAO_ENCONTRADO,
    403: {"description": "Laudo não pertence à empresa do admin-cliente."},
}
RESPOSTAS_GATE_CLIENTE = {
    **RESPOSTAS_CHAT_CLIENTE,
    **RESPOSTA_GATE_QUALIDADE_REPROVADO,
}
RESPOSTAS_MESA_CLIENTE = {
    **RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR,
}
RESPOSTAS_MESA_CLIENTE_COM_PENDENCIA = {
    **RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR,
    404: {"description": "Pendência da mesa não encontrada."},
}
RESPOSTAS_MESA_CLIENTE_COM_ANEXO = {
    **RESPOSTA_LAUDO_NAO_ENCONTRADO_REVISOR,
    400: {"description": "Upload inválido."},
    413: {"description": "Arquivo acima do limite."},
    415: {"description": "Tipo de arquivo não suportado."},
}
RESPOSTAS_MESA_CLIENTE_DOWNLOAD = {
    200: {
        "description": "Arquivo do anexo da mesa.",
        "content": {
            "application/pdf": {},
            "image/png": {},
            "image/jpeg": {},
            "image/webp": {},
            "application/octet-stream": {},
        },
    },
    404: {"description": "Anexo da mesa não encontrado."},
}
RESPOSTAS_DOCUMENTO_OFICIAL_NR35_DOWNLOAD = {
    200: {
        "description": "Artefato oficial NR35 emitido.",
        "content": {
            "application/pdf": {},
            "application/zip": {},
            "application/octet-stream": {},
        },
    },
    404: {"description": "Emissão oficial NR35 não encontrada."},
}


class DadosMesaAvaliacaoCliente(BaseModel):
    acao: Literal["aprovar", "rejeitar"]
    motivo: str = Field(default="", max_length=600)

    model_config = ConfigDict(str_strip_whitespace=True)


def _obter_laudo_documento_cliente(
    banco: Session,
    *,
    laudo_id: int,
    usuario: Usuario,
) -> Laudo:
    laudo = banco.scalar(
        select(Laudo).where(
            Laudo.id == int(laudo_id),
            Laudo.empresa_id == int(usuario.empresa_id),
        )
    )
    if laudo is None:
        raise HTTPException(status_code=404, detail="Laudo não encontrado para este cliente.")
    return laudo


def _obter_emissao_oficial_nr35_cliente(
    banco: Session,
    *,
    laudo: Laudo,
):
    registro = load_active_official_issue_record(banco, laudo=laudo)
    if registro is None:
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    issue_context = (
        dict(getattr(registro, "issue_context_json", None) or {})
        if isinstance(getattr(registro, "issue_context_json", None), dict)
        else {}
    )
    nr35_manifest = issue_context.get("nr35_official_pdf")
    if not isinstance(nr35_manifest, dict):
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    mesa_review = _dict_payload_or_none(nr35_manifest.get("mesa_review")) or {}
    approved_snapshot = _dict_payload_or_none(nr35_manifest.get("approved_snapshot")) or {}
    official_pdf_validation = _dict_payload_or_none(nr35_manifest.get("official_pdf_validation")) or {}
    if not bool(official_pdf_validation.get("ok")):
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    if str(mesa_review.get("status") or "").strip().lower() != "aprovado":
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    if str(mesa_review.get("aprovacao_origem") or "").strip().lower() != "mesa_humana":
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    if not str(getattr(registro, "package_sha256", "") or "").strip():
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    if not str(approved_snapshot.get("approved_payload_sha256") or "").strip():
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    if not str(approved_snapshot.get("approved_report_pack_sha256") or "").strip():
        raise HTTPException(status_code=404, detail="Emissão oficial NR35 não encontrada.")
    return registro


def _file_response_or_404(
    *,
    path: str | None,
    filename: str,
    media_type: str,
) -> FileResponse:
    normalized_path = str(path or "").strip()
    if not normalized_path or not os.path.isfile(normalized_path):
        raise HTTPException(status_code=404, detail="Artefato oficial não encontrado.")
    return FileResponse(
        normalized_path,
        media_type=media_type,
        filename=filename,
    )


@roteador_cliente_chat.get("/api/chat/status")
async def api_chat_status_cliente(
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    return await api_status_relatorio_cliente(request=request, usuario=usuario, banco=banco)


@roteador_cliente_chat.get("/api/chat/laudos")
async def api_chat_laudos_cliente(
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    return JSONResponse({"itens": _listar_laudos_chat_usuario(banco, usuario)})


@roteador_cliente_chat.post("/api/chat/laudos")
async def api_chat_criar_laudo_cliente(
    request: Request,
    tipo_template: str = Form(default="padrao"),
    entry_mode_preference: str | None = Form(default=None),
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await api_iniciar_relatorio_cliente(
        request=request,
        tipo_template=tipo_template,
        entry_mode_preference=entry_mode_preference,
        usuario=usuario,
        banco=banco,
    )
    payload = _payload_json_resposta(resposta)
    laudo_id = int(payload.get("laudo_id") or 0)
    if laudo_id > 0:
        _registrar_auditoria_cliente_segura(
            banco,
            empresa_id=int(usuario.empresa_id),
            ator_usuario_id=int(usuario.id),
            acao="chat_laudo_criado",
            resumo=f"{_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)} criado no chat.",
            detalhe=f"Template {str(tipo_template or 'padrao').strip() or 'padrao'} iniciado pelo admin-cliente.",
            payload={"laudo_id": laudo_id, "tipo_template": str(tipo_template or 'padrao').strip() or 'padrao'},
        )
    return resposta


@roteador_cliente_chat.get("/api/chat/laudos/{laudo_id}/mensagens", responses=RESPOSTAS_CHAT_CLIENTE)
async def api_chat_mensagens_cliente(
    laudo_id: int,
    request: Request,
    cursor: Annotated[InteiroOpcionalNullish, Query()] = None,
    limite: int = Query(default=80, ge=20, le=200),
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    payload = await obter_mensagens_laudo_cliente(
        laudo_id=laudo_id,
        request=request,
        cursor=cursor,
        limite=limite,
        usuario=usuario,
        banco=banco,
    )
    return JSONResponse(payload)


@roteador_cliente_chat.post(
    "/api/chat/upload_doc",
    responses={
        200: {"description": "Documento processado com sucesso."},
        403: {"description": "Upload documental indisponível para a empresa."},
        413: {"description": "Arquivo acima do limite."},
        415: {"description": "Tipo de arquivo não suportado."},
        422: {"description": "Não foi possível extrair texto do documento."},
    },
)
async def api_chat_upload_doc_cliente(
    request: Request,
    arquivo: UploadFile = File(...),
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    return await rota_upload_doc_cliente(
        request=request,
        arquivo=arquivo,
        usuario=usuario,
        banco=banco,
    )


@roteador_cliente_chat.post("/api/chat/mensagem")
async def api_chat_enviar_cliente(
    dados: DadosChat,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await rota_chat_cliente(
        dados=dados,
        request=request,
        usuario=usuario,
        banco=banco,
    )
    laudo_id = int(dados.laudo_id or 0)
    if laudo_id > 0:
        _registrar_auditoria_cliente_segura(
            banco,
            empresa_id=int(usuario.empresa_id),
            ator_usuario_id=int(usuario.id),
            acao="chat_mensagem_enviada",
            resumo=f"Mensagem enviada no chat de {_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)}.",
            detalhe=_resumir_texto_auditoria(dados.mensagem or "Mensagem operacional enviada pelo admin-cliente."),
            payload={
                "laudo_id": laudo_id,
                "setor": dados.setor,
                "modo": dados.modo,
                "referencia_mensagem_id": dados.referencia_mensagem_id,
            },
        )
    return resposta


@roteador_cliente_chat.get("/api/chat/laudos/{laudo_id}/gate", responses=RESPOSTAS_GATE_CLIENTE)
async def api_chat_gate_cliente(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    return await api_obter_gate_qualidade_laudo_cliente(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
    )


@roteador_cliente_chat.post(
    "/api/chat/laudos/{laudo_id}/finalizar",
    responses={
        **RESPOSTAS_CHAT_CLIENTE,
        400: {"description": "Laudo em estado inválido para finalização."},
        **RESPOSTA_GATE_QUALIDADE_REPROVADO,
    },
)
async def api_chat_finalizar_cliente(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await api_finalizar_relatorio_cliente(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
    )
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="chat_laudo_finalizado",
        resumo=f"{_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)} finalizado no chat.",
        detalhe="O laudo foi encaminhado pelo portal admin-cliente.",
        payload={"laudo_id": int(laudo_id)},
    )
    return resposta


@roteador_cliente_chat.post(
    "/api/chat/laudos/{laudo_id}/reabrir",
    responses={**RESPOSTAS_CHAT_CLIENTE, 400: {"description": "Laudo sem ajustes liberados para reabertura."}},
)
async def api_chat_reabrir_cliente(
    laudo_id: int,
    request: Request,
    dados: DadosReabrirLaudo | None = None,
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await api_reabrir_laudo_cliente(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
        issued_document_policy=(
            dados.issued_document_policy if dados is not None else None
        ),
    )
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="chat_laudo_reaberto",
        resumo=f"{_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)} reaberto no chat.",
        detalhe="O admin-cliente voltou o laudo para continuidade operacional.",
        payload={"laudo_id": int(laudo_id)},
    )
    return resposta


@roteador_cliente_chat.get("/api/mesa/laudos")
async def api_mesa_laudos_cliente(
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    return JSONResponse({"itens": _listar_laudos_mesa_empresa(banco, usuario)})


@roteador_cliente_chat.get("/api/mesa/laudos/{laudo_id}/mensagens", responses=RESPOSTAS_MESA_CLIENTE)
async def api_mesa_mensagens_cliente(
    laudo_id: int,
    cursor: Annotated[InteiroOpcionalNullish, Query()] = None,
    limite: int = Query(default=60, ge=20, le=200),
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    payload = await obter_historico_chat_revisor_cliente(
        laudo_id=laudo_id,
        cursor=cursor,
        limite=limite,
        usuario=usuario,
        banco=banco,
    )
    return JSONResponse(_rebase_urls_anexos_cliente(payload, laudo_id=laudo_id))


@roteador_cliente_chat.get("/api/mesa/laudos/{laudo_id}/completo", responses=RESPOSTAS_MESA_CLIENTE)
async def api_mesa_completo_cliente(
    laudo_id: int,
    request: Request,
    incluir_historico: bool = Query(default=False),
    cursor: Annotated[InteiroOpcionalNullish, Query()] = None,
    limite: int = Query(default=60, ge=20, le=200),
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    resposta = await obter_laudo_completo_cliente(
        laudo_id=laudo_id,
        request=request,
        incluir_historico=incluir_historico,
        cursor=cursor,
        limite=limite,
        usuario=usuario,
        banco=banco,
    )
    payload = _payload_json_resposta(resposta)
    return JSONResponse(
        _rebase_urls_anexos_cliente(payload, laudo_id=laudo_id),
        status_code=getattr(resposta, "status_code", 200),
    )


@roteador_cliente_chat.get("/api/mesa/laudos/{laudo_id}/pacote", responses=RESPOSTAS_MESA_CLIENTE)
async def api_mesa_pacote_cliente(
    laudo_id: int,
    request: Request,
    limite_whispers: int = Query(default=80, ge=20, le=300),
    limite_pendencias: int = Query(default=80, ge=20, le=300),
    limite_revisoes: int = Query(default=10, ge=1, le=50),
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    resposta = await obter_pacote_mesa_laudo_cliente(
        laudo_id=laudo_id,
        request=request,
        limite_whispers=limite_whispers,
        limite_pendencias=limite_pendencias,
        limite_revisoes=limite_revisoes,
        usuario=usuario,
        banco=banco,
    )
    payload = _payload_json_resposta(resposta)
    return JSONResponse(
        _rebase_urls_anexos_cliente(payload, laudo_id=laudo_id),
        status_code=getattr(resposta, "status_code", 200),
    )


@roteador_cliente_chat.post(
    "/api/mesa/laudos/{laudo_id}/responder",
    responses={**RESPOSTAS_MESA_CLIENTE, 400: {"description": "Mensagem inválida."}},
)
async def api_mesa_responder_cliente(
    laudo_id: int,
    dados: DadosRespostaChat,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await responder_chat_campo_cliente(
        laudo_id=laudo_id,
        dados=dados,
        request=request,
        usuario=usuario,
        banco=banco,
    )
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="mesa_resposta_enviada",
        resumo=f"Resposta enviada na mesa de {_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)}.",
        detalhe=_resumir_texto_auditoria(dados.texto),
        payload={"laudo_id": int(laudo_id), "referencia_mensagem_id": dados.referencia_mensagem_id},
    )
    return resposta


@roteador_cliente_chat.post(
    "/api/mesa/laudos/{laudo_id}/responder-anexo",
    responses=RESPOSTAS_MESA_CLIENTE_COM_ANEXO,
)
async def api_mesa_responder_anexo_cliente(
    laudo_id: int,
    request: Request,
    arquivo: UploadFile = File(...),
    texto: str = Form(default=""),
    referencia_mensagem_id: Annotated[InteiroOpcionalNullish, Form()] = None,
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await responder_chat_campo_com_anexo_cliente(
        laudo_id=laudo_id,
        request=request,
        arquivo=arquivo,
        texto=texto,
        referencia_mensagem_id=referencia_mensagem_id,
        usuario=usuario,
        banco=banco,
    )
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="mesa_resposta_com_anexo",
        resumo=f"Anexo enviado na mesa de {_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)}.",
        detalhe=_resumir_texto_auditoria(texto or f"Arquivo {getattr(arquivo, 'filename', 'anexo')} enviado pelo admin-cliente."),
        payload={
            "laudo_id": int(laudo_id),
            "arquivo": str(getattr(arquivo, "filename", "") or ""),
            "referencia_mensagem_id": referencia_mensagem_id,
        },
    )
    return resposta


@roteador_cliente_chat.patch(
    "/api/mesa/laudos/{laudo_id}/pendencias/{mensagem_id}",
    responses=RESPOSTAS_MESA_CLIENTE_COM_PENDENCIA,
)
async def api_mesa_pendencia_cliente(
    laudo_id: int,
    mensagem_id: int,
    dados: DadosPendenciaMesa,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await atualizar_pendencia_mesa_cliente(
        laudo_id=laudo_id,
        mensagem_id=mensagem_id,
        dados=dados,
        request=request,
        usuario=usuario,
        banco=banco,
    )
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="mesa_pendencia_atualizada",
        resumo=(
            f"Pendência de {_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)} "
            f"{'resolvida' if dados.lida else 'reaberta'}."
        ),
        detalhe="A pendência foi atualizada pelo admin-cliente.",
        payload={"laudo_id": int(laudo_id), "mensagem_id": int(mensagem_id), "lida": bool(dados.lida)},
    )
    return resposta


@roteador_cliente_chat.post(
    "/api/mesa/laudos/{laudo_id}/avaliar",
    responses={
        **RESPOSTAS_MESA_CLIENTE,
        400: {"description": "Ação inválida ou motivo obrigatório."},
    },
)
async def api_mesa_avaliar_cliente(
    laudo_id: int,
    dados: DadosMesaAvaliacaoCliente,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_acoes_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    resposta = await avaliar_laudo_cliente(
        laudo_id=laudo_id,
        request=request,
        acao=dados.acao,
        motivo=dados.motivo,
        csrf_token=request.headers.get("X-CSRF-Token", ""),
        usuario=usuario,
        banco=banco,
    )
    payload = _payload_json_resposta(resposta)
    acao_normalizada = str(payload.get("acao") or dados.acao or "").strip().lower()
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="mesa_laudo_avaliado",
        resumo=(
            f"{_titulo_laudo_cliente(banco, empresa_id=int(usuario.empresa_id), laudo_id=laudo_id)} "
            f"{'aprovado' if acao_normalizada == 'aprovar' else 'devolvido'} pela mesa."
        ),
        detalhe=_resumir_texto_auditoria(str(payload.get("motivo") or dados.motivo or "Avaliação registrada pelo admin-cliente.")),
        payload={
            "laudo_id": int(laudo_id),
            "acao": acao_normalizada or str(dados.acao or ""),
            "motivo": str(payload.get("motivo") or dados.motivo or ""),
        },
    )
    return resposta


@roteador_cliente_chat.post("/api/mesa/laudos/{laudo_id}/marcar-whispers-lidos", responses=RESPOSTAS_MESA_CLIENTE)
async def api_mesa_marcar_whispers_lidos_cliente(
    laudo_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    garantir_csrf_cliente(request)
    return await marcar_whispers_lidos_cliente(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
    )


@roteador_cliente_chat.get(
    "/api/mesa/laudos/{laudo_id}/anexos/{anexo_id}",
    responses=RESPOSTAS_MESA_CLIENTE_DOWNLOAD,
)
async def api_mesa_baixar_anexo_cliente(
    laudo_id: int,
    anexo_id: int,
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    return await baixar_anexo_mesa_cliente(
        laudo_id=laudo_id,
        anexo_id=anexo_id,
        usuario=usuario,
        banco=banco,
    )


@roteador_cliente_chat.get(
    "/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pacote",
    responses=RESPOSTAS_DOCUMENTO_OFICIAL_NR35_DOWNLOAD,
)
async def api_documentos_baixar_pacote_oficial_nr35_cliente(
    laudo_id: int,
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    laudo = _obter_laudo_documento_cliente(banco, laudo_id=laudo_id, usuario=usuario)
    registro = _obter_emissao_oficial_nr35_cliente(banco, laudo=laudo)
    filename = str(getattr(registro, "package_filename", "") or "").strip() or f"nr35_emissao_oficial_{int(laudo.id)}.zip"
    package_path = str(getattr(registro, "package_storage_path", "") or "").strip()
    if not package_path or not os.path.isfile(package_path):
        raise HTTPException(status_code=404, detail="Artefato oficial não encontrado.")
    registrar_auditoria_download_emissao_oficial(
        banco,
        usuario=usuario,
        laudo=laudo,
        record=registro,
        artifact_kind="official_package",
        surface="cliente",
        route_path=f"/cliente/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pacote",
        filename=filename,
        media_type="application/zip",
    )
    return _file_response_or_404(
        path=package_path,
        filename=filename,
        media_type="application/zip",
    )


@roteador_cliente_chat.get(
    "/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pdf",
    responses=RESPOSTAS_DOCUMENTO_OFICIAL_NR35_DOWNLOAD,
)
async def api_documentos_baixar_pdf_oficial_nr35_cliente(
    laudo_id: int,
    usuario: Usuario = Depends(exigir_admin_cliente_com_visibilidade_casos),
    banco: Session = Depends(obter_banco),
):
    laudo = _obter_laudo_documento_cliente(banco, laudo_id=laudo_id, usuario=usuario)
    registro = _obter_emissao_oficial_nr35_cliente(banco, laudo=laudo)
    artifact = resolve_official_issue_primary_pdf_artifact(laudo, record=registro) or {}
    filename = str(artifact.get("file_name") or "").strip() or f"nr35_laudo_{int(laudo.id)}.pdf"
    pdf_path = str(artifact.get("storage_path") or "").strip()
    if not pdf_path or not os.path.isfile(pdf_path):
        raise HTTPException(status_code=404, detail="Artefato oficial não encontrado.")
    registrar_auditoria_download_emissao_oficial(
        banco,
        usuario=usuario,
        laudo=laudo,
        record=registro,
        artifact_kind="primary_pdf",
        surface="cliente",
        route_path=f"/cliente/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial/pdf",
        filename=filename,
        media_type="application/pdf",
        primary_pdf_sha256=str(artifact.get("sha256") or "").strip() or None,
    )
    return _file_response_or_404(
        path=pdf_path,
        filename=filename,
        media_type="application/pdf",
    )


__all__ = [
    "roteador_cliente_chat",
]
