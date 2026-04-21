from __future__ import annotations

import app.domains.admin.services as admin_services
import app.domains.admin.catalog_sync_services as catalog_sync_services
from app.shared.database import FamiliaLaudoCatalogo


def test_sincronizar_catalogo_canonico_importa_apenas_familias_faltantes(
    ambiente_critico,
    monkeypatch,
) -> None:
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]
    monkeypatch.setattr(
        admin_services,
        "carregar_family_schema_canonico",
        lambda family_key: {
            "family_key": family_key,
            "nome_exibicao": family_key.replace("_", " ").title(),
            "macro_categoria": "NR",
            "schema_version": 1,
        },
    )

    monkeypatch.setattr(
        catalog_sync_services,
        "_listar_family_keys_canonicas_family",
        lambda: [
            "nr13_inspecao_caldeira",
            "nr12_prensas",
        ],
    )

    with SessionLocal() as banco:
        admin_services.upsert_familia_catalogo(
            banco,
            family_key="nr13_inspecao_caldeira",
            nome_exibicao="NR13 - Inspecao de Caldeira",
            status_catalogo="publicado",
            criado_por_id=ids["admin_a"],
        )
        banco.commit()

    with SessionLocal() as banco:
        resultado = catalog_sync_services.sincronizar_catalogo_canonico(banco, status_catalogo="publicado")
        banco.commit()

    assert resultado["candidate_family_keys"] == [
        "nr13_inspecao_caldeira",
        "nr12_prensas",
    ]
    assert resultado["existing_count"] == 1
    assert resultado["missing_family_keys"] == ["nr12_prensas"]
    assert resultado["imported_count"] == 1

    with SessionLocal() as banco:
        families = list(
            banco.query(FamiliaLaudoCatalogo)
            .filter(FamiliaLaudoCatalogo.catalog_classification == "family")
            .order_by(FamiliaLaudoCatalogo.family_key.asc())
            .all()
        )
        resultado_idempotente = catalog_sync_services.sincronizar_catalogo_canonico(
            banco,
            status_catalogo="publicado",
        )

    assert [item.family_key for item in families] == [
        "nr12_prensas",
        "nr13_inspecao_caldeira",
    ]
    assert resultado_idempotente["missing_family_keys"] == []
    assert resultado_idempotente["imported_count"] == 0
    assert resultado_idempotente["existing_count"] == 2
