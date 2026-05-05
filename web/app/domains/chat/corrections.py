"""Correções estruturadas do Inspeção IA."""

from __future__ import annotations

import re
import unicodedata
from copy import deepcopy
from uuid import uuid4

from fastapi import Depends, HTTPException, Request
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.domains.chat.app_context import logger
from app.domains.chat.core_helpers import agora_utc, resposta_json_ok
from app.domains.chat.laudo_access_helpers import obter_laudo_do_inspetor
from app.domains.chat.schemas import (
    DadosCorrecaoEstruturada,
    DadosStatusCorrecaoEstruturada,
)
from app.domains.chat.session_helpers import exigir_csrf
from app.shared.database import Laudo, Usuario, commit_ou_rollback_operacional, obter_banco
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
CHAT_CORRECTION_SOURCE = "inspector_chat_hidden"
_CHAT_CORRECTION_TRIGGERS = (
    "adicione",
    "acrescente",
    "altere",
    "arrume",
    "atualize",
    "coloque",
    "corrige",
    "corrija",
    "corrigir",
    "mude",
    "remova",
    "retire",
    "substitua",
    "troque",
)
_CHAT_CORRECTION_CONTEXT_TERMS = (
    "art",
    "checklist",
    "cliente",
    "conclusao",
    "conclusão",
    "data",
    "evidencia",
    "evidência",
    "foto",
    "imagem",
    "laudo",
    "local",
    "observacao",
    "observação",
    "pdf",
    "relatorio",
    "relatório",
    "status",
    "tag",
)


def _normalizar_texto_chat_correcao(texto: object) -> str:
    valor = unicodedata.normalize("NFKD", str(texto or "").strip().lower())
    sem_acento = "".join(char for char in valor if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", sem_acento).strip()


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
        "applied_at": item.get("applied_at"),
        "applied_by_id": item.get("applied_by_id"),
        "application_mode": item.get("application_mode"),
        "applied_to": (
            list(item.get("applied_to") or [])
            if isinstance(item.get("applied_to"), list)
            else []
        ),
        "source": item.get("source"),
        "hidden_from_user": bool(item.get("hidden_from_user")),
        "source_message_id": item.get("source_message_id"),
    }


def _salvar_correcoes_laudo(laudo: Laudo, correcoes: list[dict]) -> None:
    draft = _draft_laudo(laudo)
    draft[STRUCTURED_CORRECTIONS_KEY] = correcoes[-40:]
    draft["structured_corrections_version"] = STRUCTURED_CORRECTIONS_VERSION
    laudo.report_pack_draft_json = draft
    laudo.atualizado_em = agora_utc()
    flag_modified(laudo, "report_pack_draft_json")


def _texto_limpo(valor: object, *, limite: int = 1600) -> str:
    return " ".join(str(valor or "").strip().split())[:limite]


def inferir_correcao_estruturada_chat(texto: object) -> dict | None:
    descricao = _texto_limpo(texto, limite=1600)
    normalizado = _normalizar_texto_chat_correcao(descricao)
    if not descricao or not normalizado:
        return None

    tem_gatilho = any(gatilho in normalizado for gatilho in _CHAT_CORRECTION_TRIGGERS)
    tem_contexto = any(termo in normalizado for termo in _CHAT_CORRECTION_CONTEXT_TERMS)
    if not tem_gatilho or not tem_contexto:
        return None

    if any(termo in normalizado for termo in ("foto", "imagem", "evidencia", "anexo")):
        block = "evidencias"
    elif "checklist" in normalizado or re.search(r"\b(c|nc|na)\b", normalizado):
        block = "checklist"
    elif any(termo in normalizado for termo in ("conclusao", "status", "aprovado", "reprovado", "pendente")):
        block = "conclusao"
    else:
        block = "observacoes"

    if any(termo in normalizado for termo in ("substitua", "troque", "mude")):
        intent = "substituir"
    elif any(termo in normalizado for termo in ("adicione", "acrescente", "coloque")):
        intent = "adicionar"
    elif "valid" in normalizado or "confira" in normalizado:
        intent = "validar"
    else:
        intent = "corrigir"

    return {
        "block": block,
        "intent": intent,
        "description": descricao,
    }


def _append_texto_documental(valor_atual: object, novo_texto: str) -> str:
    atual = str(valor_atual or "").strip()
    texto = _texto_limpo(novo_texto, limite=1600)
    if not texto:
        return atual
    if not atual:
        return texto
    if texto.lower() in atual.lower():
        return atual
    return f"{atual}\n\n{texto}"


