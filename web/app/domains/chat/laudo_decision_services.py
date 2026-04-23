"""Casos de uso de decisão final, revisão mobile e reabertura de laudo."""

from __future__ import annotations

from typing import Any, Literal, cast

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.chat.core_helpers import agora_utc
from app.domains.chat.catalog_pdf_templates import persist_case_instance_payload_for_laudo
from app.domains.chat.laudo_access_helpers import obter_laudo_do_inspetor
from app.domains.chat.laudo_service import ResultadoJson
from app.domains.chat.laudo_workflow_support import (
    _QUALITY_GATE_OVERRIDE_REASON_MIN_LENGTH,
    alinhar_status_canonico_nr35_persistido,
    aplicar_binding_familia_padrao_laudo,
    avaliar_gate_documental_finalizacao,
    build_case_lifecycle_response_fields,
    build_legacy_case_status_payload_for_document_mutation,
    logger,
    registrar_override_humano_gate_qualidade,
    request_base_url,
    resolver_intencao_override_gate_qualidade,
    review_mode_final_from_report_pack,
    texto_curto_limpo,
)
from app.domains.chat.gate_helpers import avaliar_gate_qualidade_laudo
from app.domains.chat.ia_runtime import obter_cliente_ia_ativo
from app.domains.chat.laudo_state_helpers import (
    aplicar_finalizacao_inspetor_ao_laudo,
    aplicar_reabertura_manual_ao_laudo,
    laudo_permite_edicao_inspetor,
    laudo_permite_transicao_finalizacao_inspetor,
    laudo_permite_reabrir,
    obter_contexto_modo_entrada_laudo,
    resolver_alvo_reabertura_manual_laudo,
    serializar_card_laudo,
)
from app.domains.chat.mobile_ai_preferences import limpar_historico_visivel_chat
from app.domains.chat.report_pack_helpers import (
    atualizar_final_validation_mode_report_pack,
    atualizar_report_pack_draft_laudo,
    build_pre_laudo_summary,
    mensagem_incluida_no_contexto_do_laudo,
    obter_dados_formulario_candidate_report_pack,
    obter_pre_laudo_outline_report_pack,
    obter_report_pack_draft_laudo,
)
from app.domains.chat.session_helpers import aplicar_contexto_laudo_selecionado, obter_contexto_inicial_laudo_sessao
from app.domains.chat.template_governance import reaffirm_case_bound_template_governance
from app.domains.chat.templates_ai import obter_schema_template_ia
from app.v2.acl import is_mobile_review_command_allowed
from app.v2.case_runtime import build_technical_case_context_bundle
from app.v2.document import build_document_hard_gate_block_detail
from app.v2.report_pack_rollout_metrics import record_report_pack_finalization_observation
from app.shared.database import (
    EvidenceMesaStatus,
    EvidenceOperationalStatus,
    Laudo,
    MensagemLaudo,
    OperationalIrregularity,
    OperationalIrregularityStatus,
    OperationalSeverity,
    StatusRevisao,
    TipoMensagem,
    Usuario,
    commit_ou_rollback_operacional,
)
from app.shared.inspection_history import build_human_override_summary, build_inspection_history_summary
from app.shared.operational_memory import registrar_validacao_evidencia
from app.shared.operational_memory_contracts import EvidenceValidationInput
from app.shared.operational_memory_hooks import (
    find_replayable_approved_case_snapshot_for_laudo,
    record_approved_case_snapshot_for_laudo,
    record_quality_gate_validations,
    record_return_to_inspector_irregularity,
    resolve_open_return_to_inspector_irregularities,
)
from app.shared.public_verification import build_public_verification_payload
from app.shared.official_issue_package import resolve_official_issue_primary_pdf_artifact
from app.shared.tenant_entitlement_guard import ensure_tenant_capability_for_user

_OPEN_RETURN_TO_INSPECTOR_STATUSES = (
    OperationalIrregularityStatus.OPEN.value,
    OperationalIrregularityStatus.ACKNOWLEDGED.value,
)
_MOBILE_APPROVAL_REVIEW_MODES = {"mobile_autonomous", "mobile_review_allowed"}
_REOPEN_ISSUED_DOCUMENT_POLICIES = {"keep_visible", "hide_from_case"}


def _resolver_review_mode_final(
    *,
    request: Request,
    laudo: Laudo,
) -> str:
    policy_summary = getattr(request.state, "v2_policy_decision_summary", None)
    if not isinstance(policy_summary, dict):
        policy_summary = {}
    return str(
        policy_summary.get("review_mode")
        or ((getattr(laudo, "report_pack_draft_json", None) or {}).get("quality_gates") or {}).get(
            "final_validation_mode"
        )
        or "mesa_required"
    ).strip().lower()


