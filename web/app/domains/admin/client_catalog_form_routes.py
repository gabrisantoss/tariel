"""Rotas Admin CEO para formulários de famílias do catálogo de laudos."""

from __future__ import annotations

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
    upsert_calibracao_familia,
    upsert_familia_catalogo,
    upsert_governanca_review_familia,
    upsert_modo_tecnico_familia,
    upsert_oferta_comercial_familia,
    upsert_tenant_family_release,
)
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html

logger = logging.getLogger("tariel.admin")

URL_CATALOGO_LAUDOS = "/admin/catalogo-laudos"
_CATALOGO_FAMILY_TABS = (
    "visao-geral",
    "schema-tecnico",
    "modos",
    "templates",
    "ofertas",
    "calibracao",
    "liberacao",
    "historico",
)


def _normalizar_catalogo_family_tab(tab: str | None) -> str:
    tab_norm = str(tab or "").strip().lower()
    return tab_norm if tab_norm in _CATALOGO_FAMILY_TABS else _CATALOGO_FAMILY_TABS[0]


def _catalogo_family_tab_url(family_key: str, tab: str | None) -> str:
    family_key_norm = str(family_key or "").strip()
    tab_norm = _normalizar_catalogo_family_tab(tab)
    return f"{URL_CATALOGO_LAUDOS}/familias/{family_key_norm}?tab={tab_norm}#{tab_norm}"


def _eh_true(valor: str) -> bool:
    return str(valor or "").strip().lower() in {"1", "true", "sim", "on", "ativo"}


