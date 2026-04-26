#!/usr/bin/env python3
"""Materializa o projeto nativo Android quando a lane real exigir prebuild."""

from __future__ import annotations

import datetime as dt
import json
import pathlib
import re
import shlex
import subprocess
from typing import Any

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
ANDROID_ROOT = REPO_ROOT / "android"
ARTIFACTS_ROOT = REPO_ROOT / "artifacts" / "mobile_native_preflight"
DEVKIT_RUNTIME_ROOT = REPO_ROOT / ".tmp_online" / "devkit"
STATE_FILE = DEVKIT_RUNTIME_ROOT / "mobile_native_preflight_status.json"
NATIVE_PROJECT_ROOT = ANDROID_ROOT / "android"
BUILD_GRADLE_PATH = NATIVE_PROJECT_ROOT / "app" / "build.gradle"
MANIFEST_PATH = NATIVE_PROJECT_ROOT / "app" / "src" / "main" / "AndroidManifest.xml"
PREBUILD_COMMAND = ["npm", "run", "android:prebuild"]
PREBUILD_COMMAND_DISPLAY = "cd android && npm run android:prebuild"
NODE_ENGINE_REQUIREMENT = "^20.19.0 || ^22.13.0 || >=24"


def now_slug() -> str:
    return dt.datetime.now().strftime("%Y%m%d_%H%M%S")


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def ensure_dir(path: pathlib.Path) -> pathlib.Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path: pathlib.Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def run_text(command: list[str], cwd: pathlib.Path | None = None) -> str | None:
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd) if cwd else None,
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return None
    output = (completed.stdout or completed.stderr or "").strip()
    return output.splitlines()[0].strip() if output else None


def parse_node_version(value: str | None) -> tuple[int, int, int] | None:
    if not value:
        return None
    match = re.search(r"v?(\d+)\.(\d+)\.(\d+)", value)
    if not match:
        return None
    return tuple(int(part) for part in match.groups())


def format_node_version(version: tuple[int, int, int] | None) -> str | None:
    if not version:
        return None
    return "v%d.%d.%d" % version


def is_supported_node_version(version: tuple[int, int, int] | None) -> bool:
    if not version:
        return False
    major, minor, patch = version
    if major == 20:
        return (minor, patch) >= (19, 0)
    if major == 22:
        return (minor, patch) >= (13, 0)
    return major >= 24


def installed_nvm_node_versions() -> list[tuple[int, int, int]]:
    versions_dir = pathlib.Path.home() / ".nvm" / "versions" / "node"
    if not versions_dir.is_dir():
        return []
    versions: list[tuple[int, int, int]] = []
    for child in versions_dir.iterdir():
        version = parse_node_version(child.name)
        if version and is_supported_node_version(version):
            versions.append(version)
    return sorted(versions, reverse=True)


def select_prebuild_command(
    current_node_version: tuple[int, int, int] | None,
) -> tuple[list[str], str, str, tuple[int, int, int] | None]:
    if is_supported_node_version(current_node_version):
        return (
            PREBUILD_COMMAND,
            PREBUILD_COMMAND_DISPLAY,
            "current_node",
            current_node_version,
        )

    compatible_versions = installed_nvm_node_versions()
    if compatible_versions:
        same_major = [
            version
            for version in compatible_versions
            if current_node_version and version[0] == current_node_version[0]
        ]
        selected = same_major[0] if same_major else compatible_versions[0]
        selected_text = format_node_version(selected)
        nvm_command = (
            'source "$HOME/.nvm/nvm.sh" && '
            f"nvm use {shlex.quote(selected_text or '')} >/dev/null && "
            "npm run android:prebuild"
        )
        return (
            ["bash", "-lc", nvm_command],
            f"cd android && nvm use {selected_text} && npm run android:prebuild",
            "nvm_compatible_node",
            selected,
        )

    return (
        PREBUILD_COMMAND,
        PREBUILD_COMMAND_DISPLAY,
        "unsupported_current_node",
        current_node_version,
    )


def native_project_present() -> bool:
    return BUILD_GRADLE_PATH.is_file() and MANIFEST_PATH.is_file()


def load_previous_payload() -> dict[str, Any] | None:
    if not STATE_FILE.exists():
        return None
    try:
        payload = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def previous_prebuild_failed(payload: dict[str, Any] | None) -> bool:
    if not payload:
        return False
    return bool(payload.get("prebuild_executed")) and payload.get("status") == "fail"


