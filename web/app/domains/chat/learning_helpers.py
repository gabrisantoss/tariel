"""Helpers compartilhados do aprendizado supervisionado de IA."""

from __future__ import annotations

import base64
import binascii
import hashlib
import re
import unicodedata
import uuid
from pathlib import Path
from typing import Any, Iterable

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.domains.chat.normalization import (
    nome_template_humano,
    normalizar_tipo_template,
    resolver_familia_padrao_template,
)
from app.core.settings import env_str
from app.domains.chat.media_helpers import nome_documento_seguro, validar_imagem_base64
from app.shared.database import AprendizadoVisualIa, StatusAprendizadoIa, VereditoAprendizadoIa

PASTA_APRENDIZADOS_VISUAIS_IA = Path(
    env_str("PASTA_APRENDIZADOS_VISUAIS_IA", "static/uploads/aprendizados_ia")
).expanduser()
MIME_IMAGEM_APRENDIZADO = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
CORRECAO_CHAT_AUTOMATICA_PADRAO = (
    "Sem correção explícita do inspetor. Evidência visual capturada do chat para validação posterior da mesa."
)
DESCRICAO_CHAT_AUTOMATICA_PADRAO = (
    "Evidência visual capturada automaticamente do chat do inspetor para revisão da mesa avaliadora."
)
MARCADORES_INTERNOS_APRENDIZADO_PREFIXOS = (
    "aprendizado_bloqueado:",
    "confianca_visual:",
    "familia_alvo:",
    "fluxo_correcao_visual:",
    "responsabilidade_humana:",
    "risco_poisoning:",
    "template_alvo:",
)
MARCADORES_BLOQUEIO_REFERENCIA_FUTURA_PREFIXOS = (
    "aprendizado_bloqueado:",
    "risco_poisoning:",
)
MARCADORES_LIBERACAO_REFERENCIA_FUTURA = {
    "confirmado_pela_mesa:sim",
    "confirmado_por_evidencia:sim",
    "variacao_visual_validada:sim",
}
_TERMOS_CHAT_CONFORME = (
    "esta correto",
    "esta correta",
    "isso esta correto",
    "isso esta correta",
    "ta correto",
    "ta correta",
    "esta sim correta",
    "esta sim correto",
    "procede",
)
_TERMOS_CHAT_NAO_CONFORME = (
    "nao conforme",
    "não conforme",
    "irregular",
    "inadequado",
)
_TERMOS_CHAT_AJUSTE = (
    "esta errado",
    "esta errada",
    "isso esta errado",
    "isso esta errada",
    "incorreto",
    "incorreta",
    "reavalie",
    "reavaliar",
    "revise",
    "corrija",
    "corrigir",
)
_TERMOS_CHAT_EXPLICACAO_VISUAL = (
    "porque",
    "pois",
    "motivo",
    "explico",
    "explicacao",
    "explicação",
    "a imagem mostra",
    "a foto mostra",
    "na imagem aparece",
    "na foto aparece",
    "dá para ver",
    "da para ver",
)
_TERMOS_CHAT_INSISTENCIA_VISUAL = (
    "tenho certeza",
    "tenho conviccao",
    "tenho convicção",
    "pode continuar",
    "quero continuar",
    "continue assim",
    "continuar assim",
    "prosseguir",
    "siga como",
    "assumo",
    "por minha conta",
    "por conta e risco",
    "sob minha responsabilidade",
)
_TERMOS_CHAT_ANGULO_COMPLEMENTAR = (
    "outro angulo",
    "outro ângulo",
    "nova foto",
    "foto complementar",
    "mais uma foto",
    "outra foto",
    "de lado",
    "mais perto",
    "mais de perto",
)
_GATILHOS_CORRECAO_FAMILIA = (
    "isso e",
    "isso eh",
    "isso é",
    "mas isso e",
    "mas isso eh",
    "mas isso é",
    "na verdade e",
    "na verdade eh",
    "na verdade é",
    "reavalie como",
    "reavaliar como",
    "classifique como",
    "é nr",
    "e nr",
)
_PADROES_TEMPLATE_CORRECAO: tuple[tuple[str, str], ...] = (
    ("nr35_ponto_ancoragem", "ponto de ancoragem|ancoragem nr35|ancoragem nr 35"),
    ("nr35_montagem", "montagem nr35|montagem nr 35|fabricacao linha de vida|fabricação linha de vida"),
    ("nr35_projeto", "projeto nr35|projeto nr 35|projeto linha de vida"),
    ("nr35_linha_vida", "nr35 linha de vida|nr 35 linha de vida|linha de vida|linha-de-vida|nr35|nr 35"),
    ("nr33_espaco_confinado", "nr33|nr 33|espaco confinado|espaço confinado"),
    ("nr20_instalacoes", "nr20|nr 20|inflamavel|inflamável|combustivel|combustível"),
    ("nr13", "nr13|nr 13|caldeira|vaso de pressao|vaso de pressão|tubulacao|tubulação"),
    ("nr13_calibracao", "calibracao|calibração|valvula de seguranca|válvula de segurança|manometro|manômetro"),
    ("nr13_ultrassom", "ultrassom|espessura"),
    ("nr13_teste_hidrostatico", "hidrostatico|hidrostático|estanqueidade"),
    ("nr12maquinas", "nr12|nr 12|maquina|máquina|equipamento"),
    ("nr11_movimentacao", "nr11|nr 11|movimentacao|movimentação|icamento|ponte rolante"),
    ("loto", "loto|bloqueio|energia perigosa"),
    ("spda", "spda|descarga atmosferica|descarga atmosférica|para-raio|para raio"),
    ("pie", "pie|prontuario eletrico|prontuário elétrico|prontuario das instalacoes|prontuário das instalações"),
    ("rti", "rti|instalacao eletrica|instalação elétrica|relatorio tecnico eletrico|relatório técnico elétrico"),
    ("avcb", "avcb|bombeiro|incendio|incêndio"),
)


