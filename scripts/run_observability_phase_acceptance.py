#!/usr/bin/env python3
"""Runner oficial da Fase 10 - Observabilidade, operação e segurança."""

from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import shutil
import subprocess
import sys
from typing import Any

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB_ROOT = REPO_ROOT / "web"
ANDROID_ROOT = REPO_ROOT / "android"
ARTIFACTS_ROOT = REPO_ROOT / "artifacts" / "observability_phase_acceptance"


def resolve_web_python() -> pathlib.Path:
    configured = str(os.getenv("PYTHON_BIN") or "").strip()
    if configured:
        return pathlib.Path(configured)
    if (WEB_ROOT / ".venv-linux" / "bin" / "python").exists():
        return WEB_ROOT / ".venv-linux" / "bin" / "python"
    if (WEB_ROOT / ".venv" / "Scripts" / "python.exe").exists():
        return WEB_ROOT / ".venv" / "Scripts" / "python.exe"
    return pathlib.Path(sys.executable)


WEB_PYTHON = resolve_web_python()


def resolve_executable(name: str) -> str:
    resolved = shutil.which(name)
    if resolved:
        return resolved
    return name


NPM_BIN = resolve_executable("npm")


def now_slug() -> str:
    return dt.datetime.now().strftime("%Y%m%d_%H%M%S")


def ensure_dir(path: pathlib.Path) -> pathlib.Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_text(path: pathlib.Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def write_json(path: pathlib.Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def android_dependencies_available() -> bool:
    return (ANDROID_ROOT / "node_modules" / ".bin" / "jest").exists()


def run_command(
    *,
    name: str,
    command: list[str],
    cwd: pathlib.Path,
    artifacts_dir: pathlib.Path,
) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        completed = subprocess.CompletedProcess(
            command,
            127,
            stdout="",
            stderr=str(exc),
        )
    write_text(
        artifacts_dir / f"{name}.txt",
        "\n".join(
            [
                f"$ {' '.join(command)}",
                "",
                "[stdout]",
                completed.stdout.strip(),
                "",
                "[stderr]",
                completed.stderr.strip(),
                "",
                f"[returncode] {completed.returncode}",
            ]
        ).strip()
        + "\n",
    )
    return {
        "name": name,
        "cwd": str(cwd),
        "command": command,
        "returncode": completed.returncode,
    }


def build_final_report(results: list[dict[str, Any]]) -> str:
    status = "ok" if all(int(item["returncode"]) == 0 for item in results) else "failed"
    lines = [
        "# Fase 10 - aceite operacional",
        "",
        f"- status: {status}",
        f"- executed_at: {dt.datetime.now().isoformat()}",
        "",
        "## Commands",
    ]
    for item in results:
        lines.extend(
            [
                f"- `{item['name']}`: returncode={item['returncode']}",
                f"  command: {' '.join(item['command'])}",
            ]
        )
    return "\n".join(lines) + "\n"


def print_failure_diagnostics(
    *,
    results: list[dict[str, Any]],
    artifacts_dir: pathlib.Path,
    summary_payload: dict[str, Any],
) -> None:
    print("::group::observability_phase_acceptance_summary")
    print(json.dumps(summary_payload, ensure_ascii=False, indent=2, sort_keys=True))
    print("::endgroup::")

    for item in results:
        if int(item["returncode"]) == 0:
            continue
        artifact_path = artifacts_dir / f"{item['name']}.txt"
        print(f"::group::{item['name']}")
        if artifact_path.exists():
            print(artifact_path.read_text(encoding="utf-8").rstrip())
        else:
            print(f"artifact_not_found: {artifact_path}")
        print("::endgroup::")


def main() -> int:
    artifacts_dir = ensure_dir(ARTIFACTS_ROOT / now_slug())
    results: list[dict[str, Any]] = []

    results.append(
        run_command(
            name="web_observability_tests",
            command=[
                str(WEB_PYTHON),
                "-m",
                "pytest",
                "-q",
                "tests/test_core_support.py",
                "tests/test_perf_support.py",
                "tests/test_admin_client_routes.py",
            ],
            cwd=WEB_ROOT,
            artifacts_dir=artifacts_dir,
        )
    )
    if not android_dependencies_available():
        results.append(
            run_command(
                name="android_install_dependencies",
                command=[NPM_BIN, "ci"],
                cwd=ANDROID_ROOT,
                artifacts_dir=artifacts_dir,
            )
        )
    results.append(
        run_command(
            name="android_observability_tests",
            command=[
                NPM_BIN,
                "run",
                "test",
                "--",
                "--runInBand",
                "src/config/apiCore.test.ts",
                "src/config/mesaApi.test.ts",
            ],
            cwd=ANDROID_ROOT,
            artifacts_dir=artifacts_dir,
        )
    )
    results.append(
        run_command(
            name="contract_check",
            command=[
                str(WEB_PYTHON),
                "-m",
                "pytest",
                "-q",
                "tests/test_transaction_contract.py",
                "tests/test_tenant_access.py",
                "tests/test_v2_android_public_contract.py",
                "tests/test_v2_admin_contract_catalogs.py",
            ],
            cwd=WEB_ROOT,
            artifacts_dir=artifacts_dir,
        )
    )
    results.append(
        run_command(
            name="reviewdesk_observability_tests",
            command=[
                str(WEB_PYTHON),
                "-m",
                "pytest",
                "-q",
                "tests/test_revisor_realtime.py",
                "tests/test_revisor_ws.py",
                "tests/test_reviewer_panel_boot_hotfix.py",
            ],
            cwd=WEB_ROOT,
            artifacts_dir=artifacts_dir,
        )
    )

    summary_payload = {
        "status": "ok" if all(int(item["returncode"]) == 0 for item in results) else "failed",
        "executed_at": dt.datetime.now().isoformat(),
        "commands": results,
    }
    write_json(
        artifacts_dir / "observability_phase_acceptance_summary.json",
        summary_payload,
    )
    write_text(artifacts_dir / "final_report.md", build_final_report(results))
    print(str(artifacts_dir))
    if summary_payload["status"] != "ok":
        print_failure_diagnostics(
            results=results,
            artifacts_dir=artifacts_dir,
            summary_payload=summary_payload,
        )
    return 0 if summary_payload["status"] == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
