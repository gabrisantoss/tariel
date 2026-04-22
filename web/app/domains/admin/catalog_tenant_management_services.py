from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session


def catalogo_actor_label(actor: Any, *, fallback: str = "Sistema Tariel") -> str:
    if actor is None:
        return fallback
    nome = str(getattr(actor, "nome_completo", "") or getattr(actor, "email", "") or "").strip()
    if nome:
        return nome
    actor_id = getattr(actor, "id", None)
    return f"Usuário #{int(actor_id)}" if actor_id else fallback


def catalogo_texto_leitura(
    valor: str | None,
    *,
    fallback: str | None = None,
    humanizar_slug: Callable[[str], str],
) -> str | None:
    texto = str(valor or "").strip()
    if not texto:
        return fallback
    if re.search(r"[_-]", texto):
        return humanizar_slug(texto)
    return texto


def catalogo_scope_summary_label(
    *,
    allowed_modes: list[str] | None,
    allowed_templates: list[str] | None,
    allowed_variants: list[str] | None,
) -> str:
    modos = len(list(allowed_modes or []))
    modelos = len(list(allowed_templates or []))
    opcoes = len(list(allowed_variants or []))
    if modos == 0 and modelos == 0 and opcoes == 0:
        return "Sem recortes extras. A empresa segue a família completa."
    partes: list[str] = []
    if modos:
        partes.append(f"{modos} forma(s) de uso")
    if modelos:
        partes.append(f"{modelos} modelo(s) específico(s)")
    if opcoes:
        partes.append(f"{opcoes} opção(ões) liberada(s)")
    return " • ".join(partes)


def serializar_release_catalogo_familia(
    item: Any,
    *,
    empresa_lookup: dict[int, Any],
    oferta: Any | None = None,
    summarize_release_contract_governance: Callable[..., dict[str, Any]],
    offer_lifecycle_resolvido: Callable[[Any], str | None],
    label_catalogo: Callable[[dict[str, str], str, str], str],
    release_status_labels: dict[str, str],
    catalogo_modelo_label: Callable[..., str],
    normalizar_datetime_admin: Callable[[Any], Any],
    formatar_data_admin: Callable[..., str],
    resumir_governanca_release_policy: Callable[[Any], dict[str, Any]],
    catalogo_scope_summary_label: Callable[..., str],
) -> dict[str, Any]:
    tenant = empresa_lookup.get(int(item.tenant_id))
    release_status = str(getattr(item, "release_status", "") or "").strip().lower() or "draft"
    commercial = summarize_release_contract_governance(
        getattr(item, "governance_policy_json", None),
        offer_flags_payload=getattr(oferta, "flags_json", None) if oferta is not None else None,
        offer_lifecycle_status=offer_lifecycle_resolvido(oferta),
    )
    return {
        "id": int(item.id),
        "tenant_id": int(item.tenant_id),
        "tenant_label": str(getattr(tenant, "nome_fantasia", "") or f"Empresa {item.tenant_id}"),
        "release_status": label_catalogo(
            release_status_labels,
            release_status,
            release_status or "Rascunho",
        ),
        "allowed_modes": list(getattr(item, "allowed_modes_json", None) or []),
        "allowed_offers": list(getattr(item, "allowed_offers_json", None) or []),
        "allowed_templates": list(getattr(item, "allowed_templates_json", None) or []),
        "allowed_variants": list(getattr(item, "allowed_variants_json", None) or []),
        "default_template_code": str(getattr(item, "default_template_code", "") or "").strip() or None,
        "default_template_label": catalogo_modelo_label(
            str(getattr(item, "default_template_code", "") or "").strip() or None,
            fallback="Herdado da família",
        ),
        "observacoes": str(getattr(item, "observacoes", "") or "").strip() or None,
        "start_at": normalizar_datetime_admin(getattr(item, "start_at", None)),
        "end_at": normalizar_datetime_admin(getattr(item, "end_at", None)),
        "start_at_label": formatar_data_admin(
            normalizar_datetime_admin(getattr(item, "start_at", None)),
            fallback="Imediato",
        ),
        "end_at_label": formatar_data_admin(
            normalizar_datetime_admin(getattr(item, "end_at", None)),
            fallback="Sem expiração",
        ),
        "updated_at": normalizar_datetime_admin(getattr(item, "atualizado_em", None)),
        "updated_at_label": formatar_data_admin(
            normalizar_datetime_admin(getattr(item, "atualizado_em", None))
        ),
        "actor_label": catalogo_actor_label(getattr(item, "criado_por", None)),
        "governance": resumir_governanca_release_policy(
            getattr(item, "governance_policy_json", None)
        ),
        "effective_release_channel": commercial["effective_release_channel"],
        "contract_entitlements": commercial["effective_contract_entitlements"],
        "scope_summary": catalogo_scope_summary_label(
            allowed_modes=list(getattr(item, "allowed_modes_json", None) or []),
            allowed_templates=list(getattr(item, "allowed_templates_json", None) or []),
            allowed_variants=list(getattr(item, "allowed_variants_json", None) or []),
        ),
    }


