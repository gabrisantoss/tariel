"""Rotas Admin CEO para exportacao diagnostica do tenant."""

from __future__ import annotations

import json
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.domains.admin.auditoria import (
    listar_auditoria_admin_empresa,
    serializar_registro_auditoria_admin,
)
from app.domains.admin.portal_support import (
    URL_CLIENTES,
    _redirect_err,
    _redirect_login,
    _verificar_acesso_admin,
)
from app.domains.admin.services import buscar_detalhe_cliente, get_tenant_exceptional_support_state
from app.domains.cliente.auditoria import listar_auditoria_empresa, serializar_registro_auditoria
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html
from app.v2.contracts.envelopes import utc_now


def _dict_payload(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def registrar_rotas_diagnostico_cliente(
    roteador: APIRouter,
    *,
    exigir_step_up_admin_ou_redirect: Callable[..., Any],
    empresa_cliente_existe_no_banco: Callable[[Session, int], bool],
    tenant_admin_visibility_policy_snapshot: Callable[..., dict[str, Any]],
) -> None:
    @roteador.get("/clientes/{empresa_id}/diagnostico")
    async def exportar_diagnostico_cliente_admin(
        request: Request,
        empresa_id: int,
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()
        step_up = exigir_step_up_admin_ou_redirect(
            request,
            return_to=f"{URL_CLIENTES}/{empresa_id}/diagnostico",
            mensagem="Reautenticação necessária para exportar o diagnóstico administrativo.",
        )
        if step_up is not None:
            return step_up

        dados = buscar_detalhe_cliente(banco, empresa_id)
        if not dados:
            mensagem = (
                "Não foi possível carregar os detalhes da empresa."
                if empresa_cliente_existe_no_banco(banco, empresa_id)
                else "Empresa não encontrada."
            )
            return _redirect_err(URL_CLIENTES, mensagem)

        empresa = dados["empresa"]
        usuarios = dados.get("usuarios") or []
        auditoria_admin = [
            serializar_registro_auditoria_admin(item)
            for item in listar_auditoria_admin_empresa(
                banco,
                empresa_id=empresa_id,
                limite=20,
            )
        ]
        auditoria_cliente = [
            serializar_registro_auditoria(item)
            for item in listar_auditoria_empresa(
                banco,
                empresa_id=empresa_id,
                limite=20,
            )
        ]
        suporte_excepcional = get_tenant_exceptional_support_state(banco, empresa_id=empresa_id)
        seguranca = _dict_payload(dados.get("seguranca"))
        payload = {
            "contract_name": "PlatformTenantOperationalDiagnosticV1",
            "generated_at": utc_now().isoformat(),
            "portal": "admin",
            "actor": {
                "usuario_id": int(usuario.id),
                "papel": "diretoria",
                "email": str(getattr(usuario, "email", "") or ""),
            },
            "tenant": {
                "id": int(empresa.id),
                "nome_fantasia": str(getattr(empresa, "nome_fantasia", "") or ""),
                "cnpj": str(getattr(empresa, "cnpj", "") or ""),
                "plano_ativo": str(getattr(empresa, "plano_ativo", "") or ""),
                "status_bloqueio": bool(getattr(empresa, "status_bloqueio", False)),
                "segmento": str(getattr(empresa, "segmento", "") or ""),
                "cidade_estado": str(getattr(empresa, "cidade_estado", "") or ""),
                "nome_responsavel": str(getattr(empresa, "nome_responsavel", "") or ""),
            },
            "resumo_operacional": {
                "total_usuarios": int(
                    (dados.get("resumo_operacional") or {}).get("usuarios_total", len(usuarios))
                ),
                "admins_cliente": int(
                    (dados.get("resumo_operacional") or {}).get(
                        "admins_total", len(dados.get("admins_cliente") or [])
                    )
                ),
                "inspetores": int(
                    (dados.get("resumo_operacional") or {}).get(
                        "inspetores_total", len(dados.get("inspetores") or [])
                    )
                ),
                "revisores": int(
                    (dados.get("resumo_operacional") or {}).get(
                        "revisores_total", len(dados.get("revisores") or [])
                    )
                ),
                "total_laudos": int(dados.get("total_laudos") or 0),
                "limite_plano": dados.get("limite_plano"),
                "uso_percentual": dados.get("uso_percentual"),
            },
            "status_operacional": {
                "status": (dados.get("status_admin") or {}).get("label"),
                "saude": (dados.get("saude_admin") or {}).get("label"),
                "saude_razao": (dados.get("saude_admin") or {}).get("razao"),
            },
            "seguranca": {
                "total_sessoes_ativas": int(
                    (dados.get("seguranca") or {}).get("total_sessoes_ativas", 0)
                ),
                "usuarios_com_sessao_ativa": int(
                    (dados.get("seguranca") or {}).get("usuarios_com_sessao_ativa", 0)
                ),
                "usuarios_bloqueados": int(
                    (dados.get("seguranca") or {}).get("usuarios_bloqueados", 0)
                ),
                "usuarios_troca_senha_pendente": int(
                    (dados.get("seguranca") or {}).get("usuarios_troca_senha_pendente", 0)
                ),
                "ultimo_acesso": (dados.get("seguranca") or {}).get("ultimo_acesso_label"),
            },
            "usuarios_administrativos": [
                {
                    "id": int(item.get("id") or 0),
                    "nome": str(item.get("nome_completo") or ""),
                    "email": str(item.get("email") or ""),
                    "perfil": str(item.get("role_label") or ""),
                    "ativo": bool(item.get("ativo")),
                    "senha_temporaria_ativa": bool(item.get("senha_temporaria_ativa")),
                }
                for item in (dados.get("admins_cliente") or [])
            ],
            "equipe_operacional_privada": {
                "inspetores_total": int(
                    (dados.get("resumo_operacional") or {}).get("inspetores_total", 0)
                ),
                "mesa_avaliadora_total": int(
                    (dados.get("resumo_operacional") or {}).get("revisores_total", 0)
                ),
                "gestao_direta_pelo_admin_ceo": False,
                "suporte_realizado_via_admin_cliente": True,
            },
            "sessoes_ativas": [
                {
                    "usuario_id": int(item.get("usuario_id") or 0),
                    "usuario_nome": str(item.get("usuario_nome") or ""),
                    "role": str(item.get("role_label") or ""),
                    "ultima_atividade": str(item.get("ultima_atividade_label") or ""),
                    "expira_em": str(item.get("expira_em_label") or ""),
                }
                for item in seguranca.get("sessoes_ativas", [])
            ],
            "falhas_recentes": [
                {
                    "acao": str(getattr(item, "acao", "") or ""),
                    "resumo": str(getattr(item, "resumo", "") or ""),
                    "criado_em": (
                        criado_em.isoformat()
                        if (criado_em := getattr(item, "criado_em", None)) is not None
                        else ""
                    ),
                }
                for item in (dados.get("falhas_recentes") or [])
            ],
            "auditoria_admin": auditoria_admin,
            "auditoria_cliente": auditoria_cliente,
            "visibility_policy": tenant_admin_visibility_policy_snapshot(banco),
            "support_exceptional": suporte_excepcional,
            "fronteiras": {
                "admin_scope": "cross_tenant_with_explicit_target",
                "tenant_scope": "company_scoped",
                "chat_scope": "company_scoped",
                "mesa_scope": "company_scoped",
            },
        }
        return Response(
            content=json.dumps(payload, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="tariel-admin-tenant-{int(empresa.id)}-diagnostico.json"'
                )
            },
        )


__all__ = ["registrar_rotas_diagnostico_cliente"]
