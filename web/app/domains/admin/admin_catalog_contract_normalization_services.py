from __future__ import annotations

import json
import re
from typing import Any

from app.domains.admin.catalog_tenant_management_services import (
    catalogo_scope_summary_label as _catalog_tenant_scope_summary_label,
    catalogo_texto_leitura as _catalog_tenant_texto_leitura,
)
from app.domains.admin.tenant_user_services import (
    _normalizar_texto_curto,
    _normalizar_texto_opcional,
)
from app.shared.catalog_commercial_governance import (
    normalize_release_channel,
    sanitize_commercial_bundle,
    sanitize_contract_entitlements,
)
from app.shared.database import PlanoEmpresa

_SHOWROOM_PLAN_LABELS = {
    PlanoEmpresa.INICIAL.value: {
        "label": "Starter",
        "short_label": "Starter",
        "support_label": "Inicial",
    },
    PlanoEmpresa.INTERMEDIARIO.value: {
        "label": "Pro",
        "short_label": "Pro",
        "support_label": "Intermediario",
    },
    PlanoEmpresa.ILIMITADO.value: {
        "label": "Enterprise",
        "short_label": "Enterprise",
        "support_label": "Ilimitado",
    },
}
_CATALOGO_TECHNICAL_STATUS_LABELS = {
    "draft": ("Em preparo", "draft"),
    "review": ("Em ajuste", "review"),
    "ready": ("Pronta", "ready"),
    "deprecated": ("Arquivada", "archived"),
}
_CATALOGO_LIFECYCLE_STATUS_LABELS = {
    "draft": ("Em preparo", "draft"),
    "testing": ("Em validacao", "testing"),
    "active": ("Ativa", "active"),
    "paused": ("Pausada", "paused"),
    "archived": ("Arquivada", "archived"),
}
_CATALOGO_CALIBRATION_STATUS_LABELS = {
    "none": ("Sem validacao", "idle"),
    "synthetic_only": ("Base inicial", "draft"),
    "partial_real": ("Em validacao", "testing"),
    "real_calibrated": ("Validada", "active"),
}
_CATALOGO_RELEASE_STATUS_LABELS = {
    "draft": ("Em preparo", "draft"),
    "active": ("Liberada", "active"),
    "paused": ("Pausado", "paused"),
    "expired": ("Encerrada", "archived"),
}
_CATALOGO_REVIEW_MODE_LABELS = {
    "mesa_required": ("Revisão Técnica obrigatória", "review"),
    "mobile_review_allowed": ("Aprovação interna assistida", "testing"),
    "mobile_autonomous": ("Aprovação interna", "active"),
}
_CATALOGO_REVIEW_OVERRIDE_LABELS = {
    "inherit": "Usar configuracao padrao",
    "allow": "Permitir",
    "deny": "Bloquear",
}
_CATALOGO_RED_FLAG_SEVERITY_LABELS = {
    "low": ("Baixa", "idle"),
    "medium": ("Média", "testing"),
    "high": ("Alta", "review"),
    "critical": ("Crítica", "active"),
}
_CATALOGO_READINESS_LABELS = {
    "technical_only": ("Base pronta", "idle"),
    "partial": ("Quase pronta", "testing"),
    "sellable": ("Pronta para venda", "active"),
    "calibrated": ("Validada", "active"),
}
_CATALOGO_MATERIAL_WORKSPACE_STATUS_LABELS = {
    "aguardando_material_real": ("Aguardando material", "testing"),
    "baseline_sintetica_externa_validada": ("Base validada", "active"),
    "material_real_calibrado": ("Validada com material real", "active"),
    "workspace_bootstrapped": ("Pasta inicial criada", "draft"),
}
_CATALOGO_MATERIAL_PRIORITY_LABELS = {
    "resolved": ("Resolvido", "active"),
    "immediate": ("Prioridade alta", "review"),
    "active_queue": ("Na fila", "testing"),
    "waiting_material": ("Aguardando material", "draft"),
    "bootstrap": ("Preparar base", "idle"),
}
_CATALOGO_DOCUMENT_PREVIEW_STATUS_LABELS = {
    "bootstrap": ("Inicio da base", "draft"),
    "foundation": ("Base pronta", "testing"),
    "reference_ready": ("Com referencia", "review"),
    "premium_ready": ("Pronto para uso", "active"),
}
_CATALOGO_SHOWCASE_STATUS_LABELS = {
    "building": ("Em montagem", "draft"),
    "demonstration_ready": ("Modelo demonstrativo pronto", "active"),
}
_CATALOGO_MATERIAL_PREVIEW_STATUS_LABELS = {
    "none": ("Sem material real", "idle"),
    "reference_ready": ("Com base de referencia", "testing"),
    "real_calibrated": ("Calibrado com material real", "active"),
}
_CATALOGO_VARIANT_LIBRARY_STATUS_LABELS = {
    "operational": ("Pronta", "active"),
    "template_mapped": ("Modelo ligado", "testing"),
    "needs_template": ("Falta modelo", "draft"),
}
_CATALOGO_TEMPLATE_REFINEMENT_STATUS_LABELS = {
    "continuous": ("Ajuste continuo", "active"),
    "refinement_due": ("Precisa de ajuste", "review"),
    "mapped": ("Modelo ligado", "testing"),
    "registry_gap": ("Falta registro", "draft"),
}
_CATALOGO_MATERIAL_WORKLIST_STATUS_LABELS = {
    "done": ("Concluído", "active"),
    "pending": ("Pendente", "draft"),
    "blocking": ("Bloqueio", "review"),
    "in_progress": ("Em andamento", "testing"),
}
_CATALOGO_MATERIAL_WORKLIST_PHASE_LABELS = {
    "intake_pending": ("Coleta prioritária", "review"),
    "packaging_reference": ("Consolidação do pacote", "testing"),
    "template_refinement": ("Refino de template", "review"),
    "continuous": ("Refino contínuo", "active"),
}
_MATERIAL_REAL_EXECUTION_TRACK_PRESETS: dict[str, dict[str, Any]] = {
    "nr13_inspecao_tubulacao": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Fechar a trilha premium de tubulação usando material real e harmonizar a linguagem com a baseline de NR13 já validada.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-17",
        "lane": "wave1_critical_finish",
        "sort_order": 10,
    },
    "nr13_integridade_caldeira": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Subir a família de integridade para o mesmo nível premium já alcançado por caldeira e vaso de pressão.",
        "recommended_owner": "Curadoria Tariel + responsável técnico do cliente",
        "next_checkpoint": "2026-04-17",
        "lane": "wave1_critical_finish",
        "sort_order": 11,
    },
    "nr13_teste_hidrostatico": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Consolidar a variante de teste com anexos, memória e conclusão vendável de NR13.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-19",
        "lane": "wave1_critical_finish",
        "sort_order": 12,
    },
    "nr13_teste_estanqueidade_tubulacao_gas": {
        "track_id": "nr13_wave1_finish",
        "track_label": "Fechamento NR13 wave 1",
        "focus_label": "Fechar a família de estanqueidade com material real e amarração forte de evidência, anexo e conclusão.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-19",
        "lane": "wave1_critical_finish",
        "sort_order": 13,
    },
    "nr12_inspecao_maquina_equipamento": {
        "track_id": "wave1_expand_nr12",
        "track_label": "Expansão premium NR12",
        "focus_label": "Abrir a baseline real inaugural de inspeção de máquinas com casca premium de inspeção vendável.",
        "recommended_owner": "Curadoria Tariel + SST do cliente",
        "next_checkpoint": "2026-04-24",
        "lane": "wave1_critical_expand",
        "sort_order": 30,
    },
    "nr12_apreciacao_risco_maquina": {
        "track_id": "wave1_expand_nr12",
        "track_label": "Expansão premium NR12",
        "focus_label": "Pressionar o template mestre técnico com material real de apreciação de risco e anexos de engenharia.",
        "recommended_owner": "Curadoria Tariel + engenharia do cliente",
        "next_checkpoint": "2026-04-24",
        "lane": "wave1_critical_expand",
        "sort_order": 31,
    },
    "nr20_inspecao_instalacoes_inflamaveis": {
        "track_id": "wave1_expand_nr20",
        "track_label": "Expansão premium NR20",
        "focus_label": "Abrir acervo real de inspeção de inflamáveis para consolidar linguagem, evidência e anexo pack.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-26",
        "lane": "wave1_critical_expand",
        "sort_order": 40,
    },
    "nr20_prontuario_instalacoes_inflamaveis": {
        "track_id": "wave1_expand_nr20",
        "track_label": "Expansão premium NR20",
        "focus_label": "Consolidar documentação controlada e prontuário com material real e governança mais rígida.",
        "recommended_owner": "Curadoria Tariel + documentação técnica do cliente",
        "next_checkpoint": "2026-04-26",
        "lane": "wave1_critical_expand",
        "sort_order": 41,
    },
    "nr33_avaliacao_espaco_confinado": {
        "track_id": "wave1_expand_nr33",
        "track_label": "Expansão premium NR33",
        "focus_label": "Subir a baseline real de avaliação de espaço confinado e alinhar red flags, bloqueios e evidência forte.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-28",
        "lane": "wave1_critical_expand",
        "sort_order": 50,
    },
    "nr33_permissao_entrada_trabalho": {
        "track_id": "wave1_expand_nr33",
        "track_label": "Expansão premium NR33",
        "focus_label": "Consolidar a PET com material real, governança documental e postura de emissão controlada.",
        "recommended_owner": "Curadoria Tariel + operação do cliente",
        "next_checkpoint": "2026-04-28",
        "lane": "wave1_critical_expand",
        "sort_order": 51,
    },
}
_CATALOGO_METHOD_HINTS: tuple[tuple[str, str, str], ...] = (
    ("ultrassom", "ultrassom", "inspection_method"),
    ("liquido_penetrante", "liquido_penetrante", "inspection_method"),
    ("particula_magnetica", "particula_magnetica", "inspection_method"),
    ("visual", "visual", "inspection_method"),
    ("estanqueidade", "estanqueidade", "inspection_method"),
    ("hidrostatic", "hidrostatico", "inspection_method"),
)
_REVIEW_MODE_ORDER = {
    "mobile_autonomous": 0,
    "mobile_review_allowed": 1,
    "mesa_required": 2,
}


