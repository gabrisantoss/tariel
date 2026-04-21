"""Escrita de ofertas comerciais do catálogo governado."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.database import ModoTecnicoFamiliaLaudo, OfertaComercialFamiliaLaudo
from app.shared.db.models_base import agora_utc as _agora_utc


def upsert_oferta_comercial_familia(
    db: Session,
    *,
    family_key: str,
    offer_key: str = "",
    family_mode_key: str = "",
    nome_oferta: str = "",
    descricao_comercial: str = "",
    pacote_comercial: str = "",
    prazo_padrao_dias: int | str | None = None,
    ativo_comercial: bool = False,
    lifecycle_status: str = "",
    showcase_enabled: bool | None = None,
    versao_oferta: int = 1,
    material_real_status: str = "sintetico",
    material_level: str = "",
    escopo_comercial_text: str = "",
    exclusoes_text: str = "",
    insumos_minimos_text: str = "",
    variantes_comerciais_text: str = "",
    release_channel: str = "",
    bundle_key: str = "",
    bundle_label: str = "",
    bundle_summary: str = "",
    bundle_audience: str = "",
    bundle_highlights_text: str = "",
    included_features_text: str = "",
    entitlement_monthly_issues: int | str | None = None,
    entitlement_max_admin_clients: int | str | None = None,
    entitlement_max_inspectors: int | str | None = None,
    entitlement_max_reviewers: int | str | None = None,
    entitlement_max_active_variants: int | str | None = None,
    entitlement_max_integrations: int | str | None = None,
    template_default_code: str = "",
    flags_json_text: str = "",
    criado_por_id: int | None = None,
) -> OfertaComercialFamiliaLaudo:
    from app.domains.admin import services as admin_services

    familia = admin_services._buscar_familia_catalogo_por_chave(db, family_key)
    mode_key_norm = (
        admin_services._normalizar_chave_catalogo(family_mode_key, campo="Modo técnico", max_len=80)
        if family_mode_key
        else ""
    )
    modo = None
    if mode_key_norm:
        modo = db.scalar(
            select(ModoTecnicoFamiliaLaudo).where(
                ModoTecnicoFamiliaLaudo.family_id == familia.id,
                ModoTecnicoFamiliaLaudo.mode_key == mode_key_norm,
            )
        )
        if modo is None:
            raise ValueError("Modo técnico não encontrado para a família.")
    oferta = db.scalar(
        select(OfertaComercialFamiliaLaudo).where(OfertaComercialFamiliaLaudo.family_id == familia.id)
    )
    if oferta is None:
        oferta = OfertaComercialFamiliaLaudo(
            family_id=int(familia.id),
            criado_por_id=criado_por_id,
        )
        db.add(oferta)

    prazo_norm: int | None
    if prazo_padrao_dias in (None, ""):
        prazo_norm = None
    else:
        prazo_norm = int(prazo_padrao_dias) if isinstance(prazo_padrao_dias, (int, str)) else None
        if prazo_norm is not None and prazo_norm < 0:
            raise ValueError("Prazo padrão precisa ser zero ou positivo.")

    lifecycle_norm = admin_services._normalizar_lifecycle_status_oferta(
        lifecycle_status or ("active" if bool(ativo_comercial) else "draft")
    )
    material_real_norm = admin_services._normalizar_status_material_real_oferta(material_real_status)
    material_level_norm = admin_services._normalizar_material_level_catalogo(
        material_level
        or (
            "real_calibrated"
            if material_real_norm == "calibrado"
            else "partial"
            if material_real_norm == "parcial"
            else "synthetic"
        )
    )
    offer_key_norm = admin_services._normalizar_chave_catalogo(
        offer_key or family_key,
        campo="Offer key",
        max_len=120,
    )

    oferta.nome_oferta = admin_services._normalizar_texto_curto(
        nome_oferta or str(familia.nome_exibicao or familia.family_key),
        campo="Nome da oferta",
        max_len=180,
    )
    oferta.offer_key = offer_key_norm
    oferta.family_mode_id = int(modo.id) if modo is not None else None
    oferta.descricao_comercial = admin_services._normalizar_texto_opcional(descricao_comercial)
    oferta.pacote_comercial = admin_services._normalizar_texto_opcional(pacote_comercial, 80)
    oferta.prazo_padrao_dias = prazo_norm
    oferta.ativo_comercial = lifecycle_norm == "active"
    oferta.lifecycle_status = lifecycle_norm
    oferta.showcase_enabled = bool(
        showcase_enabled if showcase_enabled is not None else lifecycle_norm in {"active", "testing"}
    )
    oferta.versao_oferta = max(1, int(versao_oferta or 1))
    oferta.material_real_status = material_real_norm
    oferta.material_level = material_level_norm
    oferta.escopo_json = admin_services._normalizar_lista_textual(
        escopo_comercial_text,
        campo="Escopo comercial",
    )
    oferta.exclusoes_json = admin_services._normalizar_lista_textual(exclusoes_text, campo="Exclusões")
    oferta.insumos_minimos_json = admin_services._normalizar_lista_textual(
        insumos_minimos_text,
        campo="Insumos mínimos",
    )
    oferta.variantes_json = admin_services._normalizar_variantes_comerciais(variantes_comerciais_text)
    oferta.template_default_code = (
        admin_services._normalizar_chave_catalogo(template_default_code, campo="Template default", max_len=120)
        if str(template_default_code or "").strip()
        else None
    )
    flags_payload = admin_services._normalizar_json_opcional(flags_json_text, campo="Flags da oferta")
    oferta.flags_json = admin_services.merge_offer_commercial_flags(
        flags_payload,
        release_channel=admin_services._normalizar_release_channel_catalogo(
            release_channel,
            campo="Release channel da oferta",
        ),
        commercial_bundle=admin_services._normalizar_bundle_comercial_payload(
            bundle_key=bundle_key,
            bundle_label=bundle_label,
            bundle_summary=bundle_summary,
            bundle_audience=bundle_audience,
            bundle_highlights_text=bundle_highlights_text,
        ),
        contract_entitlements=admin_services._normalizar_contract_entitlements_payload(
            included_features_text=included_features_text,
            monthly_issues=entitlement_monthly_issues,
            max_admin_clients=entitlement_max_admin_clients,
            max_inspectors=entitlement_max_inspectors,
            max_reviewers=entitlement_max_reviewers,
            max_active_variants=entitlement_max_active_variants,
            max_integrations=entitlement_max_integrations,
        ),
    )
    oferta.publicado_em = _agora_utc() if oferta.lifecycle_status == "active" else None
    if criado_por_id and not oferta.criado_por_id:
        oferta.criado_por_id = criado_por_id

    admin_services.flush_ou_rollback_integridade(
        db,
        logger_operacao=admin_services.logger,
        mensagem_erro="Não foi possível salvar a oferta comercial da família.",
    )
    return oferta


__all__ = ["upsert_oferta_comercial_familia"]
