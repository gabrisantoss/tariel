from __future__ import annotations

from typing import Any


def preview_section_status(
    *,
    chain_complete: bool,
    has_reference_pack: bool,
    calibration_key: str,
    dependencies: dict[str, Any],
) -> dict[str, str]:
    if chain_complete and has_reference_pack and calibration_key == "real_calibrated":
        status_key = "premium_ready"
    elif chain_complete and has_reference_pack:
        status_key = "reference_ready"
    elif chain_complete:
        status_key = "foundation"
    else:
        status_key = "bootstrap"
    return dependencies["label_catalogo"](
        dependencies["document_preview_status_labels"],
        status_key,
        dependencies["humanizar_slug"](status_key) or "Preview",
    )


def showcase_preview_status(*, chain_complete: bool, dependencies: dict[str, Any]) -> dict[str, str]:
    status_key = "demonstration_ready" if chain_complete else "building"
    return dependencies["label_catalogo"](
        dependencies["showcase_status_labels"],
        status_key,
        dependencies["humanizar_slug"](status_key) or "Preview",
    )


def material_preview_status(
    *,
    has_reference_pack: bool,
    calibration_key: str,
    dependencies: dict[str, Any],
) -> dict[str, str]:
    if calibration_key == "real_calibrated":
        status_key = "real_calibrated"
    elif has_reference_pack or calibration_key == "partial_real":
        status_key = "reference_ready"
    else:
        status_key = "none"
    return dependencies["label_catalogo"](
        dependencies["material_preview_status_labels"],
        status_key,
        dependencies["humanizar_slug"](status_key) or "Material",
    )


def document_preview_objective(
    *,
    row: dict[str, Any],
    family_schema: dict[str, Any] | None,
) -> dict[str, str]:
    nr_label = str(
        row.get("nr_key")
        or (family_schema or {}).get("macro_categoria")
        or row.get("macro_category")
        or ""
    ).strip().upper()
    family_name = str(
        row.get("display_name")
        or (family_schema or {}).get("nome_exibicao")
        or "este laudo"
    ).strip()
    objective_title = f"Objetivo da {nr_label}" if nr_label else "Objetivo do modelo"
    objective_summary = (
        f"Mostrar como o laudo de {family_name} chega pronto para receber evidencias, analise e conclusao final."
    )
    if nr_label:
        objective_summary = (
            f"Mostrar como o laudo de {family_name} atende o objetivo da {nr_label}, "
            "com estrutura pronta para receber evidencias, analise e conclusao final."
        )
    return {
        "title": objective_title,
        "summary": objective_summary,
    }


