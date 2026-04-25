"""Serviços neutros do ciclo de laudo do portal inspetor."""

from __future__ import annotations

import uuid
from typing import Any, TypeAlias

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.domains.chat.auth_mobile_support import obter_contexto_preferencia_modo_entrada_usuario
from app.domains.chat.catalog_pdf_templates import (
    capture_catalog_snapshot_for_laudo,
    materialize_catalog_instance_payload_for_laudo,
)
from app.domains.chat.chat_runtime import (
    MODO_DETALHADO,
    resolver_modo_entrada_caso,
)
from app.domains.chat.gate_helpers import avaliar_gate_qualidade_laudo
from app.domains.chat.laudo_access_helpers import obter_laudo_do_inspetor
from app.domains.chat.laudo_status_response_services import obter_status_relatorio_resposta
from app.domains.chat.laudo_workflow_support import (
    build_case_lifecycle_response_fields,
    logger,
    request_base_url,
)
from app.domains.chat.laudo_state_helpers import (
    obter_contexto_modo_entrada_laudo,
    obter_guided_inspection_draft_laudo,
    serializar_card_laudo,
)
from app.domains.chat.schemas import GuidedInspectionDraftPayload
from app.domains.chat.limits_helpers import garantir_limite_laudos
from app.domains.chat.normalization import (
    nome_template_humano,
    resolver_familia_padrao_template,
)
from app.domains.chat.report_pack_helpers import (
    atualizar_report_pack_draft_laudo,
    build_pre_laudo_summary,
    obter_pre_laudo_outline_report_pack,
    obter_report_pack_draft_laudo,
)
from app.domains.chat.session_helpers import (
    aplicar_contexto_laudo_selecionado,
    definir_contexto_inicial_laudo_sessao,
)
from app.domains.chat.template_governance import (
    apply_template_governance_to_laudo,
    resolve_guided_template_governance,
)
from app.shared.database import (
    Laudo,
    Usuario,
    StatusRevisao,
    commit_ou_rollback_operacional,
)
from app.shared.inspection_history import (
    build_clone_from_last_inspection_seed,
)
from app.shared.tenant_entitlement_guard import (
    ensure_tenant_capability_for_user,
)
from app.shared.operational_memory_hooks import (
    record_quality_gate_validations,
)
from app.shared.public_verification import build_public_verification_payload
from app.shared.tenant_report_catalog import resolve_tenant_template_request

PayloadJson: TypeAlias = dict[str, Any]
ResultadoJson: TypeAlias = tuple[PayloadJson, int]

RESPOSTA_LAUDO_NAO_ENCONTRADO = {404: {"description": "Laudo não encontrado."}}
RESPOSTA_GATE_QUALIDADE_REPROVADO = {
    422: {
        "description": "Finalização interrompida por pendências.",
        "content": {"application/json": {"schema": {"type": "object"}}},
    }
}
RESPOSTA_DOCUMENT_HARD_GATE_BLOQUEADO = {
    422: {
        "description": "Hard gate documental controlado bloqueou a operacao.",
        "content": {"application/json": {"schema": {"type": "object"}}},
    }
}

async def _resolver_tipo_template_bruto(
    *,
    request: Request,
    tipo_template: str | None,
    tipotemplate: str | None,
) -> str:
    tipo_template_bruto = (tipo_template or tipotemplate or "").strip().lower()

    if not tipo_template_bruto:
        payload_json: PayloadJson = {}
        try:
            payload_json = await request.json()
        except Exception:
            payload_json = {}

        tipo_template_bruto = str(
            payload_json.get("tipo_template")
            or payload_json.get("tipotemplate")
            or payload_json.get("template")
            or ""
        ).strip().lower()

    return tipo_template_bruto or "padrao"


async def _resolver_entry_mode_preference_bruta(
    *,
    request: Request,
    entry_mode_preference: str | None,
) -> str | None:
    valor_bruto = str(entry_mode_preference or "").strip().lower()
    if valor_bruto:
        return valor_bruto

    payload_json: PayloadJson = {}
    try:
        payload_json = await request.json()
    except Exception:
        payload_json = {}

    valor_bruto = str(
        payload_json.get("entry_mode_preference")
        or payload_json.get("entryModePreference")
        or payload_json.get("entry_mode")
        or ""
    ).strip().lower()
    return valor_bruto or None


def _normalizar_texto_contexto_inicial(
    valor: str | None,
    *,
    limite: int,
) -> str:
    texto = " ".join(str(valor or "").strip().split())
    if not texto:
        return ""
    return texto[:limite]