def registrar_rotas_formularios_catalogo_cliente(
    roteador: APIRouter,
    *,
    executar_acao_admin_redirect,
) -> None:
    @roteador.post("/catalogo-laudos/familias")
    async def salvar_familia_catalogo(
        request: Request,
        csrf_token: str = Form(default=""),
        family_key: str = Form(...),
        nome_exibicao: str = Form(...),
        macro_categoria: str = Form(default=""),
        nr_key: str = Form(default=""),
        descricao: str = Form(default=""),
        status_catalogo: str = Form(default="rascunho"),
        technical_status: str = Form(default=""),
        catalog_classification: str = Form(default=""),
        schema_version: int = Form(default=1),
        evidence_policy_json: str = Form(default=""),
        review_policy_json: str = Form(default=""),
        output_schema_seed_json: str = Form(default=""),
        governance_metadata_json: str = Form(default=""),
        return_to: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(URL_CATALOGO_LAUDOS, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            familia = upsert_familia_catalogo(
                banco,
                family_key=family_key,
                nome_exibicao=nome_exibicao,
                macro_categoria=macro_categoria,
                nr_key=nr_key,
                descricao=descricao,
                status_catalogo=status_catalogo,
                technical_status=technical_status,
                catalog_classification=catalog_classification,
                schema_version=schema_version,
                evidence_policy_json_text=evidence_policy_json,
                review_policy_json_text=review_policy_json,
                output_schema_seed_json_text=output_schema_seed_json,
                governance_metadata_json_text=governance_metadata_json,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Catálogo de famílias atualizado | family_key=%s | admin_id=%s",
                familia.family_key,
                usuario.id if usuario else None,
            )
            url_retorno = return_to or f"{URL_CATALOGO_LAUDOS}/familias/{familia.family_key}"
            return _redirect_ok(
                url_retorno,
                f"Família {familia.family_key} salva no catálogo oficial.",
            )

        return executar_acao_admin_redirect(
            url_erro=URL_CATALOGO_LAUDOS,
            mensagem_log="Falha ao salvar família do catálogo",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )

    @roteador.post("/catalogo-laudos/familias/{family_key}/governanca-review")
    async def salvar_governanca_review_catalogo(
        request: Request,
        family_key: str,
        csrf_token: str = Form(default=""),
        default_review_mode: str = Form(default=""),
        max_review_mode: str = Form(default=""),
        requires_family_lock: str = Form(default=""),
        block_on_scope_mismatch: str = Form(default=""),
        block_on_missing_required_evidence: str = Form(default=""),
        block_on_critical_field_absent: str = Form(default=""),
        blocking_conditions: str = Form(default=""),
        non_blocking_conditions: str = Form(default=""),
        red_flags_json: str = Form(default=""),
        requires_release_active: str = Form(default=""),
        requires_upload_doc_for_mobile_autonomous: str = Form(default=""),
        mobile_review_allowed_plans: str = Form(default=""),
        mobile_autonomous_allowed_plans: str = Form(default=""),
        return_to: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()
        url_retorno = return_to or _catalogo_family_tab_url(family_key, "schema-tecnico")
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(url_retorno, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            familia = upsert_governanca_review_familia(
                banco,
                family_key=family_key,
                default_review_mode=default_review_mode,
                max_review_mode=max_review_mode,
                requires_family_lock=_eh_true(requires_family_lock),
                block_on_scope_mismatch=_eh_true(block_on_scope_mismatch),
                block_on_missing_required_evidence=_eh_true(block_on_missing_required_evidence),
                block_on_critical_field_absent=_eh_true(block_on_critical_field_absent),
                blocking_conditions_text=blocking_conditions,
                non_blocking_conditions_text=non_blocking_conditions,
                red_flags_json_text=red_flags_json,
                requires_release_active=_eh_true(requires_release_active),
                requires_upload_doc_for_mobile_autonomous=_eh_true(requires_upload_doc_for_mobile_autonomous),
                mobile_review_allowed_plans_text=mobile_review_allowed_plans,
                mobile_autonomous_allowed_plans_text=mobile_autonomous_allowed_plans,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Governança review da família atualizada | family_key=%s | admin_id=%s",
                familia.family_key,
                usuario.id if usuario else None,
            )
            return _redirect_ok(url_retorno, "Governança de revisão da família salva.")

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao salvar governança de revisão da família",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )

    @roteador.post("/catalogo-laudos/ofertas-comerciais")
    async def salvar_oferta_comercial_catalogo(
        request: Request,
        csrf_token: str = Form(default=""),
        family_key: str = Form(...),
        offer_key: str = Form(default=""),
        family_mode_key: str = Form(default=""),
        nome_oferta: str = Form(default=""),
        descricao_comercial: str = Form(default=""),
        pacote_comercial: str = Form(default=""),
        prazo_padrao_dias: str = Form(default=""),
        ativo_comercial: str = Form(default=""),
        lifecycle_status: str = Form(default=""),
        showcase_enabled: str = Form(default=""),
        versao_oferta: int = Form(default=1),
        material_real_status: str = Form(default="sintetico"),
        material_level: str = Form(default=""),
        release_channel: str = Form(default=""),
        bundle_key: str = Form(default=""),
        bundle_label: str = Form(default=""),
        bundle_summary: str = Form(default=""),
        bundle_audience: str = Form(default=""),
        bundle_highlights: str = Form(default=""),
        included_features: str = Form(default=""),
        entitlement_monthly_issues: str = Form(default=""),
        entitlement_max_admin_clients: str = Form(default=""),
        entitlement_max_inspectors: str = Form(default=""),
        entitlement_max_reviewers: str = Form(default=""),
        entitlement_max_active_variants: str = Form(default=""),
        entitlement_max_integrations: str = Form(default=""),
        escopo_comercial: str = Form(default=""),
        exclusoes: str = Form(default=""),
        insumos_minimos: str = Form(default=""),
        variantes_comerciais: str = Form(default=""),
        template_default_code: str = Form(default=""),
        flags_json: str = Form(default=""),
        return_to: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        if not _validar_csrf(request, csrf_token):
            return _redirect_err(URL_CATALOGO_LAUDOS, "Requisição inválida.")

        ativo_norm = _eh_true(ativo_comercial)
        showcase_norm = _eh_true(showcase_enabled)

        def _operacao() -> RedirectResponse:
            oferta = upsert_oferta_comercial_familia(
                banco,
                family_key=family_key,
                offer_key=offer_key,
                family_mode_key=family_mode_key,
                nome_oferta=nome_oferta,
                descricao_comercial=descricao_comercial,
                pacote_comercial=pacote_comercial,
                prazo_padrao_dias=prazo_padrao_dias,
                ativo_comercial=ativo_norm,
                lifecycle_status=lifecycle_status,
                showcase_enabled=showcase_norm,
                versao_oferta=versao_oferta,
                material_real_status=material_real_status,
                material_level=material_level,
                release_channel=release_channel,
                bundle_key=bundle_key,
                bundle_label=bundle_label,
                bundle_summary=bundle_summary,
                bundle_audience=bundle_audience,
                bundle_highlights_text=bundle_highlights,
                included_features_text=included_features,
                entitlement_monthly_issues=entitlement_monthly_issues,
                entitlement_max_admin_clients=entitlement_max_admin_clients,
                entitlement_max_inspectors=entitlement_max_inspectors,
                entitlement_max_reviewers=entitlement_max_reviewers,
                entitlement_max_active_variants=entitlement_max_active_variants,
                entitlement_max_integrations=entitlement_max_integrations,
                escopo_comercial_text=escopo_comercial,
                exclusoes_text=exclusoes,
                insumos_minimos_text=insumos_minimos,
                variantes_comerciais_text=variantes_comerciais,
                template_default_code=template_default_code,
                flags_json_text=flags_json,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Oferta comercial atualizada | family_key=%s | oferta_id=%s | admin_id=%s",
                family_key,
                oferta.id,
                usuario.id if usuario else None,
            )
            url_retorno = return_to or f"{URL_CATALOGO_LAUDOS}/familias/{family_key}#ofertas"
            return _redirect_ok(
                url_retorno,
                f"Oferta comercial da família {family_key} salva no catálogo.",
            )

        return executar_acao_admin_redirect(
            url_erro=URL_CATALOGO_LAUDOS,
            mensagem_log="Falha ao salvar oferta comercial do catálogo",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )

    @roteador.post("/catalogo-laudos/familias/{family_key}/modos")
    async def salvar_modo_tecnico_catalogo(
        request: Request,
        family_key: str,
        csrf_token: str = Form(default=""),
        mode_key: str = Form(...),
        nome_exibicao: str = Form(...),
        descricao: str = Form(default=""),
        regras_adicionais_json: str = Form(default=""),
        compatibilidade_template_json: str = Form(default=""),
        compatibilidade_oferta_json: str = Form(default=""),
        ativo: str = Form(default="on"),
        return_to: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()
        url_retorno = return_to or _catalogo_family_tab_url(family_key, "modos")
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(url_retorno, "Requisição inválida.")

        ativo_norm = _eh_true(ativo)

        def _operacao() -> RedirectResponse:
            modo = upsert_modo_tecnico_familia(
                banco,
                family_key=family_key,
                mode_key=mode_key,
                nome_exibicao=nome_exibicao,
                descricao=descricao,
                regras_adicionais_json_text=regras_adicionais_json,
                compatibilidade_template_json_text=compatibilidade_template_json,
                compatibilidade_oferta_json_text=compatibilidade_oferta_json,
                ativo=ativo_norm,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Modo técnico atualizado | family_key=%s | mode_key=%s | admin_id=%s",
                family_key,
                modo.mode_key,
                usuario.id if usuario else None,
            )
            return _redirect_ok(url_retorno, f"Modo técnico {modo.mode_key} salvo para a família.")

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao salvar modo técnico da família",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )

    @roteador.post("/catalogo-laudos/familias/{family_key}/calibracao")
    async def salvar_calibracao_catalogo(
        request: Request,
        family_key: str,
        csrf_token: str = Form(default=""),
        calibration_status: str = Form(...),
        reference_source: str = Form(default=""),
        summary_of_adjustments: str = Form(default=""),
        changed_fields_json: str = Form(default=""),
        changed_language_notes: str = Form(default=""),
        attachments_json: str = Form(default=""),
        return_to: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()
        url_retorno = return_to or _catalogo_family_tab_url(family_key, "calibracao")
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(url_retorno, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            calibracao = upsert_calibracao_familia(
                banco,
                family_key=family_key,
                calibration_status=calibration_status,
                reference_source=reference_source,
                summary_of_adjustments=summary_of_adjustments,
                changed_fields_json_text=changed_fields_json,
                changed_language_notes=changed_language_notes,
                attachments_json_text=attachments_json,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Calibração atualizada | family_key=%s | status=%s | admin_id=%s",
                family_key,
                calibracao.calibration_status,
                usuario.id if usuario else None,
            )
            return _redirect_ok(url_retorno, "Calibração da família salva.")

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao salvar calibração da família",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
        )

    @roteador.post("/catalogo-laudos/familias/{family_key}/liberacao-tenant")
    async def salvar_release_tenant_catalogo(
        request: Request,
        family_key: str,
        csrf_token: str = Form(default=""),
        tenant_id: int = Form(...),
        release_status: str = Form(default="draft"),
        allowed_modes: list[str] | None = Form(default=None),
        allowed_offers: list[str] | None = Form(default=None),
        allowed_templates: list[str] | None = Form(default=None),
        allowed_variants: list[str] | None = Form(default=None),
        force_review_mode: str = Form(default=""),
        max_review_mode: str = Form(default=""),
        mobile_review_override: str = Form(default=""),
        mobile_autonomous_override: str = Form(default=""),
        release_channel_override: str = Form(default=""),
        included_features: str = Form(default=""),
        entitlement_monthly_issues: str = Form(default=""),
        entitlement_max_admin_clients: str = Form(default=""),
        entitlement_max_inspectors: str = Form(default=""),
        entitlement_max_reviewers: str = Form(default=""),
        entitlement_max_active_variants: str = Form(default=""),
        entitlement_max_integrations: str = Form(default=""),
        default_template_code: str = Form(default=""),
        observacoes: str = Form(default=""),
        return_to: str = Form(default=""),
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()
        url_retorno = return_to or _catalogo_family_tab_url(family_key, "liberacao")
        if not _validar_csrf(request, csrf_token):
            return _redirect_err(url_retorno, "Requisição inválida.")

        def _operacao() -> RedirectResponse:
            registro = upsert_tenant_family_release(
                banco,
                tenant_id=int(tenant_id),
                family_key=family_key,
                release_status=release_status,
                allowed_modes=list(allowed_modes or []),
                allowed_offers=list(allowed_offers or []),
                allowed_templates=list(allowed_templates or []),
                allowed_variants=list(allowed_variants or []),
                force_review_mode=force_review_mode,
                max_review_mode=max_review_mode,
                mobile_review_override=mobile_review_override,
                mobile_autonomous_override=mobile_autonomous_override,
                release_channel_override=release_channel_override,
                included_features_text=included_features,
                entitlement_monthly_issues=entitlement_monthly_issues,
                entitlement_max_admin_clients=entitlement_max_admin_clients,
                entitlement_max_inspectors=entitlement_max_inspectors,
                entitlement_max_reviewers=entitlement_max_reviewers,
                entitlement_max_active_variants=entitlement_max_active_variants,
                entitlement_max_integrations=entitlement_max_integrations,
                default_template_code=default_template_code,
                observacoes=observacoes,
                criado_por_id=usuario.id if usuario else None,
            )
            logger.info(
                "Liberação por tenant atualizada | family_key=%s | tenant_id=%s | status=%s | admin_id=%s",
                family_key,
                tenant_id,
                registro.release_status,
                usuario.id if usuario else None,
            )
            return _redirect_ok(url_retorno, "Liberacao por empresa atualizada para a familia.")

        return executar_acao_admin_redirect(
            url_erro=url_retorno,
            mensagem_log="Falha ao salvar liberação por tenant da família",
            operacao=_operacao,
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
            tenant_id=tenant_id,
        )


__all__ = ["registrar_rotas_formularios_catalogo_cliente"]
