from __future__ import annotations
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.admin import catalog_canonical_schema_services as _catalog_canonical_schema_services
from app.shared.database import FamiliaLaudoCatalogo, MetodoCatalogoInspecao


def _repo_root_dir() -> Path:
    return _catalog_canonical_schema_services._repo_root_dir()


def _family_schemas_dir() -> Path:
    from app.domains.admin import services as admin_services

    candidate = (admin_services._repo_root_dir() / "docs" / "family_schemas").resolve()
    if candidate.is_dir():
        return candidate
    return _catalog_canonical_schema_services.family_schemas_dir()


def _family_schema_file_path(family_key: str) -> Path:
    from app.domains.admin import services as admin_services

    return _catalog_canonical_schema_services.family_schema_file_path(
        family_key,
        directory=admin_services._family_schemas_dir(),
        normalize_family_key=admin_services._normalizar_chave_catalogo,
    )


def _family_artifact_file_path(family_key: str, artifact_suffix: str) -> Path:
    from app.domains.admin import services as admin_services

    return _catalog_canonical_schema_services.family_artifact_file_path(
        family_key,
        artifact_suffix,
        directory=admin_services._family_schemas_dir(),
        normalize_family_key=admin_services._normalizar_chave_catalogo,
    )


def _ler_json_arquivo(path: Path, *, campo: str) -> dict[str, Any]:
    return _catalog_canonical_schema_services._read_json_file(path, field_name=campo)


def listar_family_schemas_canonicos() -> list[dict[str, Any]]:
    from app.domains.admin import services as admin_services

    return _catalog_canonical_schema_services.list_canonical_family_schemas(
        directory=admin_services._family_schemas_dir(),
        normalize_family_key=admin_services._normalizar_chave_catalogo,
        infer_catalog_classification=admin_services._inferir_classificacao_catalogo,
    )


def carregar_family_schema_canonico(family_key: str) -> dict[str, Any]:
    from app.domains.admin import services as admin_services

    return _catalog_canonical_schema_services.load_canonical_family_schema(
        family_key,
        directory=admin_services._family_schemas_dir(),
        normalize_family_key=admin_services._normalizar_chave_catalogo,
    )


def _buscar_familia_catalogo_por_chave(db: Session, family_key: str) -> FamiliaLaudoCatalogo:
    from app.domains.admin import services as admin_services

    family_key_norm = admin_services._normalizar_chave_catalogo(
        family_key,
        campo="Família",
        max_len=120,
    )
    familia = db.scalar(
        select(FamiliaLaudoCatalogo).where(FamiliaLaudoCatalogo.family_key == family_key_norm)
    )
    if familia is None:
        raise ValueError("Família do catálogo não encontrada.")
    return familia


def _metodos_sugeridos_para_familia(*, family_key: str, nome_exibicao: str = "") -> list[dict[str, str]]:
    from app.domains.admin import services as admin_services

    texto = " ".join(
        (str(family_key or "").strip().lower(), str(nome_exibicao or "").strip().lower())
    )
    sugestoes: list[dict[str, str]] = []
    vistos: set[str] = set()
    for pista, method_key, categoria in admin_services._CATALOGO_METHOD_HINTS:
        if pista not in texto or method_key in vistos:
            continue
        vistos.add(method_key)
        sugestoes.append(
            {
                "method_key": method_key,
                "categoria": categoria,
                "nome_exibicao": method_key.replace("_", " ").title(),
            }
        )
    return sugestoes


def _upsert_metodos_catalogo_para_familia(
    db: Session,
    *,
    familia: FamiliaLaudoCatalogo,
    criado_por_id: int | None = None,
) -> list[MetodoCatalogoInspecao]:
    from app.domains.admin import services as admin_services

    itens = _metodos_sugeridos_para_familia(
        family_key=str(getattr(familia, "family_key", "") or ""),
        nome_exibicao=str(getattr(familia, "nome_exibicao", "") or ""),
    )
    registros: list[MetodoCatalogoInspecao] = []
    for item in itens:
        method_key = admin_services._normalizar_chave_catalogo(
            item["method_key"],
            campo="Method key",
            max_len=80,
        )
        registro = db.scalar(
            select(MetodoCatalogoInspecao).where(MetodoCatalogoInspecao.method_key == method_key)
        )
        if registro is None:
            registro = MetodoCatalogoInspecao(
                method_key=method_key,
                nome_exibicao=admin_services._normalizar_texto_curto(
                    item["nome_exibicao"],
                    campo="Método",
                    max_len=120,
                ),
                categoria=item["categoria"],
                criado_por_id=criado_por_id,
                ativo=True,
            )
            db.add(registro)
        registros.append(registro)
    return registros


__all__ = [
    "_buscar_familia_catalogo_por_chave",
    "_family_artifact_file_path",
    "_family_schema_file_path",
    "_family_schemas_dir",
    "_ler_json_arquivo",
    "_metodos_sugeridos_para_familia",
    "_repo_root_dir",
    "_upsert_metodos_catalogo_para_familia",
    "carregar_family_schema_canonico",
    "listar_family_schemas_canonicos",
]
