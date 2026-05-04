"""Ponto único de exposição dos roteadores por domínio."""

from app.domains.admin.routes import roteador_admin
from app.domains.cliente.routes import roteador_cliente
from app.domains.chat import roteador_inspetor
from app.domains.revisor.routes import roteador_revisor
from app.domains.social_auth import roteador_social_auth

__all__ = [
    "roteador_admin",
    "roteador_cliente",
    "roteador_inspetor",
    "roteador_revisor",
    "roteador_social_auth",
]
