"""Suporte de serializacao do bootstrap do portal admin-cliente."""

from __future__ import annotations

import datetime as dt
import re
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domains.cliente.dashboard_documents_support import (
    DOCUMENT_PACKAGE_SECTION_LABELS,
    build_document_package_sections,
    build_document_summary_card,
    build_document_timeline,
    document_visual_state,
)
from app.domains.chat.laudo_state_helpers import (
    serializar_card_laudo,
)
from app.domains.chat.normalization import TIPOS_TEMPLATE_VALIDOS
from app.shared.public_verification import build_public_verification_payload
from app.shared.official_issue_package import build_official_issue_summary, serialize_official_issue_record
from app.shared.database import EmissaoOficialLaudo, Laudo, MensagemLaudo, NivelAcesso, TipoMensagem, Usuario
from app.shared.inspection_history import build_human_override_summary
from app.shared.tenant_entitlement_guard import tenant_access_policy_for_user
from app.shared.tenant_admin_policy import (
    tenant_admin_effective_user_portal_grants,
    tenant_admin_user_portal_label,
)

ROLE_LABELS = {
    int(NivelAcesso.INSPETOR): "Inspetor",
    int(NivelAcesso.REVISOR): "Mesa Avaliadora",
    int(NivelAcesso.ADMIN_CLIENTE): "Admin-Cliente",
}
SERVICE_CATALOG = {
    "rti": {"label": "RTI", "family": "eletrica"},
    "spda": {"label": "SPDA", "family": "eletrica"},
    "pie": {"label": "PIE", "family": "eletrica"},
    "loto": {"label": "LOTO", "family": "seguranca"},
    "nr12": {"label": "NR12", "family": "maquinas"},
    "nr13": {"label": "NR13", "family": "vasos_e_caldeiras"},
    "nr33": {"label": "NR33", "family": "espaco_confinado"},
    "nr35": {"label": "NR35", "family": "trabalho_em_altura"},
    "avcb": {"label": "AVCB", "family": "bombeiros"},
    "laudo_tecnico": {"label": "Laudos técnicos", "family": "geral"},
}
_DOCUMENT_SIGNAL_DEFINITIONS = (
    ("art", "ART vinculada", ("art:", " art ", "anotacao de responsabilidade tecnica", "anotação de responsabilidade técnica")),
    ("pie", "PIE", ("pie:", " prontuario das instalacoes eletricas", " prontuário das instalações elétricas", " prontuario eletrico", " prontuário elétrico")),
    ("prontuario", "Prontuário", ("prontuario", " prontuário", "dossie tecnico", "dossiê técnico")),
    ("pet", "PET", ("pet:", "permissao de entrada e trabalho", "permissão de entrada e trabalho")),
    ("certificado", "Certificado", ("certificado:", " certificado ")),
)
NR35_LINHA_VIDA_FAMILY_KEY = "nr35_inspecao_linha_de_vida"
NR35_OFFICIAL_DOWNLOAD_BASE = "/cliente/api/documentos/laudos/{laudo_id}/nr35/emissao-oficial"


def _dict_copy_or_empty(value: object) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _usuario_nome(usuario: Usuario) -> str:
    return getattr(usuario, "nome", None) or getattr(usuario, "nome_completo", None) or f"Cliente #{usuario.id}"


def _texto_curto(value: Any, *, fallback: str | None = None) -> str | None:
    texto = " ".join(str(value or "").strip().split())
    if texto:
        return texto
    return fallback


def _isoformat_or_empty(value: Any) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else ""


def _is_nr35_linha_vida_document(laudo: Laudo) -> bool:
    return (
        str(getattr(laudo, "catalog_family_key", "") or "").strip() == NR35_LINHA_VIDA_FAMILY_KEY
        or str(getattr(laudo, "tipo_template", "") or "").strip() == "nr35_linha_vida"
    )


