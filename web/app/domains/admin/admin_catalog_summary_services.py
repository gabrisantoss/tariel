from __future__ import annotations

from typing import Any


def calibracao_status_resolvido(familia, oferta, *, dependencies: dict[str, Any]) -> str:
    calibracao = getattr(familia, "calibracao", None)
    if calibracao is not None and str(getattr(calibracao, "calibration_status", "") or "").strip():
        return str(calibracao.calibration_status)
    material_status = str(getattr(oferta, "material_level", "") or "").strip().lower()
    if material_status == "real_calibrated":
        return "real_calibrated"
    if material_status == "partial":
        return "partial_real"
    if material_status == "synthetic":
        return "synthetic_only"
    material_status_legacy = str(getattr(oferta, "material_real_status", "") or "").strip().lower()
    if material_status_legacy == "calibrado":
        return "real_calibrated"
    if material_status_legacy == "parcial":
        return "partial_real"
    if material_status_legacy == "sintetico":
        return "synthetic_only"
    return "none"


def offer_lifecycle_resolvido(oferta) -> str | None:
    if oferta is None:
        return None
    lifecycle = str(getattr(oferta, "lifecycle_status", "") or "").strip().lower()
    if lifecycle:
        return lifecycle
    return "active" if bool(getattr(oferta, "ativo_comercial", False)) else "draft"


def total_releases_ativas_familia(familia) -> int:
    total = 0
    for item in list(getattr(familia, "tenant_releases", None) or []):
        if str(getattr(item, "release_status", "") or "").strip().lower() == "active":
            total += 1
    return total


def derivar_prontidao_catalogo(
    *,
    technical_status: str,
    has_template_seed: bool,
    has_laudo_output_seed: bool,
    offer_lifecycle_status: str | None,
    calibration_status: str,
    active_release_count: int,
) -> str:
    tecnico_pronto = str(technical_status or "").strip().lower() == "ready"
    possui_template = bool(has_template_seed or has_laudo_output_seed)
    oferta_ativa = str(offer_lifecycle_status or "").strip().lower() == "active"
    calibracao = str(calibration_status or "").strip().lower()

    if not tecnico_pronto or not possui_template:
        return "technical_only"
    if not oferta_ativa:
        return "technical_only"
    if active_release_count <= 0:
        return "partial"
    if calibracao == "real_calibrated":
        return "calibrated"
    if calibracao in {"partial_real", "synthetic_only"}:
        return "sellable"
    return "partial"


def catalog_plan_distribution_summary(familia, *, dependencies: dict[str, Any]) -> dict[str, Any]:
    review_summary = dependencies["resumir_governanca_review_policy"](
        getattr(familia, "review_policy_json", None)
    )
    tenant_entitlements = dict(review_summary.get("tenant_entitlements") or {})
    review_plans = {
        str(item).strip()
        for item in list(tenant_entitlements.get("mobile_review_allowed_plans") or [])
        if str(item).strip()
    }
    autonomy_plans = {
        str(item).strip()
        for item in list(tenant_entitlements.get("mobile_autonomous_allowed_plans") or [])
        if str(item).strip()
    }
    has_explicit_plan_rules = bool(review_plans or autonomy_plans)
    requires_release_active = bool(tenant_entitlements.get("requires_release_active"))
    items: list[dict[str, Any]] = []
    enabled_count = 0

    for plan_name in dependencies["plano_empresa"].valores():
        showroom_label = dependencies["catalog_showroom_plan_label"](plan_name)
        enabled = (
            plan_name in review_plans or plan_name in autonomy_plans
            if has_explicit_plan_rules
            else True
        )
        access_level = "full" if plan_name in autonomy_plans else "enabled" if enabled else "disabled"
        items.append(
            {
                "key": dependencies["normalizar_chave_catalogo"](plan_name, campo="Plano", max_len=40),
                "label": showroom_label["label"],
                "short_label": showroom_label["short_label"],
                "support_label": showroom_label["support_label"],
                "enabled": bool(enabled),
                "access_level": access_level,
            }
        )
        enabled_count += int(enabled)

    total = len(items)
    if enabled_count == total and total > 0:
        summary_label = "Todas as assinaturas"
    elif enabled_count <= 0:
        summary_label = "Sem assinatura liberada"
    else:
        summary_label = "Distribuicao seletiva"

    enabled_labels = [str(item["short_label"]) for item in items if item["enabled"]]

    summary_hint = (
        "Assinatura compativel e liberacao ativa."
        if requires_release_active
        else "Disponibilidade comercial exibida na vitrine."
    )
    if not has_explicit_plan_rules:
        summary_hint = "Liberado para qualquer assinatura ativa."

    return {
        "enabled_count": int(enabled_count),
        "total_count": int(total),
        "summary_label": summary_label,
        "summary_hint": summary_hint,
        "enabled_labels_text": dependencies["catalog_human_join"](enabled_labels),
        "requires_release_active": requires_release_active,
        "has_explicit_plan_rules": has_explicit_plan_rules,
        "items": items,
    }