def _catalog_showroom_plan_label(plan_name: str) -> dict[str, str]:
    normalized = PlanoEmpresa.normalizar(plan_name)
    return dict(
        _SHOWROOM_PLAN_LABELS.get(
            normalized,
            {
                "label": normalized,
                "short_label": normalized,
                "support_label": normalized,
            },
        )
    )


def _catalog_human_join(values: list[str]) -> str:
    labels = [str(item).strip() for item in values if str(item).strip()]
    if not labels:
        return "Sem assinatura liberada"
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} e {labels[1]}"
    return ", ".join(labels[:-1]) + f" e {labels[-1]}"


def _catalog_macro_category_sort_key(value: str) -> tuple[int, int, str]:
    label = str(value or "").strip()
    normalized = label.casefold()
    nr_match = re.search(r"\bnr\D*(\d{1,3})\b", normalized)
    if nr_match:
        return (0, int(nr_match.group(1)), normalized)
    return (1, 9999, normalized)


def _normalizar_chave_catalogo(valor: str, *, campo: str, max_len: int) -> str:
    texto = str(valor or "").strip().lower()
    texto = (
        texto.replace("á", "a")
        .replace("à", "a")
        .replace("ã", "a")
        .replace("â", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )
    texto = re.sub(r"[^a-z0-9]+", "_", texto).strip("_")
    if not texto:
        raise ValueError(f"{campo} é obrigatório.")
    return texto[:max_len]


def _normalizar_json_opcional(valor: str, *, campo: str) -> Any | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    try:
        return json.loads(texto)
    except json.JSONDecodeError as erro:
        raise ValueError(f"{campo} precisa ser JSON válido.") from erro


def _normalizar_lista_textual(
    valor: str,
    *,
    campo: str,
    max_len_item: int = 240,
) -> list[str] | None:
    texto = str(valor or "").strip()
    if not texto:
        return None

    if texto.startswith("["):
        payload = _normalizar_json_opcional(texto, campo=campo)
        if not isinstance(payload, list):
            raise ValueError(f"{campo} precisa ser uma lista JSON ou linhas de texto.")
        itens_brutos = payload
    else:
        itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        linha = re.sub(r"^[\-\*\u2022]+\s*", "", str(bruto or "").strip())
        if not linha:
            continue
        linha = linha[:max_len_item]
        chave = linha.casefold()
        if chave in vistos:
            continue
        vistos.add(chave)
        itens.append(linha)
    return itens or None


def _normalizar_status_catalogo_familia(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "rascunho",
        "rascunho": "rascunho",
        "draft": "rascunho",
        "publicado": "publicado",
        "published": "publicado",
        "arquivado": "arquivado",
        "archived": "arquivado",
        "archive": "arquivado",
    }
    if texto not in aliases:
        raise ValueError("Status do catálogo inválido.")
    return aliases[texto]


def _normalizar_status_material_real_oferta(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "sintetico",
        "sintetico": "sintetico",
        "sintetica": "sintetico",
        "base_sintetica": "sintetico",
        "parcial": "parcial",
        "misto": "parcial",
        "hibrido": "parcial",
        "material_real_parcial": "parcial",
        "calibrado": "calibrado",
        "real": "calibrado",
        "material_real": "calibrado",
    }
    if texto not in aliases:
        raise ValueError("Status de material real inválido.")
    return aliases[texto]


def _normalizar_variantes_comerciais(
    valor: str | list[dict[str, Any]] | None,
) -> list[dict[str, Any]] | None:
    itens: list[Any]
    if isinstance(valor, list):
        itens = valor
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo="Variantes comerciais")
            if not isinstance(payload, list):
                raise ValueError("Variantes comerciais precisam ser uma lista JSON.")
            itens = payload
        else:
            itens = [linha for linha in texto.splitlines() if linha.strip()]

    variantes: list[dict[str, Any]] = []
    vistos: set[str] = set()
    for indice, bruto in enumerate(itens, start=1):
        if isinstance(bruto, dict):
            variant_key_raw = (
                bruto.get("variant_key")
                or bruto.get("codigo")
                or bruto.get("slug")
                or bruto.get("chave")
                or bruto.get("nome_exibicao")
                or bruto.get("nome")
                or ""
            )
            nome_raw = bruto.get("nome_exibicao") or bruto.get("nome") or variant_key_raw
            template_code_raw = bruto.get("template_code") or bruto.get("codigo_template") or ""
            uso_raw = bruto.get("uso_recomendado") or bruto.get("descricao") or ""
        else:
            linha = re.sub(r"^[\-\*\u2022]+\s*", "", str(bruto or "").strip())
            if not linha:
                continue
            partes = [parte.strip() for parte in linha.split("|")]
            variant_key_raw = partes[0] if partes else ""
            nome_raw = partes[1] if len(partes) > 1 else variant_key_raw
            template_code_raw = partes[2] if len(partes) > 2 else ""
            uso_raw = partes[3] if len(partes) > 3 else ""

        variant_key = _normalizar_chave_catalogo(
            variant_key_raw,
            campo="Código da variante",
            max_len=80,
        )
        if variant_key in vistos:
            continue
        vistos.add(variant_key)
        variantes.append(
            {
                "variant_key": variant_key,
                "nome_exibicao": _normalizar_texto_curto(
                    str(nome_raw or variant_key_raw),
                    campo="Nome da variante",
                    max_len=120,
                ),
                "template_code": (
                    _normalizar_chave_catalogo(
                        str(template_code_raw),
                        campo="Template code",
                        max_len=80,
                    )
                    if str(template_code_raw or "").strip()
                    else None
                ),
                "uso_recomendado": _normalizar_texto_opcional(str(uso_raw or ""), 240),
                "ordem": indice,
            }
        )
    return variantes or None