def historico_catalogo_familia(
    familia: Any,
    *,
    tenant_releases: list[Any],
    normalizar_datetime_admin: Callable[[Any], Any],
    formatar_data_admin: Callable[..., str],
    catalog_offer_variants: Callable[[Any, Any], list[dict[str, Any]]],
    offer_lifecycle_resolvido: Callable[[Any], str | None],
    catalogo_modelo_label: Callable[..., str],
    catalogo_texto_leitura: Callable[..., str],
) -> list[dict[str, Any]]:
    eventos: list[dict[str, Any]] = []

    tipo_labels = {
        "family": "Família",
        "offer": "Oferta",
        "calibration": "Calibração",
        "tenant_release": "Liberação para empresa",
    }

    def _push(
        tipo: str,
        titulo: str,
        quando: datetime | None,
        detalhe: str = "",
        *,
        actor_label: str = "Sistema Tariel",
        diff_summary: str = "",
    ) -> None:
        quando_norm = normalizar_datetime_admin(quando)
        if quando_norm is None:
            return
        eventos.append(
            {
                "tipo": tipo,
                "tipo_label": tipo_labels.get(tipo, "Evento"),
                "titulo": titulo,
                "detalhe": detalhe,
                "actor_label": actor_label,
                "diff_summary": diff_summary,
                "quando": quando_norm,
                "quando_label": formatar_data_admin(quando_norm),
            }
        )

    macro_categoria = str(getattr(familia, "macro_categoria", "") or "").strip() or "Sem macro categoria"
    _push(
        "family",
        "Família atualizada",
        normalizar_datetime_admin(getattr(familia, "atualizado_em", None))
        or normalizar_datetime_admin(getattr(familia, "criado_em", None)),
        f"Status técnico: {str(getattr(familia, 'technical_status', '') or 'draft')}.",
        actor_label=catalogo_actor_label(getattr(familia, "criado_por", None)),
        diff_summary=f"Schema v{int(getattr(familia, 'schema_version', 1) or 1)} • macro {macro_categoria}",
    )
    oferta = getattr(familia, "oferta_comercial", None)
    if oferta is not None:
        variants = catalog_offer_variants(familia, oferta)
        _push(
            "offer",
            "Oferta comercial revisada",
            normalizar_datetime_admin(getattr(oferta, "atualizado_em", None))
            or normalizar_datetime_admin(getattr(oferta, "criado_em", None)),
            f"Situação do pacote: {str(getattr(oferta, 'lifecycle_status', '') or offer_lifecycle_resolvido(oferta) or 'draft')}.",
            actor_label=catalogo_actor_label(getattr(oferta, "criado_por", None)),
            diff_summary=" • ".join(
                trecho
                for trecho in (
                    "modelo principal "
                    + str(
                        catalogo_modelo_label(
                            str(getattr(oferta, "template_default_code", "") or "").strip() or None,
                            fallback="em definição",
                        )
                    ),
                    f"{len(variants)} opções",
                    str(getattr(oferta, "pacote_comercial", "") or "").strip() or "",
                )
                if trecho
            ),
        )
    calibracao = getattr(familia, "calibracao", None)
    if calibracao is not None:
        changed_fields = list(getattr(calibracao, "changed_fields_json", None) or [])
        _push(
            "calibration",
            "Calibração registrada",
            normalizar_datetime_admin(getattr(calibracao, "last_calibrated_at", None))
            or normalizar_datetime_admin(getattr(calibracao, "atualizado_em", None)),
            f"Status: {str(getattr(calibracao, 'calibration_status', '') or 'none')}.",
            actor_label=catalogo_actor_label(getattr(calibracao, "criado_por", None)),
            diff_summary=" • ".join(
                trecho
                for trecho in (
                    catalogo_texto_leitura(
                        str(getattr(calibracao, "reference_source", "") or "").strip() or None
                    )
                    or "",
                    f"{len(changed_fields)} campos alterados" if changed_fields else "",
                )
                if trecho
            ),
        )
    for item in tenant_releases:
        _push(
            "tenant_release",
            "Liberação para empresa revisada",
            normalizar_datetime_admin(getattr(item, "atualizado_em", None))
            or normalizar_datetime_admin(getattr(item, "criado_em", None)),
            f"Empresa {int(item.tenant_id)} em {str(getattr(item, 'release_status', '') or 'draft')}.",
            actor_label=catalogo_actor_label(getattr(item, "criado_por", None)),
            diff_summary=" • ".join(
                trecho
                for trecho in (
                    catalogo_modelo_label(
                        str(getattr(item, "default_template_code", "") or "").strip() or None,
                        fallback="modelo herdado",
                    ),
                    f"{len(list(getattr(item, 'allowed_templates_json', None) or []))} modelos"
                    if list(getattr(item, "allowed_templates_json", None) or [])
                    else "",
                    f"{len(list(getattr(item, 'allowed_variants_json', None) or []))} opções"
                    if list(getattr(item, "allowed_variants_json", None) or [])
                    else "",
                )
                if trecho
            ),
        )
    eventos.sort(key=lambda item: item["quando"], reverse=True)
    return eventos