def _construir_dados_formulario_inicial(
    *,
    cliente: str | None,
    unidade: str | None,
    local_inspecao: str | None,
    objetivo: str | None,
    nome_inspecao: str | None,
) -> dict[str, str] | None:
    payload = {
        "cliente": _normalizar_texto_contexto_inicial(cliente, limite=120),
        "unidade": _normalizar_texto_contexto_inicial(unidade, limite=120),
        "local_inspecao": _normalizar_texto_contexto_inicial(local_inspecao, limite=120),
        "objetivo": _normalizar_texto_contexto_inicial(objetivo, limite=600),
        "nome_inspecao": _normalizar_texto_contexto_inicial(nome_inspecao, limite=160),
    }
    dados_filtrados = {chave: valor for chave, valor in payload.items() if valor}
    return dados_filtrados or None


def salvar_guided_inspection_draft_mobile_resposta(
    *,
    laudo_id: int,
    guided_inspection_draft: GuidedInspectionDraftPayload | None,
    usuario: Usuario,
    banco: Session,
) -> ResultadoJson:
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    if laudo.status_revisao != StatusRevisao.RASCUNHO.value:
        raise HTTPException(
            status_code=400,
            detail="Somente laudos em rascunho aceitam persistencia do draft guiado.",
        )

    if guided_inspection_draft is not None:
        resolucao_template = resolve_guided_template_governance(
            banco,
            usuario=usuario,
            template_key=guided_inspection_draft.template_key,
            laudo=laudo,
        )
        laudo.guided_inspection_draft_json = guided_inspection_draft.model_dump(mode="python")
        apply_template_governance_to_laudo(
            laudo=laudo,
            resolucao_template=resolucao_template,
        )
        capture_catalog_snapshot_for_laudo(
            banco=banco,
            laudo=laudo,
        )
    else:
        laudo.guided_inspection_draft_json = None
    atualizar_report_pack_draft_laudo(banco=banco, laudo=laudo)
    commit_ou_rollback_operacional(
        banco,
        logger_operacao=logger,
        mensagem_erro="Falha ao salvar draft guiado do laudo mobile.",
    )
    banco.refresh(laudo)

    return (
        {
            "ok": True,
            "laudo_id": int(laudo.id),
            "guided_inspection_draft": obter_guided_inspection_draft_laudo(laudo),
            "report_pack_draft": obter_report_pack_draft_laudo(laudo),
            "pre_laudo_summary": build_pre_laudo_summary(
                obter_pre_laudo_outline_report_pack(obter_report_pack_draft_laudo(laudo))
            ),
        },
        200,
    )