def _normalizar_status_tecnico_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "draft",
        "draft": "draft",
        "rascunho": "draft",
        "review": "review",
        "revisao": "review",
        "ready": "ready",
        "publicado": "ready",
        "deprecated": "deprecated",
        "arquivado": "deprecated",
        "archived": "deprecated",
    }
    if texto not in aliases:
        raise ValueError("Status técnico inválido.")
    return aliases[texto]


def _normalizar_classificacao_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "family",
        "family": "family",
        "familia": "family",
        "inspection_method": "inspection_method",
        "metodo_inspecao": "inspection_method",
        "evidence_method": "evidence_method",
        "metodo_evidencia": "evidence_method",
    }
    if texto not in aliases:
        raise ValueError("Classificação do catálogo inválida.")
    return aliases[texto]


def _normalizar_lifecycle_status_oferta(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "draft",
        "draft": "draft",
        "rascunho": "draft",
        "testing": "testing",
        "teste": "testing",
        "active": "active",
        "ativo": "active",
        "paused": "paused",
        "pausado": "paused",
        "archived": "archived",
        "arquivado": "archived",
    }
    if texto not in aliases:
        raise ValueError("Lifecycle da oferta inválido.")
    return aliases[texto]


def _normalizar_material_level_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "synthetic",
        "synthetic": "synthetic",
        "sintetico": "synthetic",
        "partial": "partial",
        "parcial": "partial",
        "real_calibrated": "real_calibrated",
        "calibrado": "real_calibrated",
        "real": "real_calibrated",
    }
    if texto not in aliases:
        raise ValueError("Material level inválido.")
    return aliases[texto]


