"""Serviços de sincronização do catálogo canônico do Admin-CEO."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.database import FamiliaLaudoCatalogo, Usuario


def _listar_family_keys_canonicas_family() -> list[str]:
    from app.domains.admin.services import listar_family_schemas_canonicos

    family_keys: list[str] = []
    vistos: set[str] = set()
    for item in listar_family_schemas_canonicos():
        if str(item.get("catalog_classification") or "family").strip().lower() != "family":
            continue
        family_key = str(item.get("family_key") or "").strip().lower()
        if not family_key or family_key in vistos:
            continue
        vistos.add(family_key)
        family_keys.append(family_key)
    return family_keys


def _resolver_admin_owner_id_catalogo(db: Session) -> int | None:
    admin_owner_id = db.scalar(
        select(Usuario.id)
        .where(
            Usuario.portal_admin_autorizado.is_(True),
            Usuario.account_scope == "platform",
        )
        .order_by(Usuario.id.asc())
        .limit(1)
    )
    return int(admin_owner_id) if admin_owner_id else None


def sincronizar_catalogo_canonico(
    db: Session,
    *,
    status_catalogo: str = "publicado",
    criado_por_id: int | None = None,
) -> dict[str, Any]:
    from app.domains.admin.services import importar_familias_canonicas_para_catalogo

    family_keys_canonicas = _listar_family_keys_canonicas_family()
    if not family_keys_canonicas:
        return {
            "candidate_family_keys": [],
            "existing_family_keys": [],
            "missing_family_keys": [],
            "imported_families": [],
            "imported_count": 0,
            "existing_count": 0,
        }

    family_keys_existentes = {
        str(item).strip().lower()
        for item in db.scalars(
            select(FamiliaLaudoCatalogo.family_key).where(
                FamiliaLaudoCatalogo.catalog_classification == "family"
            )
        ).all()
        if str(item).strip()
    }
    faltantes = [item for item in family_keys_canonicas if item not in family_keys_existentes]
    autor_id = criado_por_id if criado_por_id is not None else _resolver_admin_owner_id_catalogo(db)

    familias_importadas = (
        importar_familias_canonicas_para_catalogo(
            db,
            family_keys=faltantes,
            status_catalogo=status_catalogo,
            criado_por_id=autor_id,
        )
        if faltantes
        else []
    )
    return {
        "candidate_family_keys": family_keys_canonicas,
        "existing_family_keys": sorted(family_keys_existentes),
        "missing_family_keys": faltantes,
        "imported_families": familias_importadas,
        "imported_count": len(familias_importadas),
        "existing_count": len(family_keys_existentes),
    }


__all__ = [
    "sincronizar_catalogo_canonico",
]