def _payload_documento_laudo(laudo: Laudo) -> dict:
    payload = getattr(laudo, "dados_formulario", None)
    return deepcopy(payload) if isinstance(payload, dict) else {}


def _sincronizar_payload_documento_no_draft(laudo: Laudo, payload: dict) -> None:
    draft = _draft_laudo(laudo)
    draft["structured_data_candidate"] = deepcopy(payload)
    draft["structured_data_candidate_source"] = "inspector_structured_correction"
    laudo.report_pack_draft_json = draft
    flag_modified(laudo, "report_pack_draft_json")


def _aplicar_correcao_no_documento(
    *,
    laudo: Laudo,
    item: dict,
    usuario: Usuario,
) -> list[str]:
    block = str(item.get("block") or "").strip().lower()
    descricao = _texto_limpo(item.get("description"), limite=1600)
    if not descricao:
        return []

    payload = _payload_documento_laudo(laudo)
    campos_aplicados: list[str] = []

    if block == "conclusao":
        conclusao = (
            dict(payload.get("conclusao") or {})
            if isinstance(payload.get("conclusao"), dict)
            else {}
        )
        conclusao["conclusao_tecnica"] = _append_texto_documental(
            conclusao.get("conclusao_tecnica"),
            descricao,
        )
        conclusao["justificativa"] = _append_texto_documental(
            conclusao.get("justificativa"),
            descricao,
        )
        payload["conclusao"] = conclusao
        campos_aplicados.extend(
            [
                "dados_formulario.conclusao.conclusao_tecnica",
                "dados_formulario.conclusao.justificativa",
            ]
        )
    elif block == "observacoes":
        payload["observacoes"] = _append_texto_documental(payload.get("observacoes"), descricao)
        documentacao = (
            dict(payload.get("documentacao_e_registros") or {})
            if isinstance(payload.get("documentacao_e_registros"), dict)
            else {}
        )
        documentacao["observacoes_documentais"] = _append_texto_documental(
            documentacao.get("observacoes_documentais"),
            descricao,
        )
        payload["documentacao_e_registros"] = documentacao
        campos_aplicados.extend(
            [
                "dados_formulario.observacoes",
                "dados_formulario.documentacao_e_registros.observacoes_documentais",
            ]
        )
    elif block == "checklist":
        checklist_notes = payload.get("checklist_correcoes_estruturadas")
        if not isinstance(checklist_notes, list):
            checklist_notes = []
        checklist_notes.append(
            {
                "description": descricao,
                "intent": str(item.get("intent") or "").strip() or None,
                "source_correction_id": str(item.get("id") or "").strip() or None,
                "created_at": agora_utc().isoformat(),
            }
        )
        payload["checklist_correcoes_estruturadas"] = checklist_notes[-40:]
        campos_aplicados.append("dados_formulario.checklist_correcoes_estruturadas")
    elif block == "evidencias":
        evidence_notes = payload.get("evidencias_correcoes_estruturadas")
        if not isinstance(evidence_notes, list):
            evidence_notes = []
        evidence_notes.append(
            {
                "description": descricao,
                "intent": str(item.get("intent") or "").strip() or None,
                "source_correction_id": str(item.get("id") or "").strip() or None,
                "created_at": agora_utc().isoformat(),
            }
        )
        payload["evidencias_correcoes_estruturadas"] = evidence_notes[-40:]
        campos_aplicados.append("dados_formulario.evidencias_correcoes_estruturadas")
    else:
        return []

    agora = agora_utc().isoformat()
    item["applied_at"] = agora
    item["applied_by_id"] = int(usuario.id)
    item["application_mode"] = "document_payload_append"
    item["applied_to"] = campos_aplicados
    item["applied_description"] = descricao
    historico = payload.get("correcoes_estruturadas_aplicadas")
    if not isinstance(historico, list):
        historico = []
    historico.append(
        {
            "id": str(item.get("id") or "").strip(),
            "block": block,
            "description": descricao,
            "applied_at": agora,
            "applied_by_id": int(usuario.id),
            "fields": campos_aplicados,
        }
    )
    payload["correcoes_estruturadas_aplicadas"] = historico[-40:]
    laudo.dados_formulario = payload
    flag_modified(laudo, "dados_formulario")
    _sincronizar_payload_documento_no_draft(laudo, payload)
    return campos_aplicados


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


