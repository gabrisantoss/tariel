"""Sub-roteador de gestão administrativa do portal admin-cliente."""

from __future__ import annotations

import json
import logging
import uuid
import datetime as dt
import hashlib
import tempfile
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.settings import env_str
from app.domains.admin.services import (
    alternar_bloqueio_usuario_empresa,
    atualizar_usuario_empresa,
    criar_usuario_empresa,
    excluir_usuario_empresa,
    filtro_usuarios_gerenciaveis_cliente,
    filtro_usuarios_operacionais_cliente,
    resetar_senha_usuario_empresa,
)
from app.domains.chat.auth_mobile_support import email_valido_basico as _email_valido_basico
from app.domains.chat.media_helpers import nome_documento_seguro
from app.domains.chat.normalization import normalizar_email
from app.domains.cliente.auditoria import (
    listar_auditoria_empresa,
    resumir_auditoria_serializada,
    serializar_registro_auditoria,
)
from app.domains.cliente.common import validar_csrf_cliente
from app.domains.cliente.diagnostics import build_cliente_portal_diagnostic_payload
from app.domains.cliente.dashboard import (
    ROLE_LABELS as _ROLE_LABELS,
    comparativo_plano_cliente as _comparativo_plano_cliente,
    resumo_empresa_cliente as _resumo_empresa_cliente,
    serializar_usuario_cliente as _serializar_usuario_cliente,
)
from app.domains.cliente.dashboard_bootstrap_support import resumir_habilitacao_profissional_empresa
from app.domains.cliente.route_support import (
    URL_EQUIPE,
    _consumir_credencial_onboarding_cliente,
    _empresa_usuario,
    _registrar_credencial_onboarding_cliente,
    _registrar_auditoria_cliente_segura,
    _render_template,
    _traduzir_erro_servico_cliente,
)
from app.shared.database import NivelAcesso, PlanoEmpresa, SignatarioGovernadoLaudo, Usuario, obter_banco
from app.shared.security import exigir_admin_cliente, usuario_ocupa_slot_operacional
from app.shared.tenant_entitlement_guard import ensure_tenant_capability_for_user
from app.shared.tenant_admin_policy import summarize_tenant_admin_operational_package

roteador_cliente_management = APIRouter()
logger = logging.getLogger("tariel.cliente.management")

