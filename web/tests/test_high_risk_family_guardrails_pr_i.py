from __future__ import annotations

from sqlalchemy import select

from app.domains.chat.high_risk_family_guardrails import (
    family_requires_separate_mesa_review,
    resolve_high_risk_family_guardrail,
)
from app.shared.database import (
    ApprovedCaseSnapshot,
    EmissaoOficialLaudo,
    Empresa,
    Laudo,
    StatusRevisao,
)
from tests.regras_rotas_criticas_support import (
    _criar_laudo,
    _login_app_inspetor,
)


def _configurar_empresa(
    banco,
    ids: dict[str, int],
    *,
    package: str,
) -> None:
    empresa = banco.get(Empresa, ids["empresa_a"])
    assert empresa is not None
    empresa.admin_cliente_policy_json = {"commercial_service_package": package}


def _criar_laudo_com_familia(
    banco,
    ids: dict[str, int],
    *,
    family_key: str,
    template_key: str,
    final_validation_mode: str = "mesa_required",
) -> int:
    laudo_id = _criar_laudo(
        banco,
        empresa_id=ids["empresa_a"],
        usuario_id=ids["inspetor_a"],
        status_revisao=StatusRevisao.RASCUNHO.value,
        tipo_template=template_key,
    )
    laudo = banco.get(Laudo, laudo_id)
    assert laudo is not None
    laudo.catalog_family_key = family_key
    laudo.report_pack_draft_json = {
        "family": family_key,
        "template_key": template_key,
        "quality_gates": {"final_validation_mode": final_validation_mode},
    }
    banco.commit()
    return laudo_id


def test_guardrail_reconhece_familias_modeladas_de_alto_risco() -> None:
    for family_key in (
        "nr35_inspecao_linha_de_vida",
        "nr35_inspecao_ponto_ancoragem",
        "nr13_inspecao_caldeira",
        "nr13_inspecao_vaso_pressao",
        "nr20_prontuario_instalacoes_inflamaveis",
        "nr10_prontuario_instalacoes_eletricas",
    ):
        assert family_requires_separate_mesa_review(catalog_family_key=family_key) is True

    assert family_requires_separate_mesa_review(catalog_family_key="geral") is False
    assert family_requires_separate_mesa_review(template_key="padrao") is False

    nr35_guardrail = resolve_high_risk_family_guardrail(
        catalog_family_key="nr35_inspecao_linha_de_vida"
    )
    assert nr35_guardrail is not None
    assert nr35_guardrail.code == "nr35_mesa_required_unavailable"

    generic_guardrail = resolve_high_risk_family_guardrail(
        catalog_family_key="nr13_inspecao_caldeira"
    )
    assert generic_guardrail is not None
    assert generic_guardrail.code == "high_risk_mesa_required_unavailable"


def test_familia_simples_sem_mesa_continua_em_self_review(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        _configurar_empresa(banco, ids, package="inspector_chat")
        laudo_id = _criar_laudo_com_familia(
            banco,
            ids,
            family_key="geral",
            template_key="padrao",
        )

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["primary_action"] == "approve_without_mesa"
    assert corpo["direct_without_mesa"] is True
    assert corpo["review_mode_final_preview"] == "mobile_autonomous"
    assert corpo["mobile_chat_first_governance"]["self_review_allowed"] is True
    assert corpo["mobile_chat_first_governance"]["separate_mesa_required"] is False


def test_familia_alto_risco_sem_mesa_bloqueia_self_review_generico(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        _configurar_empresa(banco, ids, package="inspector_chat")
        laudo_id = _criar_laudo_com_familia(
            banco,
            ids,
            family_key="nr13_inspecao_caldeira",
            template_key="nr13",
        )

    csrf = _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta_preview = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta_preview.status_code == 422
    detalhe = resposta_preview.json()["detail"]
    assert detalhe["code"] == "high_risk_mesa_required_unavailable"
    assert detalhe["family_key"] == "nr13_inspecao_caldeira"
    assert detalhe["review_mode_requested"] == "mesa_required"
    assert detalhe["required_capability"] == "inspector_send_to_mesa"
    assert detalhe["guardrail"] == "separate_mesa_required"
    assert "NR13 Caldeira exige Revisão Técnica" in detalhe["message"]

    resposta_finalizar = client.post(
        f"/app/api/laudo/{laudo_id}/finalizar",
        headers={"X-CSRF-Token": csrf},
    )
    assert resposta_finalizar.status_code == 422

    with SessionLocal() as banco:
        laudo = banco.get(Laudo, laudo_id)
        assert laudo is not None
        assert laudo.status_revisao == StatusRevisao.RASCUNHO.value
        assert (
            banco.scalar(
                select(ApprovedCaseSnapshot).where(ApprovedCaseSnapshot.laudo_id == laudo_id)
            )
            is None
        )
        assert (
            banco.scalar(
                select(EmissaoOficialLaudo).where(EmissaoOficialLaudo.laudo_id == laudo_id)
            )
            is None
        )


def test_familia_alto_risco_com_policy_mobile_autonomous_e_mesa_forca_handoff(
    ambiente_critico,
) -> None:
    client = ambiente_critico["client"]
    SessionLocal = ambiente_critico["SessionLocal"]
    ids = ambiente_critico["ids"]

    with SessionLocal() as banco:
        _configurar_empresa(banco, ids, package="inspector_chat_mesa")
        laudo_id = _criar_laudo_com_familia(
            banco,
            ids,
            family_key="nr13_inspecao_caldeira",
            template_key="nr13",
            final_validation_mode="mobile_autonomous",
        )

    _login_app_inspetor(client, "inspetor@empresa-a.test")
    resposta = client.get(f"/app/api/laudo/{laudo_id}/finalizacao-preview")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["primary_action"] == "send_to_mesa"
    assert corpo["review_mode_final_preview"] == "mesa_required"
    assert corpo["review_mode_final_reason"] == "high_risk_family_requires_mesa"
    assert corpo["mobile_chat_first_governance"]["review_governance_mode"] == (
        "separate_mesa_required"
    )
    assert corpo["mobile_chat_first_governance"]["separate_mesa_required"] is True
    assert corpo["mobile_chat_first_governance"]["self_review_allowed"] is False
    assert corpo["chat_review_tools"]["title"] == "Revisão Técnica"
