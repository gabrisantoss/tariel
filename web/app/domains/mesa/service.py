"""Serviços de aplicação do domínio Mesa Avaliadora."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.domains.mesa.contracts import (
    AnexoPackItemPacoteMesa,
    AnexoPackPacoteMesa,
    DocumentoEstruturadoPacoteMesa,
    EventoMesa,
    NotificacaoMesa,
    PacoteMesaLaudo,
    SecaoDocumentoEstruturadoPacoteMesa,
    VerificacaoPublicaPacoteMesa,
)
from app.domains.mesa.package_block_review import (
    build_revisao_por_bloco_pacote as _build_revisao_por_bloco_pacote,
)
from app.domains.mesa.package_coverage import build_coverage_map_pacote as _build_coverage_map_pacote
from app.domains.mesa.package_history import (
    build_historico_inspecao_pacote as _build_historico_inspecao_pacote,
    build_historico_refazer_inspetor_pacote as _build_historico_refazer_inspetor_pacote,
    build_memoria_operacional_familia_pacote as _build_memoria_operacional_familia_pacote,
)
from app.domains.mesa.package_message_summary import build_mesa_message_package_summary
from app.domains.mesa.package_official_issue import (
    build_emissao_oficial_pacote as _build_emissao_oficial_pacote,
)
from app.domains.mesa.package_read_models import (
    build_revisoes_pacote as _build_revisoes_pacote,
    listar_mensagens_mesa_pacote as _listar_mensagens_mesa_pacote,
    listar_revisoes_mesa_pacote as _listar_revisoes_mesa_pacote,
    serializar_mensagem_pacote as _serializar_mensagem_pacote,
)
from app.domains.chat.laudo_state_helpers import resolver_snapshot_leitura_caso_tecnico
from app.domains.chat.normalization import TIPOS_TEMPLATE_VALIDOS
from app.shared.database import Laudo
from app.shared.inspection_history import build_human_override_summary
from app.shared.official_issue_package import build_official_issue_package
from app.shared.public_verification import build_public_verification_payload
from app.shared.tenant_report_catalog import build_tenant_template_option_snapshot
from app.v2.acl.technical_case_core import build_case_status_visual_label
from app.v2.policy.governance import load_case_policy_governance_context

SECTION_TITLES = {
    "identificacao": "Identificacao",
    "caracterizacao_do_equipamento": "Caracterizacao",
    "inspecao_visual": "Inspecao visual",
    "dispositivos_e_acessorios": "Dispositivos e acessorios",
    "dispositivos_e_controles": "Dispositivos e controles",
    "documentacao_e_registros": "Documentacao e registros",
    "nao_conformidades": "Nao conformidades",
    "recomendacoes": "Recomendacoes",
    "conclusao": "Conclusao",
}
SECTION_ORDER = (
    "identificacao",
    "caracterizacao_do_equipamento",
    "inspecao_visual",
    "dispositivos_e_acessorios",
    "dispositivos_e_controles",
    "documentacao_e_registros",
    "nao_conformidades",
    "recomendacoes",
    "conclusao",
)
ATTENTION_CONCLUSION_STATUSES = {"ajuste", "reprovado", "nao_conforme", "bloqueado"}


def agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalizar_data_utc(data: datetime | None) -> datetime | None:
    if data is None:
        return None
    if data.tzinfo is None:
        return data.replace(tzinfo=timezone.utc)
    return data.astimezone(timezone.utc)


def _texto_limpo_curto(valor: Any) -> str | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    return " ".join(texto.split())


def _dict_payload(valor: Any) -> dict[str, Any]:
    return dict(valor) if isinstance(valor, dict) else {}


def _list_payload(valor: Any) -> list[Any]:
    return list(valor) if isinstance(valor, list) else []


def _resumir_texto_curto(valor: Any, *, limite: int = 180) -> str | None:
    texto = _texto_limpo_curto(valor)
    if texto is None:
        return None
    if len(texto) <= limite:
        return texto
    return f"{texto[: max(0, limite - 3)].rstrip()}..."


def _humanizar_slug(valor: Any) -> str:
    texto = str(valor or "").strip().replace("_", " ")
    if not texto:
        return ""
    return " ".join(parte.capitalize() for parte in texto.split())


def _normalizar_lista_textos(valores: Any) -> list[str]:
    if isinstance(valores, str):
        valores_iteraveis = [valores]
    else:
        valores_iteraveis = list(valores or [])
    resultado: list[str] = []
    vistos: set[str] = set()
    for valor in valores_iteraveis:
        texto = _texto_limpo_curto(valor)
        if not texto:
            continue
        chave = texto.lower()
        if chave in vistos:
            continue
        vistos.add(chave)
        resultado.append(texto)
    return resultado


def _build_catalog_template_scope_pacote(
    banco: Session,
    *,
    laudo: Laudo,
) -> dict[str, Any]:
    empresa_id = int(getattr(laudo, "empresa_id", 0) or 0)
    runtime_template_code = (
        _texto_limpo_curto(getattr(laudo, "tipo_template", None)) or "padrao"
    ).lower()
    if empresa_id > 0:
        template_snapshot = build_tenant_template_option_snapshot(
            banco,
            empresa_id=empresa_id,
        )
    else:
        template_snapshot = {
            "governed_mode": False,
            "catalog_state": "legacy_open",
            "permissions": {},
            "options": [],
            "runtime_codes": list(TIPOS_TEMPLATE_VALIDOS.keys()),
            "activation_count": 0,
        }

    runtime_codes = _normalizar_lista_textos(template_snapshot.get("runtime_codes") or [])
    tipos_relatorio = (
        {
            runtime_code.lower(): TIPOS_TEMPLATE_VALIDOS.get(
                runtime_code.lower(),
                runtime_code,
            )
            for runtime_code in runtime_codes
        }
        if bool(template_snapshot.get("governed_mode"))
        else dict(TIPOS_TEMPLATE_VALIDOS)
    )
    governance_context = load_case_policy_governance_context(
        banco,
        tenant_id=empresa_id,
        family_key=getattr(laudo, "catalog_family_key", None),
        variant_key=getattr(laudo, "catalog_variant_key", None),
        template_key=getattr(laudo, "tipo_template", None),
    )
    return {
        "tipos_relatorio": tipos_relatorio,
        "tipo_template_options": list(template_snapshot.get("options") or []),
        "catalog_governed_mode": bool(template_snapshot.get("governed_mode")),
        "catalog_state": str(template_snapshot.get("catalog_state") or "legacy_open"),
        "catalog_permissions": dict(template_snapshot.get("permissions") or {}),
        "activation_count": int(template_snapshot.get("activation_count") or 0),
        "active_binding": {
            "selection_token": _texto_limpo_curto(
                getattr(laudo, "catalog_selection_token", None)
            ),
            "family_key": _texto_limpo_curto(getattr(laudo, "catalog_family_key", None)),
            "family_label": _texto_limpo_curto(
                getattr(laudo, "catalog_family_label", None)
            ),
            "variant_key": _texto_limpo_curto(
                getattr(laudo, "catalog_variant_key", None)
            ),
            "variant_label": _texto_limpo_curto(
                getattr(laudo, "catalog_variant_label", None)
            ),
            "runtime_template_code": runtime_template_code,
            "runtime_template_label": TIPOS_TEMPLATE_VALIDOS.get(
                runtime_template_code,
                runtime_template_code,
            ),
        },
        "family_governance": {
            "family_key": governance_context.get("family_key"),
            "family_label": governance_context.get("family_label"),
            "release_present": bool(governance_context.get("release_present")),
            "release_active": governance_context.get("release_active"),
            "release_status": governance_context.get("release_status"),
            "activation_active": bool(governance_context.get("activation_active")),
            "allowed_templates": list(governance_context.get("allowed_templates") or []),
            "allowed_variants": list(governance_context.get("allowed_variants") or []),
            "default_review_mode": governance_context.get("default_review_mode"),
            "max_review_mode": governance_context.get("max_review_mode"),
            "release_force_review_mode": governance_context.get(
                "release_force_review_mode"
            ),
            "release_max_review_mode": governance_context.get(
                "release_max_review_mode"
            ),
            "release_mobile_review_override": governance_context.get(
                "release_mobile_review_override"
            ),
            "release_mobile_autonomous_override": governance_context.get(
                "release_mobile_autonomous_override"
            ),
        },
    }


def _valor_tem_conteudo(valor: Any) -> bool:
    if valor is None:
        return False
    if isinstance(valor, bool):
        return True
    if isinstance(valor, (int, float)):
        return True
    if isinstance(valor, str):
        return bool(valor.strip())
    if isinstance(valor, dict):
        return any(_valor_tem_conteudo(item) for item in valor.values())
    if isinstance(valor, (list, tuple, set)):
        if not valor:
            return False
        return any(_valor_tem_conteudo(item) for item in valor)
    return True


def _contagem_folhas_preenchidas(valor: Any) -> tuple[int, int]:
    if isinstance(valor, dict):
        preenchidas = 0
        total = 0
        for item in valor.values():
            item_preenchidas, item_total = _contagem_folhas_preenchidas(item)
            preenchidas += item_preenchidas
            total += item_total
        return preenchidas, total
    if isinstance(valor, (list, tuple, set)):
        if not valor:
            return 0, 1
        preenchidas = 0
        total = 0
        for item in valor:
            item_preenchidas, item_total = _contagem_folhas_preenchidas(item)
            preenchidas += item_preenchidas
            total += item_total
        return preenchidas, max(1, total)
    return (1 if _valor_tem_conteudo(valor) else 0, 1)


def _obter_em_caminho(payload: dict[str, Any] | None, *chaves: str) -> Any:
    atual: Any = payload
    for chave in chaves:
        if not isinstance(atual, dict):
            return None
        atual = atual.get(chave)
    return atual


def _rotulo_disponibilidade(flag: Any) -> str | None:
    if flag is True:
        return "disponivel"
    if flag is False:
        return "ausente"
    return None


def _valor_status_conclusao(valor: Any) -> str | None:
    texto = str(valor or "").strip().lower()
    if not texto:
        return None
    return texto


def _rotulo_status_conclusao(valor: Any) -> str | None:
    status = _valor_status_conclusao(valor)
    if not status:
        return None
    rotulos = {
        "ajuste": "Ajuste",
        "aprovado": "Aprovado",
        "conforme": "Conforme",
        "reprovado": "Reprovado",
        "nao_conforme": "Nao conforme",
        "bloqueado": "Bloqueado",
        "pendente": "Pendente",
    }
    return rotulos.get(status, _humanizar_slug(status))


def _primeiro_texto(*valores: Any) -> str | None:
    for valor in valores:
        texto = _resumir_texto_curto(valor)
        if texto:
            return texto
    return None


def _descricao_artefato(payload: dict[str, Any] | None, *, incluir_flag: bool = False) -> str | None:
    if not isinstance(payload, dict):
        return None
    partes: list[str] = []
    if incluir_flag:
        rotulo_disponibilidade = _rotulo_disponibilidade(payload.get("disponivel"))
        if rotulo_disponibilidade:
            partes.append(rotulo_disponibilidade.capitalize())
    for chave in ("descricao", "referencias_texto", "observacao"):
        texto = _resumir_texto_curto(payload.get(chave))
        if texto:
            partes.append(texto)
    if not partes:
        return None
    return " | ".join(partes[:3])


def _sumario_identificacao(secao: dict[str, Any]) -> tuple[str | None, str | None]:
    identificador = None
    for chave, valor in secao.items():
        if chave.startswith("identificacao_"):
            identificador = _resumir_texto_curto(valor)
            if identificador:
                break
    localizacao = _resumir_texto_curto(secao.get("localizacao"))
    tag = _resumir_texto_curto(secao.get("tag_patrimonial"))
    resumo = " | ".join(
        parte
        for parte in (
            identificador,
            localizacao,
            f"tag {tag}" if tag else None,
        )
        if parte
    )
    diff_short = _primeiro_texto(
        _obter_em_caminho(secao, "placa_identificacao", "descricao"),
        _obter_em_caminho(secao, "placa_identificacao", "observacao"),
        _obter_em_caminho(secao, "placa_identificacao", "referencias_texto"),
    )
    return (resumo or None, diff_short)


def _sumario_caracterizacao(secao: dict[str, Any]) -> tuple[str | None, str | None]:
    descricao = _resumir_texto_curto(secao.get("descricao_sumaria"))
    condicao_operacao = _resumir_texto_curto(secao.get("condicao_de_operacao_no_momento"))
    vista = None
    for chave, valor in secao.items():
        if chave.startswith("vista_geral"):
            vista = _descricao_artefato(valor)
            if vista:
                break
    resumo = " | ".join(parte for parte in (descricao, condicao_operacao, vista) if parte)
    return (resumo or None, vista or descricao)


def _sumario_inspecao(secao: dict[str, Any]) -> tuple[str | None, str | None]:
    resumo = " | ".join(
        parte
        for parte in (
            _resumir_texto_curto(secao.get("condicao_geral")),
            _resumir_texto_curto(secao.get("integridade_aparente")),
            _resumir_texto_curto(secao.get("acessibilidade_para_inspecao")),
        )
        if parte
    )
    diff_short = _primeiro_texto(
        _obter_em_caminho(secao, "pontos_de_corrosao", "descricao"),
        _obter_em_caminho(secao, "pontos_de_vazamento_ou_fuligem", "descricao"),
        _obter_em_caminho(secao, "vazamentos", "descricao"),
        _obter_em_caminho(secao, "isolamento_termico", "descricao"),
        _obter_em_caminho(secao, "chamine_ou_exaustao", "descricao"),
    )
    return (resumo or diff_short, diff_short)


def _sumario_dispositivos(secao: dict[str, Any]) -> tuple[str | None, str | None]:
    destaques: list[str] = []
    diff_short = None
    for chave, valor in secao.items():
        if isinstance(valor, dict):
            texto = _descricao_artefato(valor)
            if not texto:
                continue
            rotulo = _humanizar_slug(chave)
            linha = f"{rotulo}: {texto}"
            destaques.append(linha)
            if diff_short is None:
                diff_short = _resumir_texto_curto(linha)
            continue
        texto = _resumir_texto_curto(valor)
        if texto:
            destaques.append(texto)
            if diff_short is None:
                diff_short = texto
    return (" | ".join(destaques[:3]) or None, diff_short)


def _sumario_documentacao(secao: dict[str, Any], mesa_review: dict[str, Any] | None) -> tuple[str | None, str | None]:
    itens: list[str] = []
    for chave in ("prontuario", "certificado", "relatorio_anterior"):
        bloco = secao.get(chave)
        if not isinstance(bloco, dict):
            continue
        rotulo = _humanizar_slug(chave)
        disponibilidade = _rotulo_disponibilidade(bloco.get("disponivel"))
        referencia = _resumir_texto_curto(bloco.get("referencias_texto"))
        if disponibilidade and referencia:
            itens.append(f"{rotulo}: {disponibilidade} ({referencia})")
        elif disponibilidade:
            itens.append(f"{rotulo}: {disponibilidade}")
        elif referencia:
            itens.append(f"{rotulo}: {referencia}")
    resumo = " | ".join(itens[:3]) or _resumir_texto_curto(secao.get("registros_disponiveis_no_local"))
    diff_short = _primeiro_texto(
        _obter_em_caminho(mesa_review, "pendencias_resolvidas_texto"),
        _obter_em_caminho(mesa_review, "observacoes_mesa"),
        _obter_em_caminho(mesa_review, "bloqueios_texto"),
    )
    return (resumo, diff_short)


def _sumario_nao_conformidades(secao: dict[str, Any]) -> tuple[str | None, str | None]:
    if secao.get("ha_nao_conformidades") is False:
        return ("Sem nao conformidades estruturadas.", None)
    resumo = _primeiro_texto(
        secao.get("descricao"),
        secao.get("ha_nao_conformidades_texto"),
    )
    diff_short = _primeiro_texto(
        _obter_em_caminho(secao, "evidencias", "descricao"),
        _obter_em_caminho(secao, "evidencias", "referencias_texto"),
    )
    return (resumo or "Nao conformidades registradas.", diff_short)


def _sumario_recomendacoes(secao: dict[str, Any]) -> tuple[str | None, str | None]:
    texto = _resumir_texto_curto(secao.get("texto"))
    return (texto, texto)


def _sumario_conclusao(secao: dict[str, Any]) -> tuple[str | None, str | None]:
    rotulo_status = _rotulo_status_conclusao(secao.get("status"))
    conclusao_tecnica = _resumir_texto_curto(secao.get("conclusao_tecnica"))
    justificativa = _resumir_texto_curto(secao.get("justificativa"))
    resumo = " | ".join(parte for parte in (rotulo_status, conclusao_tecnica) if parte)
    return (resumo or justificativa, justificativa)


def _sumario_secao_documental(
    key: str,
    secao: dict[str, Any],
    *,
    mesa_review: dict[str, Any] | None,
) -> tuple[str | None, str | None]:
    if key == "identificacao":
        return _sumario_identificacao(secao)
    if key == "caracterizacao_do_equipamento":
        return _sumario_caracterizacao(secao)
    if key == "inspecao_visual":
        return _sumario_inspecao(secao)
    if key in {"dispositivos_e_acessorios", "dispositivos_e_controles"}:
        return _sumario_dispositivos(secao)
    if key == "documentacao_e_registros":
        return _sumario_documentacao(secao, mesa_review)
    if key == "nao_conformidades":
        return _sumario_nao_conformidades(secao)
    if key == "recomendacoes":
        return _sumario_recomendacoes(secao)
    if key == "conclusao":
        return _sumario_conclusao(secao)
    return (_resumir_texto_curto(secao), None)


def _status_secao_documental(key: str, secao: dict[str, Any], *, preenchidas: int, total: int) -> str:
    if preenchidas <= 0:
        return "empty"
    if key == "nao_conformidades" and secao.get("ha_nao_conformidades") is True:
        return "attention"
    if key == "conclusao" and _valor_status_conclusao(secao.get("status")) in ATTENTION_CONCLUSION_STATUSES:
        return "attention"
    if total > 0 and preenchidas < max(2, total // 3):
        return "partial"
    return "filled"


def _rotulo_familia_catalogada(laudo: Laudo, family_key: str | None) -> str | None:
    label = _texto_limpo_curto(getattr(laudo, "catalog_family_label", None))
    if label:
        return label
    if family_key:
        return _humanizar_slug(family_key)
    return None


def _montar_documento_estruturado_pacote(laudo: Laudo) -> DocumentoEstruturadoPacoteMesa | None:
    payload = getattr(laudo, "dados_formulario", None)
    if not isinstance(payload, dict):
        return None
    schema_type = _texto_limpo_curto(payload.get("schema_type"))
    if schema_type != "laudo_output":
        return None

    family_key = _texto_limpo_curto(payload.get("family_key") or getattr(laudo, "catalog_family_key", None))
    mesa_review = payload.get("mesa_review") if isinstance(payload.get("mesa_review"), dict) else {}
    sections: list[SecaoDocumentoEstruturadoPacoteMesa] = []

    for key in SECTION_ORDER:
        secao = payload.get(key)
        if not isinstance(secao, dict):
            continue
        preenchidas, total = _contagem_folhas_preenchidas(secao)
        summary, diff_short = _sumario_secao_documental(
            key,
            secao,
            mesa_review=mesa_review,
        )
        sections.append(
            SecaoDocumentoEstruturadoPacoteMesa(
                key=key,
                title=SECTION_TITLES.get(key, _humanizar_slug(key)),
                status=_status_secao_documental(key, secao, preenchidas=preenchidas, total=total),
                summary=summary,
                diff_short=diff_short,
                filled_fields=preenchidas,
                total_fields=total,
            )
        )

    summary = _primeiro_texto(
        payload.get("resumo_executivo"),
        _obter_em_caminho(payload, "conclusao", "conclusao_tecnica"),
        _obter_em_caminho(payload, "conclusao", "justificativa"),
    )
    mesa_review = _dict_payload(mesa_review)
    review_notes = _primeiro_texto(
        mesa_review.get("pendencias_resolvidas_texto"),
        mesa_review.get("observacoes_mesa"),
        mesa_review.get("bloqueios_texto"),
    )

    return DocumentoEstruturadoPacoteMesa(
        schema_type=schema_type,
        family_key=family_key,
        family_label=_rotulo_familia_catalogada(laudo, family_key),
        summary=summary,
        review_notes=review_notes,
        sections=sections,
    )


def _tempo_em_campo_minutos(inicio: datetime | None) -> int:
    inicio_utc = _normalizar_data_utc(inicio)
    if inicio_utc is None:
        return 0
    delta = agora_utc() - inicio_utc
    if delta.total_seconds() < 0:
        return 0
    return int(delta.total_seconds() // 60)


def criar_notificacao(
    *,
    evento: EventoMesa,
    laudo_id: int,
    origem: str,
    resumo: str,
) -> NotificacaoMesa:
    return NotificacaoMesa(
        evento=evento,
        laudo_id=laudo_id,
        origem=origem,
        resumo=resumo,
    )


def _build_verificacao_publica_pacote(
    laudo: Laudo,
    *,
    case_snapshot: Any | None = None,
) -> VerificacaoPublicaPacoteMesa:
    payload = build_public_verification_payload(laudo=laudo)
    status_visual_label = build_case_status_visual_label(
        lifecycle_status=getattr(case_snapshot, "case_lifecycle_status", None),
        active_owner_role=getattr(case_snapshot, "active_owner_role", None),
    )
    return VerificacaoPublicaPacoteMesa(
        codigo_hash=str(payload.get("codigo_hash") or ""),
        hash_short=str(payload.get("hash_short") or ""),
        verification_url=str(payload.get("verification_url") or ""),
        qr_payload=str(payload.get("qr_payload") or ""),
        qr_image_data_uri=_resumir_texto_curto(payload.get("qr_image_data_uri"), limite=12000),
        empresa_nome=_resumir_texto_curto(payload.get("empresa_nome"), limite=160),
        status_revisao=_resumir_texto_curto(payload.get("status_revisao"), limite=40),
        status_visual_label=_resumir_texto_curto(status_visual_label, limite=120),
        status_conformidade=_resumir_texto_curto(payload.get("status_conformidade"), limite=40),
        approved_at=_normalizar_data_utc(payload.get("approved_at")),
        approval_version=int(payload.get("approval_version") or 0) or None,
        document_outcome=_resumir_texto_curto(payload.get("document_outcome"), limite=80),
    )


def _build_anexo_pack_pacote(payload: dict[str, Any] | None) -> AnexoPackPacoteMesa | None:
    if not isinstance(payload, dict):
        return None
    items = []
    for item in list(payload.get("items") or []):
        if not isinstance(item, dict):
            continue
        item_key = _texto_limpo_curto(item.get("item_key"))
        label = _texto_limpo_curto(item.get("label"))
        category = _texto_limpo_curto(item.get("category"))
        source = _texto_limpo_curto(item.get("source"))
        if not item_key or not label or not category or not source:
            continue
        items.append(
            AnexoPackItemPacoteMesa(
                item_key=item_key[:160],
                label=label[:180],
                category=category[:40],
                required=bool(item.get("required")),
                present=bool(item.get("present")),
                source=source[:40],
                summary=_resumir_texto_curto(item.get("summary"), limite=280),
                mime_type=_resumir_texto_curto(item.get("mime_type"), limite=120),
                size_bytes=int(item.get("size_bytes") or 0) if item.get("size_bytes") is not None else None,
                file_name=_resumir_texto_curto(item.get("file_name"), limite=220),
                archive_path=_resumir_texto_curto(item.get("archive_path"), limite=260),
            )
        )
    return AnexoPackPacoteMesa(
        total_items=int(payload.get("total_items") or 0),
        total_required=int(payload.get("total_required") or 0),
        total_present=int(payload.get("total_present") or 0),
        missing_required_count=int(payload.get("missing_required_count") or 0),
        document_count=int(payload.get("document_count") or 0),
        image_count=int(payload.get("image_count") or 0),
        virtual_count=int(payload.get("virtual_count") or 0),
        ready_for_issue=bool(payload.get("ready_for_issue")),
        missing_items=_normalizar_lista_textos(payload.get("missing_items")),
        items=items,
    )


def montar_pacote_mesa_laudo(
    banco: Session,
    *,
    laudo: Laudo,
    limite_whispers: int = 80,
    limite_pendencias: int = 80,
    limite_revisoes: int = 10,
) -> PacoteMesaLaudo:
    limite_whispers_seguro = max(10, min(int(limite_whispers), 400))
    limite_pendencias_seguro = max(10, min(int(limite_pendencias), 400))
    limite_revisoes_seguro = max(1, min(int(limite_revisoes), 80))

    mensagens = _listar_mensagens_mesa_pacote(banco, laudo=laudo)

    mensagens_summary = build_mesa_message_package_summary(
        mensagens,
        laudo_criado_em=laudo.criado_em,
        laudo_atualizado_em=laudo.atualizado_em,
        limite_whispers=limite_whispers_seguro,
    )

    revisoes = _listar_revisoes_mesa_pacote(
        banco,
        laudo=laudo,
        limite_revisoes=limite_revisoes_seguro,
    )
    revisoes_payload = _build_revisoes_pacote(revisoes)
    documento_estruturado = _montar_documento_estruturado_pacote(laudo)
    coverage_map = _build_coverage_map_pacote(banco, laudo=laudo)
    historico_refazer_inspetor = _build_historico_refazer_inspetor_pacote(
        banco,
        laudo_id=int(laudo.id),
    )
    historico_inspecao = _build_historico_inspecao_pacote(
        banco,
        laudo=laudo,
    )
    case_snapshot = resolver_snapshot_leitura_caso_tecnico(banco, laudo)
    human_override_summary = build_human_override_summary(laudo)
    memoria_operacional_familia = _build_memoria_operacional_familia_pacote(
        banco,
        laudo=laudo,
    )
    verificacao_publica = _build_verificacao_publica_pacote(
        laudo,
        case_snapshot=case_snapshot,
    )
    anexo_pack_payload, emissao_oficial_payload = build_official_issue_package(
        banco,
        laudo=laudo,
    )
    anexo_pack = _build_anexo_pack_pacote(anexo_pack_payload)
    emissao_oficial = _build_emissao_oficial_pacote(emissao_oficial_payload)
    revisao_por_bloco = _build_revisao_por_bloco_pacote(
        banco,
        laudo_id=int(laudo.id),
        documento=documento_estruturado,
        coverage_map=coverage_map,
        mensagens=mensagens,
    )
    catalog_template_scope = _build_catalog_template_scope_pacote(
        banco,
        laudo=laudo,
    )
    status_revisao = getattr(laudo, "status_revisao", "")
    status_conformidade = getattr(laudo, "status_conformidade", "")
    if hasattr(status_revisao, "value"):
        status_revisao = status_revisao.value
    if hasattr(status_conformidade, "value"):
        status_conformidade = status_conformidade.value
    status_visual_label = build_case_status_visual_label(
        lifecycle_status=case_snapshot.case_lifecycle_status,
        active_owner_role=case_snapshot.active_owner_role,
    )
    revisor_id_publico = (
        int(laudo.revisado_por)
        if laudo.revisado_por
        and str(case_snapshot.active_owner_role or "") in {"mesa", "none"}
        else None
    )

    return PacoteMesaLaudo(
        laudo_id=int(laudo.id),
        codigo_hash=str(laudo.codigo_hash or ""),
        tipo_template=str(getattr(laudo, "tipo_template", "") or ""),
        setor_industrial=str(laudo.setor_industrial or ""),
        status_revisao=str(status_revisao or ""),
        status_conformidade=str(status_conformidade or ""),
        case_status=str(case_snapshot.canonical_status or ""),
        case_lifecycle_status=str(case_snapshot.case_lifecycle_status or ""),
        case_workflow_mode=str(case_snapshot.workflow_mode or ""),
        active_owner_role=str(case_snapshot.active_owner_role or ""),
        allowed_next_lifecycle_statuses=list(case_snapshot.allowed_next_lifecycle_statuses),
        allowed_surface_actions=list(case_snapshot.allowed_surface_actions),
        status_visual_label=str(status_visual_label or ""),
        criado_em=_normalizar_data_utc(laudo.criado_em) or agora_utc(),
        atualizado_em=_normalizar_data_utc(laudo.atualizado_em),
        tempo_em_campo_minutos=_tempo_em_campo_minutos(laudo.criado_em),
        ultima_interacao_em=mensagens_summary.ultima_interacao_em,
        inspetor_id=int(laudo.usuario_id) if laudo.usuario_id else None,
        revisor_id=revisor_id_publico,
        dados_formulario=getattr(laudo, "dados_formulario", None),
        documento_estruturado=documento_estruturado,
        revisao_por_bloco=revisao_por_bloco,
        parecer_ia=getattr(laudo, "parecer_ia", None),
        resumo_mensagens=mensagens_summary.resumo_mensagens,
        resumo_evidencias=mensagens_summary.resumo_evidencias,
        resumo_pendencias=mensagens_summary.resumo_pendencias,
        catalog_template_scope=catalog_template_scope,
        coverage_map=coverage_map,
        historico_inspecao=historico_inspecao,
        human_override_summary=human_override_summary,
        verificacao_publica=verificacao_publica,
        anexo_pack=anexo_pack,
        emissao_oficial=emissao_oficial,
        historico_refazer_inspetor=historico_refazer_inspetor,
        memoria_operacional_familia=memoria_operacional_familia,
        pendencias_abertas=[
            _serializar_mensagem_pacote(msg)
            for msg in mensagens_summary.pendencias_abertas[:limite_pendencias_seguro]
        ],
        pendencias_resolvidas_recentes=[
            _serializar_mensagem_pacote(msg)
            for msg in mensagens_summary.pendencias_resolvidas[:limite_pendencias_seguro]
        ],
        whispers_recentes=[_serializar_mensagem_pacote(msg) for msg in mensagens_summary.whispers_recentes],
        revisoes_recentes=revisoes_payload,
    )


__all__ = [
    "agora_utc",
    "criar_notificacao",
    "montar_pacote_mesa_laudo",
]