def _normalizar_status_calibracao_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "none",
        "none": "none",
        "nenhum": "none",
        "synthetic_only": "synthetic_only",
        "sintetico": "synthetic_only",
        "partial_real": "partial_real",
        "parcial": "partial_real",
        "real_calibrated": "real_calibrated",
        "calibrado": "real_calibrated",
    }
    if texto not in aliases:
        raise ValueError("Status de calibração inválido.")
    return aliases[texto]


def _normalizar_status_release_catalogo(valor: str) -> str:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": "draft",
        "draft": "draft",
        "rascunho": "draft",
        "active": "active",
        "ativo": "active",
        "paused": "paused",
        "pausado": "paused",
        "expired": "expired",
        "expirado": "expired",
    }
    if texto not in aliases:
        raise ValueError("Status de liberação inválido.")
    return aliases[texto]


def _normalizar_release_channel_catalogo(
    valor: str | None,
    *,
    campo: str,
    allow_empty: bool = True,
) -> str | None:
    try:
        return normalize_release_channel(valor, allow_empty=allow_empty)
    except ValueError as exc:
        raise ValueError(f"{campo} inválido.") from exc


def _normalizar_limite_contractual(
    valor: int | str | None,
    *,
    campo: str,
) -> int | None:
    if valor is None or valor == "":
        return None
    try:
        parsed = int(valor)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{campo} precisa ser inteiro.") from exc
    if parsed < 0:
        raise ValueError(f"{campo} precisa ser zero ou positivo.")
    return parsed