def _build_cliente_official_delivery_payload(
    *,
    laudo: Laudo,
    emissao_oficial: dict[str, Any],
    current_issue: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    laudo_id = int(getattr(laudo, "id", 0) or 0)
    nr35_manifest = _dict_copy_or_empty(current_issue.get("nr35_official_pdf"))
    is_nr35 = _is_nr35_linha_vida_document(laudo)
    current_issue_exists = bool(current_issue)
    nr35_manifest_ok = bool(nr35_manifest.get("manifest_ok"))
    package_ready = bool(
        current_issue.get("package_sha256")
        and current_issue.get("package_storage_ready")
        and current_issue.get("package_present_on_disk")
    )
    pdf_ready = bool(
        current_issue.get("primary_pdf_sha256")
        and current_issue.get("primary_pdf_storage_ready")
        and current_issue.get("primary_pdf_present_on_disk")
    )
    if is_nr35:
        officially_deliverable = bool(current_issue_exists and nr35_manifest_ok and package_ready)
    else:
        officially_deliverable = bool(current_issue_exists and package_ready)

    if officially_deliverable:
        status = "emitido"
    elif current_issue_exists:
        status = "emitido_sem_manifest_nr35" if is_nr35 else "emitido_indisponivel"
    elif bool(emissao_oficial.get("ready_for_issue")):
        status = "aguardando_emissao"
    else:
        status = "em_revisao"

    base_url = NR35_OFFICIAL_DOWNLOAD_BASE.format(laudo_id=laudo_id)
    delivery = {
        "existe": officially_deliverable,
        "status": status,
        "emitida_em": _isoformat_or_empty(current_issue.get("issued_at")) or None,
        "issue_number": str(current_issue.get("issue_number") or "").strip() or None,
        "issue_state": str(current_issue.get("issue_state") or "").strip() or None,
        "mesa_status": str((nr35_manifest.get("mesa_review") or {}).get("status") or "").strip() or None,
        "package_sha256": str(current_issue.get("package_sha256") or "").strip() or None,
        "primary_pdf_sha256": str(
            current_issue.get("primary_pdf_sha256")
            or nr35_manifest.get("primary_pdf_sha256")
            or ""
        ).strip()
        or None,
        "template_version": nr35_manifest.get("template_version"),
        "schema_version": nr35_manifest.get("schema_version"),
        "manifest_ok": bool(nr35_manifest_ok),
        "auditavel": bool(nr35_manifest.get("auditavel")),
        "package_ready": package_ready,
        "primary_pdf_ready": pdf_ready,
        "download_pdf_url": f"{base_url}/pdf" if is_nr35 and officially_deliverable and pdf_ready else None,
        "download_package_url": f"{base_url}/pacote" if is_nr35 and officially_deliverable else None,
    }

    if not is_nr35:
        return delivery, None

    nr35_payload = {
        "feed": "documentos",
        "slots_fotograficos": int(nr35_manifest.get("photo_slot_count") or 0),
        "manifest_ok": bool(nr35_manifest_ok),
        "auditavel": bool(nr35_manifest.get("auditavel") and officially_deliverable),
        "template_version": nr35_manifest.get("template_version"),
        "schema_version": nr35_manifest.get("schema_version"),
        "status_mesa": str((nr35_manifest.get("mesa_review") or {}).get("status") or "").strip() or None,
        "photo_slots": [
            {
                "slot": str(item.get("slot") or "").strip(),
                "label": str(item.get("label") or "").strip(),
                "campo_json": str(item.get("campo_json") or "").strip(),
                "achado_relacionado": str(item.get("achado_relacionado") or "").strip(),
                "secao_pdf": str(item.get("secao_pdf") or "").strip(),
                "referencia_persistida": bool(item.get("referencia_persistida")),
                "legenda_tecnica": bool(item.get("legenda_tecnica")),
            }
            for item in list(nr35_manifest.get("photo_slots") or [])
            if isinstance(item, dict)
        ],
    }
    return delivery, nr35_payload


def _listar_historico_emissoes_cliente(banco: Session, laudo: Laudo) -> list[dict[str, Any]]:
    registros = list(
        banco.scalars(
            select(EmissaoOficialLaudo)
            .where(EmissaoOficialLaudo.laudo_id == int(laudo.id))
            .order_by(EmissaoOficialLaudo.issued_at.desc(), EmissaoOficialLaudo.id.desc())
            .limit(12)
        ).all()
    )
    historico: list[dict[str, Any]] = []
    for registro in registros:
        item = serialize_official_issue_record(registro) or {}
        nr35_manifest = _dict_copy_or_empty(item.get("nr35_official_pdf"))
        historico.append(
            {
                "issue_number": str(item.get("issue_number") or "").strip() or None,
                "issue_state": str(item.get("issue_state") or "").strip() or None,
                "issue_state_label": str(item.get("issue_state_label") or "").strip() or None,
                "issued_at": _isoformat_or_empty(item.get("issued_at")) or None,
                "package_sha256": str(item.get("package_sha256") or "").strip() or None,
                "primary_pdf_sha256": str(item.get("primary_pdf_sha256") or "").strip() or None,
                "template_version": nr35_manifest.get("template_version"),
                "schema_version": nr35_manifest.get("schema_version"),
                "nr35_manifest_ok": bool(nr35_manifest.get("manifest_ok")),
                "nr35_auditavel": bool(nr35_manifest.get("auditavel")),
            }
        )
    return historico


def serializar_usuario_cliente(usuario: Usuario) -> dict[str, Any]:
    nivel = int(usuario.nivel_acesso or 0)
    allowed_portals = tenant_admin_effective_user_portal_grants(
        getattr(getattr(usuario, "empresa", None), "admin_cliente_policy_json", None),
        access_level=nivel,
        stored_portals=getattr(usuario, "allowed_portals", ()),
    )
    return {
        "id": int(usuario.id),
        "nome": _usuario_nome(usuario),
        "email": str(usuario.email or ""),
        "telefone": str(usuario.telefone or ""),
        "crea": str(usuario.crea or ""),
        "nivel_acesso": nivel,
        "papel": ROLE_LABELS.get(nivel, f"Nível {nivel}"),
        "allowed_portals": allowed_portals,
        "allowed_portal_labels": [
            tenant_admin_user_portal_label(item) for item in allowed_portals
        ],
        "tenant_access_policy": tenant_access_policy_for_user(usuario),
        "ativo": bool(usuario.ativo),
        "senha_temporaria_ativa": bool(getattr(usuario, "senha_temporaria_ativa", False)),
        "ultimo_login": usuario.ultimo_login.isoformat() if getattr(usuario, "ultimo_login", None) else "",
        "ultimo_login_label": (usuario.ultimo_login.astimezone().strftime("%d/%m/%Y %H:%M") if getattr(usuario, "ultimo_login", None) else "Nunca"),
    }


def build_guided_onboarding_cliente(
    *,
    usuarios: list[dict[str, Any]],
    laudos_chat: list[dict[str, Any]],
    laudos_mesa: list[dict[str, Any]],
    servicos_summary: dict[str, Any] | None,
    ativos_summary: dict[str, Any] | None,
    documentos_summary: dict[str, Any] | None,
    recorrencia_summary: dict[str, Any] | None,
    surface_availability: dict[str, bool],
) -> dict[str, Any]:
    papeis = {str(item.get("papel") or "").strip().lower() for item in usuarios}
    total_usuarios = len(usuarios)
    primeiros_acessos_concluidos = sum(1 for item in usuarios if str(item.get("ultimo_login") or "").strip())
    total_laudos = len(laudos_chat)
    total_documentos = int((documentos_summary or {}).get("total_documents") or 0)
    total_eventos = int((recorrencia_summary or {}).get("total_events") or 0)
    total_ativos = int((ativos_summary or {}).get("total_assets") or 0)
    total_servicos = int((servicos_summary or {}).get("total_services") or 0)
    total_mesa = len(laudos_mesa)

    steps = [
        {
            "key": "equipe",
            "title": "Ativar equipe operacional",
            "done": total_usuarios > 0,
            "detail": (
                "A empresa já possui usuários operacionais cadastrados."
                if total_usuarios > 0
                else "Cadastre ao menos um inspetor ou revisor para a WF começar a operar no tenant."
            ),
            "action_label": "Abrir equipe",
            "action_kind": "admin-section",
            "action_target": "admin-onboarding-lista",
        },
        {
            "key": "primeiro_acesso",
            "title": "Concluir primeiros acessos",
            "done": total_usuarios > 0 and primeiros_acessos_concluidos >= total_usuarios,
            "detail": (
                "A equipe já concluiu o primeiro acesso e não depende mais de senha temporária."
                if total_usuarios > 0 and primeiros_acessos_concluidos >= total_usuarios
                else "Peça para a equipe concluir o primeiro acesso antes de abrir operação crítica no tenant."
            ),
            "action_label": "Abrir equipe",
            "action_kind": "admin-section",
            "action_target": "admin-onboarding-lista",
        },
        {
            "key": "inspetor",
            "title": "Liberar acesso de campo",
            "done": "inspetor" in papeis,
            "detail": (
                "Já existe pelo menos um perfil de campo apto a iniciar laudos."
                if "inspetor" in papeis
                else "Crie um inspetor para a empresa abrir o primeiro caso real."
            ),
            "action_label": "Abrir ativação",
            "action_kind": "admin-section",
            "action_target": "lista-usuarios",
        },
        {
            "key": "mesa",
            "title": "Preparar revisão humana",
            "done": ("mesa avaliadora" in papeis) or ("revisor" in papeis) or not bool(surface_availability.get("mesa", False)),
            "detail": (
                "A revisão humana já está coberta pela equipe da empresa."
                if (("mesa avaliadora" in papeis) or ("revisor" in papeis))
                else (
                    "Este contrato não expõe mesa avaliadora para a empresa."
                    if not bool(surface_availability.get("mesa", False))
                    else "Cadastre um revisor para fechar a etapa de decisão humana."
                )
            ),
            "action_label": "Abrir mesa",
            "action_kind": "mesa-section",
            "action_target": "mesa-overview",
        },
        {
            "key": "primeiro_laudo",
            "title": "Abrir o primeiro laudo",
            "done": total_laudos > 0,
            "detail": (
                "A carteira operacional já começou a ser formada."
                if total_laudos > 0
                else "Crie o primeiro laudo da empresa para alimentar serviços, ativos e documentos."
            ),
            "action_label": "Abrir chat",
            "action_kind": "chat-section",
            "action_target": "form-chat-laudo",
        },
        {
            "key": "primeiro_envio_mesa",
            "title": "Enviar o primeiro caso para mesa",
            "done": total_mesa > 0 or not bool(surface_availability.get("mesa", False)),
            "detail": (
                "A primeira rodada de revisão humana já aconteceu no tenant."
                if total_mesa > 0
                else (
                    "Este contrato não expõe mesa avaliadora para a empresa."
                    if not bool(surface_availability.get("mesa", False))
                    else "Envie o primeiro caso para a mesa para validar o fluxo completo de revisão."
                )
            ),
            "action_label": "Abrir mesa",
            "action_kind": "mesa-section",
            "action_target": "mesa-overview",
        },
        {
            "key": "documentos",
            "title": "Consolidar biblioteca documental",
            "done": total_documentos > 0,
            "detail": (
                "Já existem documentos técnicos mapeados no portal."
                if total_documentos > 0
                else "Finalize e aprove ao menos um laudo para começar a biblioteca documental da empresa."
            ),
            "action_label": "Abrir documentos",
            "action_kind": "documentos-section",
            "action_target": "documentos-lista",
        },
        {
            "key": "recorrencia",
            "title": "Programar recorrência",
            "done": total_eventos > 0,
            "detail": (
                "A agenda preventiva já enxerga próximos vencimentos."
                if total_eventos > 0
                else "Preencha unidade, ativo e próxima inspeção para a agenda preventiva começar a funcionar."
            ),
            "action_label": "Abrir recorrência",
            "action_kind": "recorrencia-section",
            "action_target": "agenda-recorrencia-lista",
        },
    ]
    completed = sum(1 for item in steps if bool(item.get("done")))
    next_step = next((item for item in steps if not bool(item.get("done"))), None)
    return {
        "progress": {
            "completed": completed,
            "total": len(steps),
        },
        "steps": steps,
        "next_step": next_step,
        "surface_empty_hints": {
            "servicos": {
                "title": "Carteira contratada ainda vazia",
                "body": (
                    "Abra o primeiro laudo classificado para a empresa começar a enxergar RTI, SPDA, PIE, NR35 e outras linhas contratadas."
                    if total_servicos <= 0
                    else "A carteira já existe, mas ainda pode crescer conforme novos laudos forem classificados."
                ),
                "action_label": "Abrir chat",
                "action_kind": "chat-section",
                "action_target": "form-chat-laudo",
            },
            "ativos": {
                "title": "Ativos ainda não mapeados",
                "body": (
                    "Preencha unidade, local e ativo no primeiro laudo para a carteira técnica da WF aparecer por planta e equipamento."
                    if total_ativos <= 0
                    else "Os ativos já começaram a ser mapeados; aprofunde a identificação por unidade e local funcional."
                ),
                "action_label": "Abrir ativos",
                "action_kind": "ativos-section",
                "action_target": "ativos-industriais-lista",
            },
            "documentos": {
                "title": "Biblioteca documental aguardando emissão",
                "body": (
                    "Quando o primeiro laudo fechar o ciclo técnico, esta superfície passa a mostrar PDF, ART, PIE e prontuário."
                    if total_documentos <= 0
                    else "A biblioteca documental já começou; mantenha ART, PIE e anexos governados no mesmo laudo."
                ),
                "action_label": "Abrir documentos",
                "action_kind": "documentos-section",
                "action_target": "documentos-lista",
            },
            "recorrencia": {
                "title": "Agenda preventiva ainda vazia",
                "body": (
                    "Sem próxima inspeção registrada, a WF não enxerga atrasos nem próximos 30 dias no portal."
                    if total_eventos <= 0
                    else "A agenda preventiva já existe; mantenha as próximas inspeções atualizadas para não perder vencimentos."
                ),
                "action_label": "Abrir recorrência",
                "action_kind": "recorrencia-section",
                "action_target": "agenda-recorrencia-lista",
            },
        },
        "overview": {
            "team_ready": total_usuarios > 0,
            "cases_ready": total_laudos > 0,
            "services_ready": total_servicos > 0,
            "assets_ready": total_ativos > 0,
            "documents_ready": total_documentos > 0,
            "recurrence_ready": total_eventos > 0,
            "mesa_cases_ready": total_mesa > 0,
        },
    }


def _mapa_contagem_por_laudo(
    banco: Session,
    *,
    laudo_ids: list[int],
    tipo: str,
    apenas_nao_lidas: bool = False,
) -> dict[int, int]:
    ids_validos = [int(item) for item in laudo_ids if int(item or 0) > 0]
    if not ids_validos:
        return {}

    consulta = select(MensagemLaudo.laudo_id, func.count(MensagemLaudo.id)).where(
        MensagemLaudo.laudo_id.in_(ids_validos),
        MensagemLaudo.tipo == tipo,
    )
    if apenas_nao_lidas:
        consulta = consulta.where(MensagemLaudo.lida.is_(False))

    resultado = banco.execute(consulta.group_by(MensagemLaudo.laudo_id)).all()
    return {int(laudo_id): int(total) for laudo_id, total in resultado}


def _serializar_laudo_chat(banco: Session, laudo: Laudo) -> dict[str, Any]:
    payload = serializar_card_laudo(banco, laudo)
    payload.update(
        {
            "usuario_id": int(laudo.usuario_id) if laudo.usuario_id else None,
            "atualizado_em": laudo.atualizado_em.isoformat() if laudo.atualizado_em else "",
            "tipo_template_label": TIPOS_TEMPLATE_VALIDOS.get(str(laudo.tipo_template or "padrao"), "Inspeção"),
            "human_override_summary": build_human_override_summary(laudo),
        }
    )
    return payload


def _serializar_laudo_mesa(
    banco: Session,
    laudo: Laudo,
    *,
    pendencias_abertas: int,
    whispers_nao_lidos: int,
) -> dict[str, Any]:
    payload = serializar_card_laudo(banco, laudo)
    payload.update(
        {
            "pendencias_abertas": int(pendencias_abertas),
            "whispers_nao_lidos": int(whispers_nao_lidos),
            "usuario_id": int(laudo.usuario_id) if laudo.usuario_id else None,
            "revisado_por": int(laudo.revisado_por) if laudo.revisado_por else None,
            "atualizado_em": laudo.atualizado_em.isoformat() if laudo.atualizado_em else "",
            "human_override_summary": build_human_override_summary(laudo),
        }
    )
    return payload


def listar_laudos_chat_usuario(banco: Session, usuario: Usuario) -> list[dict[str, Any]]:
    laudos = list(
        banco.scalars(
            select(Laudo)
            .where(
                Laudo.empresa_id == usuario.empresa_id,
            )
            .order_by(func.coalesce(Laudo.atualizado_em, Laudo.criado_em).desc(), Laudo.id.desc())
            .limit(40)
        ).all()
    )
    return [_serializar_laudo_chat(banco, laudo) for laudo in laudos]


def listar_laudos_mesa_empresa(banco: Session, usuario: Usuario) -> list[dict[str, Any]]:
    laudos = list(
        banco.scalars(
            select(Laudo)
            .where(Laudo.empresa_id == usuario.empresa_id)
            .order_by(func.coalesce(Laudo.atualizado_em, Laudo.criado_em).desc(), Laudo.id.desc())
            .limit(60)
        ).all()
    )
    laudo_ids = [int(laudo.id) for laudo in laudos]
    pendencias_abertas = _mapa_contagem_por_laudo(
        banco,
        laudo_ids=laudo_ids,
        tipo=TipoMensagem.HUMANO_ENG.value,
        apenas_nao_lidas=True,
    )
    whispers_nao_lidos = _mapa_contagem_por_laudo(
        banco,
        laudo_ids=laudo_ids,
        tipo=TipoMensagem.HUMANO_INSP.value,
        apenas_nao_lidas=True,
    )
    return [
        _serializar_laudo_mesa(
            banco,
            laudo,
            pendencias_abertas=pendencias_abertas.get(int(laudo.id), 0),
            whispers_nao_lidos=whispers_nao_lidos.get(int(laudo.id), 0),
        )
        for laudo in laudos
    ]


def _tipo_documento_por_laudo(laudo: Laudo) -> str:
    family_key = str(getattr(laudo, "catalog_family_key", "") or "").strip().lower()
    tipo_template = str(getattr(laudo, "tipo_template", "") or "").strip().lower()
    texto_composto = " ".join(part for part in (family_key, tipo_template) if part)

    if "nr10" in texto_composto or "pie" in texto_composto or "rti" in texto_composto:
        return "Prontuário / relatório elétrico"
    if "spda" in texto_composto:
        return "Inspeção SPDA"
    if "loto" in texto_composto:
        return "Implantação LOTO"
    if "nr13" in texto_composto or "caldeira" in texto_composto or "vaso" in texto_composto:
        return "Inspeção NR13"
    if "nr12" in texto_composto:
        return "Adequação NR12"
    if "nr33" in texto_composto or "confin" in texto_composto:
        return "Espaço confinado"
    if "nr35" in texto_composto or "linha_vida" in texto_composto or "ancor" in texto_composto:
        return "Trabalho em altura"
    if "avcb" in texto_composto or "bombeiro" in texto_composto:
        return "Projeto / laudo AVCB"
    return "Laudo técnico"


def _coletar_fontes_documentais(laudo: Laudo) -> list[str]:
    dados = getattr(laudo, "dados_formulario", None)
    if not isinstance(dados, dict):
        return []
    documentacao = dict(dados.get("documentacao_e_registros") or {}) if isinstance(dados.get("documentacao_e_registros"), dict) else {}
    prontuario_payload = dict(documentacao.get("prontuario") or {}) if isinstance(documentacao.get("prontuario"), dict) else {}
    certificado_payload = dict(documentacao.get("certificado") or {}) if isinstance(documentacao.get("certificado"), dict) else {}
    textos = [
        documentacao.get("documentos_disponiveis"),
        documentacao.get("documentos_emitidos"),
        documentacao.get("observacoes_documentais"),
        documentacao.get("pie"),
        documentacao.get("manual_maquina"),
        documentacao.get("apreciacao_risco"),
        documentacao.get("checklist_nr12"),
        documentacao.get("inventario_nr12"),
        documentacao.get("procedimento_loto"),
        documentacao.get("proxima_inspecao_planejada"),
        prontuario_payload.get("referencias_texto"),
        prontuario_payload.get("observacao"),
        certificado_payload.get("referencias_texto"),
        certificado_payload.get("observacao"),
    ]
    resultado: list[str] = []
    for item in textos:
        texto = " ".join(str(item or "").strip().split())
        if texto:
            resultado.append(texto)
    return resultado


def _derivar_sinais_documentais(laudo: Laudo) -> dict[str, Any]:
    fontes = _coletar_fontes_documentais(laudo)
    corpus = f" {' | '.join(fontes).lower()} "
    detected: list[dict[str, Any]] = []
    for key, label, markers in _DOCUMENT_SIGNAL_DEFINITIONS:
        found = any(marker in corpus for marker in markers)
        if not found and key == "art":
            found = bool(re.search(r"\bart\s*[:\-]?\s*\d", corpus))
        detected.append(
            {
                "key": key,
                "label": label,
                "present": bool(found),
            }
        )
    return {
        "items": detected,
        "present_keys": [item["key"] for item in detected if item["present"]],
        "present_labels": [item["label"] for item in detected if item["present"]],
        "count": sum(1 for item in detected if item["present"]),
        "source_excerpt": fontes[0] if fontes else None,
    }


def _normalizar_condicao_nr35(value: Any) -> str | None:
    text = str(value or "").strip().upper().replace("/", "")
    if text in {"C", "CONFORME"}:
        return "C"
    if text in {"NC", "NAOCONFORME", "NÃOCONFORME"}:
        return "NC"
    if text in {"NA", "NAPLICAVEL", "NAOAPLICAVEL", "NÃOAPLICÁVEL", "NÃOAPLICAVEL"}:
        return "NA"
    return None


def _derivar_resumo_nr35(laudo: Laudo) -> dict[str, Any] | None:
    dados = getattr(laudo, "dados_formulario", None)
    if not isinstance(dados, dict):
        return None

    family_key = str(getattr(laudo, "catalog_family_key", "") or dados.get("family_key") or "").strip().lower()
    tipo_template = str(getattr(laudo, "tipo_template", "") or "").strip().lower()
    if "nr35" not in family_key and "nr35" not in tipo_template:
        return None

    objeto = dict(dados.get("objeto_inspecao") or {}) if isinstance(dados.get("objeto_inspecao"), dict) else {}
    conclusao = dict(dados.get("conclusao") or {}) if isinstance(dados.get("conclusao"), dict) else {}
    doc_reg = dict(dados.get("documentacao_e_registros") or {}) if isinstance(dados.get("documentacao_e_registros"), dict) else {}
    componentes = dict(dados.get("componentes_inspecionados") or {}) if isinstance(dados.get("componentes_inspecionados"), dict) else {}
    checklist = dict(dados.get("checklist_componentes") or {}) if isinstance(dados.get("checklist_componentes"), dict) else {}
    registros = list(dados.get("registros_fotograficos") or []) if isinstance(dados.get("registros_fotograficos"), list) else []
    component_source = componentes or checklist
    counts = {"C": 0, "NC": 0, "NA": 0}
    for item in component_source.values():
        if not isinstance(item, dict):
            continue
        condicao = _normalizar_condicao_nr35(item.get("condicao"))
        if condicao in counts:
            counts[condicao] += 1

    conclusion_status = str(conclusao.get("status") or "").strip() or None
    operational_status = str(conclusao.get("status_operacional") or "").strip() or None
    next_inspection = (
        str(conclusao.get("proxima_inspecao_periodica") or "").strip()
        or str(doc_reg.get("proxima_inspecao_planejada") or "").strip()
        or None
    )
    return {
        "line_type": str(objeto.get("tipo_linha_de_vida") or "").strip() or None,
        "inspection_scope": str(objeto.get("escopo_inspecao") or "").strip() or None,
        "conclusion_status": conclusion_status,
        "operational_status": operational_status,
        "motivo_status": str(conclusao.get("motivo_status") or "").strip() or None,
        "liberado_para_uso": str(conclusao.get("liberado_para_uso") or "").strip() or None,
        "acao_requerida": str(conclusao.get("acao_requerida") or "").strip() or None,
        "proxima_inspecao": next_inspection,
        "component_counts": counts,
        "photo_count": len(registros),
        "observacoes": str(conclusao.get("observacoes") or "").strip() or None,
    }


def _pick_first_text(*values: Any) -> str | None:
    for value in values:
        text = " ".join(str(value or "").strip().split())
        if text:
            return text
    return None


def _health_status_from_payload(status_text: str | None, operational_status: str | None) -> tuple[str, str]:
    status = str(status_text or "").strip().lower()
    op = str(operational_status or "").strip().lower()
    if status in {"reprovado"} or op in {"bloqueio", "corrigir_e_revalidar"}:
        return "critical", "Crítico"
    if status in {"pendente"} or op in {"complementar_inspecao"}:
        return "attention", "Pendente"
    if status in {"aprovado"} or op in {"liberado"}:
        return "healthy", "Aprovado"
    return "monitoring", "Em acompanhamento"


def _service_keys_for_laudo(laudo: Laudo) -> list[str]:
    family_key = str(getattr(laudo, "catalog_family_key", "") or "").strip().lower()
    tipo_template = str(getattr(laudo, "tipo_template", "") or "").strip().lower()
    text = f"{family_key} {tipo_template}"
    keys: list[str] = []
    if "rti" in text:
        keys.append("rti")
    if "nr35" in text:
        keys.append("nr35")
    if "nr13" in text:
        keys.append("nr13")
    if "nr12" in text:
        keys.append("nr12")
    if "pie" in text:
        keys.append("pie")
    if "spda" in text:
        keys.append("spda")
    if "loto" in text:
        keys.append("loto")
    if "nr33" in text:
        keys.append("nr33")
    if "avcb" in text or "bombeiro" in text:
        keys.append("avcb")
    deduped: list[str] = []
    for key in keys or ["laudo_tecnico"]:
        if key not in deduped:
            deduped.append(key)
    return deduped


def _service_status_from_assets(healthy: int, attention: int, critical: int) -> tuple[str, str]:
    if critical > 0:
        return "critical", "Pendências críticas"
    if attention > 0:
        return "attention", "Pendências abertas"
    if healthy > 0:
        return "healthy", "Operação estável"
    return "monitoring", "Em acompanhamento"


def _serializar_ativo_cliente(banco: Session, laudo: Laudo) -> dict[str, Any]:
    dados = getattr(laudo, "dados_formulario", None)
    payload = dict(dados or {}) if isinstance(dados, dict) else {}
    identificacao = dict(payload.get("identificacao") or {}) if isinstance(payload.get("identificacao"), dict) else {}
    objeto = dict(payload.get("objeto_inspecao") or {}) if isinstance(payload.get("objeto_inspecao"), dict) else {}
    info = dict(payload.get("informacoes_gerais") or {}) if isinstance(payload.get("informacoes_gerais"), dict) else {}
    escopo = dict(payload.get("escopo_servico") or {}) if isinstance(payload.get("escopo_servico"), dict) else {}
    doc_reg = dict(payload.get("documentacao_e_registros") or {}) if isinstance(payload.get("documentacao_e_registros"), dict) else {}
    conclusao = dict(payload.get("conclusao") or {}) if isinstance(payload.get("conclusao"), dict) else {}
    resumo_nr35 = _derivar_resumo_nr35(laudo)

    unit_label = _pick_first_text(
        info.get("unidade"),
        payload.get("unidade"),
        payload.get("planta"),
        identificacao.get("unidade_operacional"),
        payload.get("case_context", {}).get("unidade_nome") if isinstance(payload.get("case_context"), dict) else None,
        getattr(getattr(laudo, "empresa", None), "nome_fantasia", None),
    ) or "Unidade não informada"
    asset_label = _pick_first_text(
        identificacao.get("objeto_principal"),
        identificacao.get("identificacao_do_vaso"),
        objeto.get("identificacao_linha_vida"),
        objeto.get("objeto_principal"),
        payload.get("objeto_principal"),
        f"Ativo #{int(laudo.id)}",
    ) or f"Ativo #{int(laudo.id)}"
    location_label = _pick_first_text(
        identificacao.get("localizacao"),
        objeto.get("localizacao"),
        payload.get("local_inspecao"),
        payload.get("localizacao"),
        info.get("local"),
        unit_label,
    ) or unit_label
    asset_type = _pick_first_text(
        escopo.get("ativo_tipo"),
        resumo_nr35.get("line_type") if isinstance(resumo_nr35, dict) else None,
        objeto.get("tipo_linha_de_vida"),
        "ativo_industrial",
    ) or "ativo_industrial"
    next_due = _pick_first_text(
        doc_reg.get("proxima_inspecao_planejada"),
        resumo_nr35.get("proxima_inspecao") if isinstance(resumo_nr35, dict) else None,
    )
    status_text = (
        resumo_nr35.get("conclusion_status") if isinstance(resumo_nr35, dict) else None
    ) or _pick_first_text(conclusao.get("status"))
    operational_status = (
        resumo_nr35.get("operational_status") if isinstance(resumo_nr35, dict) else None
    ) or _pick_first_text(conclusao.get("status_operacional"), conclusao.get("acao_requerida"))
    health_status, health_label = _health_status_from_payload(status_text, operational_status)
    return {
        "asset_id": f"laudo:{int(laudo.id)}",
        "laudo_id": int(laudo.id),
        "unit_label": unit_label,
        "location_label": location_label,
        "asset_label": asset_label,
        "asset_type": asset_type,
        "service_keys": _service_keys_for_laudo(laudo),
        "health_status": health_status,
        "health_label": health_label,
        "last_inspection_at": _isoformat_or_empty(getattr(laudo, "atualizado_em", None)),
        "next_due_at": next_due,
        "latest_report_id": int(laudo.id),
        "latest_report_title": asset_label,
        "status_visual_label": str(serializar_card_laudo(banco, laudo).get("status_visual_label") or "").strip() or None,
        "nr35_summary": resumo_nr35,
    }


def listar_ativos_empresa(banco: Session, usuario: Usuario) -> list[dict[str, Any]]:
    laudos = list(
        banco.scalars(
            select(Laudo)
            .where(Laudo.empresa_id == usuario.empresa_id)
            .order_by(func.coalesce(Laudo.atualizado_em, Laudo.criado_em).desc(), Laudo.id.desc())
            .limit(80)
        ).all()
    )
    return [_serializar_ativo_cliente(banco, laudo) for laudo in laudos]


def resumir_ativos_empresa(items: list[dict[str, Any]]) -> dict[str, Any]:
    ativos = list(items or [])
    units = sorted({str(item.get("unit_label") or "").strip() for item in ativos if str(item.get("unit_label") or "").strip()})
    return {
        "total_assets": len(ativos),
        "total_units": len(units),
        "critical_assets": sum(1 for item in ativos if item.get("health_status") == "critical"),
        "attention_assets": sum(1 for item in ativos if item.get("health_status") == "attention"),
        "healthy_assets": sum(1 for item in ativos if item.get("health_status") == "healthy"),
    }


def _parse_due_date(value: Any) -> dt.date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return dt.date.fromisoformat(text[:10])
    except ValueError:
        return None


def listar_recorrencia_empresa(banco: Session, usuario: Usuario) -> list[dict[str, Any]]:
    hoje = dt.date.today()
    ativos = listar_ativos_empresa(banco, usuario)
    eventos: list[dict[str, Any]] = []
    for item in ativos:
        due_value = str(item.get("next_due_at") or "").strip()
        due_date = _parse_due_date(due_value)
        if not due_value:
            continue
        days_until_due = (due_date - hoje).days if due_date else None
        if days_until_due is not None and days_until_due < 0:
            status = "overdue"
            status_label = "Atrasado"
        elif days_until_due is not None and days_until_due <= 30:
            status = "next_30_days"
            status_label = "Próximos 30 dias"
        else:
            status = "scheduled"
            status_label = "Planejado"
        eventos.append(
            {
                "event_id": f"rec:{item.get('asset_id')}",
                "asset_id": item.get("asset_id"),
                "laudo_id": item.get("laudo_id"),
                "asset_label": item.get("asset_label"),
                "unit_label": item.get("unit_label"),
                "service_keys": list(item.get("service_keys") or []),
                "due_at": due_value,
                "days_until_due": days_until_due,
                "status": status,
                "status_label": status_label,
                "health_label": item.get("health_label"),
                "plan_label": "Plano preventivo",
                "action_label": "Programar reinspeção" if status != "overdue" else "Regularizar reinspeção",
            }
        )
    def _recorrencia_sort_key(item: dict[str, Any]) -> tuple[int, str]:
        days_until_due = item.get("days_until_due")
        return (
            999999 if days_until_due is None else int(days_until_due),
            str(item.get("asset_label") or ""),
        )

    eventos.sort(key=_recorrencia_sort_key)
    return eventos


def resumir_recorrencia_empresa(items: list[dict[str, Any]]) -> dict[str, Any]:
    eventos = list(items or [])
    return {
        "total_events": len(eventos),
        "next_30_days": sum(1 for item in eventos if item.get("status") == "next_30_days"),
        "overdue": sum(1 for item in eventos if item.get("status") == "overdue"),
        "scheduled": sum(1 for item in eventos if item.get("status") == "scheduled"),
    }


def listar_servicos_empresa(banco: Session, usuario: Usuario) -> list[dict[str, Any]]:
    ativos = listar_ativos_empresa(banco, usuario)
    documentos = listar_documentos_empresa(banco, usuario)
    service_map: dict[str, dict[str, Any]] = {}

    for key, meta in SERVICE_CATALOG.items():
        service_map[key] = {
            "service_key": key,
            "label": str(meta.get("label") or key.upper()),
            "family_key": str(meta.get("family") or "geral"),
            "units": set(),
            "assets": 0,
            "critical": 0,
            "attention": 0,
            "healthy": 0,
            "documents_total": 0,
            "documents_ready": 0,
            "next_due_values": [],
        }

    for item in ativos:
        for key in list(item.get("service_keys") or []):
            bucket = service_map.setdefault(
                key,
                {
                    "service_key": key,
                    "label": key.upper(),
                    "family_key": "geral",
                    "units": set(),
                    "assets": 0,
                    "critical": 0,
                    "attention": 0,
                    "healthy": 0,
                    "documents_total": 0,
                    "documents_ready": 0,
                    "next_due_values": [],
                },
            )
            unit_label = str(item.get("unit_label") or "").strip()
            if unit_label:
                bucket["units"].add(unit_label)
            bucket["assets"] += 1
            health = str(item.get("health_status") or "").strip()
            if health == "critical":
                bucket["critical"] += 1
            elif health == "attention":
                bucket["attention"] += 1
            elif health == "healthy":
                bucket["healthy"] += 1
            next_due = str(item.get("next_due_at") or "").strip()
            if next_due:
                bucket["next_due_values"].append(next_due)

    for item in documentos:
        for key in list(_service_keys_for_laudo(type("ServiceDoc", (), {
            "catalog_family_key": item.get("family_key") or "",
            "tipo_template": item.get("tipo_template") or "",
        })())):
            bucket = service_map.setdefault(
                key,
                {
                    "service_key": key,
                    "label": key.upper(),
                    "family_key": "geral",
                    "units": set(),
                    "assets": 0,
                    "critical": 0,
                    "attention": 0,
                    "healthy": 0,
                    "documents_total": 0,
                    "documents_ready": 0,
                    "next_due_values": [],
                },
            )
            bucket["documents_total"] += 1
            if item.get("already_issued") or item.get("ready_for_issue") or item.get("pdf_present"):
                bucket["documents_ready"] += 1

    services: list[dict[str, Any]] = []
    for key, bucket in service_map.items():
        coverage_assets = int(bucket["assets"])
        coverage_documents = int(bucket["documents_total"])
        if coverage_assets <= 0 and coverage_documents <= 0:
            continue
        status, status_label = _service_status_from_assets(bucket["healthy"], bucket["attention"], bucket["critical"])
        next_due_at = sorted(bucket["next_due_values"])[0] if bucket["next_due_values"] else None
        services.append(
            {
                "service_key": key,
                "label": bucket["label"],
                "family_key": bucket["family_key"],
                "status": status,
                "status_label": status_label,
                "units_covered": len(bucket["units"]),
                "assets_covered": coverage_assets,
                "open_findings": int(bucket["critical"]) + int(bucket["attention"]),
                "documents_ready": int(bucket["documents_ready"]),
                "documents_total": coverage_documents,
                "next_due_at": next_due_at,
                "lead_engineer": {
                    "name": "Equipe técnica Tariel",
                    "crea": "",
                },
            }
        )

    order = {key: idx for idx, key in enumerate(SERVICE_CATALOG.keys())}
    services.sort(key=lambda item: (order.get(str(item.get("service_key") or ""), 999), str(item.get("label") or "")))
    return services


def resumir_servicos_empresa(items: list[dict[str, Any]]) -> dict[str, Any]:
    services = list(items or [])
    return {
        "total_services": len(services),
        "critical_services": sum(1 for item in services if item.get("status") == "critical"),
        "attention_services": sum(1 for item in services if item.get("status") == "attention"),
        "healthy_services": sum(1 for item in services if item.get("status") == "healthy"),
        "total_units_covered": sum(int(item.get("units_covered") or 0) for item in services),
    }


def _serializar_documento_cliente(banco: Session, laudo: Laudo) -> dict[str, Any]:
    payload_laudo = serializar_card_laudo(banco, laudo)
    verificacao_publica = build_public_verification_payload(banco, laudo=laudo)
    emissao_oficial = build_official_issue_summary(banco, laudo=laudo)
    current_issue = dict(emissao_oficial.get("current_issue") or {})
    verification_url = str(verificacao_publica.get("verification_url") or "").strip()
    issue_number = str(current_issue.get("issue_number") or "").strip()
    issue_state_label = str(current_issue.get("issue_state_label") or "").strip()
    issue_status_label = str(emissao_oficial.get("issue_status_label") or "").strip()
    sinais_documentais = _derivar_sinais_documentais(laudo)
    resumo_nr35 = _derivar_resumo_nr35(laudo)
    entrega_oficial, entrega_nr35 = _build_cliente_official_delivery_payload(
        laudo=laudo,
        emissao_oficial=emissao_oficial,
        current_issue=current_issue,
    )
    historico_emissoes = _listar_historico_emissoes_cliente(banco, laudo)
    visual_state, visual_state_label, visual_state_detail = document_visual_state(
        emissao_oficial=emissao_oficial,
        payload_laudo=payload_laudo,
    )
    package_sections = build_document_package_sections(
        emissao_oficial=emissao_oficial,
        document_signals=sinais_documentais,
    )
    summary_card = build_document_summary_card(
        emissao_oficial=emissao_oficial,
        verificacao_publica=verificacao_publica,
        payload_laudo=payload_laudo,
    )
    timeline = build_document_timeline(emissao_oficial=emissao_oficial)
    latest_event = next(
        (
            item
            for item in list(emissao_oficial.get("audit_trail") or [])
            if isinstance(item, dict) and str(item.get("summary") or "").strip()
        ),
        None,
    )
    return {
        "document_id": f"laudo:{int(laudo.id)}",
        "laudo_id": int(laudo.id),
        "titulo": str(payload_laudo.get("titulo") or f"Laudo #{int(laudo.id)}"),
        "document_type": "laudo",
        "document_type_label": _tipo_documento_por_laudo(laudo),
        "tipo_template": str(getattr(laudo, "tipo_template", "") or "").strip() or None,
        "tipo_template_label": TIPOS_TEMPLATE_VALIDOS.get(
            str(getattr(laudo, "tipo_template", "") or "padrao"),
            "Inspeção",
        ),
        "family_key": str(getattr(laudo, "catalog_family_key", "") or "").strip() or None,
        "family_label": str(getattr(laudo, "catalog_family_label", "") or "").strip() or None,
        "status_card": str(payload_laudo.get("status_card") or "").strip(),
        "status_revisao": str(payload_laudo.get("status_revisao") or "").strip(),
        "case_lifecycle_status": str(payload_laudo.get("case_lifecycle_status") or "").strip(),
        "status_visual_label": str(payload_laudo.get("status_visual_label") or "").strip(),
        "document_visual_state": visual_state,
        "document_visual_state_label": visual_state_label,
        "document_visual_state_detail": visual_state_detail,
        "codigo_hash": str(getattr(laudo, "codigo_hash", "") or "").strip(),
        "hash_short": str(verificacao_publica.get("hash_short") or "").strip(),
        "verification_url": verification_url or None,
        "pdf_file_name": str(getattr(laudo, "nome_arquivo_pdf", "") or "").strip() or None,
        "pdf_present": bool(emissao_oficial.get("pdf_present")),
        "public_verification_present": bool(emissao_oficial.get("public_verification_present")),
        "ready_for_issue": bool(emissao_oficial.get("ready_for_issue")),
        "already_issued": bool(emissao_oficial.get("already_issued")),
        "reissue_recommended": bool(emissao_oficial.get("reissue_recommended")),
        "issue_status": str(emissao_oficial.get("issue_status") or "").strip(),
        "issue_status_label": issue_status_label or None,
        "issue_action_label": str(emissao_oficial.get("issue_action_label") or "").strip() or None,
        "issue_number": issue_number or None,
        "issue_state_label": issue_state_label or None,
        "issued_at": _isoformat_or_empty(current_issue.get("issued_at")) or None,
        "signatory_name": str(current_issue.get("signatory_name") or "").strip() or None,
        "emissao_oficial": entrega_oficial,
        "historico_emissoes": historico_emissoes,
        "nr35": entrega_nr35,
        "document_signals": sinais_documentais,
        "document_package_sections": package_sections,
        "document_summary_card": summary_card,
        "document_timeline": timeline,
        "nr35_summary": resumo_nr35,
        "verification_summary": (
            f"Hash {str(verificacao_publica.get('hash_short') or '').strip()} pronto para conferência pública."
            if verification_url
            else "Verificação pública ainda não materializada."
        ),
        "latest_timeline_summary": str((latest_event or {}).get("summary") or "").strip() or None,
        "updated_at": _isoformat_or_empty(getattr(laudo, "atualizado_em", None)),
        "created_at": _isoformat_or_empty(getattr(laudo, "criado_em", None)),
    }


def listar_documentos_empresa(banco: Session, usuario: Usuario) -> list[dict[str, Any]]:
    laudos = list(
        banco.scalars(
            select(Laudo)
            .where(Laudo.empresa_id == usuario.empresa_id)
            .order_by(func.coalesce(Laudo.atualizado_em, Laudo.criado_em).desc(), Laudo.id.desc())
            .limit(60)
        ).all()
    )
    return [_serializar_documento_cliente(banco, laudo) for laudo in laudos]


def resumir_documentos_empresa(items: list[dict[str, Any]]) -> dict[str, Any]:
    documents = list(items or [])
    with_art = [item for item in documents if "art" in list((item.get("document_signals") or {}).get("present_keys") or [])]
    with_pie = [item for item in documents if "pie" in list((item.get("document_signals") or {}).get("present_keys") or [])]
    with_prontuario = [
        item for item in documents if "prontuario" in list((item.get("document_signals") or {}).get("present_keys") or [])
    ]
    state_counts = {
        "official": sum(1 for item in documents if item.get("document_visual_state") == "official"),
        "draft": sum(1 for item in documents if item.get("document_visual_state") == "draft"),
        "in_review": sum(1 for item in documents if item.get("document_visual_state") == "in_review"),
        "historical": sum(1 for item in documents if item.get("document_visual_state") == "historical"),
        "internal": sum(1 for item in documents if item.get("document_visual_state") == "internal"),
    }
    package_section_counts = {key: 0 for key in DOCUMENT_PACKAGE_SECTION_LABELS}
    for item in documents:
        counts = dict((item.get("document_package_sections") or {}).get("counts") or {})
        for key in package_section_counts:
            package_section_counts[key] += int(counts.get(key) or 0)
    return {
        "total_documents": len(documents),
        "issued_documents": sum(1 for item in documents if item.get("already_issued")),
        "pending_issue_documents": sum(1 for item in documents if item.get("ready_for_issue") and not item.get("already_issued")),
        "with_public_verification": sum(1 for item in documents if item.get("public_verification_present")),
        "reissue_recommended": sum(1 for item in documents if item.get("reissue_recommended")),
        "document_state_counts": state_counts,
        "package_section_counts": package_section_counts,
        "nr35_approved": sum(1 for item in documents if str(((item.get("nr35_summary") or {}).get("conclusion_status") or "")).lower() == "aprovado"),
        "nr35_reproved": sum(1 for item in documents if str(((item.get("nr35_summary") or {}).get("conclusion_status") or "")).lower() == "reprovado"),
        "nr35_pending": sum(1 for item in documents if str(((item.get("nr35_summary") or {}).get("conclusion_status") or "")).lower() == "pendente"),
        "nr35_official_issued": sum(1 for item in documents if bool((item.get("nr35") or {}).get("auditavel"))),
        "official_package_ready": sum(1 for item in documents if bool((item.get("emissao_oficial") or {}).get("package_ready"))),
        "official_issue_history_count": sum(len(list(item.get("historico_emissoes") or [])) for item in documents),
        "documents_with_art": len(with_art),
        "documents_with_pie": len(with_pie),
        "documents_with_prontuario": len(with_prontuario),
        "with_art_items": with_art[:12],
        "with_pie_items": with_pie[:12],
        "with_prontuario_items": with_prontuario[:12],
    }


__all__ = [
    "ROLE_LABELS",
    "build_guided_onboarding_cliente",
    "listar_ativos_empresa",
    "listar_documentos_empresa",
    "listar_laudos_chat_usuario",
    "listar_laudos_mesa_empresa",
    "listar_recorrencia_empresa",
    "listar_servicos_empresa",
    "resumir_ativos_empresa",
    "resumir_documentos_empresa",
    "resumir_recorrencia_empresa",
    "resumir_servicos_empresa",
    "serializar_usuario_cliente",
]