def normalizar_validade_signatario(
    valor: str | datetime | None,
    *,
    normalizar_texto_opcional: Callable[..., str | None],
) -> datetime | None:
    if isinstance(valor, datetime):
        dt = valor
    else:
        bruto = normalizar_texto_opcional(valor, 40)
        if not bruto:
            return None
        try:
            dt = datetime.fromisoformat(bruto)
        except ValueError as exc:
            raise ValueError("Data de validade do signatário inválida.") from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def normalizar_family_keys_signatario(
    family_keys: list[str] | tuple[str, ...] | str | None,
    *,
    normalizar_lista_json_canonica: Callable[..., list[str] | None],
    normalizar_chave_catalogo: Callable[..., str],
) -> list[str]:
    valores = normalizar_lista_json_canonica(family_keys, campo="Famílias compatíveis") or []
    return [
        normalizar_chave_catalogo(item, campo="Família compatível", max_len=120)
        for item in valores
    ]


def status_signatario_governado(
    *,
    ativo: bool,
    valid_until: datetime | None,
    normalizar_datetime_admin: Callable[[Any], Any],
    agora_utc: Callable[[], datetime],
) -> dict[str, str]:
    validade = normalizar_datetime_admin(valid_until)
    if not ativo:
        return {"key": "inactive", "label": "Inativo", "tone": "idle"}
    if validade is not None and validade < agora_utc():
        return {"key": "expired", "label": "Expirado", "tone": "archived"}
    if validade is not None and validade <= (agora_utc() + timedelta(days=30)):
        return {"key": "expiring_soon", "label": "Validade próxima", "tone": "testing"}
    return {"key": "ready", "label": "Pronto", "tone": "active"}


