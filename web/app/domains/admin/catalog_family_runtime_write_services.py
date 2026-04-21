"""Escrita de modo técnico e calibração para famílias do catálogo."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.database import CalibracaoFamiliaLaudo, ModoTecnicoFamiliaLaudo


def upsert_modo_tecnico_familia(
    db: Session,
    *,
    family_key: str,
    mode_key: str,
    nome_exibicao: str,
    descricao: str = "",
    regras_adicionais_json_text: str = "",
    compatibilidade_template_json_text: str = "",
    compatibilidade_oferta_json_text: str = "",
    ativo: bool = True,
    criado_por_id: int | None = None,
) -> ModoTecnicoFamiliaLaudo:
    from app.domains.admin import services as admin_services

    familia = admin_services._buscar_familia_catalogo_por_chave(db, family_key)
    mode_key_norm = admin_services._normalizar_chave_catalogo(mode_key, campo="Modo técnico", max_len=80)
    modo = db.scalar(
        select(ModoTecnicoFamiliaLaudo).where(
            ModoTecnicoFamiliaLaudo.family_id == familia.id,
            ModoTecnicoFamiliaLaudo.mode_key == mode_key_norm,
        )
    )
    if modo is None:
        modo = ModoTecnicoFamiliaLaudo(
            family_id=int(familia.id),
            mode_key=mode_key_norm,
            criado_por_id=criado_por_id,
        )
        db.add(modo)

    modo.nome_exibicao = admin_services._normalizar_texto_curto(
        nome_exibicao,
        campo="Nome do modo",
        max_len=120,
    )
    modo.descricao = admin_services._normalizar_texto_opcional(descricao)
    modo.regras_adicionais_json = admin_services._normalizar_json_opcional(
        regras_adicionais_json_text,
        campo="Regras adicionais do modo",
    )
    modo.compatibilidade_template_json = admin_services._normalizar_json_opcional(
        compatibilidade_template_json_text,
        campo="Compatibilidade de template",
    )
    modo.compatibilidade_oferta_json = admin_services._normalizar_json_opcional(
        compatibilidade_oferta_json_text,
        campo="Compatibilidade de oferta",
    )
    modo.ativo = bool(ativo)
    if criado_por_id and not modo.criado_por_id:
        modo.criado_por_id = criado_por_id

    admin_services.flush_ou_rollback_integridade(
        db,
        logger_operacao=admin_services.logger,
        mensagem_erro="Não foi possível salvar o modo técnico da família.",
    )
    return modo


def upsert_calibracao_familia(
    db: Session,
    *,
    family_key: str,
    calibration_status: str,
    reference_source: str = "",
    last_calibrated_at: datetime | None = None,
    summary_of_adjustments: str = "",
    changed_fields_json_text: str = "",
    changed_language_notes: str = "",
    attachments_json_text: str = "",
    criado_por_id: int | None = None,
) -> CalibracaoFamiliaLaudo:
    from app.domains.admin import services as admin_services

    familia = admin_services._buscar_familia_catalogo_por_chave(db, family_key)
    calibracao = db.scalar(
        select(CalibracaoFamiliaLaudo).where(CalibracaoFamiliaLaudo.family_id == familia.id)
    )
    if calibracao is None:
        calibracao = CalibracaoFamiliaLaudo(
            family_id=int(familia.id),
            criado_por_id=criado_por_id,
        )
        db.add(calibracao)

    calibracao.calibration_status = admin_services._normalizar_status_calibracao_catalogo(calibration_status)
    calibracao.reference_source = admin_services._normalizar_texto_opcional(reference_source, 255)
    calibracao.last_calibrated_at = last_calibrated_at
    calibracao.summary_of_adjustments = admin_services._normalizar_texto_opcional(summary_of_adjustments)
    calibracao.changed_fields_json = admin_services._normalizar_json_opcional(
        changed_fields_json_text,
        campo="Changed fields",
    )
    calibracao.changed_language_notes = admin_services._normalizar_texto_opcional(changed_language_notes)
    calibracao.attachments_json = admin_services._normalizar_json_opcional(
        attachments_json_text,
        campo="Attachments",
    )
    if criado_por_id and not calibracao.criado_por_id:
        calibracao.criado_por_id = criado_por_id

    admin_services.flush_ou_rollback_integridade(
        db,
        logger_operacao=admin_services.logger,
        mensagem_erro="Não foi possível salvar a calibração da família.",
    )
    return calibracao


__all__ = [
    "upsert_calibracao_familia",
    "upsert_modo_tecnico_familia",
]