def _normalize_reopen_issued_document_policy(value: str | None) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in _REOPEN_ISSUED_DOCUMENT_POLICIES:
        return normalized
    return "keep_visible"


def _registrar_documento_emitido_reaberto(
    *,
    laudo: Laudo,
    actor_user_id: int | None,
    issued_document_policy: str,
    previous_issued_document_name: str | None,
) -> bool:
    previous_name = str(previous_issued_document_name or "").strip()
    if not previous_name:
        return False
    previous_pdf_artifact = resolve_official_issue_primary_pdf_artifact(laudo)
    draft = dict(obter_report_pack_draft_laudo(laudo) or {})
    history = list(draft.get("reopen_issued_document_history") or [])
    history.append(
        {
            "reopened_at": agora_utc().isoformat(),
            "actor_user_id": actor_user_id,
            "source_kind": "issued_pdf_previous_cycle",
            "file_name": previous_name,
            "issued_document_policy": issued_document_policy,
            "visible_in_active_case": issued_document_policy == "keep_visible",
            "internal_learning_candidate": True,
            "pdf_artifact": {
                "storage_version": str((previous_pdf_artifact or {}).get("storage_version") or "").strip() or None,
                "storage_version_number": int((previous_pdf_artifact or {}).get("storage_version_number") or 0) or None,
                "storage_path": str((previous_pdf_artifact or {}).get("storage_path") or "").strip() or None,
                "sha256": str((previous_pdf_artifact or {}).get("sha256") or "").strip() or None,
                "source": str((previous_pdf_artifact or {}).get("source") or "").strip() or None,
            },
        }
    )
    draft["reopen_issued_document_history"] = history[-20:]
    draft["last_reopen_issued_document_policy"] = issued_document_policy
    laudo.report_pack_draft_json = draft
    return True


def _garantir_comando_revisao_mobile_permitido(
    *,
    request: Request,
    usuario: Usuario,
    banco: Session,
    laudo: Laudo,
    command: str,
    block_key: str | None = None,
) -> None:
    legacy_payload = build_legacy_case_status_payload_for_document_mutation(
        banco=banco,
        laudo=laudo,
    )
    runtime_bundle = build_technical_case_context_bundle(
        banco=banco,
        usuario=usuario,
        laudo=laudo,
        legacy_payload=legacy_payload,
        source_channel="mobile_review_command",
        include_policy_decision=False,
        include_document_facade=False,
    )
    case_snapshot = runtime_bundle.case_snapshot
    assert case_snapshot is not None
    review_mode_from_policy = getattr(request.state, "v2_policy_decision_summary", None)
    if not isinstance(review_mode_from_policy, dict):
        review_mode_from_policy = {}
    report_pack_quality_gates = (
        (getattr(laudo, "report_pack_draft_json", None) or {}).get("quality_gates") or {}
    )
    review_mode = str(
        review_mode_from_policy.get("review_mode")
        or report_pack_quality_gates.get("final_validation_mode")
        or ""
    ).strip().lower() or None
    allows_edit = laudo_permite_edicao_inspetor(laudo)
    allowed = []
    for candidate in (
        "enviar_para_mesa",
        "aprovar_no_mobile",
        "devolver_no_mobile",
        "reabrir_bloco",
    ):
        if is_mobile_review_command_allowed(
            lifecycle_status=case_snapshot.case_lifecycle_status,
            allows_edit=allows_edit,
            review_mode=review_mode,
            command=candidate,
            has_block_review_items=bool(str(block_key or "").strip()),
            allow_approval_when_review_mode_unresolved=review_mode is None,
        ):
            allowed.append(candidate)
    if command in allowed:
        return
    raise HTTPException(
        status_code=422,
        detail={
            "code": "mobile_review_command_not_allowed",
            "message": "O comando solicitado nao esta liberado para o estado atual do caso.",
            "command": command,
            "case_lifecycle_status": case_snapshot.case_lifecycle_status,
            "case_workflow_mode": case_snapshot.workflow_mode,
            "active_owner_role": case_snapshot.active_owner_role,
            "review_mode": review_mode or "unresolved",
            "allows_edit": allows_edit,
            "allowed_next_lifecycle_statuses": list(case_snapshot.allowed_next_lifecycle_statuses),
            "allowed_lifecycle_transitions": [
                item.model_dump(mode="python")
                for item in case_snapshot.allowed_lifecycle_transitions
            ],
            "allowed_surface_actions": list(case_snapshot.allowed_surface_actions),
            "allowed_commands": allowed,
        },
    )