RESPOSTAS_USUARIO_CLIENTE = {
    400: {"description": "Dados inválidos para o usuário da empresa."},
    403: {"description": "Operação não permitida para o portal admin-cliente."},
    404: {"description": "Usuário não encontrado para esta empresa."},
    409: {"description": "Conflito ao alterar o cadastro da empresa."},
}
RESPOSTAS_BLOQUEIO_CLIENTE = {
    403: {"description": "Operação não permitida para o portal admin-cliente."},
    404: {"description": "Usuário não encontrado para esta empresa."},
}
RESPOSTAS_PLANO_CLIENTE = {
    400: {"description": "Plano inválido."},
    403: {"description": "Mudança comercial direta de plano não é permitida ao admin-cliente."},
    404: {"description": "Empresa não encontrada."},
}
NIVEL_MAP_CLIENTE = {
    "inspetor": NivelAcesso.INSPETOR,
    "revisor": NivelAcesso.REVISOR,
}
ROTA_USUARIO_ACESSO_INICIAL = "/usuarios/{usuario_id}/acesso-inicial"
URL_USUARIO_ACESSO_INICIAL = "/cliente/usuarios/{usuario_id}/acesso-inicial"
MAX_BYTES_EVIDENCIA_HABILITACAO = 8 * 1024 * 1024
PASTA_EVIDENCIAS_HABILITACAO = Path(
    env_str(
        "PASTA_EVIDENCIAS_HABILITACAO_PROFISSIONAL",
        str(Path(tempfile.gettempdir()) / "tariel_control" / "habilitacao_profissional"),
    )
).expanduser()
MIME_EVIDENCIAS_HABILITACAO = {
    "application/pdf": ("pdf", ".pdf"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ("docx", ".docx"),
    "image/png": ("imagem", ".png"),
    "image/jpeg": ("imagem", ".jpg"),
    "image/jpg": ("imagem", ".jpg"),
}


def _safe_int(value: Any) -> int:
    if isinstance(value, bool):
        return 0
    if not isinstance(value, (int, float, str, bytes, bytearray)):
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


class DadosPlanoCliente(BaseModel):
    plano: Literal["Inicial", "Intermediario", "Ilimitado"]

    model_config = ConfigDict(str_strip_whitespace=True)


class DadosInteressePlanoCliente(BaseModel):
    plano: Literal["Inicial", "Intermediario", "Ilimitado"]
    origem: Literal["admin", "chat", "mesa"] = "admin"
    urgencia: str = Field(default="", max_length=40)
    motivo: str = Field(default="", max_length=80)
    observacoes: str = Field(default="", max_length=600)

    model_config = ConfigDict(str_strip_whitespace=True)


class DadosCriarUsuarioCliente(BaseModel):
    nome: str = Field(..., min_length=3, max_length=150)
    email: str = Field(..., min_length=5, max_length=254)
    nivel_acesso: str = Field(..., min_length=3, max_length=40)
    telefone: str = Field(default="", max_length=30)
    crea: str = Field(default="", max_length=40)
    allowed_portals: list[str] = Field(default_factory=list)

    model_config = ConfigDict(str_strip_whitespace=True)


class DadosAtualizarUsuarioCliente(BaseModel):
    nome: str | None = Field(default=None, min_length=3, max_length=150)
    email: str | None = Field(default=None, min_length=5, max_length=254)
    telefone: str | None = Field(default=None, max_length=30)
    crea: str | None = Field(default=None, max_length=40)
    allowed_portals: list[str] | None = Field(default=None)

    model_config = ConfigDict(str_strip_whitespace=True)


class DadosRelatoSuporteCliente(BaseModel):
    tipo: Literal["bug", "feedback"] = "feedback"
    titulo: str = Field(default="", max_length=120)
    mensagem: str = Field(..., min_length=3, max_length=4000)
    email_retorno: str = Field(default="", max_length=254)
    contexto: str = Field(default="", max_length=500)

    model_config = ConfigDict(str_strip_whitespace=True)


class DadosSolicitacaoHabilitacaoProfissionalCliente(BaseModel):
    nome: str = Field(..., min_length=3, max_length=160)
    tipo_profissional: Literal[
        "engenheiro_seguranca",
        "tecnico_seguranca",
        "profissional_habilitado",
        "outro",
    ] = "profissional_habilitado"
    registro_profissional: str = Field(..., min_length=3, max_length=80)
    email: str = Field(default="", max_length=254)
    telefone: str = Field(default="", max_length=30)
    observacoes: str = Field(default="", max_length=800)

    model_config = ConfigDict(str_strip_whitespace=True)


def _json_attachment_response(payload: dict[str, object], *, filename: str) -> Response:
    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _resolver_nivel_operacional_cliente(valor: str) -> NivelAcesso:
    nivel = str(valor or "").strip().lower()
    if nivel == "admin_cliente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O portal admin-cliente não pode criar contas Admin-Cliente. Esse acesso é governado pela Tariel.",
        )
    if nivel not in NIVEL_MAP_CLIENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Perfil inválido para o portal admin-cliente.")
    return NIVEL_MAP_CLIENTE[nivel]


def _validar_usuario_operacional_cliente(
    banco: Session,
    *,
    empresa_id: int,
    usuario_id: int,
) -> Usuario:
    usuario = banco.scalar(
        select(Usuario).where(
            Usuario.id == int(usuario_id),
            Usuario.empresa_id == int(empresa_id),
            filtro_usuarios_operacionais_cliente(),
        )
    )
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário operacional não encontrado para esta empresa.")
    return usuario


def _contar_usuarios_operacionais_empresa(banco: Session, *, empresa_id: int) -> int:
    usuarios = list(
        banco.scalars(
            select(Usuario).where(
                Usuario.empresa_id == int(empresa_id),
                filtro_usuarios_gerenciaveis_cliente(),
            )
        ).all()
    )
    return sum(1 for item in usuarios if usuario_ocupa_slot_operacional(item))


def _payload_credencial_onboarding_cliente(
    credencial_onboarding: dict[str, object],
    *,
    usuario_id: int,
) -> dict[str, object]:
    payload = dict(credencial_onboarding)
    payload["acesso_inicial_url"] = URL_USUARIO_ACESSO_INICIAL.format(usuario_id=int(usuario_id))
    return payload


def _garantir_gestao_equipe_habilitada(usuario: Usuario) -> None:
    ensure_tenant_capability_for_user(
        usuario,
        capability="admin_manage_team",
    )