def serializar_signatario_governado_admin(
    signatario: Any,
    *,
    family_labels: dict[str, str],
    normalizar_family_keys_signatario_fn: Callable[[Any], list[str]],
    status_signatario_governado_fn: Callable[..., dict[str, str]],
    normalizar_datetime_admin: Callable[[Any], Any],
    formatar_data_admin: Callable[..., str],
    normalizar_texto_opcional: Callable[..., str | None],
) -> dict[str, Any]:
    allowed_family_keys = normalizar_family_keys_signatario_fn(
        getattr(signatario, "allowed_family_keys_json", None)
    )
    status = status_signatario_governado_fn(
        ativo=bool(getattr(signatario, "ativo", False)),
        valid_until=getattr(signatario, "valid_until", None),
    )
    family_scope = [
        {
            "family_key": family_key,
            "family_label": family_labels.get(family_key, family_key),
        }
        for family_key in allowed_family_keys
    ]
    return {
        "id": int(signatario.id),
        "nome": str(signatario.nome),
        "funcao": str(signatario.funcao),
        "registro_profissional": normalizar_texto_opcional(signatario.registro_profissional, 80),
        "valid_until": normalizar_datetime_admin(getattr(signatario, "valid_until", None)),
        "valid_until_label": formatar_data_admin(getattr(signatario, "valid_until", None), fallback="Sem validade"),
        "ativo": bool(getattr(signatario, "ativo", False)),
        "status": status,
        "allowed_family_keys": allowed_family_keys,
        "family_scope": family_scope,
        "family_scope_summary": "Todas as famílias liberadas do tenant" if not family_scope else ", ".join(
            item["family_label"] for item in family_scope[:3]
        ),
        "observacoes": normalizar_texto_opcional(getattr(signatario, "observacoes", None)),
    }