def _contar_irregularidades_abertas_retorno_inspetor(
    *,
    banco: Session,
    laudo_id: int,
    block_key: str | None = None,
) -> int:
    consulta = (
        select(OperationalIrregularity.id)
        .where(
            OperationalIrregularity.laudo_id == int(laudo_id),
            OperationalIrregularity.irregularity_type.in_(
                ("block_returned_to_inspector", "field_reopened")
            ),
            OperationalIrregularity.status.in_(_OPEN_RETURN_TO_INSPECTOR_STATUSES),
        )
    )
    if block_key:
        consulta = consulta.where(OperationalIrregularity.block_key == str(block_key))
    return len(list(banco.scalars(consulta).all()))


def _garantir_sem_irregularidades_abertas_para_aprovacao(
    *,
    banco: Session,
    laudo_id: int,
) -> None:
    total_abertas = _contar_irregularidades_abertas_retorno_inspetor(
        banco=banco,
        laudo_id=laudo_id,
    )
    if total_abertas <= 0:
        return
    raise HTTPException(
        status_code=422,
        detail={
            "code": "mobile_review_pending_returns",
            "message": "Ainda existem blocos ou pendencias operacionais em refazer no mobile.",
            "open_return_count": total_abertas,
        },
    )


def _sincronizar_validacao_evidencia_revisao_mobile(
    *,
    banco: Session,
    laudo_id: int,
    actor_user_id: int | None,
    evidence_key: str | None,
    summary: str | None,
    reason: str | None,
    required_action: str | None,
    failure_reasons: list[str] | None,
) -> None:
    evidence_key_limpo = str(evidence_key or "").strip()
    if not evidence_key_limpo:
        return
    registrar_validacao_evidencia(
        banco,
        EvidenceValidationInput(
            laudo_id=int(laudo_id),
            evidence_key=evidence_key_limpo,
            operational_status=EvidenceOperationalStatus.IRREGULAR.value,
            mesa_status=EvidenceMesaStatus.NEEDS_RECHECK.value,
            failure_reasons=list(failure_reasons or []),
            evidence_metadata={
                "origin": "mobile_review_command",
                "summary": str(summary or "").strip(),
                "reason": str(reason or "").strip(),
                "required_action": str(required_action or "").strip(),
            },
            validated_by_user_id=actor_user_id,
            last_evaluated_at=agora_utc(),
        ),
    )


def _registrar_retorno_mobile_para_ajuste(
    *,
    banco: Session,
    laudo: Laudo,
    actor_user_id: int | None,
    command: Literal["devolver_no_mobile", "reabrir_bloco"],
    block_key: str | None,
    evidence_key: str | None,
    title: str | None,
    reason: str | None,
    summary: str | None,
    required_action: str | None,
    failure_reasons: list[str] | None,
) -> None:
    block_key_limpo = str(block_key or "").strip() or (
        "mobile_review:global" if command == "devolver_no_mobile" else "mobile_review:block"
    )
    title_limpo = " ".join(str(title or "").strip().split())[:180]
    reason_limpo = " ".join(str(reason or "").strip().split())[:800]
    summary_limpo = " ".join(str(summary or "").strip().split())[:280]
    required_action_limpa = " ".join(str(required_action or "").strip().split())[:280]
    failure_reasons_norm = [
        " ".join(str(item or "").strip().split())[:120]
        for item in list(failure_reasons or [])
        if str(item or "").strip()
    ]
    default_summary = (
        summary_limpo
        or reason_limpo
        or (
            f"Bloco {title_limpo or block_key_limpo} reaberto na revisão mobile."
            if command == "reabrir_bloco"
            else f"Caso devolvido para ajuste na revisão mobile ({title_limpo or 'ajuste operacional'})."
        )
    )
    default_required_action = (
        required_action_limpa
        or (
            f"Revalidar o bloco {title_limpo or block_key_limpo} antes de concluir o caso."
            if command == "reabrir_bloco"
            else "Corrigir os pontos sinalizados antes de reenviar ou aprovar no mobile."
        )
    )
    event_type = "field_reopened" if command == "reabrir_bloco" else "block_returned_to_inspector"

    _sincronizar_validacao_evidencia_revisao_mobile(
        banco=banco,
        laudo_id=int(laudo.id),
        actor_user_id=actor_user_id,
        evidence_key=evidence_key,
        summary=default_summary,
        reason=reason_limpo,
        required_action=default_required_action,
        failure_reasons=failure_reasons_norm,
    )
    record_return_to_inspector_irregularity(
        banco,
        laudo=laudo,
        actor_user_id=actor_user_id,
        event_type=event_type,
        block_key=block_key_limpo,
        evidence_key=str(evidence_key or "").strip() or None,
        severity=OperationalSeverity.WARNING.value,
        source="inspetor",
        details={
            "decision_source": "mobile_review",
            "title": title_limpo,
            "reason": reason_limpo,
            "summary": default_summary,
            "required_action": default_required_action,
            "failure_reasons": failure_reasons_norm,
        },
    )
    laudo.atualizado_em = agora_utc()
    banco.flush()
    commit_ou_rollback_operacional(
        banco,
        logger_operacao=logger,
        mensagem_erro="Falha ao registrar devolucao operacional do mobile.",
    )