def catalog_row_matches_filters(
    row: dict[str, Any],
    *,
    filtro_macro_categoria: str = "",
    filtro_status_tecnico: str = "",
    filtro_prontidao: str = "",
    filtro_status_comercial: str = "",
    filtro_calibracao: str = "",
    filtro_liberacao: str = "",
    filtro_template_default: str = "",
    filtro_oferta_ativa: str = "",
    filtro_mode: str = "",
    dependencies: dict[str, Any],
) -> bool:
    if filtro_macro_categoria:
        if str(row["macro_category"]).strip().lower() != str(filtro_macro_categoria).strip().lower():
            return False
    if filtro_status_tecnico:
        if str((row["technical_status"] or {}).get("key") or "") != dependencies["normalizar_status_tecnico_catalogo"](filtro_status_tecnico):
            return False
    if filtro_prontidao:
        if str((row["readiness"] or {}).get("key") or "") != str(filtro_prontidao).strip().lower():
            return False
    if filtro_status_comercial:
        comparado = str((row["commercial_status"] or {}).get("key") or "")
        desejado = str(filtro_status_comercial).strip().lower()
        if desejado == "none":
            if comparado != "none":
                return False
        elif comparado != dependencies["normalizar_lifecycle_status_oferta"](desejado):
            return False
    if filtro_calibracao:
        if str((row["calibration_status"] or {}).get("key") or "") != dependencies["normalizar_status_calibracao_catalogo"](filtro_calibracao):
            return False
    if filtro_liberacao:
        desejado = str(filtro_liberacao).strip().lower()
        ativos = int(row["active_release_count"])
        if desejado == "active" and ativos <= 0:
            return False
        if desejado == "none" and ativos > 0:
            return False
    if filtro_template_default:
        desejado = str(filtro_template_default).strip().lower()
        template_default = str(row.get("template_default_code") or "").strip().lower()
        if desejado == "configured" and not (template_default or row["artifact_snapshot"]["has_template_seed"]):
            return False
        if desejado == "unconfigured" and (template_default or row["artifact_snapshot"]["has_template_seed"]):
            return False
        if desejado not in {"configured", "unconfigured"} and template_default != desejado:
            return False
    if filtro_oferta_ativa:
        desejado = str(filtro_oferta_ativa).strip().lower()
        ativa = str((row["commercial_status"] or {}).get("key") or "") == "active"
        if desejado == "true" and not ativa:
            return False
        if desejado == "false" and ativa:
            return False
    if filtro_mode:
        desejado = str(filtro_mode).strip().lower()
        modos = [str(item.get("mode_key") or "").strip().lower() for item in row["modes"]]
        if desejado == "available" and not modos:
            return False
        if desejado not in {"available", ""} and desejado not in modos:
            return False
    return True
