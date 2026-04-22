from __future__ import annotations


def aviso_notificacao_boas_vindas() -> str:
    return "Entrega automática de boas-vindas não configurada. Compartilhe a credencial por canal seguro."


def disparar_email_boas_vindas(
    email: str,
    empresa: str,
    senha: str,
    *,
    backend: str,
    logger,
) -> str | None:
    """
    Backend operacional mínimo para onboarding:
    - `log`: registra metadados redigidos e devolve aviso para o operador.
    - `noop`: não tenta enviar, mas devolve aviso explícito para o operador.
    - `strict`: falha explicitamente para não mascarar ausência de entrega.
    """
    if backend == "log":
        logger.info(
            "\n=========================================\n"
            "[BACKEND LOG] BOAS-VINDAS INTERCEPTADO\n"
            f"Empresa: {empresa}\n"
            f"E-mail:  {email}\n"
            "Credencial temporaria: [REDACTED]\n"
            "Acao:    compartilhe a credencial por canal seguro.\n"
            "=========================================\n"
        )
        return aviso_notificacao_boas_vindas()

    if backend == "noop":
        logger.info(
            "Entrega automatica de boas-vindas desativada | empresa=%s | email=%s",
            empresa,
            email,
        )
        return aviso_notificacao_boas_vindas()

    if backend == "strict":
        raise RuntimeError(aviso_notificacao_boas_vindas())

    raise RuntimeError(
        "Backend de boas-vindas inválido. Use ADMIN_WELCOME_NOTIFICATION_BACKEND=log|noop|strict."
    )