async def _preparar_laudo_para_decisao_final(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> tuple[Laudo, str]:
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    atualizar_report_pack_draft_laudo(banco=banco, laudo=laudo)
    request.state.pending_quality_gate_override = None

    if laudo.status_revisao != StatusRevisao.RASCUNHO.value:
        raise HTTPException(status_code=400, detail="Laudo já foi enviado ou finalizado.")

    aplicar_binding_familia_padrao_laudo(
        laudo=laudo,
        tipo_template=getattr(laudo, "tipo_template", None),
    )

    schema_pydantic = obter_schema_template_ia(laudo.tipo_template)
    if schema_pydantic is not None and not laudo.dados_formulario:
        dados_formulario_candidate = obter_dados_formulario_candidate_report_pack(laudo)
        if dados_formulario_candidate is not None:
            persist_case_instance_payload_for_laudo(
                laudo=laudo,
                source_payload=dados_formulario_candidate,
            )

    if schema_pydantic is not None and not laudo.dados_formulario:
        try:
            mensagens = (
                banco.query(MensagemLaudo)
                .filter(MensagemLaudo.laudo_id == laudo_id)
                .order_by(MensagemLaudo.criado_em.asc())
                .all()
            )

            historico = limpar_historico_visivel_chat(
                [
                    {
                        "papel": (
                            "usuario"
                            if m.tipo in (
                                TipoMensagem.USER.value,
                                TipoMensagem.HUMANO_INSP.value,
                            )
                            else "assistente"
                        ),
                        "texto": m.conteudo,
                    }
                    for m in mensagens
                    if m.tipo in (
                        TipoMensagem.USER.value,
                        TipoMensagem.HUMANO_INSP.value,
                        TipoMensagem.IA.value,
                    )
                    and mensagem_incluida_no_contexto_do_laudo(m)
                ]
            )

            cliente_ia_ativo = obter_cliente_ia_ativo()
            dados_json = await cliente_ia_ativo.gerar_json_estruturado(
                schema_pydantic=schema_pydantic,
                historico=historico,
                dados_imagem="",
                texto_documento="",
            )
            persist_case_instance_payload_for_laudo(
                laudo=laudo,
                source_payload=dados_json if isinstance(dados_json, dict) else None,
            )
        except Exception:
            logger.warning(
                "Falha ao gerar JSON estruturado do template %s na finalização | laudo_id=%s",
                laudo.tipo_template,
                laudo_id,
                exc_info=True,
            )

    contexto_inicial = obter_contexto_inicial_laudo_sessao(
        request,
        laudo_id=int(laudo.id),
    )
    dados_formulario_atual = laudo.dados_formulario if isinstance(laudo.dados_formulario, dict) else {}
    source_payload = (
        {**contexto_inicial, **dados_formulario_atual}
        if (contexto_inicial or dados_formulario_atual)
        else None
    )
    from app.domains.chat.catalog_pdf_templates import materialize_catalog_payload_for_laudo

    materialize_catalog_payload_for_laudo(
        laudo=laudo,
        source_payload=source_payload,
        diagnostico=str(getattr(laudo, "parecer_ia", "") or ""),
        inspetor=str(getattr(usuario, "nome_completo", "") or ""),
        empresa=str(getattr(getattr(usuario, "empresa", None), "nome_fantasia", "") or ""),
    )
    alinhar_status_canonico_nr35_persistido(laudo)

    gate_result = avaliar_gate_qualidade_laudo(banco, laudo)
    try:
        record_quality_gate_validations(
            banco,
            laudo=laudo,
            gate_result=gate_result,
            actor_user_id=int(getattr(usuario, "id", 0) or 0) or None,
        )
    except Exception:
        logger.warning(
            "Falha ao persistir validacoes operacionais do quality gate | laudo_id=%s",
            laudo_id,
            exc_info=True,
        )
    gate_override_request = await resolver_intencao_override_gate_qualidade(request)
    if not bool(gate_result.get("aprovado", False)):
        override_policy = (
            dict(gate_result.get("human_override_policy") or {})
            if isinstance(gate_result.get("human_override_policy"), dict)
            else {}
        )
        if not bool(gate_override_request.get("requested")):
            raise HTTPException(status_code=422, detail=gate_result)

        if not bool(override_policy.get("available")):
            override_policy["requested"] = True
            override_policy["validation_error"] = (
                "Este bloqueio ainda exige correção da coleta; a exceção governada não pode ser aplicada agora."
            )
            gate_result["human_override_policy"] = override_policy
            gate_result["mensagem"] = str(override_policy["validation_error"])
            raise HTTPException(status_code=422, detail=gate_result)

        reason = texto_curto_limpo(
            gate_override_request.get("reason"),
            limite=2000,
        )
        if len(reason) < _QUALITY_GATE_OVERRIDE_REASON_MIN_LENGTH:
            override_policy["requested"] = True
            override_policy["validation_error"] = (
                "Informe uma justificativa interna com pelo menos 12 caracteres para seguir com a exceção governada."
            )
            gate_result["human_override_policy"] = override_policy
            gate_result["mensagem"] = str(override_policy["validation_error"])
            raise HTTPException(status_code=422, detail=gate_result)

        request.state.pending_quality_gate_override = {
            **gate_override_request,
            "reason": reason,
            "human_override_policy": override_policy,
        }

    hard_gate_result = None
    try:
        _, hard_gate_result = avaliar_gate_documental_finalizacao(
            request=request,
            usuario=usuario,
            banco=banco,
            laudo=laudo,
        )
    except Exception:
        logger.debug("Falha ao avaliar hard gate documental da finalizacao.", exc_info=True)
        request.state.v2_document_hard_gate_error = "report_finalize_hard_gate_failed"

    if hard_gate_result is not None and hard_gate_result.decision.did_block:
        raise HTTPException(
            status_code=int(hard_gate_result.blocked_response_status or 422),
            detail=build_document_hard_gate_block_detail(hard_gate_result),
        )

    return laudo, _resolver_review_mode_final(request=request, laudo=laudo)


def _persistir_decisao_final_laudo(
    *,
    banco: Session,
    laudo: Laudo,
    usuario: Usuario,
    laudo_id: int,
    final_validation_mode: str,
    status_destino: str,
    document_outcome: str,
    mesa_resolution_summary: dict[str, Any],
    quality_gate_override_request: dict[str, Any] | None = None,
) -> None:
    target_case_lifecycle_status: Literal["aguardando_mesa", "aprovado"] = (
        "aprovado"
        if status_destino == StatusRevisao.APROVADO.value
        else "aguardando_mesa"
    )
    if not laudo_permite_transicao_finalizacao_inspetor(
        banco,
        laudo,
        target_status=target_case_lifecycle_status,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Laudo não está em estágio compatível com aprovação final."
                if target_case_lifecycle_status == "aprovado"
                else "Laudo não está em estágio compatível com envio para a mesa."
            ),
        )

    aplicar_finalizacao_inspetor_ao_laudo(
        laudo,
        target_status=target_case_lifecycle_status,
        occurred_at=agora_utc(),
        clear_reopen_anchor=target_case_lifecycle_status != "aprovado",
    )
    atualizar_final_validation_mode_report_pack(
        laudo=laudo,
        final_validation_mode=final_validation_mode,
    )
    registrar_override_humano_gate_qualidade(
        banco=banco,
        laudo=laudo,
        usuario=usuario,
        final_validation_mode=final_validation_mode,
        gate_override_request=quality_gate_override_request or {},
    )
    if status_destino == StatusRevisao.APROVADO.value:
        try:
            record_approved_case_snapshot_for_laudo(
                banco,
                laudo=laudo,
                approved_by_id=int(getattr(usuario, "id", 0) or 0) or None,
                document_outcome=document_outcome,
                mesa_resolution_summary=mesa_resolution_summary,
            )
        except Exception:
            logger.warning(
                "Falha ao registrar snapshot aprovado do fluxo mobile | laudo_id=%s",
                laudo_id,
                exc_info=True,
            )
    record_report_pack_finalization_observation(
        laudo=laudo,
        report_pack_draft=obter_report_pack_draft_laudo(laudo),
        final_validation_mode=final_validation_mode,
        status_revisao=laudo.status_revisao,
    )
    banco.flush()