async def iniciar_relatorio_resposta(
    *,
    request: Request,
    tipo_template: str | None,
    tipotemplate: str | None,
    cliente: str | None,
    unidade: str | None,
    local_inspecao: str | None,
    objetivo: str | None,
    nome_inspecao: str | None,
    entry_mode_preference: str | None,
    usuario: Usuario,
    banco: Session,
) -> ResultadoJson:
    ensure_tenant_capability_for_user(
        usuario,
        capability="inspector_case_create",
    )
    tipo_template_bruto = await _resolver_tipo_template_bruto(
        request=request,
        tipo_template=tipo_template,
        tipotemplate=tipotemplate,
    )
    try:
        resolucao_template = resolve_tenant_template_request(
            banco,
            empresa_id=int(usuario.empresa_id),
            requested_value=tipo_template_bruto,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    tipo_template_normalizado = str(resolucao_template["runtime_template_code"] or "padrao").strip().lower() or "padrao"
    family_binding = resolver_familia_padrao_template(tipo_template_normalizado)
    family_key_resolvida = (
        str(resolucao_template.get("family_key") or "").strip()
        or str(family_binding.get("family_key") or "").strip()
        or None
    )
    family_label_resolvida = (
        str(resolucao_template.get("family_label") or "").strip()
        or str(family_binding.get("family_label") or "").strip()
        or None
    )
    entry_mode_preference_bruta = await _resolver_entry_mode_preference_bruta(
        request=request,
        entry_mode_preference=entry_mode_preference,
    )
    contexto_preferencia_modo_entrada = obter_contexto_preferencia_modo_entrada_usuario(
        banco,
        usuario_id=int(usuario.id),
    )
    try:
        entry_mode_decision = resolver_modo_entrada_caso(
            requested_preference=entry_mode_preference_bruta,
            existing_preference=contexto_preferencia_modo_entrada.entry_mode_preference,
            last_case_mode=(
                contexto_preferencia_modo_entrada.last_case_mode
                if contexto_preferencia_modo_entrada.remember_last_case_mode
                else None
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    garantir_limite_laudos(usuario, banco)

    dados_formulario_inicial = _construir_dados_formulario_inicial(
        cliente=cliente,
        unidade=unidade,
        local_inspecao=local_inspecao,
        objetivo=objetivo,
        nome_inspecao=nome_inspecao,
    )
    clone_from_last_inspection = build_clone_from_last_inspection_seed(
        banco,
        empresa_id=int(usuario.empresa_id),
        family_key=str(family_key_resolvida or tipo_template_normalizado),
        current_payload=dados_formulario_inicial,
    )
    prefill_data = (
        clone_from_last_inspection.get("prefill_data")
        if isinstance(clone_from_last_inspection, dict)
        else None
    )
    if isinstance(prefill_data, dict):
        dados_formulario_inicial = dict(prefill_data)
    setor_industrial = (
        str((dados_formulario_inicial or {}).get("local_inspecao") or "").strip()
        or str((dados_formulario_inicial or {}).get("nome_inspecao") or "").strip()
        or nome_template_humano(tipo_template_normalizado)
    )

    laudo = Laudo(
        empresa_id=usuario.empresa_id,
        usuario_id=usuario.id,
        tipo_template=tipo_template_normalizado,
        catalog_selection_token=resolucao_template.get("selection_token"),
        catalog_family_key=family_key_resolvida,
        catalog_family_label=family_label_resolvida,
        catalog_variant_key=resolucao_template.get("variant_key"),
        catalog_variant_label=resolucao_template.get("variant_label"),
        status_revisao=StatusRevisao.RASCUNHO.value,
        setor_industrial=setor_industrial[:100],
        primeira_mensagem=None,
        modo_resposta=MODO_DETALHADO,
        codigo_hash=uuid.uuid4().hex,
        is_deep_research=False,
        entry_mode_preference=entry_mode_decision.preference,
        entry_mode_effective=entry_mode_decision.effective,
        entry_mode_reason=entry_mode_decision.reason,
    )

    banco.add(laudo)
    banco.flush()
    capture_catalog_snapshot_for_laudo(
        banco=banco,
        laudo=laudo,
    )
    if laudo.catalog_selection_token and laudo.catalog_family_key:
        materialize_catalog_instance_payload_for_laudo(
            laudo=laudo,
            source_payload=dados_formulario_inicial,
        )
    banco.flush()
    banco.refresh(laudo)
    # O laudo precisa estar committed antes do próximo request do inspetor
    # (ex.: widget/canal da mesa) para evitar 404 por registro ainda não visível.
    commit_ou_rollback_operacional(
        banco,
        logger_operacao=logger,
        mensagem_erro="Falha ao criar laudo do inspetor.",
    )
    banco.refresh(laudo)

    definir_contexto_inicial_laudo_sessao(
        request,
        laudo_id=laudo.id,
        contexto=dados_formulario_inicial,
    )
    contexto = aplicar_contexto_laudo_selecionado(request, banco, laudo, usuario)

    logger.info(
        "Relatório iniciado | usuario_id=%s | tipo=%s | family_key=%s | variant_key=%s | laudo_id=%s",
        usuario.id,
        tipo_template_normalizado,
        resolucao_template.get("family_key"),
        resolucao_template.get("variant_key"),
        laudo.id,
    )
    public_verification = build_public_verification_payload(
        laudo=laudo,
        base_url=request_base_url(request),
    )

    return (
        {
            "success": True,
            "laudo_id": laudo.id,
            "hash": laudo.codigo_hash[-6:],
            "message": f"✅ Inspeção {nome_template_humano(tipo_template_normalizado)} criada. Envie a primeira mensagem para iniciar o laudo.",
            "estado": "sem_relatorio",
            "tipo_template": tipo_template_normalizado,
            "catalog_governed_mode": bool(resolucao_template.get("governed_mode")),
            "catalog_selection_token": resolucao_template.get("selection_token"),
            "catalog_family_key": resolucao_template.get("family_key"),
            "catalog_variant_key": resolucao_template.get("variant_key"),
            "clone_from_last_inspection": clone_from_last_inspection,
            "public_verification": public_verification,
            **build_case_lifecycle_response_fields(contexto),
            **obter_contexto_modo_entrada_laudo(laudo),
            "laudo_card": serializar_card_laudo(banco, laudo),
        },
        200,
    )


def obter_gate_qualidade_laudo_resposta(
    *,
    laudo_id: int,
    usuario: Usuario,
    banco: Session,
) -> ResultadoJson:
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    resultado = avaliar_gate_qualidade_laudo(banco, laudo)
    try:
        record_quality_gate_validations(
            banco,
            laudo=laudo,
            gate_result=resultado,
            actor_user_id=int(getattr(usuario, "id", 0) or 0) or None,
        )
    except Exception:
        logger.warning(
            "Falha ao persistir observacao operacional do gate de qualidade | laudo_id=%s",
            laudo_id,
            exc_info=True,
        )

    status_http = 200 if bool(resultado.get("aprovado", False)) else 422
    return resultado, status_http




__all__ = [
    "RESPOSTA_DOCUMENT_HARD_GATE_BLOQUEADO",
    "RESPOSTA_GATE_QUALIDADE_REPROVADO",
    "RESPOSTA_LAUDO_NAO_ENCONTRADO",
    "ResultadoJson",
    "iniciar_relatorio_resposta",
    "obter_gate_qualidade_laudo_resposta",
    "obter_status_relatorio_resposta",
]