def build_document_preview_summary(
    *,
    row: dict[str, Any],
    artifact_snapshot: dict[str, bool],
    family_schema: dict[str, Any] | None,
    offer: dict[str, Any] | None,
    calibration: dict[str, Any],
    material_real_workspace: dict[str, Any] | None,
    family_methods: list[dict[str, Any]],
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    evidence_policy = family_schema.get("evidence_policy") if isinstance(family_schema, dict) else {}
    if not isinstance(evidence_policy, dict):
        evidence_policy = {}
    minimum_evidence = evidence_policy.get("minimum_evidence")
    if not isinstance(minimum_evidence, dict):
        minimum_evidence = {}
    required_slots_raw = evidence_policy.get("required_slots")
    optional_slots_raw = evidence_policy.get("optional_slots")
    required_slots = [
        {
            "slot_id": str(item.get("slot_id") or "").strip() or None,
            "label": str(item.get("label") or item.get("slot_id") or "").strip() or "Slot obrigatório",
            "purpose": str(item.get("purpose") or "").strip() or None,
        }
        for item in list(required_slots_raw or [])
        if isinstance(item, dict)
    ]
    optional_slots = [
        {
            "slot_id": str(item.get("slot_id") or "").strip() or None,
            "label": str(item.get("label") or item.get("slot_id") or "").strip() or "Slot opcional",
        }
        for item in list(optional_slots_raw or [])
        if isinstance(item, dict)
    ]
    chain_complete = all(
        bool(artifact_snapshot.get(key))
        for key in (
            "has_family_schema",
            "has_template_seed",
            "has_laudo_output_seed",
            "has_laudo_output_exemplo",
        )
    )
    has_reference_pack = bool(
        (material_real_workspace or {}).get("has_reference_manifest")
        and (material_real_workspace or {}).get("has_reference_bundle")
    )
    calibration_key = str((calibration.get("status") or {}).get("key") or "")
    preview_status = dependencies["preview_section_status"](
        chain_complete=chain_complete,
        has_reference_pack=has_reference_pack,
        calibration_key=calibration_key,
    )
    showcase_status = dependencies["showcase_preview_status"](chain_complete=chain_complete)
    material_status = dependencies["material_preview_status"](
        has_reference_pack=has_reference_pack,
        calibration_key=calibration_key,
    )
    objective = dependencies["document_preview_objective"](
        row=row,
        family_schema=family_schema,
    )
    scope_payload = family_schema.get("scope") if isinstance(family_schema, dict) else {}
    if not isinstance(scope_payload, dict):
        scope_payload = {}
    scope_signals = [
        str(item).strip()
        for item in list(scope_payload.get("scope_signals") or [])
        if str(item).strip()
    ]
    sections = [
        {
            "title": "Casca profissional",
            "status": dependencies["label_catalogo"](
                dependencies["document_preview_status_labels"],
                "foundation" if chain_complete else "bootstrap",
                "Casca documental",
            ),
            "bullets": [
                "Modelo oficial premium governado no catálogo.",
                "Estrutura documental preservada da base ao PDF final.",
                (
                    f"Modelo principal: {dependencies['catalogo_modelo_label']((offer or {}).get('template_default_code'), fallback='em definição')}."
                ),
            ],
        },
        {
            "title": "Metodologia e evidências",
            "status": dependencies["label_catalogo"](
                dependencies["document_preview_status_labels"],
                "reference_ready" if has_reference_pack else "foundation" if required_slots else "bootstrap",
                "Metodologia",
            ),
            "bullets": (
                [item["label"] for item in required_slots[:3]]
                or [item["display_name"] for item in family_methods[:3]]
                or ["Definir slots críticos de evidência."]
            ),
        },
        {
            "title": "Conclusão e emissão",
            "status": dependencies["label_catalogo"](
                dependencies["document_preview_status_labels"],
                (
                    "premium_ready"
                    if calibration_key == "real_calibrated"
                    else "reference_ready"
                    if has_reference_pack
                    else "foundation"
                ),
                "Emissão",
            ),
            "bullets": [
                "QR/hash público, anexo pack e emissão oficial transacional.",
                "Diff entre emissões e trilha de revisão por bloco.",
                "Responsaveis autorizados pela assinatura e pacote oficial exportavel.",
            ],
        },
    ]
    return {
        "status": preview_status,
        "showcase_status": showcase_status,
        "material_status": material_status,
        "title": str((offer or {}).get("offer_name") or row.get("display_name") or "Preview documental"),
        "subtitle": str((offer or {}).get("description") or "").strip()
        or str((family_schema or {}).get("descricao") or "").strip()
        or "Casca documental premium governada para esta família.",
        "objective": objective,
        "template_default_code": str((offer or {}).get("template_default_code") or "").strip() or None,
        "template_default_label": dependencies["catalogo_modelo_label"](
            str((offer or {}).get("template_default_code") or "").strip() or None
        ),
        "minimum_evidence": {
            "fotos": int(minimum_evidence.get("fotos") or 0),
            "documentos": int(minimum_evidence.get("documentos") or 0),
            "textos": int(minimum_evidence.get("textos") or 0),
        },
        "required_slots": required_slots[:6],
        "optional_slots": optional_slots[:5],
        "required_slot_count": len(required_slots),
        "optional_slot_count": len(optional_slots),
        "scope_signals": scope_signals[:4],
        "sections": sections,
        "premium_features": [
            "QR/hash público",
            "anexo pack oficial",
            "diff entre emissões",
            "responsaveis pela assinatura",
        ],
    }


def build_catalog_home_document_preview(
    *,
    family: Any,
    row: dict[str, Any],
    metodos_catalogo: list[Any],
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    family_key = str(getattr(family, "family_key", "") or row.get("family_key") or "").strip()
    artifact_snapshot = dict(row.get("artifact_snapshot") or dependencies["catalog_family_artifact_snapshot"](family_key))
    oferta = getattr(family, "oferta_comercial", None)
    material_real_workspace = dependencies["build_material_real_workspace_summary"](family_key)
    try:
        family_schema = dependencies["carregar_family_schema_canonico"](family_key)
    except ValueError:
        family_schema = None

    family_methods = [
        {
            "method_key": str(getattr(item, "method_key", "") or "").strip(),
            "display_name": str(getattr(item, "nome_exibicao", "") or "").strip(),
            "categoria": str(getattr(item, "categoria", "") or "").strip(),
        }
        for item in metodos_catalogo
        if str(getattr(item, "method_key", "") or "").strip() in family_key
    ]
    calibration_payload = {
        "status": dependencies["label_catalogo"](
            dependencies["calibration_status_labels"],
            dependencies["calibracao_status_resolvido"](family, oferta),
            "Sem calibracao",
        ),
    }
    preview = dependencies["build_document_preview_summary"](
        row=row,
        artifact_snapshot=artifact_snapshot,
        family_schema=family_schema,
        offer=(
            {
                "offer_name": str(getattr(oferta, "nome_oferta", "") or "").strip()
                or str(getattr(family, "nome_exibicao", "") or family_key),
                "description": str(getattr(oferta, "descricao_comercial", "") or "").strip() or None,
                "template_default_code": str(getattr(oferta, "template_default_code", "") or "").strip() or None,
            }
            if oferta is not None
            else None
        ),
        calibration=calibration_payload,
        material_real_workspace=material_real_workspace,
        family_methods=family_methods,
    )
    if preview["showcase_status"]["key"] == "demonstration_ready" and preview["material_status"]["key"] == "real_calibrated":
        preview_note = "Modelo demonstrativo pronto e ja calibrado com material real."
    elif preview["showcase_status"]["key"] == "demonstration_ready" and preview["material_status"]["key"] == "reference_ready":
        preview_note = "Modelo demonstrativo pronto e ja apoiado por base de referencia."
    elif preview["showcase_status"]["key"] == "demonstration_ready":
        preview_note = "Modelo demonstrativo pronto para vitrine. O laudo ja abre como documento antes do material real."
    elif bool(artifact_snapshot.get("has_laudo_output_seed")):
        preview_note = "Base do laudo pronta. Ainda falta fechar o modelo demonstrativo final."
    else:
        preview_note = "Estrutura em montagem antes do laudo-exemplo final."
    return {
        **preview,
        "preview_note": preview_note,
    }


def enrich_catalog_rows_with_document_preview(
    *,
    rows: list[dict[str, Any]],
    families: list[Any],
    metodos_catalogo: list[Any],
    dependencies: dict[str, Any],
) -> list[dict[str, Any]]:
    families_by_key = {
        str(getattr(item, "family_key", "") or "").strip().lower(): item
        for item in families
        if str(getattr(item, "family_key", "") or "").strip()
    }
    enriched_rows: list[dict[str, Any]] = []
    for row in rows:
        family_key = str(row.get("family_key") or "").strip().lower()
        family = families_by_key.get(family_key)
        if family is None:
            enriched_rows.append(row)
            continue
        enriched_rows.append(
            {
                **row,
                "document_preview": dependencies["build_catalog_home_document_preview"](
                    family=family,
                    row=row,
                    metodos_catalogo=metodos_catalogo,
                ),
            }
        )
    return enriched_rows