async def finalizar_relatorio_resposta(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
) -> ResultadoJson:
    ensure_tenant_capability_for_user(
        usuario,
        capability="inspector_case_finalize",
    )
    laudo_existente = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    if laudo_existente.status_revisao == StatusRevisao.APROVADO.value:
        snapshot_replay = find_replayable_approved_case_snapshot_for_laudo(
            banco,
            laudo=laudo_existente,
            approved_by_id=int(getattr(usuario, "id", 0) or 0) or None,
            document_outcome="approved_mobile_autonomous",
            mesa_resolution_summary={
                "decision": "approved",
                "decision_source": "mobile_autonomous",
                "actor_user_id": int(getattr(usuario, "id", 0) or 0) or None,
                "review_mode_final": "mobile_autonomous",
            },
        )
        if snapshot_replay is not None:
            contexto_existente = aplicar_contexto_laudo_selecionado(request, banco, laudo_existente, usuario)
            return (
                {
                    "success": True,
                    "message": "✅ Aprovação mobile já consolidada anteriormente para este caso.",
                    "laudo_id": laudo_existente.id,
                    "estado": contexto_existente["estado"],
                    "permite_reabrir": contexto_existente["permite_reabrir"],
                    "review_mode_final": review_mode_final_from_report_pack(
                        laudo_existente,
                        fallback="mobile_autonomous",
                    ),
                    "idempotent_replay": True,
                    "inspection_history": build_inspection_history_summary(
                        banco,
                        laudo=laudo_existente,
                    ),
                    "human_override_summary": build_human_override_summary(laudo_existente),
                    "public_verification": build_public_verification_payload(
                        laudo=laudo_existente,
                        base_url=request_base_url(request),
                    ),
                    "pre_laudo_summary": build_pre_laudo_summary(
                        obter_pre_laudo_outline_report_pack(obter_report_pack_draft_laudo(laudo_existente))
                    ),
                    **build_case_lifecycle_response_fields(contexto_existente),
                    **obter_contexto_modo_entrada_laudo(laudo_existente),
                    "laudo_card": serializar_card_laudo(banco, laudo_existente),
                    "report_pack_draft": obter_report_pack_draft_laudo(laudo_existente),
                },
                200,
            )

    laudo, final_validation_mode = await _preparar_laudo_para_decisao_final(
        laudo_id=laudo_id,
        request=request,
        usuario=usuario,
        banco=banco,
    )
    status_destino = (
        StatusRevisao.APROVADO.value
        if final_validation_mode == "mobile_autonomous"
        else StatusRevisao.AGUARDANDO.value
    )
    _persistir_decisao_final_laudo(
        banco=banco,
        laudo=laudo,
        usuario=usuario,
        laudo_id=laudo_id,
        final_validation_mode=final_validation_mode,
        status_destino=status_destino,
        document_outcome=(
            "approved_mobile_autonomous"
            if final_validation_mode == "mobile_autonomous"
            else "submitted_to_mesa"
        ),
        mesa_resolution_summary={
            "decision": "approved" if final_validation_mode == "mobile_autonomous" else "send_to_mesa",
            "decision_source": final_validation_mode,
            "actor_user_id": int(getattr(usuario, "id", 0) or 0) or None,
            "review_mode_final": final_validation_mode,
        },
        quality_gate_override_request=getattr(
            request.state,
            "pending_quality_gate_override",
            None,
        ),
    )
    contexto = aplicar_contexto_laudo_selecionado(request, banco, laudo, usuario)

    logger.info("Relatório finalizado | usuario_id=%s | laudo_id=%s", usuario.id, laudo_id)

    return (
        {
            "success": True,
            "message": (
                "✅ Relatório aprovado automaticamente com o report pack canônico do caso."
                if final_validation_mode == "mobile_autonomous"
                else "✅ Relatório enviado para engenharia! Já aparece na Mesa de Avaliação."
            ),
            "laudo_id": laudo.id,
            "estado": contexto["estado"],
            "permite_reabrir": contexto["permite_reabrir"],
            "review_mode_final": final_validation_mode,
            "idempotent_replay": False,
            "inspection_history": build_inspection_history_summary(
                banco,
                laudo=laudo,
            ),
            "human_override_summary": build_human_override_summary(laudo),
            "public_verification": build_public_verification_payload(
                laudo=laudo,
                base_url=request_base_url(request),
            ),
            "pre_laudo_summary": build_pre_laudo_summary(
                obter_pre_laudo_outline_report_pack(obter_report_pack_draft_laudo(laudo))
            ),
            **build_case_lifecycle_response_fields(contexto),
            **obter_contexto_modo_entrada_laudo(laudo),
            "laudo_card": serializar_card_laudo(banco, laudo),
            "report_pack_draft": obter_report_pack_draft_laudo(laudo),
        },
        200,
    )