_TIPO_PROFISSIONAL_LABELS = {
    "engenheiro_seguranca": "Engenheiro de Segurança do Trabalho",
    "tecnico_seguranca": "Técnico de Segurança do Trabalho",
    "profissional_habilitado": "Profissional habilitado",
    "outro": "Responsável técnico",
}


def _normalizar_registro_profissional_cliente(value: str) -> str:
    return " ".join(str(value or "").strip().split())[:80]


def _registro_profissional_ja_cadastrado(
    banco: Session,
    *,
    empresa_id: int,
    registro_profissional: str,
) -> SignatarioGovernadoLaudo | None:
    registro_norm = _normalizar_registro_profissional_cliente(registro_profissional).lower()
    if not registro_norm:
        return None
    signatarios = list(
        banco.scalars(
            select(SignatarioGovernadoLaudo).where(SignatarioGovernadoLaudo.tenant_id == int(empresa_id))
        ).all()
    )
    for signatario in signatarios:
        atual = _normalizar_registro_profissional_cliente(
            str(getattr(signatario, "registro_profissional", "") or "")
        ).lower()
        if atual and atual == registro_norm:
            return signatario
    return None


def _metadata_signatario_cliente(signatario: SignatarioGovernadoLaudo) -> dict[str, Any]:
    metadata = getattr(signatario, "governance_metadata_json", None)
    return dict(metadata) if isinstance(metadata, dict) else {}


def _normalizar_status_habilitacao_cliente(signatario: SignatarioGovernadoLaudo) -> str:
    metadata = _metadata_signatario_cliente(signatario)
    status_atual = str(
        metadata.get("professional_approval_status")
        or metadata.get("approval_status")
        or "approved"
    ).strip().lower().replace("-", "_")
    return status_atual if status_atual in {"pending", "in_review", "approved", "rejected", "suspended"} else "in_review"


def _documentos_habilitacao_cliente(metadata: dict[str, Any]) -> list[dict[str, Any]]:
    documentos = metadata.get("professional_documents")
    if not isinstance(documentos, list):
        return []
    itens: list[dict[str, Any]] = []
    for item in documentos:
        if not isinstance(item, dict):
            continue
        documento_id = str(item.get("id") or "").strip()
        nome = str(item.get("nome") or item.get("name") or "").strip()
        caminho = str(item.get("storage_path") or "").strip()
        if documento_id and nome and caminho:
            itens.append(dict(item))
    return itens


def _serializar_evidencia_habilitacao_cliente(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("id") or ""),
        "nome": str(item.get("nome") or ""),
        "mime_type": str(item.get("mime_type") or ""),
        "categoria": str(item.get("categoria") or "documento"),
        "tamanho_bytes": int(item.get("tamanho_bytes") or 0),
        "sha256": str(item.get("sha256") or ""),
        "uploaded_at": str(item.get("uploaded_at") or ""),
    }


def _validar_evidencia_habilitacao(
    *,
    nome_original: str,
    mime_type: str,
    conteudo: bytes,
) -> tuple[str, str, str]:
    mime = str(mime_type or "").strip().lower()
    categoria_ext = MIME_EVIDENCIAS_HABILITACAO.get(mime)
    if categoria_ext is None:
        raise HTTPException(status_code=415, detail="Use PDF, DOCX, PNG ou JPG como comprovação profissional.")
    if not conteudo:
        raise HTTPException(status_code=400, detail="Arquivo de comprovação vazio.")
    if len(conteudo) > MAX_BYTES_EVIDENCIA_HABILITACAO:
        raise HTTPException(status_code=413, detail="A comprovação profissional deve ter no máximo 8MB.")
    categoria, extensao = categoria_ext
    nome_seguro = nome_documento_seguro(nome_original or "comprovacao_profissional")
    nome_final = Path(nome_seguro).name or "comprovacao_profissional"
    if Path(nome_final).suffix.lower() not in {extensao, ".jpeg" if extensao == ".jpg" else extensao}:
        nome_final = f"{Path(nome_final).stem or 'comprovacao_profissional'}{extensao}"
    return categoria, extensao, nome_final


