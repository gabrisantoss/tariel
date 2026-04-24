from __future__ import annotations

import logging
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.shared.database import (
    Base,
    Empresa,
    commit_ou_rollback_operacional,
    commit_ou_rollback_operacional_preservando_integridade,
    sessao_tem_mutacoes_pendentes,
)


def _session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False, class_=Session)


def test_sessao_sem_mutacao_nao_fica_marcada_apos_leitura() -> None:
    SessionLocal = _session_factory()

    with SessionLocal() as banco:
        banco.execute(text("SELECT 1"))
        assert sessao_tem_mutacoes_pendentes(banco) is False


def test_sessao_flushada_ainda_exige_commit_final() -> None:
    SessionLocal = _session_factory()

    with SessionLocal() as banco:
        empresa = Empresa(
            nome_fantasia="Empresa Flush",
            cnpj="12345678000199",
        )
        banco.add(empresa)

        assert sessao_tem_mutacoes_pendentes(banco) is True

        banco.flush()

        assert sessao_tem_mutacoes_pendentes(banco) is True

        banco.commit()

        assert sessao_tem_mutacoes_pendentes(banco) is False


def test_commit_operacional_explicito_limpa_marcador_transacional() -> None:
    SessionLocal = _session_factory()

    with SessionLocal() as banco:
        banco.add(
            Empresa(
                nome_fantasia="Empresa Commit Operacional",
                cnpj="12345678000197",
            )
        )

        assert sessao_tem_mutacoes_pendentes(banco) is True

        commit_ou_rollback_operacional(
            banco,
            logger_operacao=logging.getLogger("tests.transaction_contract"),
            mensagem_erro="Falha esperada no contrato transacional de teste.",
        )

        assert sessao_tem_mutacoes_pendentes(banco) is False


def test_commit_operacional_idempotente_preserva_integrity_error_para_replay() -> None:
    SessionLocal = _session_factory()

    with SessionLocal() as banco:
        banco.add(
            Empresa(
                nome_fantasia="Empresa Idempotente Base",
                cnpj="12345678000196",
            )
        )
        banco.commit()

        banco.add(
            Empresa(
                nome_fantasia="Empresa Idempotente Duplicada",
                cnpj="12345678000196",
            )
        )

        with pytest.raises(IntegrityError):
            commit_ou_rollback_operacional_preservando_integridade(
                banco,
                logger_operacao=logging.getLogger("tests.transaction_contract"),
                mensagem_erro="Falha esperada no contrato transacional idempotente.",
            )

        assert sessao_tem_mutacoes_pendentes(banco) is False


def test_sessao_rollback_limpa_marcador_transacional() -> None:
    SessionLocal = _session_factory()

    with SessionLocal() as banco:
        banco.add(
            Empresa(
                nome_fantasia="Empresa Rollback",
                cnpj="12345678000198",
            )
        )

        assert sessao_tem_mutacoes_pendentes(banco) is True

        banco.rollback()

        assert sessao_tem_mutacoes_pendentes(banco) is False


def test_fluxos_principais_laudo_usam_commit_operacional_explicito() -> None:
    raiz_app = Path(__file__).resolve().parents[1] / "app"
    laudo_service = (raiz_app / "domains" / "chat" / "laudo_service.py").read_text(encoding="utf-8")
    laudo_decision_services = (
        raiz_app / "domains" / "chat" / "laudo_decision_services.py"
    ).read_text(encoding="utf-8")

    assert "banco.commit(" not in laudo_service
    assert "banco.commit(" not in laudo_decision_services
    assert 'mensagem_erro="Falha ao criar laudo do inspetor."' in laudo_service
    assert (
        'mensagem_erro="Falha ao persistir decisao final do laudo do inspetor."'
        in laudo_decision_services
    )
    assert 'mensagem_erro="Falha ao reabrir laudo do inspetor."' in laudo_decision_services


def test_envio_mesa_inspetor_usa_commit_operacional_preservando_idempotencia() -> None:
    rota_mesa = (
        Path(__file__).resolve().parents[1] / "app" / "domains" / "chat" / "mesa_message_routes.py"
    ).read_text(encoding="utf-8")

    assert "banco.commit(" not in rota_mesa
    assert "commit_ou_rollback_operacional_preservando_integridade" in rota_mesa
    assert 'mensagem_erro="Falha ao confirmar envio de mensagem do inspetor para a mesa."' in rota_mesa
    assert 'mensagem_erro="Falha ao confirmar envio de anexo do inspetor para a mesa."' in rota_mesa


def test_pendencias_e_correcoes_do_inspetor_usam_commit_operacional_explicito() -> None:
    raiz_chat = Path(__file__).resolve().parents[1] / "app" / "domains" / "chat"
    pendencias = (raiz_chat / "pendencias.py").read_text(encoding="utf-8")
    corrections = (raiz_chat / "corrections.py").read_text(encoding="utf-8")

    assert "commit_ou_rollback_operacional" in pendencias
    assert "commit_ou_rollback_operacional" in corrections
    assert 'mensagem_erro="Falha ao marcar pendencias da mesa como lidas."' in pendencias
    assert 'mensagem_erro="Falha ao atualizar pendencia da mesa do inspetor."' in pendencias
    assert 'mensagem_erro="Falha ao criar correcao estruturada do inspetor."' in corrections
    assert 'mensagem_erro="Falha ao atualizar correcao estruturada do inspetor."' in corrections