def _normalizar_lista_json_canonica(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
    max_len_item: int = 120,
) -> list[str] | None:
    if valor is None:
        return None
    if isinstance(valor, (list, tuple)):
        itens_brutos = list(valor)
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo=campo)
            if not isinstance(payload, list):
                raise ValueError(f"{campo} precisa ser uma lista JSON.")
            itens_brutos = payload
        else:
            itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        item = _normalizar_chave_catalogo(bruto, campo=campo, max_len=max_len_item)
        if not item or item in vistos:
            continue
        vistos.add(item)
        itens.append(item)
    return itens or None


def _normalizar_nr_key(valor: str, *, family_key: str = "") -> str | None:
    bruto = str(valor or "").strip().lower()
    if not bruto and str(family_key or "").startswith("nr"):
        match = re.match(r"^(nr\d+)", str(family_key or "").strip().lower())
        bruto = match.group(1) if match else ""
    if not bruto:
        return None
    bruto = bruto.replace(" ", "").replace("/", "").replace("-", "")
    match = re.search(r"(nr\d+[a-z]*)", bruto)
    if match:
        return match.group(1)[:40]
    return _normalizar_chave_catalogo(bruto, campo="NR key", max_len=40) or None


def _inferir_classificacao_catalogo(
    *,
    family_key: str,
    nome_exibicao: str = "",
    macro_categoria: str = "",
) -> str:
    family_norm = str(family_key or "").strip().lower()
    nome_norm = str(nome_exibicao or "").strip().lower()
    macro_norm = str(macro_categoria or "").strip().lower()
    if family_norm.startswith("end_"):
        return "inspection_method"
    texto = " ".join((family_norm, nome_norm, macro_norm))
    if any(chave in texto for chave, _metodo, _categoria in _CATALOGO_METHOD_HINTS):
        return "inspection_method"
    return "family"