def _salvar_evidencia_habilitacao(
    *,
    empresa_id: int,
    signatario_id: int,
    nome_original: str,
    mime_type: str,
    conteudo: bytes,
    usuario_id: int,
) -> dict[str, Any]:
    categoria, extensao, nome_final = _validar_evidencia_habilitacao(
        nome_original=nome_original,
        mime_type=mime_type,
        conteudo=conteudo,
    )
    pasta_destino = PASTA_EVIDENCIAS_HABILITACAO / str(int(empresa_id)) / str(int(signatario_id))
    pasta_destino.mkdir(parents=True, exist_ok=True)
    documento_id = uuid.uuid4().hex
    caminho_arquivo = pasta_destino / f"{documento_id}{extensao}"
    caminho_arquivo.write_bytes(conteudo)
    return {
        "id": documento_id,
        "nome": nome_final,
        "mime_type": str(mime_type or "").strip().lower(),
        "categoria": categoria,
        "tamanho_bytes": len(conteudo),
        "sha256": hashlib.sha256(conteudo).hexdigest(),
        "storage_path": str(caminho_arquivo),
        "uploaded_by_id": int(usuario_id),
        "uploaded_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


@roteador_cliente_management.get("/api/auditoria")
async def api_auditoria_cliente(
    limite: int = Query(default=12, ge=1, le=50),
    scope: Literal["all", "admin", "chat", "mesa", "support"] = Query(default="all"),
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    itens = [
        serializar_registro_auditoria(item)
        for item in listar_auditoria_empresa(
            banco,
            empresa_id=int(usuario.empresa_id),
            limite=limite,
            scope=None if scope == "all" else scope,
        )
    ]
    return JSONResponse(
        {
            "itens": itens,
            "scope": scope,
            "resumo": resumir_auditoria_serializada(itens),
        }
    )


@roteador_cliente_management.get("/api/diagnostico")
async def api_diagnostico_cliente(
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    payload = build_cliente_portal_diagnostic_payload(
        banco,
        usuario,
        request=request,
    )
    filename = f"tariel-cliente-diagnostico-{int(usuario.empresa_id)}.json"
    return _json_attachment_response(payload, filename=filename)


@roteador_cliente_management.post("/api/suporte/report")
async def api_relato_suporte_cliente(
    dados: DadosRelatoSuporteCliente,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF invalido.")

    mensagem = str(dados.mensagem or "").strip()
    if len(mensagem) < 3:
        raise HTTPException(status_code=400, detail="Descreva a mensagem com pelo menos 3 caracteres.")

    email_retorno = normalizar_email(dados.email_retorno)
    if email_retorno and not _email_valido_basico(email_retorno):
        raise HTTPException(status_code=400, detail="Informe um e-mail de retorno valido.")

    protocolo = f"CLI-{uuid.uuid4().hex[:8].upper()}"
    logger.info(
        "Relato suporte cliente | protocolo=%s | tipo=%s | usuario_id=%s | empresa_id=%s | email=%s | titulo=%s | contexto=%s",
        protocolo,
        dados.tipo,
        usuario.id,
        usuario.empresa_id,
        email_retorno or usuario.email,
        str(dados.titulo or "").strip(),
        str(dados.contexto or "").strip(),
    )
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="suporte_reportado",
        resumo=f"Relato de suporte {dados.tipo} registrado com protocolo {protocolo}.",
        detalhe=str(dados.titulo or "").strip() or "Contato operacional registrado pelo portal admin-cliente.",
        payload={
            "protocolo": protocolo,
            "tipo": str(dados.tipo or "feedback"),
            "email_retorno": email_retorno or str(getattr(usuario, "email", "") or ""),
            "contexto": str(dados.contexto or "").strip(),
        },
    )
    return JSONResponse(
        {
            "success": True,
            "protocolo": protocolo,
            "status": "Recebido",
        }
    )


@roteador_cliente_management.post("/api/habilitacao-profissional", status_code=status.HTTP_201_CREATED)
async def api_solicitar_habilitacao_profissional_cliente(
    dados: DadosSolicitacaoHabilitacaoProfissionalCliente,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")

    registro_profissional = _normalizar_registro_profissional_cliente(dados.registro_profissional)
    if len(registro_profissional) < 3:
        raise HTTPException(status_code=400, detail="Informe o registro profissional.")

    email = normalizar_email(dados.email)
    if email and not _email_valido_basico(email):
        raise HTTPException(status_code=400, detail="Informe um e-mail profissional válido.")

    existente = _registro_profissional_ja_cadastrado(
        banco,
        empresa_id=int(usuario.empresa_id),
        registro_profissional=registro_profissional,
    )
    if existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este registro profissional já está cadastrado para análise nesta empresa.",
        )

    tipo_profissional = str(dados.tipo_profissional or "profissional_habilitado").strip()
    funcao = _TIPO_PROFISSIONAL_LABELS.get(tipo_profissional, "Responsável técnico")
    enviado_em = dt.datetime.now(dt.timezone.utc).isoformat()
    signatario = SignatarioGovernadoLaudo(
        tenant_id=int(usuario.empresa_id),
        nome=str(dados.nome or "").strip(),
        funcao=funcao,
        registro_profissional=registro_profissional,
        allowed_family_keys_json=[],
        governance_metadata_json={
            "professional_approval_status": "in_review",
            "professional_approval_submitted_by_id": int(usuario.id),
            "professional_approval_submitted_at": enviado_em,
            "professional_approval_source": "cliente_portal",
            "professional_type": tipo_profissional,
            "professional_email": email,
            "professional_phone": str(dados.telefone or "").strip(),
            "professional_documents_status": "not_uploaded",
        },
        ativo=True,
        observacoes=str(dados.observacoes or "").strip() or None,
        criado_por_id=int(usuario.id),
    )
    banco.add(signatario)
    try:
        banco.flush()
        banco.refresh(signatario)
    except IntegrityError as exc:
        banco.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este profissional já está cadastrado para esta empresa.",
        ) from exc

    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="habilitacao_profissional_solicitada",
        resumo=f"Habilitação profissional solicitada para {signatario.nome}.",
        detalhe="Solicitação enviada pelo Portal Cliente para análise da Tariel.",
        payload={
            "signatario_id": int(signatario.id),
            "nome": signatario.nome,
            "registro_profissional": signatario.registro_profissional or "",
            "tipo_profissional": tipo_profissional,
            "status": "in_review",
        },
    )
    return JSONResponse(
        {
            "success": True,
            "signatario_id": int(signatario.id),
            "habilitacao": resumir_habilitacao_profissional_empresa(
                banco,
                empresa_id=int(usuario.empresa_id),
            ),
        },
        status_code=status.HTTP_201_CREATED,
    )


@roteador_cliente_management.post(
    "/api/habilitacao-profissional/{signatario_id}/evidencias",
    status_code=status.HTTP_201_CREATED,
)
async def api_upload_evidencia_habilitacao_profissional_cliente(
    signatario_id: int,
    request: Request,
    arquivo: UploadFile = File(...),
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")

    signatario = banco.scalar(
        select(SignatarioGovernadoLaudo).where(
            SignatarioGovernadoLaudo.id == int(signatario_id),
            SignatarioGovernadoLaudo.tenant_id == int(usuario.empresa_id),
        )
    )
    if signatario is None:
        raise HTTPException(status_code=404, detail="Habilitação profissional não encontrada para esta empresa.")

    status_habilitacao = _normalizar_status_habilitacao_cliente(signatario)
    if status_habilitacao not in {"pending", "in_review"}:
        raise HTTPException(
            status_code=409,
            detail="Comprovações só podem ser adicionadas enquanto a habilitação está pendente ou em análise.",
        )

    conteudo = await arquivo.read()
    evidencia = _salvar_evidencia_habilitacao(
        empresa_id=int(usuario.empresa_id),
        signatario_id=int(signatario.id),
        nome_original=arquivo.filename or "comprovacao_profissional",
        mime_type=arquivo.content_type or "",
        conteudo=conteudo,
        usuario_id=int(usuario.id),
    )
    metadata = _metadata_signatario_cliente(signatario)
    documentos = _documentos_habilitacao_cliente(metadata)
    documentos.append(evidencia)
    metadata["professional_documents"] = documentos
    metadata["professional_documents_status"] = "uploaded"
    metadata["professional_documents_count"] = len(documentos)
    metadata["professional_documents_updated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    signatario.governance_metadata_json = metadata
    banco.flush()

    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="habilitacao_profissional_evidencia_enviada",
        resumo=f"Comprovação profissional enviada para {signatario.nome}.",
        detalhe=f"Arquivo {evidencia['nome']} anexado à solicitação de habilitação profissional.",
        payload={
            "signatario_id": int(signatario.id),
            "documento_id": evidencia["id"],
            "nome": evidencia["nome"],
            "mime_type": evidencia["mime_type"],
            "tamanho_bytes": evidencia["tamanho_bytes"],
            "sha256": evidencia["sha256"],
        },
    )
    return JSONResponse(
        {
            "success": True,
            "documento": _serializar_evidencia_habilitacao_cliente(evidencia),
            "documentos": [_serializar_evidencia_habilitacao_cliente(item) for item in documentos],
            "habilitacao": resumir_habilitacao_profissional_empresa(
                banco,
                empresa_id=int(usuario.empresa_id),
            ),
        },
        status_code=status.HTTP_201_CREATED,
    )


@roteador_cliente_management.patch("/api/empresa/plano", responses=RESPOSTAS_PLANO_CLIENTE)
async def api_alterar_plano_cliente(
    dados: DadosPlanoCliente,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")

    empresa_atual = _empresa_usuario(banco, usuario)
    plano_anterior = PlanoEmpresa.normalizar(empresa_atual.plano_ativo)
    comparativo = _comparativo_plano_cliente(banco, plano_atual=plano_anterior, plano_destino=dados.plano)
    return JSONResponse(
        {
            "success": False,
            "detail": "Mudança comercial direta de plano não é permitida ao admin-cliente. Registre interesse para encaminhamento da Tariel.",
            "plano": comparativo,
            "empresa": _resumo_empresa_cliente(banco, usuario),
        },
        status_code=status.HTTP_403_FORBIDDEN,
    )


@roteador_cliente_management.post("/api/empresa/plano/interesse", responses=RESPOSTAS_PLANO_CLIENTE)
async def api_registrar_interesse_plano_cliente(
    dados: DadosInteressePlanoCliente,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")

    empresa = _empresa_usuario(banco, usuario)
    plano_atual = PlanoEmpresa.normalizar(empresa.plano_ativo)
    comparativo = _comparativo_plano_cliente(banco, plano_atual=plano_atual, plano_destino=dados.plano)
    origem = str(dados.origem or "admin").strip().lower()
    urgencia = str(dados.urgencia or "").strip()[:40]
    motivo = str(dados.motivo or "").strip()[:80]
    observacoes = str(dados.observacoes or "").strip()[:600]

    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="plano_interesse_registrado",
        resumo=f"Interesse registrado em migrar para {comparativo['plano']}.",
        detalhe=f"Origem {origem}. Impacto esperado: {comparativo['resumo_impacto']}.",
        payload={
            "plano_anterior": plano_atual,
            "plano_sugerido": comparativo["plano"],
            "origem": origem,
            "movimento": comparativo["movimento"],
            "impacto_resumido": comparativo["resumo_impacto"],
            "delta_usuarios": comparativo["delta_usuarios"],
            "delta_laudos": comparativo["delta_laudos"],
            "urgencia": urgencia,
            "motivo": motivo,
            "observacoes": observacoes,
        },
    )
    return JSONResponse(
        {
            "success": True,
            "plano": comparativo,
            "empresa": _resumo_empresa_cliente(banco, usuario),
        }
    )


@roteador_cliente_management.get("/api/usuarios")
async def api_listar_usuarios_cliente(
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    usuarios = list(
        banco.scalars(
            select(Usuario)
            .where(
                Usuario.empresa_id == usuario.empresa_id,
                filtro_usuarios_operacionais_cliente(),
            )
            .order_by(Usuario.nivel_acesso.desc(), Usuario.nome_completo.asc())
        ).all()
    )
    return JSONResponse({"itens": [_serializar_usuario_cliente(item) for item in usuarios]})


@roteador_cliente_management.post(
    "/api/usuarios",
    status_code=status.HTTP_201_CREATED,
    responses=RESPOSTAS_USUARIO_CLIENTE,
)
async def api_criar_usuario_cliente(
    dados: DadosCriarUsuarioCliente,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")
    _garantir_gestao_equipe_habilitada(usuario)

    nivel_acesso = _resolver_nivel_operacional_cliente(dados.nivel_acesso)

    try:
        novo, senha = criar_usuario_empresa(
            banco,
            empresa_id=int(usuario.empresa_id),
            nome=dados.nome,
            email=dados.email,
            nivel_acesso=nivel_acesso,
            telefone=dados.telefone,
            crea=dados.crea,
            allowed_portals=dados.allowed_portals,
        )
    except ValueError as exc:
        detalhe = str(exc or "").strip()
        if "limite operacional" in detalhe.lower():
            empresa = _empresa_usuario(banco, usuario)
            governance = summarize_tenant_admin_operational_package(
                getattr(empresa, "admin_cliente_policy_json", None),
                operational_users_in_use=_contar_usuarios_operacionais_empresa(
                    banco,
                    empresa_id=int(usuario.empresa_id),
                ),
            )
            _registrar_auditoria_cliente_segura(
                banco,
                empresa_id=int(usuario.empresa_id),
                ator_usuario_id=int(usuario.id),
                acao="usuario_criacao_negada_pacote",
                resumo=(
                    "Tentativa de criar conta operacional extra negada pelo pacote "
                    f"{governance['operating_model_label']}."
                ),
                detalhe=detalhe,
                payload={
                    "requested_email": str(dados.email or "").strip(),
                    "requested_role": _ROLE_LABELS.get(int(nivel_acesso), "Usuário"),
                    "requested_allowed_portals": list(dados.allowed_portals or []),
                    "operating_model": governance["operating_model"],
                    "contract_operational_user_limit": governance["contract_operational_user_limit"],
                    "operational_users_in_use": governance["operational_users_in_use"],
                    "shared_mobile_operator_surface_set": governance[
                        "shared_mobile_operator_surface_set"
                    ],
                },
            )
            banco.commit()
        raise _traduzir_erro_servico_cliente(exc) from exc
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        alvo_usuario_id=int(novo.id),
        acao="usuario_criado",
        resumo=f"Usuário {novo.nome} criado como {_ROLE_LABELS.get(int(novo.nivel_acesso), 'Usuário')}.",
        detalhe=f"Cadastro criado com e-mail {novo.email}.",
        payload={
            "email": novo.email,
            "nivel_acesso": int(novo.nivel_acesso),
            "allowed_portals": list(getattr(novo, "allowed_portals", ())),
        },
    )
    credencial_onboarding = _registrar_credencial_onboarding_cliente(
        request,
        usuario=novo,
        senha_temporaria=senha,
        referencia="Novo usuário operacional",
    )
    return JSONResponse(
        {
            "success": True,
            "usuario": _serializar_usuario_cliente(novo),
            "senha_temporaria": senha,
            "credencial_onboarding": _payload_credencial_onboarding_cliente(
                credencial_onboarding,
                usuario_id=int(novo.id),
            ),
        },
        status_code=status.HTTP_201_CREATED,
    )


@roteador_cliente_management.patch("/api/usuarios/{usuario_id}", responses=RESPOSTAS_USUARIO_CLIENTE)
async def api_atualizar_usuario_cliente(
    usuario_id: int,
    dados: DadosAtualizarUsuarioCliente,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")
    _garantir_gestao_equipe_habilitada(usuario)

    _validar_usuario_operacional_cliente(
        banco,
        empresa_id=int(usuario.empresa_id),
        usuario_id=usuario_id,
    )

    try:
        atualizado = atualizar_usuario_empresa(
            banco,
            empresa_id=int(usuario.empresa_id),
            usuario_id=usuario_id,
            nome=dados.nome,
            email=dados.email,
            telefone=dados.telefone,
            crea=dados.crea,
            allowed_portals=dados.allowed_portals,
        )
    except ValueError as exc:
        raise _traduzir_erro_servico_cliente(exc) from exc
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        alvo_usuario_id=int(atualizado.id),
        acao="usuario_atualizado",
        resumo=f"Cadastro de {atualizado.nome} atualizado.",
        detalhe="Dados básicos do usuário foram editados pelo admin-cliente.",
        payload={
            "email": atualizado.email,
            "telefone": atualizado.telefone or "",
            "crea": atualizado.crea or "",
            "allowed_portals": list(getattr(atualizado, "allowed_portals", ())),
        },
    )
    return JSONResponse({"success": True, "usuario": _serializar_usuario_cliente(atualizado)})


@roteador_cliente_management.patch("/api/usuarios/{usuario_id}/bloqueio", responses=RESPOSTAS_BLOQUEIO_CLIENTE)
async def api_bloqueio_usuario_cliente(
    usuario_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")
    _garantir_gestao_equipe_habilitada(usuario)

    _validar_usuario_operacional_cliente(
        banco,
        empresa_id=int(usuario.empresa_id),
        usuario_id=usuario_id,
    )

    try:
        atualizado = alternar_bloqueio_usuario_empresa(banco, int(usuario.empresa_id), usuario_id)
    except ValueError as exc:
        raise _traduzir_erro_servico_cliente(exc) from exc
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        alvo_usuario_id=int(atualizado.id),
        acao="usuario_bloqueio_alterado",
        resumo=f"{atualizado.nome} {'desbloqueado' if atualizado.ativo else 'bloqueado'} no portal.",
        detalhe="Status operacional alterado pelo admin-cliente.",
        payload={"ativo": bool(atualizado.ativo)},
    )
    return JSONResponse({"success": True, "usuario": _serializar_usuario_cliente(atualizado)})


@roteador_cliente_management.post("/api/usuarios/{usuario_id}/resetar-senha", responses=RESPOSTAS_BLOQUEIO_CLIENTE)
async def api_resetar_senha_usuario_cliente(
    usuario_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")
    _garantir_gestao_equipe_habilitada(usuario)

    _validar_usuario_operacional_cliente(
        banco,
        empresa_id=int(usuario.empresa_id),
        usuario_id=usuario_id,
    )

    try:
        senha = resetar_senha_usuario_empresa(banco, int(usuario.empresa_id), usuario_id)
    except ValueError as exc:
        raise _traduzir_erro_servico_cliente(exc) from exc
    usuario_resetado = banco.get(Usuario, int(usuario_id))
    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        alvo_usuario_id=int(usuario_id),
        acao="senha_resetada",
        resumo=f"Senha temporária regenerada para {getattr(usuario_resetado, 'nome', f'Usuário #{usuario_id}')}.",
        detalhe="O próximo login exigirá nova troca de senha.",
        payload={"usuario_id": int(usuario_id)},
    )
    assert usuario_resetado is not None
    credencial_onboarding = _registrar_credencial_onboarding_cliente(
        request,
        usuario=usuario_resetado,
        senha_temporaria=senha,
        referencia="Senha temporária regenerada",
    )
    return JSONResponse(
        {
            "success": True,
            "senha_temporaria": senha,
            "credencial_onboarding": _payload_credencial_onboarding_cliente(
                credencial_onboarding,
                usuario_id=int(usuario_id),
            ),
        }
    )


@roteador_cliente_management.get(ROTA_USUARIO_ACESSO_INICIAL, response_class=HTMLResponse)
async def acesso_inicial_usuario_cliente(
    usuario_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    alvo = _validar_usuario_operacional_cliente(
        banco,
        empresa_id=int(usuario.empresa_id),
        usuario_id=usuario_id,
    )
    usuario_publico = _serializar_usuario_cliente(alvo)
    credencial_onboarding = _consumir_credencial_onboarding_cliente(
        request,
        usuario_id=int(usuario_id),
    )
    return _render_template(
        request,
        "cliente/usuario_acesso_inicial.html",
        {
            "empresa": _empresa_usuario(banco, usuario),
            "usuario_alvo": usuario_publico,
            "credencial_onboarding": credencial_onboarding,
            "acesso_inicial_disponivel": credencial_onboarding is not None,
            "url_retorno_equipe": URL_EQUIPE,
        },
        status_code=status.HTTP_200_OK if credencial_onboarding is not None else status.HTTP_410_GONE,
    )


@roteador_cliente_management.delete("/api/usuarios/{usuario_id}", responses=RESPOSTAS_BLOQUEIO_CLIENTE)
async def api_excluir_usuario_cliente(
    usuario_id: int,
    request: Request,
    usuario: Usuario = Depends(exigir_admin_cliente),
    banco: Session = Depends(obter_banco),
):
    if not validar_csrf_cliente(request):
        raise HTTPException(status_code=403, detail="CSRF inválido.")
    _garantir_gestao_equipe_habilitada(usuario)

    alvo = _validar_usuario_operacional_cliente(
        banco,
        empresa_id=int(usuario.empresa_id),
        usuario_id=usuario_id,
    )
    nome_alvo = str(getattr(alvo, "nome", "") or getattr(alvo, "nome_completo", "") or f"Usuário #{usuario_id}").strip()

    try:
        removido = excluir_usuario_empresa(banco, int(usuario.empresa_id), usuario_id)
    except ValueError as exc:
        raise _traduzir_erro_servico_cliente(exc) from exc

    _registrar_auditoria_cliente_segura(
        banco,
        empresa_id=int(usuario.empresa_id),
        ator_usuario_id=int(usuario.id),
        acao="usuario_excluido",
        resumo=f"Usuário {nome_alvo} removido do portal.",
        detalhe="O cadastro operacional foi excluído definitivamente pelo admin-cliente.",
        payload={
            "usuario_id": _safe_int(removido.get("usuario_id")),
            "nome": str(removido.get("nome") or ""),
            "email": str(removido.get("email") or ""),
            "nivel_acesso": _safe_int(removido.get("nivel_acesso")),
        },
    )
    return JSONResponse({"success": True, "usuario_id": _safe_int(removido.get("usuario_id"))})
