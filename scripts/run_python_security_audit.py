"""Run pip-audit from an isolated local virtual environment."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TARGET_DIR = REPO_ROOT / ".test-artifacts" / "security" / "pip_audit_target"
REQUIREMENTS_FILE = REPO_ROOT / "web" / "requirements.txt"
PIP_AUDIT_VERSION = "2.10.0"


def _run(command: list[str], *, cwd: Path = REPO_ROOT) -> None:
    subprocess.run(command, cwd=cwd, check=True)


def _run_or_retry_without_break_system_packages(command: list[str]) -> None:
    try:
        _run(command)
    except subprocess.CalledProcessError:
        fallback = [part for part in command if part != "--break-system-packages"]
        if fallback == command:
            raise
        _run(fallback)


def _target_has_pip_audit() -> bool:
    return (
        (TARGET_DIR / "pip_audit").is_dir()
        and (TARGET_DIR / f"pip_audit-{PIP_AUDIT_VERSION}.dist-info").is_dir()
    )


def _run_module_with_target(module_name: str, args: list[str]) -> int:
    env = {
        **os.environ,
        "PYTHONPATH": str(TARGET_DIR),
    }
    return subprocess.run([sys.executable, "-m", module_name, *args], env=env).returncode


def _install_with_target() -> None:
    if _target_has_pip_audit():
        return

    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    _run_or_retry_without_break_system_packages(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "--break-system-packages",
            "--upgrade",
            "--target",
            str(TARGET_DIR),
            f"pip-audit=={PIP_AUDIT_VERSION}",
        ]
    )


def main() -> int:
    if not REQUIREMENTS_FILE.exists():
        print(f"requirements file not found: {REQUIREMENTS_FILE}", file=sys.stderr)
        return 2

    _install_with_target()
    return _run_module_with_target(
        "pip_audit",
        ["-r", str(REQUIREMENTS_FILE), "--no-deps", "--disable-pip"],
    )


if __name__ == "__main__":
    raise SystemExit(main())