def _metodos_sugeridos_para_familia(
    *,
    family_key: str,
    nome_exibicao: str = "",
) -> list[dict[str, str]]:
    texto = " ".join(
        (
            str(family_key or "").strip().lower(),
            str(nome_exibicao or "").strip().lower(),
        )
    )
    sugestoes: list[dict[str, str]] = []
    vistos: set[str] = set()
    for pista, method_key, categoria in _CATALOGO_METHOD_HINTS:
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


def _label_catalogo(
    mapa: dict[str, tuple[str, str]],
    chave: str,
    fallback: str,
) -> dict[str, str]:
    label, tone = mapa.get(chave, (fallback, "draft"))
    return {"key": chave, "label": label, "tone": tone}


def _humanizar_slug(valor: str) -> str:
    texto = str(valor or "").strip().replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", texto).strip().title()


def _catalogo_texto_leitura(
    valor: str | None,
    *,
    fallback: str | None = None,
) -> str | None:
    return _catalog_tenant_texto_leitura(
        valor,
        fallback=fallback,
        humanizar_slug=_humanizar_slug,
    )


def _catalogo_scope_summary_label(
    *,
    allowed_modes: list[str] | None,
    allowed_templates: list[str] | None,
    allowed_variants: list[str] | None,
) -> str:
    return _catalog_tenant_scope_summary_label(
        allowed_modes=allowed_modes,
        allowed_templates=allowed_templates,
        allowed_variants=allowed_variants,
    )


def _normalizar_selection_tokens_catalogo(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
) -> list[str] | None:
    if valor is None:
        return None
    if isinstance(valor, (list, tuple)):
        itens_brutos = list(valor)
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo=campo)
            if not isinstance(payload, list):
                raise ValueError(f"{campo} precisa ser uma lista JSON.")
            itens_brutos = payload
        else:
            itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        token = str(bruto or "").strip().lower()
        if not token or token in vistos:
            continue
        vistos.add(token)
        itens.append(token)
    return itens or None


def _normalizar_review_mode_governanca(
    valor: str | None,
    *,
    campo: str,
    allow_empty: bool = True,
) -> str | None:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": None if allow_empty else "mesa_required",
        "inherit": None if allow_empty else "mesa_required",
        "none": None if allow_empty else "mesa_required",
        "mesa_required": "mesa_required",
        "mesa": "mesa_required",
        "mobile_review_allowed": "mobile_review_allowed",
        "mobile_review": "mobile_review_allowed",
        "mobile_review_governed": "mobile_review_allowed",
        "mobile_autonomous": "mobile_autonomous",
        "autonomous": "mobile_autonomous",
        "autonomo": "mobile_autonomous",
    }
    if texto not in aliases:
        raise ValueError(f"{campo} inválido.")
    return aliases[texto]


