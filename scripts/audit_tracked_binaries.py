#!/usr/bin/env python3
"""Audita binarios rastreados pelo Git sem alterar historico nem arquivos."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
BINARY_EXTENSIONS = frozenset(
    {
        ".docx",
        ".gif",
        ".jpeg",
        ".jpg",
        ".mov",
        ".mp4",
        ".pdf",
        ".png",
        ".pptx",
        ".ttf",
        ".webp",
        ".woff",
        ".woff2",
        ".xlsx",
        ".zip",
    }
)


def run_git_ls_files() -> list[str]:
    resultado = subprocess.run(
        ["git", "ls-files"],
        cwd=REPO_ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return [linha for linha in resultado.stdout.splitlines() if linha.strip()]


def format_bytes(valor: int) -> str:
    unidades = ("B", "KiB", "MiB", "GiB")
    tamanho = float(valor)
    for unidade in unidades:
        if tamanho < 1024 or unidade == unidades[-1]:
            return f"{tamanho:.1f} {unidade}" if unidade != "B" else f"{valor} B"
        tamanho /= 1024
    return f"{valor} B"


def collect_binary_files() -> list[dict[str, Any]]:
    arquivos: list[dict[str, Any]] = []
    for rel_path in run_git_ls_files():
        path = REPO_ROOT / rel_path
        suffix = path.suffix.lower()
        if suffix not in BINARY_EXTENSIONS or not path.is_file():
            continue
        tamanho = path.stat().st_size
        arquivos.append(
            {
                "path": rel_path,
                "extension": suffix,
                "size_bytes": tamanho,
                "size_human": format_bytes(tamanho),
            }
        )
    return sorted(arquivos, key=lambda item: int(item["size_bytes"]), reverse=True)


def build_payload(files: list[dict[str, Any]], threshold_bytes: int, top: int) -> dict[str, Any]:
    por_extensao: dict[str, dict[str, Any]] = defaultdict(lambda: {"count": 0, "size_bytes": 0})
    total_bytes = 0
    for item in files:
        total_bytes += int(item["size_bytes"])
        ext = str(item["extension"])
        por_extensao[ext]["count"] += 1
        por_extensao[ext]["size_bytes"] += int(item["size_bytes"])

    oversized = [item for item in files if int(item["size_bytes"]) >= threshold_bytes]
    return {
        "tracked_binary_files": len(files),
        "tracked_binary_bytes": total_bytes,
        "tracked_binary_human": format_bytes(total_bytes),
        "oversized_threshold_bytes": threshold_bytes,
        "oversized_threshold_human": format_bytes(threshold_bytes),
        "oversized_files": oversized,
        "oversized_count": len(oversized),
        "by_extension": {
            ext: {
                "count": dados["count"],
                "size_bytes": dados["size_bytes"],
                "size_human": format_bytes(int(dados["size_bytes"])),
            }
            for ext, dados in sorted(por_extensao.items())
        },
        "top_files": files[:top],
        "policy": {
            "keep_in_git": "manifestos, fixtures pequenas e assets essenciais de runtime",
            "move_out_of_git": "PDFs, ZIPs e pacotes de imagem fonte com mais de 10 MiB",
            "preferred_targets": ["Git LFS", "storage externo versionado", "bucket persistente com manifesto"],
        },
    }


def print_text(payload: dict[str, Any]) -> None:
    print(f"tracked_binary_files={payload['tracked_binary_files']}")
    print(f"tracked_binary_size={payload['tracked_binary_human']}")
    print(f"oversized_threshold={payload['oversized_threshold_human']}")
    print(f"oversized_files={payload['oversized_count']}")
    print("")
    print("top_files:")
    for item in payload["top_files"]:
        print(f"- {item['size_human']} {item['path']}")
    print("")
    print("policy:")
    print("- manter no Git: manifestos, fixtures pequenas e assets essenciais de runtime")
    print("- mover para LFS/storage: PDFs, ZIPs e pacotes fonte acima do limite")
    print("- nao reescrever historico sem janela explicita de migracao")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Imprime o payload JSON completo.")
    parser.add_argument("--strict", action="store_true", help="Falha quando houver arquivo acima do limite.")
    parser.add_argument("--top", type=int, default=25, help="Quantidade de maiores arquivos no resumo.")
    parser.add_argument("--threshold-mb", type=float, default=10.0, help="Limite por arquivo para modo strict.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    threshold_bytes = int(args.threshold_mb * 1024 * 1024)
    payload = build_payload(collect_binary_files(), threshold_bytes=threshold_bytes, top=max(args.top, 1))
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print_text(payload)
    return 1 if args.strict and payload["oversized_count"] else 0


if __name__ == "__main__":
    sys.exit(main())