async def executar_comando_revisao_mobile_resposta(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
    command: str,
    block_key: str | None = None,
    evidence_key: str | None = None,
    title: str | None = None,
    reason: str | None = None,
    summary: str | None = None,
    required_action: str | None = None,
    failure_reasons: list[str] | None = None,
) -> ResultadoJson:
    comando = str(command or "").strip().lower()
    if comando not in {
        "enviar_para_mesa",
        "aprovar_no_mobile",
        "devolver_no_mobile",
        "reabrir_bloco",
    }:
        raise HTTPException(status_code=400, detail="Comando de revisão mobile inválido.")
    if comando == "enviar_para_mesa":
        ensure_tenant_capability_for_user(
            usuario,
            capability="inspector_send_to_mesa",
        )
    elif comando == "aprovar_no_mobile":
        ensure_tenant_capability_for_user(
            usuario,
            capability="mobile_case_approve",
        )

    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    if laudo.status_revisao == StatusRevisao.APROVADO.value:
        if comando == "aprovar_no_mobile":
            snapshot_replay = find_replayable_approved_case_snapshot_for_laudo(
                banco,
                laudo=laudo,
                approved_by_id=int(getattr(usuario, "id", 0) or 0) or None,
                document_outcome="approved_mobile_review",
                mesa_resolution_summary={
                    "decision": "approved",
                    "decision_source": "mobile_review",
                    "actor_user_id": int(getattr(usuario, "id", 0) or 0) or None,
                    "review_mode_final": review_mode_final_from_report_pack(
                        laudo,
                        fallback="mobile_autonomous",
                    ),
                },
            )
            if snapshot_replay is not None:
                contexto_existente = aplicar_contexto_laudo_selecionado(request, banco, laudo, usuario)
                return (
                    {
                        "ok": True,
                        "command": comando,
                        "message": "Caso já estava aprovado no mobile; replay idempotente reaproveitado.",
                        "laudo_id": int(laudo.id),
                        "estado": contexto_existente["estado"],
                        "permite_edicao": contexto_existente["permite_edicao"],
                        "permite_reabrir": contexto_existente["permite_reabrir"],
                        "review_mode_final": review_mode_final_from_report_pack(
                            laudo,
                            fallback="mobile_autonomous",
                        ),
                        "idempotent_replay": True,
                        "inspection_history": build_inspection_history_summary(
                            banco,
                            laudo=laudo,
                        ),
                        "human_override_summary": build_human_override_summary(laudo),
                        "public_verification": build_public_verification_payload(
                            laudo=laudo,
                            base_url=request_base_url(request),
                        ),
                        **build_case_lifecycle_response_fields(contexto_existente),
                        **obter_contexto_modo_entrada_laudo(laudo),
                        "laudo_card": serializar_card_laudo(banco, laudo),
                    },
                    200,
                )
        raise HTTPException(status_code=400, detail="Laudo aprovado nao aceita comandos de revisão mobile.")
    _garantir_comando_revisao_mobile_permitido(
        request=request,
        usuario=usuario,
        banco=banco,
        laudo=laudo,
        command=comando,
        block_key=block_key,
    )

    actor_user_id = int(getattr(usuario, "id", 0) or 0) or None
    review_mode_final: str | None = None
    success_message = ""

    if comando in {"enviar_para_mesa", "aprovar_no_mobile"}:
        laudo, review_mode_resolvido = await _preparar_laudo_para_decisao_final(
            laudo_id=laudo_id,
            request=request,
            usuario=usuario,
            banco=banco,
        )
        if comando == "aprovar_no_mobile":
            if review_mode_resolvido not in _MOBILE_APPROVAL_REVIEW_MODES:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "mobile_review_not_allowed",
                        "message": "A policy ativa nao permite aprovacao final no mobile para este caso.",
                        "review_mode": review_mode_resolvido,
                    },
                )
            _garantir_sem_irregularidades_abertas_para_aprovacao(
                banco=banco,
                laudo_id=int(laudo.id),
            )
            review_mode_final = review_mode_resolvido
            _persistir_decisao_final_laudo(
                banco=banco,
                laudo=laudo,
                usuario=usuario,
                laudo_id=laudo_id,
                final_validation_mode=review_mode_final,
                status_destino=StatusRevisao.APROVADO.value,
                document_outcome="approved_mobile_review",
                mesa_resolution_summary={
                    "decision": "approved",
                    "decision_source": "mobile_review",
                    "actor_user_id": actor_user_id,
                    "review_mode_final": review_mode_final,
                },
                quality_gate_override_request=getattr(
                    request.state,
                    "pending_quality_gate_override",
                    None,
                ),
            )
            resolve_open_return_to_inspector_irregularities(
                banco,
                laudo_id=int(laudo.id),
                resolved_by_id=actor_user_id,
                resolution_mode="edited_case_data",
                resolution_notes="Aprovacao final consolidada no fluxo mobile.",
            )
            banco.flush()
            success_message = "Caso aprovado no mobile com trilha governada."
        else:
            review_mode_final = "mesa_required"
            _persistir_decisao_final_laudo(
                banco=banco,
                laudo=laudo,
                usuario=usuario,
                laudo_id=laudo_id,
                final_validation_mode=review_mode_final,
                status_destino=StatusRevisao.AGUARDANDO.value,
                document_outcome="submitted_to_mesa",
                mesa_resolution_summary={
                    "decision": "send_to_mesa",
                    "decision_source": "mobile_review",
                    "actor_user_id": actor_user_id,
                    "review_mode_final": review_mode_resolvido,
                    "review_mode_override": review_mode_final,
                },
                quality_gate_override_request=getattr(
                    request.state,
                    "pending_quality_gate_override",
                    None,
                ),
            )
            success_message = "Caso enviado para a Mesa Avaliadora a partir do mobile."
    else:
        if laudo.status_revisao != StatusRevisao.RASCUNHO.value:
            raise HTTPException(
                status_code=400,
                detail="Somente laudos em rascunho aceitam devolucao ou reabertura de bloco no mobile.",
            )
        reaffirm_case_bound_template_governance(laudo=laudo)
        if comando == "reabrir_bloco" and not str(block_key or "").strip():
            raise HTTPException(status_code=400, detail="block_key e obrigatório para reabrir bloco.")
        mobile_return_command = cast(
            Literal["devolver_no_mobile", "reabrir_bloco"],
            comando,
        )
        _registrar_retorno_mobile_para_ajuste(
            banco=banco,
            laudo=laudo,
            actor_user_id=actor_user_id,
            command=mobile_return_command,
            block_key=block_key,
            evidence_key=evidence_key,
            title=title,
            reason=reason,
            summary=summary,
            required_action=required_action,
            failure_reasons=failure_reasons,
        )
        success_message = (
            "Bloco reaberto na revisao mobile."
            if comando == "reabrir_bloco"
            else "Caso devolvido para ajuste no fluxo mobile."
        )

    contexto = aplicar_contexto_laudo_selecionado(request, banco, laudo, usuario)
    return (
        {
            "ok": True,
            "command": comando,
            "message": success_message,
            "laudo_id": int(laudo.id),
            "estado": contexto["estado"],
            "permite_edicao": contexto["permite_edicao"],
            "permite_reabrir": contexto["permite_reabrir"],
            "review_mode_final": review_mode_final,
            "idempotent_replay": False,
            "inspection_history": build_inspection_history_summary(
                banco,
                laudo=laudo,
            ),
            "human_override_summary": build_human_override_summary(laudo),
            "public_verification": build_public_verification_payload(
                laudo=laudo,
                base_url=request_base_url(request),
            ),
            **build_case_lifecycle_response_fields(contexto),
            **obter_contexto_modo_entrada_laudo(laudo),
            "laudo_card": serializar_card_laudo(banco, laudo),
        },
        200,
    )