def _normalizar_override_tristate(
    valor: str | None,
    *,
    campo: str,
) -> bool | None:
    texto = str(valor or "").strip().lower()
    aliases = {
        "": None,
        "inherit": None,
        "padrao": None,
        "allow": True,
        "permitir": True,
        "enabled": True,
        "on": True,
        "deny": False,
        "bloquear": False,
        "disabled": False,
        "off": False,
    }
    if texto not in aliases:
        raise ValueError(f"{campo} inválido.")
    return aliases[texto]


def _normalizar_planos_governanca(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
) -> list[str] | None:
    if valor is None:
        return None
    if isinstance(valor, (list, tuple)):
        itens_brutos = list(valor)
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        if texto.startswith("["):
            payload = _normalizar_json_opcional(texto, campo=campo)
            if not isinstance(payload, list):
                raise ValueError(f"{campo} precisa ser uma lista JSON.")
            itens_brutos = payload
        else:
            itens_brutos = texto.splitlines()

    itens: list[str] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        texto = str(bruto or "").strip()
        if not texto:
            continue
        plano = PlanoEmpresa.normalizar(texto)
        if plano in vistos:
            continue
        vistos.add(plano)
        itens.append(plano)
    return itens or None


def _normalizar_red_flags_governanca(
    valor: str | list[dict[str, Any]] | None,
) -> list[dict[str, Any]] | None:
    if valor is None:
        return None
    if isinstance(valor, list):
        itens_brutos = valor
    else:
        texto = str(valor or "").strip()
        if not texto:
            return None
        payload = _normalizar_json_opcional(texto, campo="Red flags")
        if payload is None:
            return None
        if not isinstance(payload, list):
            raise ValueError("Red flags precisam ser uma lista JSON.")
        itens_brutos = payload

    itens: list[dict[str, Any]] = []
    vistos: set[str] = set()
    for bruto in itens_brutos:
        if not isinstance(bruto, dict):
            raise ValueError("Cada red flag precisa ser um objeto JSON.")
        title = _normalizar_texto_curto(
            str(bruto.get("title") or bruto.get("titulo") or ""),
            campo="Título da red flag",
            max_len=140,
        )
        message = _normalizar_texto_curto(
            str(bruto.get("message") or bruto.get("mensagem") or ""),
            campo="Mensagem da red flag",
            max_len=400,
        )
        code_raw = str(bruto.get("code") or bruto.get("codigo") or title)
        code = _normalizar_chave_catalogo(
            code_raw,
            campo="Código da red flag",
            max_len=80,
        )
        if code in vistos:
            continue
        vistos.add(code)
        severity_key = str(bruto.get("severity") or "high").strip().lower()
        if severity_key not in _CATALOGO_RED_FLAG_SEVERITY_LABELS:
            raise ValueError("Severidade da red flag inválida.")
        source = (
            _normalizar_texto_opcional(
                str(bruto.get("source") or "family_policy"),
                80,
            )
            or "family_policy"
        )
        itens.append(
            {
                "code": code,
                "title": title,
                "message": message,
                "severity": severity_key,
                "blocking": bool(bruto.get("blocking", True)),
                "when_missing_required_evidence": bool(
                    bruto.get("when_missing_required_evidence", False)
                ),
                "source": source,
            }
        )
    return itens or None


def _normalizar_features_contractuais(
    valor: str | list[str] | tuple[str, ...] | None,
    *,
    campo: str,
) -> list[str] | None:
    itens = _normalizar_lista_json_canonica(valor, campo=campo, max_len_item=80)
    payload = sanitize_contract_entitlements({"included_features": itens or []})
    if payload is None:
        return None
    return list(payload.get("included_features") or []) or None