def build_base_payload(artifacts_dir: pathlib.Path) -> dict[str, Any]:
    return {
        "generated_at": now_iso(),
        "repo_root": str(REPO_ROOT),
        "android_workspace_root": str(ANDROID_ROOT),
        "native_project_root_from_repo": str(NATIVE_PROJECT_ROOT),
        "native_project_root_from_workspace": "android",
        "build_gradle_path_from_repo": str(BUILD_GRADLE_PATH),
        "build_gradle_path_from_workspace": "android/app/build.gradle",
        "manifest_path_from_repo": str(MANIFEST_PATH),
        "manifest_path_from_workspace": "android/app/src/main/AndroidManifest.xml",
        "prebuild_command": PREBUILD_COMMAND_DISPLAY,
        "artifact_dir": str(artifacts_dir),
        "node_engine_requirement": NODE_ENGINE_REQUIREMENT,
        "node_version": run_text(["node", "-v"], cwd=ANDROID_ROOT),
        "npm_version": run_text(["npm", "-v"], cwd=ANDROID_ROOT),
        "prebuild_node_runtime": None,
        "prebuild_node_version": None,
        "native_project_present_before": None,
        "native_project_present_after": None,
        "prebuild_executed": False,
        "prebuild_succeeded": None,
        "prebuild_returncode": None,
        "status": "unknown",
        "detail": "",
        "next_requirement": None,
    }


def persist_payload(artifacts_dir: pathlib.Path, payload: dict[str, Any]) -> None:
    write_json(artifacts_dir / "preflight_status.json", payload)
    write_json(STATE_FILE, payload)


def main() -> int:
    artifacts_dir = ensure_dir(ARTIFACTS_ROOT / now_slug())
    payload = build_base_payload(artifacts_dir)
    existed_before = native_project_present()
    previous_payload = load_previous_payload()
    must_retry_after_previous_failure = previous_prebuild_failed(previous_payload)
    payload["native_project_present_before"] = existed_before

    if existed_before and not must_retry_after_previous_failure:
        payload["native_project_present_after"] = True
        payload["status"] = "ok"
        payload["detail"] = "native_project_already_present"
        persist_payload(artifacts_dir, payload)
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
        return 0

    if existed_before and must_retry_after_previous_failure:
        print(
            "[mobile-native-preflight] Projeto nativo Android existe, mas o ultimo "
            "prebuild registrado falhou; reexecutando o prebuild oficial.",
            flush=True,
        )
    else:
        print(
            "[mobile-native-preflight] Projeto nativo Android ausente; executando "
            "prebuild oficial.",
            flush=True,
        )

    payload["prebuild_executed"] = True
    current_node_version = parse_node_version(payload.get("node_version"))
    prebuild_command, prebuild_display, runtime, runtime_version = select_prebuild_command(
        current_node_version
    )
    payload["prebuild_command"] = prebuild_display
    payload["prebuild_node_runtime"] = runtime
    payload["prebuild_node_version"] = format_node_version(runtime_version)

    if runtime == "unsupported_current_node":
        payload["status"] = "fail"
        payload["detail"] = "unsupported_node_version"
        payload["prebuild_succeeded"] = False
        payload["native_project_present_after"] = native_project_present()
        payload["next_requirement"] = (
            "Usar Node compatível com "
            f"`{NODE_ENGINE_REQUIREMENT}` antes de rodar `cd android && npm run "
            "android:prebuild`."
        )
        persist_payload(artifacts_dir, payload)
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
        return 1

    print(f"[mobile-native-preflight] Comando: `{prebuild_display}`.", flush=True)

    try:
        completed = subprocess.run(
            prebuild_command,
            cwd=str(ANDROID_ROOT),
            check=False,
        )
        payload["prebuild_returncode"] = int(completed.returncode)
    except FileNotFoundError as exc:
        payload["status"] = "fail"
        payload["detail"] = "prebuild_command_unavailable"
        payload["prebuild_succeeded"] = False
        payload["next_requirement"] = (
            "Garantir que `npm` esteja disponivel antes de rodar `cd android && npm run "
            "android:prebuild`."
        )
        payload["error"] = str(exc)
        payload["native_project_present_after"] = native_project_present()
        persist_payload(artifacts_dir, payload)
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
        return 1

    exists_after = native_project_present()
    payload["native_project_present_after"] = exists_after

    if payload["prebuild_returncode"] == 0 and exists_after:
        payload["status"] = "ok"
        payload["detail"] = "native_project_materialized"
        payload["prebuild_succeeded"] = True
        persist_payload(artifacts_dir, payload)
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
        return 0

    payload["status"] = "fail"
    payload["prebuild_succeeded"] = False
    if payload["prebuild_returncode"] != 0:
        payload["detail"] = "android_prebuild_failed"
        payload["next_requirement"] = (
            "Corrigir a falha do comando oficial `cd android && npm run android:prebuild`."
        )
    else:
        payload["detail"] = "android_prebuild_did_not_materialize_expected_files"
        payload["next_requirement"] = (
            "Verificar a geracao da pasta nativa `android/android` apos o prebuild."
        )
    persist_payload(artifacts_dir, payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
