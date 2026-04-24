"""Rotas Admin CEO para lifecycle/status do catálogo de laudos."""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.domains.admin.portal_support import (
    _redirect_err,
    _redirect_login,
    _redirect_ok,
    _validar_csrf,
    _verificar_acesso_admin,
)
from app.domains.admin.services import (
    buscar_catalogo_familia_admin,
    upsert_familia_catalogo,
    upsert_oferta_comercial_familia,
)
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html

logger = logging.getLogger("tariel.admin")

URL_CATALOGO_LAUDOS = "/admin/catalogo-laudos"


def registrar_rotas_catalogo_lifecycle_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
) -> None:
    @roteador.post("/catalogo-laudos/familias/{family_key}/technical-status")
    async def atualizar_status_tecnico_catalogo(
        request: Request,
        family_key: str,
        csrf_token: str = Form(default=""),
        technical_status: str = Form(...),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(URL_CATALOGO_LAUDOS, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            detalhe = buscar_catalogo_familia_admin(banco, family_key)
            if not detalhe:
                raise ValueError("Família não encontrada.")
            familia = detalhe["family_entity"]
            upsert_familia_catalogo(
                banco,
                family_key=str(familia.family_key),
                nome_exibicao=str(familia.nome_exibicao),
                macro_categoria=str(getattr(familia, "macro_categoria", "") or ""),
                nr_key=str(getattr(familia, "nr_key", "") or ""),
                descricao=str(getattr(familia, "descricao", "") or ""),
                status_catalogo="publicado"
                if str(technical_status).strip().lower() == "ready"
                else str(getattr(familia, "status_catalogo", "") or "rascunho"),
                technical_status=technical_status,
                catalog_classification=str(getattr(familia, "catalog_classification", "") or "family"),
                schema_version=int(getattr(familia, "schema_version", 1) or 1),
                evidence_policy_json_text=json.dumps(
                    getattr(familia, "evidence_policy_json", None), ensure_ascii=False
                )
                if getattr(familia, "evidence_policy_json", None) is not None
                else "",
                review_policy_json_text=json.dumps(
                    getattr(familia, "review_policy_json", None), ensure_ascii=False
                )
                if getattr(familia, "review_policy_json", None) is not None
                else "",
                output_schema_seed_json_text=json.dumps(
                    getattr(familia, "output_schema_seed_json", None), ensure_ascii=False
                )
                if getattr(familia, "output_schema_seed_json", None) is not None
                else "",
                governance_metadata_json_text=json.dumps(
                    getattr(familia, "governance_metadata_json", None), ensure_ascii=False
                )
                if getattr(familia, "governance_metadata_json", None) is not None
                else "",
                criado_por_id=usuario.id if usuario else None,
            )
            return _redirect_ok(URL_CATALOGO_LAUDOS, "Status técnico da família atualizado.")

        return executar_acao_admin_redirect(
            url_erro=URL_CATALOGO_LAUDOS,
            mensagem_log="Falha ao atualizar status técnico da família do catálogo",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )

    @roteador.post("/catalogo-laudos/familias/{family_key}/offer-lifecycle")
    async def atualizar_lifecycle_oferta_catalogo(
        request: Request,
        family_key: str,
        csrf_token: str = Form(default=""),
        lifecycle_status: str = Form(...),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(URL_CATALOGO_LAUDOS, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            detalhe = buscar_catalogo_familia_admin(banco, family_key)
            if not detalhe or not detalhe.get("offer"):
                raise ValueError("Oferta comercial não encontrada para a família.")
            oferta = detalhe["offer"]
            oferta_entity = getattr(detalhe["family_entity"], "oferta_comercial", None)
            upsert_oferta_comercial_familia(
                banco,
                family_key=family_key,
                offer_key=str(oferta.get("offer_key") or family_key),
                nome_oferta=str(oferta.get("offer_name") or ""),
                descricao_comercial=str(oferta.get("description") or ""),
                pacote_comercial=str(oferta.get("package_name") or ""),
                prazo_padrao_dias=str(getattr(oferta_entity, "prazo_padrao_dias", "") or ""),
                lifecycle_status=lifecycle_status,
                showcase_enabled=bool(oferta.get("showcase_enabled")),
                versao_oferta=int(getattr(oferta_entity, "versao_oferta", 1) or 1),
                material_real_status=str(getattr(oferta_entity, "material_real_status", "") or "sintetico"),
                material_level=str(getattr(oferta_entity, "material_level", "") or "synthetic"),
                escopo_comercial_text=json.dumps(list(oferta.get("scope_items") or []), ensure_ascii=False),
                exclusoes_text=json.dumps(list(oferta.get("exclusion_items") or []), ensure_ascii=False),
                insumos_minimos_text=json.dumps(list(oferta.get("minimum_inputs") or []), ensure_ascii=False),
                variantes_comerciais_text=json.dumps(list(oferta.get("variants") or []), ensure_ascii=False),
                template_default_code=str(oferta.get("template_default_code") or ""),
                criado_por_id=usuario.id if usuario else None,
            )
            return _redirect_ok(URL_CATALOGO_LAUDOS, "Lifecycle da oferta comercial atualizado.")

        return executar_acao_admin_redirect(
            url_erro=URL_CATALOGO_LAUDOS,
            mensagem_log="Falha ao atualizar lifecycle da oferta comercial",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )


__all__ = ["registrar_rotas_catalogo_lifecycle_cliente"]