def _normalizar_bundle_comercial_payload(
    *,
    bundle_key: str = "",
    bundle_label: str = "",
    bundle_summary: str = "",
    bundle_audience: str = "",
    bundle_highlights_text: str = "",
) -> dict[str, Any] | None:
    highlights = _normalizar_lista_textual(
        bundle_highlights_text,
        campo="Destaques do bundle",
        max_len_item=120,
    )
    return sanitize_commercial_bundle(
        {
            "bundle_key": (
                _normalizar_chave_catalogo(
                    bundle_key,
                    campo="Bundle key",
                    max_len=80,
                )
                if str(bundle_key or "").strip()
                else ""
            ),
            "bundle_label": _normalizar_texto_opcional(bundle_label, 120),
            "summary": _normalizar_texto_opcional(bundle_summary, 240),
            "audience": _normalizar_texto_opcional(bundle_audience, 120),
            "highlights": highlights or [],
        }
    )


def _normalizar_contract_entitlements_payload(
    *,
    included_features_text: str = "",
    monthly_issues: int | str | None = None,
    max_admin_clients: int | str | None = None,
    max_inspectors: int | str | None = None,
    max_reviewers: int | str | None = None,
    max_active_variants: int | str | None = None,
    max_integrations: int | str | None = None,
) -> dict[str, Any] | None:
    return sanitize_contract_entitlements(
        {
            "included_features": _normalizar_features_contractuais(
                included_features_text,
                campo="Features contratuais",
            )
            or [],
            "limits": {
                "monthly_issues": _normalizar_limite_contractual(
                    monthly_issues,
                    campo="Limite mensal de emissões",
                ),
                "max_admin_clients": _normalizar_limite_contractual(
                    max_admin_clients,
                    campo="Limite de admins-cliente",
                ),
                "max_inspectors": _normalizar_limite_contractual(
                    max_inspectors,
                    campo="Limite de inspetores",
                ),
                "max_reviewers": _normalizar_limite_contractual(
                    max_reviewers,
                    campo="Limite de revisores",
                ),
                "max_active_variants": _normalizar_limite_contractual(
                    max_active_variants,
                    campo="Limite de variantes ativas",
                ),
                "max_integrations": _normalizar_limite_contractual(
                    max_integrations,
                    campo="Limite de integrações",
                ),
            },
        }
    )


def _review_mode_label_meta(review_mode: str | None) -> dict[str, str]:
    resolved = (
        _normalizar_review_mode_governanca(review_mode, campo="Review mode")
        if review_mode
        else None
    )
    if resolved is None:
        return {"key": "inherit", "label": "Herdado", "tone": "idle"}
    return _label_catalogo(
        _CATALOGO_REVIEW_MODE_LABELS,
        resolved,
        resolved.replace("_", " "),
    )


def _override_choice_label(value: bool | None) -> dict[str, str]:
    key = "inherit" if value is None else "allow" if value else "deny"
    tone = "idle" if value is None else "active" if value else "review"
    return {
        "key": key,
        "label": _CATALOGO_REVIEW_OVERRIDE_LABELS[key],
        "tone": tone,
    }


def _red_flag_severity_meta(severity: str | None) -> dict[str, str]:
    key = str(severity or "high").strip().lower()
    return _label_catalogo(
        _CATALOGO_RED_FLAG_SEVERITY_LABELS,
        key,
        key or "high",
    )


def _effective_review_mode_cap(*review_modes: str | None) -> str | None:
    normalized = [
        mode
        for mode in (
            _normalizar_review_mode_governanca(item, campo="Review mode")
            if item is not None
            else None
            for item in review_modes
        )
        if mode is not None
    ]
    if not normalized:
        return None
    return sorted(normalized, key=lambda item: _REVIEW_MODE_ORDER[item], reverse=True)[0]


def _release_channel_display_order() -> tuple[str, str, str]:
    return ("pilot", "limited_release", "general_release")