async def reabrir_laudo_resposta(
    *,
    laudo_id: int,
    request: Request,
    usuario: Usuario,
    banco: Session,
    issued_document_policy: str | None = None,
) -> ResultadoJson:
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    reopen_target = resolver_alvo_reabertura_manual_laudo(banco, laudo)
    if reopen_target is None or not laudo_permite_reabrir(banco, laudo):
        raise HTTPException(
            status_code=400,
            detail="Este laudo ainda não possui ajustes liberados para reabertura.",
        )

    policy_applied = _normalize_reopen_issued_document_policy(issued_document_policy)
    previous_issued_document_name = str(getattr(laudo, "nome_arquivo_pdf", "") or "").strip() or None
    actor_user_id = int(getattr(usuario, "id", 0) or 0) or None
    internal_learning_candidate_registered = _registrar_documento_emitido_reaberto(
        laudo=laudo,
        actor_user_id=actor_user_id,
        issued_document_policy=policy_applied,
        previous_issued_document_name=previous_issued_document_name,
    )
    if previous_issued_document_name and policy_applied == "hide_from_case":
        laudo.nome_arquivo_pdf = None
    reaffirm_case_bound_template_governance(laudo=laudo)
    aplicar_reabertura_manual_ao_laudo(
        laudo,
        target_status=reopen_target,
        reopened_at=agora_utc(),
    )
    banco.flush()

    contexto = aplicar_contexto_laudo_selecionado(request, banco, laudo, usuario)

    return (
        {
            "success": True,
            "message": "Inspeção reaberta. Você já pode continuar o laudo.",
            "laudo_id": laudo.id,
            "estado": contexto["estado"],
            "permite_reabrir": contexto["permite_reabrir"],
            **build_case_lifecycle_response_fields(contexto),
            "issued_document_policy_applied": policy_applied,
            "had_previous_issued_document": previous_issued_document_name is not None,
            "previous_issued_document_visible_in_case": bool(
                previous_issued_document_name and policy_applied == "keep_visible"
            ),
            "internal_learning_candidate_registered": internal_learning_candidate_registered,
            **obter_contexto_modo_entrada_laudo(laudo),
            "laudo_card": serializar_card_laudo(banco, laudo),
        },
        200,
    )