def _payload_correcoes(laudo: Laudo, *, incluir_ocultas: bool = False) -> dict:
    itens = _lista_correcoes_laudo(laudo)
    if not incluir_ocultas:
        itens = [item for item in itens if not bool(item.get("hidden_from_user"))]
    correcoes = [_serializar_correcao(item) for item in itens]
    return {
        "ok": True,
        "laudo_id": int(laudo.id),
        "items": correcoes,
        "summary": _summary(correcoes),
    }


def registrar_correcao_estruturada_chat(
    *,
    laudo: Laudo,
    usuario: Usuario,
    mensagem_id: int,
    texto_chat: object,
) -> dict | None:
    dados = inferir_correcao_estruturada_chat(texto_chat)
    if not dados:
        return None

    agora = agora_utc()
    item = {
        "id": uuid4().hex,
        "block": dados["block"],
        "intent": dados["intent"],
        "description": dados["description"],
        "status": "aplicada",
        "source": CHAT_CORRECTION_SOURCE,
        "hidden_from_user": True,
        "created_at": agora.isoformat(),
        "updated_at": agora.isoformat(),
        "created_by_id": int(usuario.id),
        "created_by_name": str(
            getattr(usuario, "nome", None)
            or getattr(usuario, "email", None)
            or "Inspetor"
        ),
        "updated_by_id": int(usuario.id),
        "source_message_id": int(mensagem_id),
    }
    _aplicar_correcao_no_documento(laudo=laudo, item=item, usuario=usuario)
    correcoes = [*_lista_correcoes_laudo(laudo), item]
    _salvar_correcoes_laudo(laudo, correcoes)
    return _serializar_correcao(item)


def construir_contexto_correcao_estruturada_chat_para_ia(item: dict | None) -> str:
    if not isinstance(item, dict):
        return ""
    descricao = _texto_limpo(item.get("description"), limite=900)
    if not descricao:
        return ""
    bloco = CORRECTION_BLOCK_LABELS.get(str(item.get("block") or "").strip(), "Laudo")
    intencao = CORRECTION_INTENT_LABELS.get(str(item.get("intent") or "").strip(), "Corrigir")
    return "\n".join(
        [
            "[correcao_laudo_pelo_chat]",
            (
                "Instrucao interna invisivel ao usuario: trate isto como edicao do "
                "rascunho pelo chat. Nao mencione editor, formulario, payload interno "
                "ou correcoes estruturadas."
            ),
            f"- Bloco alvo: {bloco}",
            f"- Intencao: {intencao}",
            f"- Pedido do usuario: {descricao}",
            (
                "Na resposta, confirme de forma objetiva que o ajuste foi considerado "
                "no rascunho e, se faltar evidencia para sustentar a alteracao, peca "
                "somente a evidencia necessaria."
            ),
            "[/correcao_laudo_pelo_chat]",
        ]
    )


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
        "created_by_name": str(
            getattr(usuario, "nome", None)
            or getattr(usuario, "email", None)
            or "Inspetor"
        ),
        "updated_by_id": int(usuario.id),
    }
    correcoes = [*_lista_correcoes_laudo(laudo), item]
    _salvar_correcoes_laudo(laudo, correcoes)
    commit_ou_rollback_operacional(
        banco,
        logger_operacao=logger,
        mensagem_erro="Falha ao criar correcao estruturada do inspetor.",
    )
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
        status_anterior = str(item.get("status") or "pendente").strip().lower()
        if dados.status == "aplicada" and status_anterior != "aplicada":
            _aplicar_correcao_no_documento(
                laudo=laudo,
                item=item,
                usuario=usuario,
            )
        item["status"] = dados.status
        item["updated_at"] = agora_utc().isoformat()
        item["updated_by_id"] = int(usuario.id)
        item_atualizado = item
        break
    if item_atualizado is None:
        raise HTTPException(status_code=404, detail="Correção estruturada não encontrada.")
    _salvar_correcoes_laudo(laudo, correcoes)
    commit_ou_rollback_operacional(
        banco,
        logger_operacao=logger,
        mensagem_erro="Falha ao atualizar correcao estruturada do inspetor.",
    )
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
    "construir_contexto_correcao_estruturada_chat_para_ia",
    "inferir_correcao_estruturada_chat",
    "registrar_correcao_estruturada_chat",
    "roteador_corrections",
]