def upsert_tenant_family_release(
    db: Session,
    *,
    tenant_id: int,
    family_key: str,
    release_status: str,
    allowed_modes: list[str] | tuple[str, ...] | str | None = None,
    allowed_offers: list[str] | tuple[str, ...] | str | None = None,
    allowed_templates: list[str] | tuple[str, ...] | str | None = None,
    allowed_variants: list[str] | tuple[str, ...] | str | None = None,
    force_review_mode: str = "",
    max_review_mode: str = "",
    mobile_review_override: str = "",
    mobile_autonomous_override: str = "",
    release_channel_override: str = "",
    included_features_text: str = "",
    entitlement_monthly_issues: int | str | None = None,
    entitlement_max_admin_clients: int | str | None = None,
    entitlement_max_inspectors: int | str | None = None,
    entitlement_max_reviewers: int | str | None = None,
    entitlement_max_active_variants: int | str | None = None,
    entitlement_max_integrations: int | str | None = None,
    default_template_code: str = "",
    observacoes: str = "",
    criado_por_id: int | None = None,
    buscar_empresa: Callable[[Session, int], Any],
    buscar_familia_catalogo_por_chave: Callable[[Session, str], Any],
    tenant_release_model: Any,
    normalizar_status_release_catalogo: Callable[[str], str],
    normalizar_lista_json_canonica: Callable[..., list[str] | None],
    normalizar_selection_tokens_catalogo: Callable[..., list[str] | None],
    merge_release_governance_policy: Callable[..., dict[str, Any] | None],
    normalizar_review_mode_governanca: Callable[..., str | None],
    normalizar_override_tristate: Callable[..., bool | None],
    normalizar_release_channel_catalogo: Callable[..., str | None],
    normalizar_contract_entitlements_payload: Callable[..., dict[str, Any] | None],
    normalizar_chave_catalogo: Callable[..., str],
    agora_utc: Callable[[], datetime],
    normalizar_texto_opcional: Callable[..., str | None],
    list_active_tenant_catalog_activations: Callable[..., list[Any]],
    sync_tenant_catalog_activations: Callable[..., Any],
    flush_ou_rollback_integridade: Callable[..., None],
    logger_operacao,
) -> Any:
    empresa = buscar_empresa(db, int(tenant_id))
    familia = buscar_familia_catalogo_por_chave(db, family_key)
    oferta = getattr(familia, "oferta_comercial", None)
    registro = db.scalar(
        select(tenant_release_model).where(
            tenant_release_model.tenant_id == int(empresa.id),
            tenant_release_model.family_id == int(familia.id),
        )
    )
    if registro is None:
        registro = tenant_release_model(
            tenant_id=int(empresa.id),
            family_id=int(familia.id),
            criado_por_id=criado_por_id,
        )
        db.add(registro)

    release_status_norm = normalizar_status_release_catalogo(release_status)
    allowed_modes_norm = normalizar_lista_json_canonica(allowed_modes, campo="Allowed modes")
    allowed_offers_norm = normalizar_lista_json_canonica(allowed_offers, campo="Allowed offers")
    allowed_templates_norm = normalizar_lista_json_canonica(allowed_templates, campo="Allowed templates")
    allowed_variants_norm = normalizar_selection_tokens_catalogo(allowed_variants, campo="Allowed variants")
    governance_policy = merge_release_governance_policy(
        dict(getattr(registro, "governance_policy_json", None) or {})
        if isinstance(getattr(registro, "governance_policy_json", None), dict)
        else {},
        force_review_mode=normalizar_review_mode_governanca(
            force_review_mode,
            campo="Force review mode",
        ),
        max_review_mode=normalizar_review_mode_governanca(
            max_review_mode,
            campo="Max review mode",
        ),
        mobile_review_override=normalizar_override_tristate(
            mobile_review_override,
            campo="Override de revisão mobile",
        ),
        mobile_autonomous_override=normalizar_override_tristate(
            mobile_autonomous_override,
            campo="Override de autonomia mobile",
        ),
        release_channel_override=normalizar_release_channel_catalogo(
            release_channel_override,
            campo="Override de release channel",
        ),
        contract_entitlements=normalizar_contract_entitlements_payload(
            included_features_text=included_features_text,
            monthly_issues=entitlement_monthly_issues,
            max_admin_clients=entitlement_max_admin_clients,
            max_inspectors=entitlement_max_inspectors,
            max_reviewers=entitlement_max_reviewers,
            max_active_variants=entitlement_max_active_variants,
            max_integrations=entitlement_max_integrations,
        ),
    )
    registro.offer_id = int(oferta.id) if oferta is not None else None
    registro.allowed_modes_json = allowed_modes_norm
    registro.allowed_offers_json = allowed_offers_norm
    registro.allowed_templates_json = allowed_templates_norm
    registro.allowed_variants_json = allowed_variants_norm
    registro.governance_policy_json = governance_policy
    registro.default_template_code = (
        normalizar_chave_catalogo(default_template_code, campo="Template default", max_len=120)
        if str(default_template_code or "").strip()
        else None
    )
    registro.release_status = release_status_norm
    registro.start_at = (
        agora_utc()
        if release_status_norm == "active" and getattr(registro, "start_at", None) is None
        else getattr(registro, "start_at", None)
    )
    registro.end_at = agora_utc() if release_status_norm in {"paused", "expired"} else None
    registro.observacoes = normalizar_texto_opcional(observacoes)
    if criado_por_id and not registro.criado_por_id:
        registro.criado_por_id = criado_por_id

    ativos_existentes = list_active_tenant_catalog_activations(db, empresa_id=int(empresa.id))
    outros_tokens = [
        f"catalog:{str(item.family_key).strip().lower()}:{str(item.variant_key).strip().lower()}"
        for item in ativos_existentes
        if str(item.family_key).strip().lower() != str(familia.family_key).strip().lower()
    ]
    tokens_familia = allowed_variants_norm if release_status_norm == "active" else []
    sync_tenant_catalog_activations(
        db,
        empresa_id=int(empresa.id),
        selection_tokens=[*outros_tokens, *(tokens_familia or [])],
        admin_id=criado_por_id,
    )

    flush_ou_rollback_integridade(
        db,
        logger_operacao=logger_operacao,
        mensagem_erro="Não foi possível salvar a liberação por tenant da família.",
    )
    return registro