def _valor_enum_ou_texto(valor: Any) -> str:
    if valor is None:
        return ""
    return str(getattr(valor, "value", valor))


def _normalizar_texto_detector(texto: str) -> str:
    texto_normalizado = unicodedata.normalize("NFKD", str(texto or "").strip().lower())
    texto_sem_acento = "".join(char for char in texto_normalizado if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", texto_sem_acento).strip()


def _resumir_texto_chat(texto: str, *, fallback: str = "Evidência visual capturada do chat") -> str:
    valor = re.sub(r"\s+", " ", str(texto or "").strip())
    return valor[:240] if valor else fallback


def inferir_veredito_correcao_chat(texto: str) -> str | None:
    texto_norm = _normalizar_texto_detector(texto)
    if not texto_norm:
        return None
    if any(termo in texto_norm for termo in _TERMOS_CHAT_NAO_CONFORME):
        return VereditoAprendizadoIa.NAO_CONFORME.value
    if any(termo in texto_norm for termo in _TERMOS_CHAT_AJUSTE):
        return VereditoAprendizadoIa.AJUSTE.value
    if any(termo in texto_norm for termo in _TERMOS_CHAT_CONFORME):
        return VereditoAprendizadoIa.CONFORME.value
    return None


def inferir_template_correcao_chat(texto: str) -> dict[str, str] | None:
    texto_norm = _normalizar_texto_detector(texto)
    if not texto_norm:
        return None
    if not any(gatilho in texto_norm for gatilho in _GATILHOS_CORRECAO_FAMILIA):
        return None

    for template_key, padrao in _PADROES_TEMPLATE_CORRECAO:
        termos = [termo.strip() for termo in padrao.split("|") if termo.strip()]
        if not any(termo in texto_norm for termo in termos):
            continue
        template = normalizar_tipo_template(template_key)
        familia = resolver_familia_padrao_template(template)
        label = nome_template_humano(template)
        return {
            "template_key": template,
            "template_label": label,
            "family_key": str(familia.get("family_key") or template),
            "family_label": str(familia.get("family_label") or label),
            "norma_label": label.split(" ", 1)[0].replace("-", "") if label else template.upper(),
        }
    return None


def inferir_sinal_continuacao_correcao_visual(texto: str) -> str | None:
    texto_norm = _normalizar_texto_detector(texto)
    if not texto_norm:
        return None
    if any(termo in texto_norm for termo in _TERMOS_CHAT_ANGULO_COMPLEMENTAR):
        return "angulo_complementar"
    if any(termo in texto_norm for termo in _TERMOS_CHAT_INSISTENCIA_VISUAL):
        return "insistencia_usuario"
    if any(termo in texto_norm for termo in _TERMOS_CHAT_EXPLICACAO_VISUAL):
        return "explicacao_usuario"
    return None


_STOPWORDS_APRENDIZADO = {
    "com",
    "como",
    "para",
    "pela",
    "pelo",
    "das",
    "dos",
    "uma",
    "que",
    "por",
    "sem",
    "nas",
    "nos",
    "foto",
    "fotos",
    "imagem",
    "imagens",
    "laudo",
    "esse",
    "essa",
    "isso",
    "esta",
    "está",
    "aqui",
    "qual",
}


def normalizar_lista_textos(
    valores: Iterable[str] | None,
    *,
    limite_itens: int = 12,
    limite_chars: int = 180,
) -> list[str]:
    itens: list[str] = []
    vistos: set[str] = set()
    for valor in list(valores or []):
        texto = re.sub(r"\s+", " ", str(valor or "").strip())[:limite_chars]
        if not texto:
            continue
        chave = texto.lower()
        if chave in vistos:
            continue
        itens.append(texto)
        vistos.add(chave)
        if len(itens) >= limite_itens:
            break
    return itens


def normalizar_marcacoes_aprendizado(
    marcacoes: Iterable[dict[str, Any]] | None,
    *,
    limite_itens: int = 12,
) -> list[dict[str, Any]]:
    itens: list[dict[str, Any]] = []
    for item in list(marcacoes or []):
        if not isinstance(item, dict):
            continue
        rotulo = str(item.get("rotulo") or "").strip()[:80]
        observacao = str(item.get("observacao") or "").strip()[:300]
        if not rotulo and not observacao:
            continue
        payload: dict[str, Any] = {
            "rotulo": rotulo,
            "observacao": observacao,
        }
        for chave in ("x", "y", "largura", "altura"):
            valor = item.get(chave)
            if isinstance(valor, (int, float)) and 0 <= float(valor) <= 1:
                payload[chave] = round(float(valor), 4)
        itens.append(payload)
        if len(itens) >= limite_itens:
            break
    return itens


def mesclar_marcadores_internos_aprendizado(
    pontos_atuais: Iterable[str] | None,
    novos_pontos: Iterable[str] | None,
) -> list[str]:
    pontos_visiveis = normalizar_lista_textos(novos_pontos)
    marcadores_internos = [
        ponto
        for ponto in normalizar_lista_textos(pontos_atuais, limite_itens=20)
        if ponto.startswith(MARCADORES_INTERNOS_APRENDIZADO_PREFIXOS)
    ]
    return normalizar_lista_textos(pontos_visiveis + marcadores_internos)


def aprendizado_visual_pode_ser_referencia_futura(item: AprendizadoVisualIa) -> bool:
    pontos = set(normalizar_lista_textos(item.pontos_chave_json or [], limite_itens=30))
    if pontos & MARCADORES_LIBERACAO_REFERENCIA_FUTURA:
        return True
    return not any(
        ponto.startswith(MARCADORES_BLOQUEIO_REFERENCIA_FUTURA_PREFIXOS)
        for ponto in pontos
    )


def salvar_evidencia_aprendizado_visual(
    *,
    empresa_id: int,
    laudo_id: int,
    dados_imagem: str,
    nome_imagem: str,
) -> dict[str, str]:
    imagem_data_uri = validar_imagem_base64(dados_imagem)
    if not imagem_data_uri:
        return {}

    cabecalho, conteudo_b64 = imagem_data_uri.split(",", 1)
    mime_type = cabecalho.split(";", 1)[0].split(":", 1)[1].strip().lower()
    extensao = MIME_IMAGEM_APRENDIZADO.get(mime_type)
    if not extensao:
        raise HTTPException(status_code=415, detail="Formato de imagem não suportado para aprendizado visual.")

    try:
        conteudo = base64.b64decode(conteudo_b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Imagem base64 inválida para aprendizado visual.") from exc

    if not conteudo:
        raise HTTPException(status_code=400, detail="A evidência visual enviada está vazia.")

    sha256 = hashlib.sha256(conteudo).hexdigest()
    pasta_destino = PASTA_APRENDIZADOS_VISUAIS_IA / str(int(empresa_id)) / str(int(laudo_id))
    pasta_destino.mkdir(parents=True, exist_ok=True)

    nome_base = nome_documento_seguro(nome_imagem or "evidencia_aprendizado") or "evidencia_aprendizado"
    nome_arquivo = f"{uuid.uuid4().hex[:16]}{extensao}"
    caminho_arquivo = pasta_destino / nome_arquivo
    caminho_arquivo.write_bytes(conteudo)

    return {
        "imagem_url": f"/static/uploads/aprendizados_ia/{int(empresa_id)}/{int(laudo_id)}/{nome_arquivo}",
        "imagem_nome_original": Path(nome_base).name[:160],
        "imagem_mime_type": mime_type,
        "imagem_sha256": sha256,
        "caminho_arquivo": str(caminho_arquivo),
    }


def serializar_aprendizado_visual(item: AprendizadoVisualIa) -> dict[str, Any]:
    return {
        "id": int(item.id),
        "empresa_id": int(item.empresa_id),
        "laudo_id": int(item.laudo_id),
        "mensagem_referencia_id": int(item.mensagem_referencia_id) if item.mensagem_referencia_id else None,
        "setor_industrial": str(item.setor_industrial or ""),
        "resumo": str(item.resumo or ""),
        "descricao_contexto": str(item.descricao_contexto or ""),
        "correcao_inspetor": str(item.correcao_inspetor or ""),
        "parecer_mesa": str(item.parecer_mesa or ""),
        "sintese_consolidada": str(item.sintese_consolidada or ""),
        "status": _valor_enum_ou_texto(item.status),
        "veredito_inspetor": _valor_enum_ou_texto(item.veredito_inspetor),
        "veredito_mesa": _valor_enum_ou_texto(item.veredito_mesa) if item.veredito_mesa else None,
        "pontos_chave": list(item.pontos_chave_json or []),
        "referencias_norma": list(item.referencias_norma_json or []),
        "marcacoes": list(item.marcacoes_json or []),
        "imagem_url": str(item.imagem_url or ""),
        "imagem_nome_original": str(item.imagem_nome_original or ""),
        "imagem_mime_type": str(item.imagem_mime_type or ""),
        "imagem_sha256": str(item.imagem_sha256 or ""),
        "criado_por_id": int(item.criado_por_id) if item.criado_por_id else None,
        "validado_por_id": int(item.validado_por_id) if item.validado_por_id else None,
        "criado_em": item.criado_em.isoformat() if item.criado_em else None,
        "atualizado_em": item.atualizado_em.isoformat() if item.atualizado_em else None,
        "validado_em": item.validado_em.isoformat() if item.validado_em else None,
    }


def listar_aprendizados_laudo(
    banco: Session,
    *,
    laudo_id: int,
    empresa_id: int,
) -> list[AprendizadoVisualIa]:
    return (
        banco.query(AprendizadoVisualIa)
        .filter(
            AprendizadoVisualIa.laudo_id == laudo_id,
            AprendizadoVisualIa.empresa_id == empresa_id,
        )
        .order_by(AprendizadoVisualIa.criado_em.desc(), AprendizadoVisualIa.id.desc())
        .all()
    )


def obter_aprendizado_visual(
    banco: Session,
    *,
    aprendizado_id: int,
    empresa_id: int,
) -> AprendizadoVisualIa:
    item = (
        banco.query(AprendizadoVisualIa)
        .filter(
            AprendizadoVisualIa.id == aprendizado_id,
            AprendizadoVisualIa.empresa_id == empresa_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Aprendizado visual não encontrado.")
    return item


def obter_rascunho_aprendizado_visual_chat(
    banco: Session,
    *,
    empresa_id: int,
    laudo_id: int,
    criado_por_id: int,
    referencia_mensagem_id: int | None = None,
) -> AprendizadoVisualIa | None:
    consulta = banco.query(AprendizadoVisualIa).filter(
        AprendizadoVisualIa.empresa_id == empresa_id,
        AprendizadoVisualIa.laudo_id == laudo_id,
        AprendizadoVisualIa.criado_por_id == criado_por_id,
        AprendizadoVisualIa.status == StatusAprendizadoIa.RASCUNHO_INSPETOR.value,
    )
    if referencia_mensagem_id:
        item_referenciado = (
            consulta.filter(AprendizadoVisualIa.mensagem_referencia_id == referencia_mensagem_id)
            .order_by(AprendizadoVisualIa.criado_em.desc(), AprendizadoVisualIa.id.desc())
            .first()
        )
        if item_referenciado:
            return item_referenciado
    return consulta.order_by(AprendizadoVisualIa.criado_em.desc(), AprendizadoVisualIa.id.desc()).first()


def _rascunho_tem_correcao_visual_previa(rascunho: AprendizadoVisualIa | None) -> bool:
    if rascunho is None:
        return False
    pontos_previos = normalizar_lista_textos(rascunho.pontos_chave_json or [], limite_itens=20)
    tem_correcao_previa = str(rascunho.correcao_inspetor or "").strip() not in {
        "",
        CORRECAO_CHAT_AUTOMATICA_PADRAO,
    }
    tem_fluxo_previo = any(
        ponto.startswith(("template_alvo:", "fluxo_correcao_visual:"))
        for ponto in pontos_previos
    )
    return tem_correcao_previa or tem_fluxo_previo


def registrar_aprendizado_visual_automatico_chat(
    banco: Session,
    *,
    empresa_id: int,
    laudo_id: int,
    criado_por_id: int,
    setor_industrial: str,
    mensagem_id: int,
    mensagem_chat: str,
    dados_imagem: str,
    referencia_mensagem_id: int | None = None,
) -> AprendizadoVisualIa | None:
    texto_chat = str(mensagem_chat or "").strip()
    tem_imagem = bool(str(dados_imagem or "").strip())
    veredito_chat = inferir_veredito_correcao_chat(texto_chat)
    template_correcao = inferir_template_correcao_chat(texto_chat)
    sinal_continuacao = inferir_sinal_continuacao_correcao_visual(texto_chat)
    rascunho_previo = obter_rascunho_aprendizado_visual_chat(
        banco,
        empresa_id=empresa_id,
        laudo_id=laudo_id,
        criado_por_id=criado_por_id,
        referencia_mensagem_id=referencia_mensagem_id,
    )
    if sinal_continuacao and not template_correcao and not veredito_chat:
        if not _rascunho_tem_correcao_visual_previa(rascunho_previo):
            sinal_continuacao = None
    correcao_detectada = bool(veredito_chat or template_correcao or sinal_continuacao)

    if not tem_imagem and not correcao_detectada:
        return None

    pontos_chave = []
    referencias_norma = []
    if template_correcao:
        pontos_chave.extend(
            [
                f"Correção do inspetor: reavaliar como {template_correcao['template_label']}",
                f"template_alvo:{template_correcao['template_key']}",
                f"familia_alvo:{template_correcao['family_key']}",
            ]
        )
        referencias_norma.append(template_correcao["template_label"])
    if sinal_continuacao:
        pontos_chave.append(f"fluxo_correcao_visual:{sinal_continuacao}")
        if sinal_continuacao == "insistencia_usuario":
            pontos_chave.extend(
                [
                    "confianca_visual:baixa_por_premissa_usuario",
                    "risco_poisoning:premissa_usuario_baixa_confianca",
                    "aprendizado_bloqueado:insistencia_incompativel_sem_confirmacao_visual",
                    "responsabilidade_humana:validacao_assinatura",
                ]
            )

    if tem_imagem:
        evidencia = salvar_evidencia_aprendizado_visual(
            empresa_id=empresa_id,
            laudo_id=laudo_id,
            dados_imagem=dados_imagem,
            nome_imagem="chat-evidencia.png",
        )
        descricao_contexto = (
            f"{DESCRICAO_CHAT_AUTOMATICA_PADRAO} Mensagem do inspetor: {texto_chat}"
            if texto_chat
            else DESCRICAO_CHAT_AUTOMATICA_PADRAO
        )
        if template_correcao:
            descricao_contexto = (
                f"{descricao_contexto} O inspetor pediu reavaliação como "
                f"{template_correcao['template_label']} no tenant atual."
            )
        item = AprendizadoVisualIa(
            empresa_id=empresa_id,
            laudo_id=laudo_id,
            mensagem_referencia_id=mensagem_id,
            criado_por_id=criado_por_id,
            setor_industrial=str(setor_industrial or "geral").strip() or "geral",
            resumo=_resumir_texto_chat(texto_chat),
            descricao_contexto=descricao_contexto[:4000],
            correcao_inspetor=texto_chat if correcao_detectada else CORRECAO_CHAT_AUTOMATICA_PADRAO,
            veredito_inspetor=veredito_chat
            or (VereditoAprendizadoIa.AJUSTE.value if template_correcao else VereditoAprendizadoIa.DUVIDA.value),
            pontos_chave_json=normalizar_lista_textos(pontos_chave),
            referencias_norma_json=normalizar_lista_textos(referencias_norma),
            **evidencia,
        )
        banco.add(item)
        banco.flush()
        return item

    rascunho: AprendizadoVisualIa | None = rascunho_previo
    if not rascunho:
        return None

    texto_existente = str(rascunho.correcao_inspetor or "").strip()
    if not texto_existente or texto_existente == CORRECAO_CHAT_AUTOMATICA_PADRAO:
        rascunho.correcao_inspetor = texto_chat
    elif _normalizar_texto_detector(texto_chat) not in _normalizar_texto_detector(texto_existente):
        rascunho.correcao_inspetor = f"{texto_existente}\n\nComplemento do inspetor no chat: {texto_chat}"[:4000]
    if veredito_chat:
        rascunho.veredito_inspetor = veredito_chat
    elif template_correcao:
        rascunho.veredito_inspetor = VereditoAprendizadoIa.AJUSTE.value
    if not rascunho.resumo or rascunho.resumo == "Evidência visual capturada do chat":
        rascunho.resumo = _resumir_texto_chat(texto_chat)
    descricao_contexto = str(rascunho.descricao_contexto or "")
    if texto_chat and _normalizar_texto_detector(texto_chat) not in _normalizar_texto_detector(descricao_contexto):
        rascunho.descricao_contexto = f"{descricao_contexto} Complemento do inspetor no chat: {texto_chat}".strip()[:4000]
    if template_correcao or sinal_continuacao:
        rascunho.pontos_chave_json = normalizar_lista_textos(
            list(rascunho.pontos_chave_json or []) + pontos_chave
        )
        if referencias_norma:
            rascunho.referencias_norma_json = normalizar_lista_textos(
                list(rascunho.referencias_norma_json or []) + referencias_norma
            )
    banco.add(rascunho)
    banco.flush()
    return rascunho


def construir_contexto_correcao_visual_pendente_para_ia(
    item: AprendizadoVisualIa | None,
) -> str:
    if item is None:
        return ""
    if _valor_enum_ou_texto(item.status) != StatusAprendizadoIa.RASCUNHO_INSPETOR.value:
        return ""

    correcao = str(item.correcao_inspetor or "").strip()
    pontos = normalizar_lista_textos(item.pontos_chave_json or [], limite_itens=6, limite_chars=140)
    referencias = normalizar_lista_textos(item.referencias_norma_json or [], limite_itens=4, limite_chars=120)
    veredito = _valor_enum_ou_texto(item.veredito_inspetor)
    if (
        correcao == CORRECAO_CHAT_AUTOMATICA_PADRAO
        and veredito == VereditoAprendizadoIa.DUVIDA.value
        and not pontos
        and not referencias
    ):
        return ""
    if not correcao and not pontos and not referencias:
        return ""

    blocos = [
        "[correcao_visual_do_inspetor_em_rascunho]",
        (
            "Instrucao interna invisivel ao usuario: nao mencione aprendizado, "
            "tenant, governanca, memoria, rascunho ou regras internas. Responda "
            "como uma analise tecnica normal dentro do chat."
        ),
        (
            "O inspetor contestou ou refinou a leitura visual no chat. Reavalie "
            "a evidencia atual com mais cuidado, mas nao aceite a correcao como "
            "verdade automatica: cruze imagem, texto, familia, NR e tipo de laudo."
        ),
        (
            "Se a foto/contexto nao sustentarem a NR ou familia indicada com boa "
            "confianca, diga objetivamente que a evidencia nao confirma essa "
            "classificacao e peca uma justificativa tecnica ou evidencia adicional "
            "para continuar nesse caminho."
        ),
        (
            "Se o usuario explicar o motivo e a explicacao cruzar tecnicamente "
            "com a foto/contexto, prossiga com a avaliacao no tipo indicado e "
            "trate como hipotese operacional validavel, nao como memoria validada."
        ),
        (
            "Se a explicacao continuar incompatível, pergunte se ele tem certeza "
            "que deseja continuar por decisao dele. Se ele confirmar, nao discuta "
            "nem tente convencer novamente: monte a analise ou o laudo como o "
            "usuario pediu, deixando claro que a classificacao e uma premissa "
            "declarada pelo usuario, com baixa confianca visual, dependente de "
            "validacao humana e sob responsabilidade tecnica do humano que revisar "
            "e assinar, por conta e risco tecnico desse humano. Internamente, marque "
            "como sinal nao confiavel e nao use como referencia futura."
        ),
        (
            "Este rascunho pertence somente ao tenant atual "
            f"(empresa_id={int(getattr(item, 'empresa_id', 0) or 0)}). "
            "Não use como memória global nem para outra empresa."
        ),
    ]
    if correcao:
        blocos.append(f"- Correção do inspetor: {correcao}")
    if pontos:
        blocos.append(f"- Pontos-chave em rascunho: {'; '.join(pontos)}")
    if referencias:
        blocos.append(f"- Referências/serviços indicados: {'; '.join(referencias)}")
    blocos.append(
        "A experiencia do usuario deve continuar sendo apenas o chat. A decisao interna "
        "so podera virar memoria futura se houver validacao posterior da governanca do tenant."
    )
    blocos.append("[/correcao_visual_do_inspetor_em_rascunho]")
    return "\n".join(blocos)


def construir_contexto_analise_visual_chat_para_ia(*, tem_imagem: bool) -> str:
    if not tem_imagem:
        return ""
    return "\n".join(
        [
            "[politica_interna_analise_visual]",
            (
                "Instrucao interna invisivel ao usuario: mantenha a experiencia como "
                "chat tecnico normal. Nao mencione aprendizado, memoria, tenant, "
                "governanca ou regras internas."
            ),
            (
                "Antes de classificar NR, familia do laudo ou conformidade, avalie a "
                "qualidade minima da foto: nitidez, iluminacao, enquadramento, objeto "
                "visivel, distancia, angulo e contexto suficiente."
            ),
            (
                'Se a foto estiver borrada, escura, cortada, distante ou sem objeto '
                'rastreavel, diga claramente "foto com baixa qualidade" ou "evidencia '
                'visual insuficiente" e peca nova foto ou outro angulo. Nao feche '
                "conclusao tecnica categórica com imagem insuficiente."
            ),
            (
                "A regra operacional e concluir somente com evidencia suficiente e alta "
                "confianca visual. Nao prometa certeza matematica de 100%; quando nao "
                "houver base suficiente, responda como pendencia de evidencia."
            ),
            (
                "Considere que ativos reais podem aparecer em angulos incomuns, fotos "
                "parciais ou qualidade limitada. Se houver explicacao tecnica do usuario "
                "e outra foto/angulo que cruzem com a imagem original, trate como variacao "
                "visual validavel, nao como erro automatico do usuario."
            ),
            "[/politica_interna_analise_visual]",
        ]
    )


def _extrair_termos_busca(texto: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[A-Za-zÀ-ÿ0-9]{3,}", str(texto or "").lower())
        if token not in _STOPWORDS_APRENDIZADO
    }


def _formatar_marcacoes_para_prompt(marcacoes: Iterable[dict[str, Any]] | None) -> str:
    itens: list[str] = []
    for item in list(marcacoes or []):
        rotulo = str(item.get("rotulo") or "").strip()
        observacao = str(item.get("observacao") or "").strip()
        if rotulo and observacao:
            itens.append(f"{rotulo}: {observacao}")
        elif rotulo:
            itens.append(rotulo)
        elif observacao:
            itens.append(observacao)
    return "; ".join(itens[:4])


def construir_contexto_aprendizado_para_ia(
    banco: Session,
    *,
    empresa_id: int,
    laudo_id: int | None,
    setor_industrial: str,
    mensagem_atual: str,
    limite: int = 3,
) -> str:
    consulta = (
        banco.query(AprendizadoVisualIa)
        .filter(
            AprendizadoVisualIa.empresa_id == empresa_id,
            AprendizadoVisualIa.status == StatusAprendizadoIa.VALIDADO_MESA.value,
            or_(
                AprendizadoVisualIa.laudo_id == laudo_id,
                AprendizadoVisualIa.setor_industrial == setor_industrial,
            ),
        )
        .order_by(AprendizadoVisualIa.validado_em.desc(), AprendizadoVisualIa.id.desc())
        .limit(60)
        .all()
    )
    if not consulta:
        return ""

    termos_consulta = _extrair_termos_busca(mensagem_atual)
    candidatos: list[tuple[int, AprendizadoVisualIa]] = []
    for item in consulta:
        if not aprendizado_visual_pode_ser_referencia_futura(item):
            continue
        corpus = " ".join(
            [
                str(item.resumo or ""),
                str(item.sintese_consolidada or ""),
                str(item.parecer_mesa or ""),
                " ".join(normalizar_lista_textos(item.pontos_chave_json or [])),
                " ".join(normalizar_lista_textos(item.referencias_norma_json or [])),
                _formatar_marcacoes_para_prompt(item.marcacoes_json or []),
            ]
        )
        score = 0
        if laudo_id and item.laudo_id == laudo_id:
            score += 100
        if str(item.setor_industrial or "").strip() == str(setor_industrial or "").strip():
            score += 35
        score += len(termos_consulta & _extrair_termos_busca(corpus)) * 8
        if item.pontos_chave_json:
            score += min(len(item.pontos_chave_json), 4)
        candidatos.append((score, item))

    selecionados = [
        item
        for score, item in sorted(candidatos, key=lambda entry: (entry[0], entry[1].id), reverse=True)
        if score > 0
    ][:limite]
    if not selecionados:
        selecionados = [item for _score, item in candidatos[:limite]]
    if not selecionados:
        return ""

    blocos = [
        "[aprendizados_visuais_validados]",
        (
            "Considere os casos abaixo como referência validada pela mesa avaliadora, "
            "incluindo variações reais de ângulo, enquadramento e qualidade de foto "
            "que já foram aceitas no tenant. Em caso de divergência com a evidência "
            "atual, explique a diferença em vez de copiar o caso antigo."
        ),
    ]
    for indice, item in enumerate(selecionados, start=1):
        blocos.append(f"Caso {indice}:")
        blocos.append(f"- Resumo: {str(item.resumo or '').strip()}")
        blocos.append(f"- Veredito final da mesa: {str(item.veredito_mesa or item.veredito_inspetor or 'duvida')}")
        sintese = str(item.sintese_consolidada or item.parecer_mesa or item.correcao_inspetor or "").strip()
        if sintese:
            blocos.append(f"- Síntese validada: {sintese}")
        pontos = normalizar_lista_textos(item.pontos_chave_json or [], limite_itens=4, limite_chars=120)
        if pontos:
            blocos.append(f"- Pontos-chave: {'; '.join(pontos)}")
        normas = normalizar_lista_textos(item.referencias_norma_json or [], limite_itens=4, limite_chars=120)
        if normas:
            blocos.append(f"- Normas: {'; '.join(normas)}")
        marcacoes = _formatar_marcacoes_para_prompt(item.marcacoes_json or [])
        if marcacoes:
            blocos.append(f"- Marcações: {marcacoes}")
    blocos.append("[/aprendizados_visuais_validados]")
    return "\n".join(blocos)


def anexar_contexto_aprendizado_na_mensagem(
    mensagem_atual: str,
    *,
    contexto_aprendizado: str,
) -> str:
    texto = str(mensagem_atual or "").strip()
    if not contexto_aprendizado:
        return texto
    if not texto:
        return (
            f"{contexto_aprendizado}\n\n"
            "[solicitacao_atual]\n"
            "Sem texto adicional; analise a evidência enviada.\n"
            "[/solicitacao_atual]"
        )
    return f"{contexto_aprendizado}\n\n[solicitacao_atual]\n{texto}\n[/solicitacao_atual]"


__all__ = [
    "PASTA_APRENDIZADOS_VISUAIS_IA",
    "anexar_contexto_aprendizado_na_mensagem",
    "construir_contexto_analise_visual_chat_para_ia",
    "construir_contexto_aprendizado_para_ia",
    "construir_contexto_correcao_visual_pendente_para_ia",
    "aprendizado_visual_pode_ser_referencia_futura",
    "inferir_sinal_continuacao_correcao_visual",
    "inferir_template_correcao_chat",
    "listar_aprendizados_laudo",
    "mesclar_marcadores_internos_aprendizado",
    "normalizar_lista_textos",
    "normalizar_marcacoes_aprendizado",
    "obter_aprendizado_visual",
    "salvar_evidencia_aprendizado_visual",
    "serializar_aprendizado_visual",
]
