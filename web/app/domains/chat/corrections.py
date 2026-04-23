"""Correções estruturadas do Chat Inspetor."""

from __future__ import annotations

from copy import deepcopy
from uuid import uuid4

from fastapi import Depends, HTTPException, Request
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.domains.chat.core_helpers import agora_utc, resposta_json_ok
from app.domains.chat.laudo_access_helpers import obter_laudo_do_inspetor
from app.domains.chat.schemas import (
    DadosCorrecaoEstruturada,
    DadosStatusCorrecaoEstruturada,
)
from app.domains.chat.session_helpers import exigir_csrf
from app.shared.database import Laudo, Usuario, obter_banco
from app.shared.security import exigir_inspetor


STRUCTURED_CORRECTIONS_KEY = "structured_corrections"
STRUCTURED_CORRECTIONS_VERSION = "2026-04-23"
CORRECTION_STATUS_LABELS = {
    "pendente": "Pendente",
    "enviada_ia": "Enviada para IA",
    "aplicada": "Aplicada",
    "descartada": "Descartada",
}
CORRECTION_BLOCK_LABELS = {
    "evidencias": "Evidências/fotos",
    "checklist": "Checklist",
    "conclusao": "Conclusão/status",
    "observacoes": "Observações",
}
CORRECTION_INTENT_LABELS = {
    "corrigir": "Corrigir informação existente",
    "adicionar": "Adicionar item faltante",
    "substituir": "Substituir evidência ou texto",
    "validar": "Validar antes de aplicar",
}


def _draft_laudo(laudo: Laudo) -> dict:
    payload = getattr(laudo, "report_pack_draft_json", None)
    return deepcopy(payload) if isinstance(payload, dict) else {}


def _lista_correcoes_laudo(laudo: Laudo) -> list[dict]:
    draft = _draft_laudo(laudo)
    itens = draft.get(STRUCTURED_CORRECTIONS_KEY)
    if not isinstance(itens, list):
        return []
    return [
        dict(item)
        for item in itens
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]


def _serializar_correcao(item: dict) -> dict:
    status = str(item.get("status") or "pendente").strip().lower()
    block = str(item.get("block") or "").strip().lower()
    intent = str(item.get("intent") or "").strip().lower()
    return {
        "id": str(item.get("id") or "").strip(),
        "block": block,
        "block_label": CORRECTION_BLOCK_LABELS.get(block, block or "Correção"),
        "intent": intent,
        "intent_label": CORRECTION_INTENT_LABELS.get(intent, intent or "Ajuste"),
        "description": str(item.get("description") or "").strip(),
        "status": status,
        "status_label": CORRECTION_STATUS_LABELS.get(status, status or "Pendente"),
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
        "created_by_id": item.get("created_by_id"),
        "created_by_name": item.get("created_by_name") or "Inspetor",
        "updated_by_id": item.get("updated_by_id"),
    }


def _salvar_correcoes_laudo(laudo: Laudo, correcoes: list[dict]) -> None:
    draft = _draft_laudo(laudo)
    draft[STRUCTURED_CORRECTIONS_KEY] = correcoes[-40:]
    draft["structured_corrections_version"] = STRUCTURED_CORRECTIONS_VERSION
    laudo.report_pack_draft_json = draft
    laudo.atualizado_em = agora_utc()
    flag_modified(laudo, "report_pack_draft_json")


def _summary(correcoes: list[dict]) -> dict:
    contadores = {status: 0 for status in CORRECTION_STATUS_LABELS}
    for item in correcoes:
        status = str(item.get("status") or "pendente").strip().lower()
        contadores[status] = contadores.get(status, 0) + 1
    return {
        "total": len(correcoes),
        "pending": contadores.get("pendente", 0),
        "sent_to_ai": contadores.get("enviada_ia", 0),
        "applied": contadores.get("aplicada", 0),
        "discarded": contadores.get("descartada", 0),
        "blocks": list(CORRECTION_BLOCK_LABELS),
        "statuses": list(CORRECTION_STATUS_LABELS),
    }


def _payload_correcoes(laudo: Laudo) -> dict:
    correcoes = [_serializar_correcao(item) for item in _lista_correcoes_laudo(laudo)]
    return {
        "ok": True,
        "laudo_id": int(laudo.id),
        "items": correcoes,
        "summary": _summary(correcoes),
    }


async def listar_correcoes_estruturadas_laudo(
    laudo_id: int,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    return resposta_json_ok(_payload_correcoes(laudo))


async def criar_correcao_estruturada_laudo(
    laudo_id: int,
    request: Request,
    dados: DadosCorrecaoEstruturada,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    agora = agora_utc()
    item = {
        "id": uuid4().hex,
        "block": dados.block,
        "intent": dados.intent,
        "description": dados.description,
        "status": "pendente",
        "created_at": agora.isoformat(),
        "updated_at": agora.isoformat(),
        "created_by_id": int(usuario.id),
        "created_by_name": str(getattr(usuario, "nome", None) or getattr(usuario, "email", None) or "Inspetor"),
        "updated_by_id": int(usuario.id),
    }
    correcoes = [*_lista_correcoes_laudo(laudo), item]
    _salvar_correcoes_laudo(laudo, correcoes)
    banco.flush()
    return resposta_json_ok(
        {
            **_payload_correcoes(laudo),
            "item": _serializar_correcao(item),
        },
        status_code=201,
    )


async def atualizar_status_correcao_estruturada_laudo(
    laudo_id: int,
    correction_id: str,
    request: Request,
    dados: DadosStatusCorrecaoEstruturada,
    usuario: Usuario = Depends(exigir_inspetor),
    banco: Session = Depends(obter_banco),
):
    exigir_csrf(request)
    laudo = obter_laudo_do_inspetor(banco, laudo_id, usuario)
    alvo = str(correction_id or "").strip()
    correcoes = _lista_correcoes_laudo(laudo)
    item_atualizado: dict | None = None
    for item in correcoes:
        if str(item.get("id") or "").strip() != alvo:
            continue
        item["status"] = dados.status
        item["updated_at"] = agora_utc().isoformat()
        item["updated_by_id"] = int(usuario.id)
        item_atualizado = item
        break
    if item_atualizado is None:
        raise HTTPException(status_code=404, detail="Correção estruturada não encontrada.")
    _salvar_correcoes_laudo(laudo, correcoes)
    banco.flush()
    return resposta_json_ok(
        {
            **_payload_correcoes(laudo),
            "item": _serializar_correcao(item_atualizado),
        }
    )


roteador_corrections = APIRouter()
roteador_corrections.add_api_route(
    "/api/laudo/{laudo_id}/correcoes-estruturadas",
    listar_correcoes_estruturadas_laudo,
    methods=["GET"],
)
roteador_corrections.add_api_route(
    "/api/laudo/{laudo_id}/correcoes-estruturadas",
    criar_correcao_estruturada_laudo,
    methods=["POST"],
)
roteador_corrections.add_api_route(
    "/api/laudo/{laudo_id}/correcoes-estruturadas/{correction_id}",
    atualizar_status_correcao_estruturada_laudo,
    methods=["PATCH"],
)


__all__ = [
    "STRUCTURED_CORRECTIONS_KEY",
    "roteador_corrections",
]
