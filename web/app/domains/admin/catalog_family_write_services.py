"""Escrita e importação inicial de famílias do catálogo governado."""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.database import FamiliaLaudoCatalogo
from app.shared.db.models_base import agora_utc as _agora_utc


def upsert_familia_catalogo(
    db: Session,
    *,
    family_key: str,
    nome_exibicao: str,
    macro_categoria: str = "",
    nr_key: str = "",
    descricao: str = "",
    status_catalogo: str = "rascunho",
    technical_status: str = "",
    catalog_classification: str = "",
    schema_version: int = 1,
    evidence_policy_json_text: str = "",
    review_policy_json_text: str = "",
    output_schema_seed_json_text: str = "",
    governance_metadata_json_text: str = "",
    criado_por_id: int | None = None,
) -> FamiliaLaudoCatalogo:
    from app.domains.admin import services as admin_services

    family_key_norm = admin_services._normalizar_chave_catalogo(family_key, campo="Family key", max_len=120)
    nome_norm = admin_services._normalizar_texto_curto(nome_exibicao, campo="Nome de exibição", max_len=180)
    macro_norm = admin_services._normalizar_texto_opcional(macro_categoria, 80)
    nr_key_norm = admin_services._normalizar_nr_key(nr_key, family_key=family_key_norm)
    descricao_norm = admin_services._normalizar_texto_opcional(descricao)
    status_norm = admin_services._normalizar_status_catalogo_familia(status_catalogo)
    technical_status_norm = admin_services._normalizar_status_tecnico_catalogo(
        technical_status or ("ready" if status_norm == "publicado" else "deprecated" if status_norm == "arquivado" else "draft")
    )
    classification_norm = admin_services._normalizar_classificacao_catalogo(
        catalog_classification
        or admin_services._inferir_classificacao_catalogo(
            family_key=family_key_norm,
            nome_exibicao=nome_norm,
            macro_categoria=macro_norm or "",
        )
    )
    schema_version_int = max(1, int(schema_version or 1))

    familia = db.scalar(select(FamiliaLaudoCatalogo).where(FamiliaLaudoCatalogo.family_key == family_key_norm))
    if familia is None:
        familia = FamiliaLaudoCatalogo(
            family_key=family_key_norm,
            criado_por_id=criado_por_id,
        )
        db.add(familia)

    familia.nome_exibicao = nome_norm
    familia.macro_categoria = macro_norm
    familia.nr_key = nr_key_norm
    familia.descricao = descricao_norm
    familia.status_catalogo = status_norm
    familia.technical_status = technical_status_norm
    familia.catalog_classification = classification_norm
    familia.schema_version = schema_version_int
    familia.evidence_policy_json = admin_services._normalizar_json_opcional(
        evidence_policy_json_text,
        campo="Evidence policy",
    )
    familia.review_policy_json = admin_services._normalizar_json_opcional(
        review_policy_json_text,
        campo="Review policy",
    )
    familia.output_schema_seed_json = admin_services._normalizar_json_opcional(
        output_schema_seed_json_text,
        campo="Output schema seed",
    )
    familia.governance_metadata_json = admin_services._normalizar_json_opcional(
        governance_metadata_json_text,
        campo="Governance metadata",
    )
    familia.publicado_em = _agora_utc() if status_norm == "publicado" else None
    if criado_por_id and not familia.criado_por_id:
        familia.criado_por_id = criado_por_id

    admin_services._upsert_metodos_catalogo_para_familia(db, familia=familia, criado_por_id=criado_por_id)
    admin_services.flush_ou_rollback_integridade(
        db,
        logger_operacao=admin_services.logger,
        mensagem_erro="Não foi possível salvar a família do catálogo.",
    )
    return familia


def importar_familia_canonica_para_catalogo(
    db: Session,
    *,
    family_key: str,
    status_catalogo: str = "publicado",
    criado_por_id: int | None = None,
) -> FamiliaLaudoCatalogo:
    from app.domains.admin import services as admin_services

    schema = admin_services.carregar_family_schema_canonico(family_key)
    evidence_policy = schema.get("evidence_policy")
    review_policy = schema.get("review_policy")
    output_schema_seed = schema.get("output_schema_seed")

    return upsert_familia_catalogo(
        db,
        family_key=str(schema.get("family_key") or family_key),
        nome_exibicao=str(schema.get("nome_exibicao") or family_key),
        macro_categoria=str(schema.get("macro_categoria") or ""),
        descricao=str(schema.get("descricao") or ""),
        status_catalogo=status_catalogo,
        schema_version=int(schema.get("schema_version") or 1),
        evidence_policy_json_text=json.dumps(evidence_policy, ensure_ascii=False) if evidence_policy is not None else "",
        review_policy_json_text=json.dumps(review_policy, ensure_ascii=False) if review_policy is not None else "",
        output_schema_seed_json_text=(
            json.dumps(output_schema_seed, ensure_ascii=False) if output_schema_seed is not None else ""
        ),
        criado_por_id=criado_por_id,
    )


def importar_familias_canonicas_para_catalogo(
    db: Session,
    *,
    family_keys: list[str] | tuple[str, ...] | None = None,
    status_catalogo: str = "publicado",
    criado_por_id: int | None = None,
) -> list[FamiliaLaudoCatalogo]:
    from app.domains.admin import services as admin_services

    schemas = admin_services.listar_family_schemas_canonicos()
    family_keys_resolvidas = list(family_keys or [item["family_key"] for item in schemas])
    familias_importadas: list[FamiliaLaudoCatalogo] = []
    vistos: set[str] = set()
    for item in family_keys_resolvidas:
        family_key_norm = admin_services._normalizar_chave_catalogo(item, campo="Family key", max_len=120)
        if family_key_norm in vistos:
            continue
        vistos.add(family_key_norm)
        familias_importadas.append(
            importar_familia_canonica_para_catalogo(
                db,
                family_key=family_key_norm,
                status_catalogo=status_catalogo,
                criado_por_id=criado_por_id,
            )
        )
    return familias_importadas


__all__ = [
    "importar_familia_canonica_para_catalogo",
    "importar_familias_canonicas_para_catalogo",
    "upsert_familia_catalogo",
]