def upsert_signatario_governado_laudo(
    db: Session,
    *,
    tenant_id: int,
    nome: str,
    funcao: str,
    registro_profissional: str = "",
    valid_until: str | datetime | None = None,
    allowed_family_keys: list[str] | tuple[str, ...] | str | None = None,
    observacoes: str = "",
    ativo: bool = True,
    signatario_id: int | None = None,
    criado_por_id: int | None = None,
    buscar_empresa: Callable[[Session, int], Any],
    signatario_model: Any,
    normalizar_texto_curto: Callable[..., str],
    normalizar_texto_opcional: Callable[..., str | None],
    normalizar_validade_signatario_fn: Callable[[Any], datetime | None],
    normalizar_family_keys_signatario_fn: Callable[[Any], list[str]],
    flush_ou_rollback_integridade: Callable[..., None],
    logger_operacao,
) -> Any:
    empresa = buscar_empresa(db, int(tenant_id))
    registro = None
    if signatario_id:
        registro = db.scalar(
            select(signatario_model).where(
                signatario_model.id == int(signatario_id),
                signatario_model.tenant_id == int(empresa.id),
            )
        )
        if registro is None:
            raise ValueError("Signatário governado não encontrado para este tenant.")
    if registro is None:
        registro = signatario_model(
            tenant_id=int(empresa.id),
            criado_por_id=criado_por_id,
        )
        db.add(registro)

    registro.nome = normalizar_texto_curto(nome, campo="Nome do signatário", max_len=160)
    registro.funcao = normalizar_texto_curto(funcao, campo="Função do signatário", max_len=120)
    registro.registro_profissional = normalizar_texto_opcional(registro_profissional, 80)
    registro.valid_until = normalizar_validade_signatario_fn(valid_until)
    registro.allowed_family_keys_json = normalizar_family_keys_signatario_fn(allowed_family_keys)
    registro.observacoes = normalizar_texto_opcional(observacoes)
    registro.ativo = bool(ativo)
    if criado_por_id and not registro.criado_por_id:
        registro.criado_por_id = criado_por_id

    flush_ou_rollback_integridade(
        db,
        logger_operacao=logger_operacao,
        mensagem_erro="Não foi possível salvar o signatário governado do tenant.",
    )
    return registro


def resumir_portfolio_catalogo_empresa(
    db: Session,
    *,
    empresa_id: int,
    build_admin_tenant_catalog_snapshot: Callable[..., dict[str, Any]],
) -> dict[str, Any]:
    return build_admin_tenant_catalog_snapshot(db, empresa_id=int(empresa_id))


def sincronizar_portfolio_catalogo_empresa(
    db: Session,
    *,
    empresa_id: int,
    selection_tokens: list[str] | tuple[str, ...],
    admin_id: int | None = None,
    buscar_empresa: Callable[[Session, int], Any],
    sync_tenant_catalog_activations: Callable[..., dict[str, Any]],
    flush_ou_rollback_integridade: Callable[..., None],
    logger_operacao,
) -> dict[str, Any]:
    buscar_empresa(db, int(empresa_id))
    resultado = sync_tenant_catalog_activations(
        db,
        empresa_id=int(empresa_id),
        selection_tokens=selection_tokens,
        admin_id=int(admin_id) if admin_id is not None else None,
    )
    flush_ou_rollback_integridade(
        db,
        logger_operacao=logger_operacao,
        mensagem_erro="Não foi possível sincronizar o portfólio comercial do tenant.",
    )
    return resultado
