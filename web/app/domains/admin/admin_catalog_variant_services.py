from __future__ import annotations

from collections import Counter
from typing import Any


def build_variant_library_summary(
    *,
    family_key: str,
    offer: dict[str, Any] | None,
    artifact_snapshot: dict[str, bool],
    active_release_count: int,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    variants = list((offer or {}).get("variants") or [])
    operational_runtime_ready = bool(
        artifact_snapshot.get("has_template_seed") and artifact_snapshot.get("has_laudo_output_seed")
    )
    cards: list[dict[str, Any]] = []
    template_codes: set[str] = set()
    template_usage_counter: Counter[str] = Counter()
    for item in variants:
        template_code = str(item.get("template_code") or "").strip() or None
        if template_code:
            template_codes.add(template_code)
            template_usage_counter[template_code] += 1
        if template_code and operational_runtime_ready:
            status_key = "operational"
        elif template_code:
            status_key = "template_mapped"
        else:
            status_key = "needs_template"
        variant_key = str(item.get("variant_key") or "").strip() or "variant_sem_chave"
        cards.append(
            {
                "variant_key": variant_key,
                "label": str(item.get("nome_exibicao") or variant_key).strip() or variant_key,
                "template_code": template_code,
                "template_label": dependencies["catalogo_modelo_label"](
                    template_code,
                    fallback="Modelo em definição",
                ),
                "usage": str(item.get("uso_recomendado") or "").strip() or None,
                "selection_token": f"catalog:{str(family_key).strip().lower()}:{variant_key.lower()}",
                "status": dependencies["label_catalogo"](
                    dependencies["variant_library_status_labels"],
                    status_key,
                    dependencies["humanizar_slug"](status_key) or "Variante",
                ),
            }
        )
    ambiguous_template_count = sum(1 for count in template_usage_counter.values() if count > 1)
    return {
        "variant_count": len(cards),
        "template_mapped_count": sum(1 for item in cards if item["template_code"]),
        "operational_count": sum(1 for item in cards if item["status"]["key"] == "operational"),
        "unique_template_count": len(template_codes),
        "ambiguous_template_count": ambiguous_template_count,
        "selection_guidance": (
            "Escolha a opção de uso explicitamente quando duas opções compartilham a mesma apresentação do documento."
            if ambiguous_template_count
            else "Cada opção pode ter narrativa e uso recomendado próprios sem misturar a apresentação do documento."
        ),
        "variants": cards,
        "release_signal": (
            f"{active_release_count} empresa(s) já usam esta família."
            if active_release_count > 0
            else "Ainda sem empresas liberadas para esta família."
        ),
    }


def build_template_refinement_target(
    *,
    family_key: str,
    display_name: str,
    material_real_priority: dict[str, Any],
    variant_library: dict[str, Any],
    template_default_code: str | None,
    active_release_count: int,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    master_template_id = dependencies["resolve_master_template_id_for_family"](family_key)
    contract = dict(dependencies["master_template_registry"].get(master_template_id) or {})
    registry_entry = dependencies["template_library_registry_index"]().get(master_template_id)
    priority_key = str((material_real_priority.get("status") or {}).get("key") or "")
    if registry_entry is None:
        status_key = "registry_gap"
    elif priority_key in {"immediate", "active_queue"}:
        status_key = "refinement_due"
    elif priority_key == "resolved":
        status_key = "continuous"
    else:
        status_key = "mapped"

    recommended_actions: list[str] = []
    if status_key == "registry_gap":
        recommended_actions.extend(
            [
                "Registrar o modelo oficial desta família na biblioteca documental.",
                "Preparar a estrutura do documento e a saída base para abrir a vitrine comercial.",
            ]
        )
    else:
        recommended_actions.append(
            "Refinar o modelo oficial com os aprendizados do material real e da Mesa."
        )
        if int(variant_library.get("variant_count") or 0) > 0:
            recommended_actions.append(
                "Garantir que as opções comerciais herdem a mesma apresentação premium do documento."
            )
        if active_release_count > 0:
            recommended_actions.append(
                "Priorizar este ajuste porque já existe empresa operando a família."
            )
    template_default_label = dependencies["catalogo_modelo_label"](template_default_code)
    signals = [
        item
        for item in (
            f"{active_release_count} empresa(s) ativa(s)" if active_release_count > 0 else "",
            f"{int(variant_library.get('variant_count') or 0)} opção(ões) comercial(is)"
            if int(variant_library.get("variant_count") or 0) > 0
            else "",
            f"Modelo principal: {template_default_label}" if template_default_label else "",
        )
        if item
    ]
    resolved_label = str(contract.get("label") or "").strip() or (
        str(registry_entry.get("label") or "").strip() if registry_entry is not None else master_template_id
    )
    resolved_summary = str(contract.get("summary") or "").strip() or (
        str(registry_entry.get("usage") or "").strip() if registry_entry is not None else ""
    )
    resolved_documental_type = str(contract.get("documental_type") or "").strip() or (
        str(registry_entry.get("documental_type") or "").strip() if registry_entry is not None else ""
    )
    return {
        "master_template_id": master_template_id,
        "label": resolved_label,
        "summary": resolved_summary or None,
        "documental_type": resolved_documental_type or None,
        "artifact_path": str(
            ((registry_entry or {}).get("artifact_path") or contract.get("seed_path") or "")
        ).strip()
        or None,
        "registry_registered": registry_entry is not None,
        "registry_label": str(registry_entry.get("label") or "").strip() or None if registry_entry else None,
        "template_default_code": template_default_code,
        "template_default_label": template_default_label,
        "family_label": display_name,
        "signals": signals[:3],
        "recommended_actions": recommended_actions[:3],
        "status": dependencies["label_catalogo"](
            dependencies["template_refinement_status_labels"],
            status_key,
            dependencies["humanizar_slug"](status_key) or "Template",
        ),
    }
