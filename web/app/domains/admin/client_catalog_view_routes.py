"""Rotas Admin CEO para visualizacao e preview do catalogo de laudos."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session

from app.core.paths import resolve_family_schemas_dir
from app.domains.admin.portal_support import (
    _redirect_err,
    _redirect_login,
    _render_template,
    _verificar_acesso_admin,
)
from app.domains.admin.services import buscar_catalogo_familia_admin, resumir_catalogo_laudos_admin
from app.domains.chat.catalog_pdf_templates import (
    RENDER_MODE_TEMPLATE_PREVIEW_BLANK,
    ResolvedPdfTemplateRef,
    has_viable_legacy_preview_overlay_for_pdf_template,
    materialize_runtime_document_editor_json,
    materialize_runtime_style_json_for_pdf_template,
    resolve_runtime_assets_for_pdf_template,
    resolve_runtime_field_mapping_for_pdf_template,
    resolve_template_preview_payload,
    should_use_rich_runtime_preview_for_pdf_template,
)
from app.shared.database import Usuario, obter_banco
from app.shared.security import obter_usuario_html
from app.v2.contracts.envelopes import utc_now
from nucleo.template_editor_word import (
    MODO_EDITOR_RICO,
    documento_editor_padrao,
    estilo_editor_padrao,
    normalizar_documento_editor,
    normalizar_estilo_editor,
    normalizar_modo_editor,
)
from nucleo.template_laudos import gerar_preview_pdf_template, normalizar_codigo_template

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


def _dict_payload(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _normalizar_catalogo_family_tab(tab: str | None) -> str:
    tab_norm = str(tab or "").strip().lower()
    return tab_norm if tab_norm in _CATALOGO_FAMILY_TABS else _CATALOGO_FAMILY_TABS[0]


def _catalogo_family_preview_path(family_key: str, suffix: str) -> Path:
    family_key_norm = normalizar_codigo_template(str(family_key or "").strip().lower())[:120]
    return (resolve_family_schemas_dir() / f"{family_key_norm}{suffix}").resolve()


def _carregar_preview_catalogo_json(family_key: str, suffix: str) -> dict[str, Any] | None:
    path = _catalogo_family_preview_path(family_key, suffix)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _build_catalog_preview_template_ref(
    *,
    family_key: str,
    detalhe: dict[str, Any],
) -> ResolvedPdfTemplateRef | None:
    template_seed = _carregar_preview_catalogo_json(family_key, ".template_master_seed.json") or {}
    offer = _dict_payload(detalhe.get("offer"))
    template_code = normalizar_codigo_template(
        str(
            template_seed.get("template_code")
            or template_seed.get("codigo_template")
            or offer.get("template_default_code")
            or family_key
        ).strip().lower()
    )
    if not template_code:
        return None
    return ResolvedPdfTemplateRef(
        source_kind="catalog_canonical_seed",
        family_key=normalizar_codigo_template(str(family_key or "").strip().lower())[:120],
        template_id=None,
        codigo_template=template_code,
        versao=max(
            1,
            int(template_seed.get("versao") or template_seed.get("schema_version") or 1),
        ),
        modo_editor=normalizar_modo_editor(template_seed.get("modo_editor") or MODO_EDITOR_RICO),
        arquivo_pdf_base=str(template_seed.get("arquivo_pdf_base") or "").strip(),
        documento_editor_json=normalizar_documento_editor(
            template_seed.get("documento_editor_json") or documento_editor_padrao()
        ),
        estilo_json=normalizar_estilo_editor(
            template_seed.get("estilo_json") or estilo_editor_padrao()
        ),
        assets_json=list(template_seed.get("assets_json") or []),
    )


def registrar_rotas_visualizacao_catalogo_cliente(
    roteador: APIRouter,
    *,
    executar_leitura_admin: Callable[..., Any],
) -> None:
    @roteador.get("/catalogo-laudos", response_class=HTMLResponse)
    async def catalogo_laudos_admin(
        request: Request,
        busca: str = "",
        macro_categoria: str = "",
        status_tecnico: str = "",
        prontidao: str = "",
        status_comercial: str = "",
        calibracao: str = "",
        liberacao: str = "",
        template_default: str = "",
        oferta_ativa: str = "",
        mode: str = "",
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        resumo = executar_leitura_admin(
            fallback={
                "familias": [],
                "catalog_rows": [],
                "catalog_rows_total": 0,
                "ofertas_comerciais": [],
                "metodos_catalogo": [],
                "familias_canonicas": [],
                "macro_categorias": [],
                "template_default_options": [],
                "total_familias": 0,
                "total_familias_canonicas": 0,
                "total_publicadas": 0,
                "total_rascunho": 0,
                "total_arquivadas": 0,
                "total_ofertas_comerciais": 0,
                "total_ofertas_ativas": 0,
                "total_familias_calibradas": 0,
                "total_variantes_comerciais": 0,
                "total_metodos_catalogados": 0,
                "governance_rollup": {},
                "filtros": {},
            },
            mensagem_log="Falha ao carregar catálogo de famílias do Admin-CEO",
            admin_id=usuario.id if usuario else None,
            operacao=lambda: resumir_catalogo_laudos_admin(
                banco,
                filtro_busca=busca,
                filtro_macro_categoria=macro_categoria,
                filtro_status_tecnico=status_tecnico,
                filtro_prontidao=prontidao,
                filtro_status_comercial=status_comercial,
                filtro_calibracao=calibracao,
                filtro_liberacao=liberacao,
                filtro_template_default=template_default,
                filtro_oferta_ativa=oferta_ativa,
                filtro_mode=mode,
            ),
        )

        return _render_template(
            request,
            "admin/catalogo_laudos.html",
            {
                "usuario": usuario,
                **resumo,
            },
        )

    @roteador.get("/catalogo-laudos/familias/{family_key}", response_class=HTMLResponse)
    async def detalhe_catalogo_familia_admin(
        request: Request,
        family_key: str,
        tab: str = "",
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        detalhe = executar_leitura_admin(
            fallback=None,
            mensagem_log="Falha ao carregar detalhe da família do catálogo",
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
            operacao=lambda: buscar_catalogo_familia_admin(banco, family_key),
        )
        if not detalhe:
            return _redirect_err(URL_CATALOGO_LAUDOS, "Família não encontrada no catálogo oficial.")

        return _render_template(
            request,
            "admin/catalogo_familia_detalhe.html",
            {
                "usuario": usuario,
                "active_tab": _normalizar_catalogo_family_tab(tab),
                **detalhe,
            },
        )

    @roteador.get("/catalogo-laudos/familias/{family_key}/preview.pdf")
    async def preview_catalogo_familia_admin(
        request: Request,
        family_key: str,
        banco: Session = Depends(obter_banco),
        usuario: Optional[Usuario] = Depends(obter_usuario_html),
    ):
        if not _verificar_acesso_admin(usuario):
            return _redirect_login()

        detalhe = executar_leitura_admin(
            fallback=None,
            mensagem_log="Falha ao carregar preview canônico da família no catálogo",
            admin_id=usuario.id if usuario else None,
            family_key=family_key,
            operacao=lambda: buscar_catalogo_familia_admin(banco, family_key),
        )
        if not detalhe:
            raise HTTPException(status_code=404, detail="Família não encontrada no catálogo oficial.")

        template_ref = _build_catalog_preview_template_ref(
            family_key=family_key,
            detalhe=detalhe,
        )
        if template_ref is None:
            raise HTTPException(status_code=404, detail="Modelo base ainda não foi preparado para esta família.")

        source_payload = (
            _carregar_preview_catalogo_json(family_key, ".laudo_output_seed.json")
            or _carregar_preview_catalogo_json(family_key, ".laudo_output_exemplo.json")
            or {}
        )
        family = _dict_payload(detalhe.get("family"))
        family_label = str(family.get("display_name") or family_key).strip() or family_key
        preview_payload = resolve_template_preview_payload(
            laudo=None,
            template_ref=template_ref,
            source_payload=source_payload,
            diagnostico=f"Prévia oficial do catálogo para {family_label}.",
            inspetor="Equipe Tariel",
            empresa="Tariel",
            data=utc_now().astimezone().strftime("%d/%m/%Y"),
            render_mode=RENDER_MODE_TEMPLATE_PREVIEW_BLANK,
        )

        try:
            promoted_from_legacy = (
                normalizar_modo_editor(template_ref.modo_editor) != MODO_EDITOR_RICO
                and should_use_rich_runtime_preview_for_pdf_template(
                    template_ref=template_ref,
                    payload=preview_payload or {},
                    render_mode=RENDER_MODE_TEMPLATE_PREVIEW_BLANK,
                )
            )
            if normalizar_modo_editor(template_ref.modo_editor) == MODO_EDITOR_RICO or promoted_from_legacy:
                import app.domains.chat.chat as chat_facade

                runtime_assets = resolve_runtime_assets_for_pdf_template(
                    template_ref=template_ref,
                    payload=preview_payload or {},
                )
                runtime_document = materialize_runtime_document_editor_json(
                    template_ref=template_ref,
                    payload=preview_payload or {},
                    render_mode=RENDER_MODE_TEMPLATE_PREVIEW_BLANK,
                )
                pdf_preview = await chat_facade.gerar_pdf_editor_rico_bytes(
                    documento_editor_json=runtime_document or documento_editor_padrao(),
                    estilo_json=materialize_runtime_style_json_for_pdf_template(
                        template_ref=template_ref,
                        payload=preview_payload or {},
                        render_mode=RENDER_MODE_TEMPLATE_PREVIEW_BLANK,
                    )
                    or estilo_editor_padrao(),
                    assets_json=runtime_assets,
                    dados_formulario=preview_payload or {},
                    public_verification=None,
                )
            elif has_viable_legacy_preview_overlay_for_pdf_template(template_ref=template_ref):
                pdf_preview = gerar_preview_pdf_template(
                    caminho_pdf_base=template_ref.arquivo_pdf_base,
                    mapeamento_campos=resolve_runtime_field_mapping_for_pdf_template(
                        template_ref=template_ref,
                    ),
                    dados_formulario=preview_payload or {},
                )
            else:
                raise FileNotFoundError("Template base indisponível para a prévia do catálogo.")
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(
                "Falha ao gerar preview do catálogo | family_key=%s | admin_id=%s",
                family_key,
                usuario.id if usuario else None,
                exc_info=True,
            )
            raise HTTPException(status_code=500, detail="Falha ao gerar a prévia do laudo.") from exc

        nome_arquivo = f"catalogo_{template_ref.codigo_template}_v{template_ref.versao}.pdf"
        return Response(
            content=pdf_preview,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{nome_arquivo}"'},
        )
