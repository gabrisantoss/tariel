"""Rotas Admin CEO para catalogo contratual do tenant."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import env_str
from app.domains.admin.auditoria import registrar_auditoria_admin_empresa_segura
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import (
    sincronizar_portfolio_catalogo_empresa,
    upsert_signatario_governado_laudo,
)
from app.shared.database import SignatarioGovernadoLaudo, Usuario, obter_banco
from app.shared.security import obter_usuario_html

logger = logging.getLogger("tariel.admin")
PASTA_EVIDENCIAS_HABILITACAO = Path(
    env_str(
        "PASTA_EVIDENCIAS_HABILITACAO_PROFISSIONAL",
        str(Path(tempfile.gettempdir()) / "tariel_control" / "habilitacao_profissional"),
    )
).expanduser()

_STATUS_REVISAO_HABILITACAO = {
    "pending": "Pendente",
    "in_review": "Em análise",
    "approved": "Aprovado",
    "rejected": "Reprovado",
    "suspended": "Suspenso",
}


def _normalizar_status_revisao_habilitacao(valor: str) -> str:
    status = str(valor or "").strip().lower().replace("-", "_")
    return status if status in _STATUS_REVISAO_HABILITACAO else ""


def _documentos_habilitacao_metadata(signatario: SignatarioGovernadoLaudo) -> list[dict]:
    metadata = signatario.governance_metadata_json if isinstance(signatario.governance_metadata_json, dict) else {}
    documentos = metadata.get("professional_documents")
    return [dict(item) for item in documentos if isinstance(item, dict)] if isinstance(documentos, list) else []


def _evidencia_habilitacao_por_id(
    signatario: SignatarioGovernadoLaudo,
    *,
    documento_id: str,
) -> dict | None:
    documento_id_norm = str(documento_id or "").strip()
    if not documento_id_norm:
        return None
    for item in _documentos_habilitacao_metadata(signatario):
        if str(item.get("id") or "").strip() == documento_id_norm:
            return item
    return None


def _tem_comprovacao_habilitacao(signatario: SignatarioGovernadoLaudo) -> bool:
    for item in _documentos_habilitacao_metadata(signatario):
        if not str(item.get("id") or "").strip():
            continue
        if not str(item.get("nome") or "").strip():
            continue
        caminho = _caminho_evidencia_habilitacao_seguro(str(item.get("storage_path") or ""))
        if caminho is not None:
            return True
    return False


def _caminho_evidencia_habilitacao_seguro(caminho: str) -> Path | None:
    valor = str(caminho or "").strip()
    if not valor:
        return None
    try:
        raiz = PASTA_EVIDENCIAS_HABILITACAO.resolve()
        arquivo = Path(valor).expanduser().resolve()
        if raiz != arquivo and raiz not in arquivo.parents:
            return None
    except Exception:
        return None
    return arquivo if arquivo.is_file() else None


def registrar_rotas_catalogo_tenant_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
) -> None:
    @roteador.post("/clientes/{empresa_id}/catalogo-laudos")
    async def sincronizar_catalogo_laudos_empresa_admin(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        catalog_variant: list[str] | None = Form(default=None),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(f"{URL_CLIENTES}/{empresa_id}", "Requisição inválida.")

        url_retorno = f"{URL_CLIENTES}/{empresa_id}"

        def _operacao() -> RedirectResponse:
            resultado = sincronizar_portfolio_catalogo_empresa(
                banco,
                empresa_id=int(empresa_id),
                selection_tokens=list(catalog_variant or []),
                admin_id=usuario.id if usuario else None,
            )
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=int(empresa_id),
                ator_usuario_id=usuario.id if usuario else None,
                acao="tenant_report_catalog_synced",
                resumo="Portfolio comercial de laudos sincronizado para a empresa.",
                detalhe=(
                    f"{int(resultado['selected_count'])} variantes ativas no catálogo operacional do cliente."
                ),
                payload={
                    "selected_count": int(resultado["selected_count"]),
                    "governed_mode": bool(resultado["governed_mode"]),
                    "activated": list(resultado["activated"]),
                    "reactivated": list(resultado["reactivated"]),
                    "deactivated": list(resultado["deactivated"]),
                },
            )
            return _redirect_ok(
                url_retorno,
                (
                    "Portfólio de laudos sincronizado."
                    if int(resultado["selected_count"]) > 0
                    else (
                        "Portfolio limpo. A empresa permanece governada pelo Admin-CEO, sem modelos liberados."
                        if bool(resultado.get("governed_mode"))
                        else "Portfolio limpo. A empresa voltou ao modo antigo, sem catalogo ativo."
                    )
                ),
            )

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao sincronizar portfólio de laudos do tenant",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            empresa_id=empresa_id,
        )

    @roteador.post("/clientes/{empresa_id}/signatarios-governados")
    async def salvar_signatario_governado_admin(
        request: Request,
        empresa_id: int,
        csrf_token: str = Form(default=""),
        signatario_id: int | None = Form(default=None),
        nome: str = Form(...),
        funcao: str = Form(...),
        registro_profissional: str = Form(default=""),
        valid_until: str = Form(default=""),
        approval_status: str = Form(default="in_review"),
        allowed_family_keys: list[str] | None = Form(default=None),
        observacoes: str = Form(default=""),
        ativo: str | None = Form(default=None),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        url_retorno = f"{URL_CLIENTES}/{empresa_id}"
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(url_retorno, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            status_habilitacao = _normalizar_status_revisao_habilitacao(approval_status)
            if status_habilitacao == "approved":
                if not signatario_id:
                    return _redirect_err(
                        url_retorno,
                        "Anexe pelo menos uma comprovação profissional antes de aprovar a habilitação.",
                    )
                signatario_atual = banco.scalar(
                    select(SignatarioGovernadoLaudo).where(
                        SignatarioGovernadoLaudo.id == int(signatario_id),
                        SignatarioGovernadoLaudo.tenant_id == int(empresa_id),
                    )
                )
                if signatario_atual is None:
                    return _redirect_err(url_retorno, "Habilitação profissional não encontrada para esta empresa.")
                if not _tem_comprovacao_habilitacao(signatario_atual):
                    return _redirect_err(
                        url_retorno,
                        "Anexe pelo menos uma comprovação profissional antes de aprovar a habilitação.",
                    )
            registro = upsert_signatario_governado_laudo(
                banco,
                tenant_id=int(empresa_id),
                signatario_id=signatario_id,
                nome=nome,
                funcao=funcao,
                registro_profissional=registro_profissional,
                valid_until=valid_until,
                approval_status=approval_status,
                allowed_family_keys=list(allowed_family_keys or []),
                observacoes=observacoes,
                ativo=ativo is not None,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Signatário governado salvo | tenant_id=%s | signatario_id=%s | admin_id=%s",
                empresa_id,
                registro.id,
                usuario.id if usuario else None,
            )
            return _redirect_ok(url_retorno, "Responsavel pela assinatura salvo para a empresa.")

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao salvar signatário governado do tenant",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            empresa_id=empresa_id,
            signatario_id=signatario_id,
        )

    @roteador.get("/clientes/{empresa_id}/signatarios-governados/{signatario_id}/evidencias/{documento_id}")
    async def baixar_evidencia_habilitacao_profissional_admin(
        empresa_id: int,
        signatario_id: int,
        documento_id: str,
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        signatario = banco.scalar(
            select(SignatarioGovernadoLaudo).where(
                SignatarioGovernadoLaudo.id == int(signatario_id),
                SignatarioGovernadoLaudo.tenant_id == int(empresa_id),
            )
        )
        if signatario is None:
            raise HTTPException(status_code=404, detail="Habilitação profissional não encontrada.")
        documento = _evidencia_habilitacao_por_id(signatario, documento_id=documento_id)
        if documento is None:
            raise HTTPException(status_code=404, detail="Comprovação profissional não encontrada.")
        caminho = _caminho_evidencia_habilitacao_seguro(str(documento.get("storage_path") or ""))
        if caminho is None:
            raise HTTPException(status_code=404, detail="Arquivo de comprovação indisponível.")
        return FileResponse(
            str(caminho),
            media_type=str(documento.get("mime_type") or "application/octet-stream"),
            filename=str(documento.get("nome") or caminho.name),
        )

    @roteador.post("/clientes/{empresa_id}/signatarios-governados/{signatario_id}/revisao")
    async def revisar_habilitacao_profissional_admin(
        request: Request,
        empresa_id: int,
        signatario_id: int,
        csrf_token: str = Form(default=""),
        approval_status: str = Form(...),
        valid_until: str = Form(default=""),
        allowed_family_keys: list[str] | None = Form(default=None),
        observacoes: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        url_retorno = f"{URL_CLIENTES}/{empresa_id}"
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(url_retorno, "Requisição inválida.")

        status_habilitacao = _normalizar_status_revisao_habilitacao(approval_status)
        if not status_habilitacao:
            return _redirect_err(url_retorno, "Status de habilitação inválido.")

        def _operacao() -> RedirectResponse:
            signatario = banco.scalar(
                select(SignatarioGovernadoLaudo).where(
                    SignatarioGovernadoLaudo.id == int(signatario_id),
                    SignatarioGovernadoLaudo.tenant_id == int(empresa_id),
                )
            )
            if signatario is None:
                return _redirect_err(url_retorno, "Habilitação profissional não encontrada para esta empresa.")

            if status_habilitacao == "approved" and not _tem_comprovacao_habilitacao(signatario):
                return _redirect_err(
                    url_retorno,
                    "Anexe pelo menos uma comprovação profissional antes de aprovar a habilitação.",
                )

            metadata_anterior = (
                dict(signatario.governance_metadata_json)
                if isinstance(signatario.governance_metadata_json, dict)
                else {}
            )
            status_anterior = _normalizar_status_revisao_habilitacao(
                str(
                    metadata_anterior.get("professional_approval_status")
                    or metadata_anterior.get("approval_status")
                    or "approved"
                )
            ) or "approved"
            registro = upsert_signatario_governado_laudo(
                banco,
                tenant_id=int(empresa_id),
                signatario_id=int(signatario_id),
                nome=str(signatario.nome or ""),
                funcao=str(signatario.funcao or ""),
                registro_profissional=str(signatario.registro_profissional or ""),
                valid_until=valid_until if status_habilitacao == "approved" else signatario.valid_until,
                approval_status=status_habilitacao,
                allowed_family_keys=(
                    list(allowed_family_keys or [])
                    if status_habilitacao == "approved"
                    else list(signatario.allowed_family_keys_json or [])
                ),
                observacoes=str(observacoes or "").strip() or str(signatario.observacoes or ""),
                ativo=(
                    True
                    if status_habilitacao == "approved"
                    else bool(signatario.ativo) if status_habilitacao in {"pending", "in_review"} else False
                ),
                criado_por_id=usuario.id if usuario else None,
            )
            registrar_auditoria_admin_empresa_segura(
                banco,
                empresa_id=int(empresa_id),
                ator_usuario_id=usuario.id if usuario else None,
                acao="tenant_professional_habilitation_reviewed",
                resumo=f"Habilitação profissional revisada para {registro.nome}.",
                detalhe=(
                    "Status alterado de "
                    f"{_STATUS_REVISAO_HABILITACAO.get(status_anterior, status_anterior)} para "
                    f"{_STATUS_REVISAO_HABILITACAO[status_habilitacao]}."
                ),
                payload={
                    "signatario_id": int(registro.id),
                    "status_anterior": status_anterior,
                    "status_novo": status_habilitacao,
                    "origem": metadata_anterior.get("professional_approval_source") or "",
                    "allowed_family_keys": list(registro.allowed_family_keys_json or []),
                },
            )
            logger.info(
                "Revisão de habilitação profissional registrada | tenant_id=%s | signatario_id=%s | status=%s | admin_id=%s",
                empresa_id,
                registro.id,
                status_habilitacao,
                usuario.id if usuario else None,
            )
            return _redirect_ok(url_retorno, "Revisão de habilitação profissional registrada.")

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao revisar habilitação profissional do tenant",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            empresa_id=empresa_id,
            signatario_id=signatario_id,
        )


__all__ = ["registrar_rotas_catalogo_tenant_cliente"]
