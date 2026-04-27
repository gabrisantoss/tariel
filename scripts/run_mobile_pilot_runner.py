#!/usr/bin/env python3
"""Runner operacional do piloto mobile V2 no tenant demo local."""

from __future__ import annotations

import argparse
import base64
import dataclasses
import datetime as dt
import hashlib
import html
import hmac
import http.cookiejar
import json
import os
import pathlib
import re
import shutil
import signal
import sqlite3
import struct
import subprocess
import sys
import textwrap
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
ANDROID_ROOT = REPO_ROOT / "android"
WEB_ROOT = REPO_ROOT / "web"
ARTIFACTS_ROOT = REPO_ROOT / "artifacts" / "mobile_pilot_run"
DEVKIT_RUNTIME_ROOT = REPO_ROOT / ".tmp_online" / "devkit"
MOBILE_PILOT_LANE_STATE_FILE = DEVKIT_RUNTIME_ROOT / "mobile_pilot_lane_status.json"
MOBILE_NATIVE_PREFLIGHT_STATE_FILE = DEVKIT_RUNTIME_ROOT / "mobile_native_preflight_status.json"
DEFAULT_PORTS = (8000, 8081, 19000, 19001)
DEFAULT_MOBILE_PASSWORD = "Dev@123456"
DEFAULT_TIMEOUT = 30
LOCAL_MOBILE_API_BASE_URL = "http://127.0.0.1:8000"
EMULATOR_MOBILE_API_BASE_URL = "http://10.0.2.2:8000"
HEALTH_URL = "http://127.0.0.1:8000/health"
PACKAGE_NAME = "com.tarielia.inspetor"
FLOW_PATH = ANDROID_ROOT / "maestro" / "mobile-v2-pilot-run.yaml"
MOBILE_PILOT_TARGET_TEXT = "Mobile pilot V2 target"
MOBILE_PILOT_CHAT_SURFACE_TEST_ID = "chat-thread-surface"
MOBILE_PILOT_MESA_ENTRY_TEST_ID = "chat-report-pack-card-open-mesa"
MOBILE_PILOT_MESA_ENTRY_LABEL = "Abrir Mesa"
MOBILE_PILOT_MESA_SURFACE_TEST_ID = "mesa-thread-surface"
MOBILE_PILOT_MESA_LOADED_TEST_ID = "mesa-thread-loaded"
ANDROID_NATIVE_PROJECT_ROOT = ANDROID_ROOT / "android"
ANDROID_BUILD_GRADLE_PATH = ANDROID_NATIVE_PROJECT_ROOT / "app" / "build.gradle"
ANDROID_MANIFEST_PATH = (
    ANDROID_NATIVE_PROJECT_ROOT / "app" / "src" / "main" / "AndroidManifest.xml"
)
ANDROID_PREVIEW_APK_PATH = (
    ANDROID_NATIVE_PROJECT_ROOT
    / "app"
    / "build"
    / "outputs"
    / "apk"
    / "release"
    / "app-release.apk"
)
DEVICE_TMP_DIR = "/data/local/tmp"
MAESTRO_ENVIRONMENT_RETRY_LIMIT = 1
ANDROID_BOOT_TIMEOUT_SECONDS = 420
ANDROID_HEALTH_STABLE_PASSES = 3
NODE_ENGINE_REQUIREMENT = "^20.19.0 || ^22.13.0 || >=24"
MOBILE_LOCAL_DB_FILENAME = "mobile_local.sqlite3"
MOBILE_REQUIRED_SEED_EMAILS = (
    "admin@tariel.ia",
    "inspetor@tariel.ia",
    "revisor@tariel.ia",
)
MOBILE_LOCAL_BACKEND_ROLLOUT_FLAG_NAMES = (
    "TARIEL_V2_ANDROID_PUBLIC_CONTRACT",
    "TARIEL_V2_ANDROID_ROLLOUT",
    "TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY",
    "TARIEL_V2_ANDROID_FEED_ENABLED",
    "TARIEL_V2_ANDROID_THREAD_ENABLED",
    "TARIEL_V2_ANDROID_PILOT_TENANT_KEY",
    "TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES",
    "TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES",
)
MOBILE_LOCAL_ANDROID_BUILD_FLAG_VALUES = {
    "EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED": "1",
    "EXPO_PUBLIC_MOBILE_AUTOMATION_DIAGNOSTICS": "1",
}
_BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
_RUNNER_DB_SNAPSHOT_CACHE: dict[str, Any] | None = None


class RunnerError(RuntimeError):
    """Erro operacional do runner."""


@dataclasses.dataclass
class CommandResult:
    command: list[str]
    returncode: int
    stdout: str
    stderr: str


@dataclasses.dataclass
class ExecutionState:
    artifacts_dir: pathlib.Path
    screenshots_dir: pathlib.Path
    ui_dumps_dir: pathlib.Path
    maestro_debug_dir: pathlib.Path
    summary_before: dict[str, Any] | None = None
    summary_after: dict[str, Any] | None = None
    capabilities_before: dict[str, Any] | None = None
    capabilities_after: dict[str, Any] | None = None
    operator_status_before: dict[str, Any] | None = None
    operator_status_after: dict[str, Any] | None = None
    operator_run_started: bool = False
    operator_run_finished: bool = False
    backend_started_here: bool = False
    backend_pid: int | None = None
    logcat_process: subprocess.Popen[str] | None = None
    device_id: str = ""
    package_name: str = PACKAGE_NAME
    main_activity: str = ".MainActivity"
    mobile_email: str = ""
    admin_email: str = ""
    mobile_token: str = ""
    target_laudo_id: int | None = None
    operator_run_outcome: str = ""
    operator_run_reason: str = ""
    outcome_label: str = "partial_execution"
    flow_ran: bool = False
    feed_covered: bool = False
    thread_covered: bool = False
    notes: list[str] = dataclasses.field(default_factory=list)
    commands_used: list[str] = dataclasses.field(default_factory=list)
    build_used_existing_install: bool = False
    apk_build_preflight: dict[str, Any] | None = None
    mobile_network_preflight: dict[str, Any] | None = None
    api_base_url_for_build: str = ""
    auth_web_base_url_for_build: str = ""
    api_base_url_runtime_if_available: str = ""
    android_localhost_strategy_for_build: str = ""
    ui_marker_summary: dict[str, Any] | None = None
    maestro_target_tap_completed: bool = False
    maestro_history_item_visible_before_tap: bool = False
    maestro_selection_callback_confirmed: bool = False
    maestro_shell_selection_confirmed: bool = False
    maestro_selection_callback_wait_failed: bool = False
    maestro_shell_selection_wait_failed: bool = False
    maestro_activity_center_terminal_confirmed: bool = False
    maestro_activity_center_v2_confirmed: bool = False
    maestro_mesa_entry_target_found: bool = False
    maestro_mesa_entry_target_tapped: bool = False
    maestro_thread_surface_confirmed: bool = False
    visual_mode: bool = False
    maestro_attempts: int = 0
    maestro_environment_retry_used: bool = False
    environment_failure_signals: list[str] = dataclasses.field(default_factory=list)
    host_phase_events: list[dict[str, Any]] = dataclasses.field(default_factory=list)
    native_project_root: str = ""
    native_project_root_from_workspace: str = ""
    native_build_gradle_path: str = ""
    native_manifest_path: str = ""
    native_project_present_before_preflight: bool | None = None
    native_project_present_after_preflight: bool | None = None
    native_prebuild_executed: bool = False
    native_prebuild_succeeded: bool | None = None
    native_prebuild_command: str = ""
    native_prebuild_status: str = ""
    native_prebuild_detail: str = ""
    native_prebuild_next_requirement: str = ""
    native_preflight_state_file: str = ""
    native_preflight_artifact_dir: str = ""
    mobile_database_url: str = ""
    mobile_database_url_redacted: str = ""
    mobile_sqlite_path: str = ""
    mobile_database_cwd_prepare: str = ""
    mobile_database_cwd_api: str = ""
    mobile_db_file_exists_before_prepare: bool | None = None
    mobile_db_file_exists_after_prepare: bool | None = None
    mobile_usuarios_table_exists_before_prepare: bool | None = None
    mobile_usuarios_table_exists_after_prepare: bool | None = None
    mobile_seed_users_present_before_prepare: bool | None = None
    mobile_seed_users_present: bool | None = None
    mobile_schema_prepare_executed: bool = False
    mobile_seed_prepare_executed: bool = False
    mobile_pilot_seed_prepare_executed: bool = False
    mobile_db_prepare_command: str = ""
    mobile_db_prepare_status: str = ""
    mobile_db_prepare_detail: str = ""
    mobile_tenant_id: int | None = None
    mobile_tenant_key: str = ""
    mobile_tenant_label: str = ""
    mobile_seed_resolved_targets: dict[str, list[int]] = dataclasses.field(default_factory=dict)
    backend_env_flags_applied: dict[str, str] = dataclasses.field(default_factory=dict)
    operator_route_preflight_status: str = ""
    summary_route_preflight_response: dict[str, Any] | None = None
    operator_status_route_preflight_response: dict[str, Any] | None = None


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def now_local_slug() -> str:
    return dt.datetime.now().strftime("%Y%m%d_%H%M%S")


def ensure_dir(path: pathlib.Path) -> pathlib.Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_text(path: pathlib.Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def write_json(path: pathlib.Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def append_note(state: ExecutionState, note: str) -> None:
    state.notes.append(note)


def env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if raw in {"1", "true", "yes", "on"}:
        return True
    if raw in {"0", "false", "no", "off"}:
        return False
    return default


def positive_int(value: object) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def record_phase_event(
    state: ExecutionState,
    *,
    phase: str,
    status: str,
    detail: str,
    extra: dict[str, Any] | None = None,
) -> None:
    payload = {
        "timestamp_utc": now_utc(),
        "phase": phase,
        "status": status,
        "detail": detail,
    }
    if extra:
        payload["extra"] = extra
    state.host_phase_events.append(payload)
    write_json(state.artifacts_dir / "host_phase_events.json", state.host_phase_events)


def write_mobile_pilot_lane_state(
    state: ExecutionState,
    *,
    status: str,
    detail: str,
) -> None:
    payload = {
        "generatedAt": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "workspace": str(REPO_ROOT),
        "status": status,
        "detail": detail,
        "device": state.device_id,
        "visualMode": state.visual_mode,
        "result": state.outcome_label,
        "operatorRunOutcome": state.operator_run_outcome,
        "operatorRunReason": state.operator_run_reason,
        "maestroAttempts": state.maestro_attempts,
        "maestroEnvironmentRetryUsed": state.maestro_environment_retry_used,
        "environmentFailureSignals": state.environment_failure_signals,
        "feedCovered": state.feed_covered,
        "threadCovered": state.thread_covered,
        "artifactDir": str(state.artifacts_dir),
    }
    write_json(MOBILE_PILOT_LANE_STATE_FILE, payload)


def command_display(command: list[str]) -> str:
    return "command [redacted]"


def has_graphical_display() -> bool:
    if sys.platform.startswith("linux"):
        return bool(os.getenv("DISPLAY", "").strip() or os.getenv("WAYLAND_DISPLAY", "").strip())
    return True


def running_in_ci() -> bool:
    return os.getenv("CI", "").strip().lower() in {"1", "true", "yes", "on"}


def resolve_visual_mode(explicit: bool | None = None) -> bool:
    if explicit is not None:
        return bool(explicit) and has_graphical_display()

    raw = os.getenv("MOBILE_VISUAL", "").strip().lower()
    if raw in {"0", "false", "no", "off"}:
        return False
    if raw in {"1", "true", "yes", "on"}:
        return has_graphical_display()
    if running_in_ci():
        return False
    return False


def should_force_fresh_emulator_boot() -> bool:
    return env_flag("MOBILE_FORCE_FRESH_BOOT", True)


def should_wipe_emulator_on_install_recovery() -> bool:
    return env_flag("MOBILE_WIPE_ON_INSTALL_RECOVERY", True)


def force_mobile_install() -> bool:
    return os.getenv("MOBILE_FORCE_INSTALL", "").strip().lower() in {"1", "true", "yes", "on"}


def allow_stale_apk() -> bool:
    return env_flag("MOBILE_ALLOW_STALE_APK", False)


def log_step(message: str) -> None:
    timestamp = dt.datetime.now().strftime("%H:%M:%S")
    print(f"[mobile-acceptance {timestamp}] {message}", flush=True)


def _start_stream_threads(
    process: subprocess.Popen[str],
    *,
    stdout_sink,
    stderr_sink,
) -> tuple[list[threading.Thread], list[str], list[str]]:
    stdout_chunks: list[str] = []
    stderr_chunks: list[str] = []

    def _pump(stream, sink, chunks: list[str]) -> None:
        try:
            for line in iter(stream.readline, ""):
                chunks.append(line)
                sink.write(line)
                sink.flush()
        finally:
            stream.close()

    stdout_thread = threading.Thread(
        target=_pump,
        args=(process.stdout, stdout_sink, stdout_chunks),
        daemon=True,
    )
    stderr_thread = threading.Thread(
        target=_pump,
        args=(process.stderr, stderr_sink, stderr_chunks),
        daemon=True,
    )
    stdout_thread.start()
    stderr_thread.start()
    return [stdout_thread, stderr_thread], stdout_chunks, stderr_chunks


def _terminate_process_group(process: subprocess.Popen[str]) -> None:
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        return
    except Exception:
        try:
            process.kill()
        except ProcessLookupError:
            return


def run_command(
    command: list[str],
    *,
    cwd: pathlib.Path | None = None,
    env: dict[str, str] | None = None,
    timeout: int | None = None,
    check: bool = True,
    stream_output: bool = False,
) -> CommandResult:
    if stream_output:
        print(f"$ {command_display(command)}", flush=True)
        process = subprocess.Popen(
            command,
            cwd=str(cwd) if cwd else None,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            start_new_session=True,
        )
        threads, stdout_chunks, stderr_chunks = _start_stream_threads(
            process,
            stdout_sink=sys.stdout,
            stderr_sink=sys.stderr,
        )
        try:
            returncode = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            _terminate_process_group(process)
            process.wait()
            raise
        finally:
            for thread in threads:
                thread.join()
        stdout = "".join(stdout_chunks)
        stderr = "".join(stderr_chunks)
        result = CommandResult(
            command=command,
            returncode=returncode,
            stdout=stdout,
            stderr=stderr,
        )
        if check and returncode != 0:
            raise RunnerError(
                f"Comando falhou ({returncode}): {command_display(command)}\n"
                f"stdout:\n{stdout}\n"
                f"stderr:\n{stderr}"
            )
        return result

    process = subprocess.Popen(
        command,
        cwd=str(cwd) if cwd else None,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        _terminate_process_group(process)
        process.wait()
        raise
    result = CommandResult(
        command=command,
        returncode=process.returncode,
        stdout=stdout,
        stderr=stderr,
    )
    if check and process.returncode != 0:
        raise RunnerError(
            f"Comando falhou ({process.returncode}): {command_display(command)}\n"
            f"stdout:\n{stdout}\n"
            f"stderr:\n{stderr}"
        )
    return result


def save_command_artifact(path: pathlib.Path, result: CommandResult) -> None:
    write_text(
        path,
        "\n".join(
            [
                f"$ {command_display(result.command)}",
                "",
                "[stdout]",
                result.stdout.strip(),
                "",
                "[stderr]",
                result.stderr.strip(),
                "",
                f"[returncode] {result.returncode}",
            ]
        ).strip()
        + "\n",
    )


def load_env_file(path: pathlib.Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw_value = line.split("=", 1)
        value = raw_value.strip().strip('"').strip("'")
        values[key.strip()] = value
    return values


def parse_application_id() -> tuple[str, str]:
    build_gradle = ANDROID_BUILD_GRADLE_PATH.read_text(encoding="utf-8")
    manifest = ANDROID_MANIFEST_PATH.read_text(encoding="utf-8")

    app_match = re.search(r"applicationId\s+'([^']+)'", build_gradle)
    activity_match = re.search(r'<activity android:name="([^"]+MainActivity)"', manifest)
    package_name = app_match.group(1) if app_match else PACKAGE_NAME
    main_activity = activity_match.group(1) if activity_match else ".MainActivity"
    return package_name, main_activity


def load_android_package_info() -> dict[str, Any]:
    package_json = json.loads((ANDROID_ROOT / "package.json").read_text(encoding="utf-8"))
    package_name, main_activity = parse_application_id()
    preferred_script = "android:preview"
    available_scripts = package_json.get("scripts") or {}
    if preferred_script not in available_scripts:
        preferred_script = "android:dev" if "android:dev" in available_scripts else "android"
    return {
        "npm_name": package_json.get("name"),
        "preferred_install_script": preferred_script,
        "package_name": package_name,
        "main_activity": main_activity,
        "scripts": available_scripts,
    }


def native_project_present() -> bool:
    return ANDROID_BUILD_GRADLE_PATH.is_file() and ANDROID_MANIFEST_PATH.is_file()


def default_native_prebuild_command() -> str:
    return "cd android && npm run android:prebuild"


def load_mobile_native_preflight_payload() -> dict[str, Any] | None:
    if not MOBILE_NATIVE_PREFLIGHT_STATE_FILE.exists():
        return None
    try:
        payload = json.loads(MOBILE_NATIVE_PREFLIGHT_STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def populate_native_preflight_state(
    state: ExecutionState,
    payload: dict[str, Any],
) -> dict[str, Any]:
    state.native_project_root = str(
        payload.get("native_project_root_from_repo") or ANDROID_NATIVE_PROJECT_ROOT
    )
    state.native_project_root_from_workspace = str(
        payload.get("native_project_root_from_workspace") or "android"
    )
    state.native_build_gradle_path = str(
        payload.get("build_gradle_path_from_repo") or ANDROID_BUILD_GRADLE_PATH
    )
    state.native_manifest_path = str(
        payload.get("manifest_path_from_repo") or ANDROID_MANIFEST_PATH
    )
    state.native_project_present_before_preflight = payload.get(
        "native_project_present_before"
    )
    state.native_project_present_after_preflight = payload.get(
        "native_project_present_after"
    )
    state.native_prebuild_executed = bool(payload.get("prebuild_executed", False))
    state.native_prebuild_succeeded = payload.get("prebuild_succeeded")
    state.native_prebuild_command = str(
        payload.get("prebuild_command") or default_native_prebuild_command()
    )
    state.native_prebuild_status = str(payload.get("status") or "")
    state.native_prebuild_detail = str(payload.get("detail") or "")
    state.native_prebuild_next_requirement = str(
        payload.get("next_requirement") or ""
    ).strip()
    state.native_preflight_state_file = str(MOBILE_NATIVE_PREFLIGHT_STATE_FILE)
    state.native_preflight_artifact_dir = str(payload.get("artifact_dir") or "").strip()
    return payload


def ensure_native_android_project_ready(state: ExecutionState) -> None:
    current_presence = native_project_present()
    payload = load_mobile_native_preflight_payload() or {
        "generated_at": now_utc(),
        "native_project_root_from_repo": str(ANDROID_NATIVE_PROJECT_ROOT),
        "native_project_root_from_workspace": "android",
        "build_gradle_path_from_repo": str(ANDROID_BUILD_GRADLE_PATH),
        "manifest_path_from_repo": str(ANDROID_MANIFEST_PATH),
        "prebuild_command": default_native_prebuild_command(),
        "native_project_present_before": current_presence,
        "native_project_present_after": current_presence,
        "prebuild_executed": False,
        "prebuild_succeeded": None,
        "status": "ok" if current_presence else "missing",
        "detail": (
            "native_project_available_without_recorded_preflight"
            if current_presence
            else "native_project_missing_without_recorded_preflight"
        ),
        "next_requirement": (
            None if current_presence else default_native_prebuild_command()
        ),
        "artifact_dir": "",
    }
    if payload.get("native_project_present_after") != current_presence:
        payload = {
            **payload,
            "native_project_present_after": current_presence,
            "status": "ok" if current_presence else "missing",
            "detail": (
                "native_project_presence_changed_after_preflight"
                if current_presence
                else "native_project_missing_after_preflight"
            ),
            "next_requirement": (
                None if current_presence else default_native_prebuild_command()
            ),
        }
    populate_native_preflight_state(state, payload)
    write_json(state.artifacts_dir / "mobile_native_preflight.json", payload)
    if current_presence:
        if state.native_prebuild_executed:
            append_note(
                state,
                "Projeto nativo Android pronto para a lane real; status carregado do preflight oficial.",
            )
        return
    next_requirement = (
        state.native_prebuild_next_requirement or default_native_prebuild_command()
    )
    raise RunnerError(
        "Projeto nativo Android ausente para a lane mobile real. "
        f"Esperado: {state.native_build_gradle_path} e {state.native_manifest_path}. "
        f"Execute o comando oficial: {next_requirement}"
    )


def resolve_web_python_binary() -> str:
    candidates = (
        WEB_ROOT / ".venv-linux" / "bin" / "python",
        WEB_ROOT / ".venv" / "bin" / "python",
        pathlib.Path(sys.executable),
    )
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return "python3"


def build_mobile_database_url(state: ExecutionState) -> str:
    db_path = (state.artifacts_dir / MOBILE_LOCAL_DB_FILENAME).resolve()
    return f"sqlite:///{db_path.as_posix()}"


def redact_database_url(database_url: str) -> str:
    if not database_url:
        return ""
    parsed = urllib.parse.urlsplit(database_url)
    if not parsed.password:
        return database_url
    netloc = parsed.netloc.replace(f":{parsed.password}@", ":***@")
    return urllib.parse.urlunsplit(
        (parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment)
    )


def sqlite_path_from_database_url(database_url: str) -> pathlib.Path | None:
    raw_url = str(database_url or "").strip()
    if not raw_url.startswith("sqlite:///"):
        return None
    path_text = raw_url.split("?", 1)[0].split("#", 1)[0][len("sqlite:///") :]
    if path_text == ":memory:":
        return None
    path_text = urllib.parse.unquote(path_text)
    path = pathlib.Path(path_text)
    if not path.is_absolute():
        path = WEB_ROOT / path
    return path.resolve()


def mobile_backend_env(state: ExecutionState) -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "AMBIENTE": "dev",
            "DATABASE_URL": state.mobile_database_url,
            "DB_BOOTSTRAP_BLOCKING_STARTUP": "1",
            "DB_BOOTSTRAP_RUN_MIGRATIONS": "1",
            "SEED_DEV_BOOTSTRAP": "1",
        }
    )
    env.update(state.backend_env_flags_applied)
    return env


def configure_mobile_backend_flags(state: ExecutionState) -> None:
    snapshot = load_runner_db_snapshot(state)
    tenant_id = positive_int(snapshot.get("mobile_tenant_id"))
    tenant_key = str(tenant_id) if tenant_id is not None else ""
    tenant_label = str(snapshot.get("mobile_tenant_label") or "").strip()
    mobile_email = str(snapshot.get("mobile_email") or "").strip()
    if not tenant_key:
        raise RunnerError(
            "Nao foi possivel resolver o tenant demo do smoke mobile no banco temporario. "
            "O bootstrap dev precisa expor um inspetor ativo antes de subir a API local."
        )

    state.mobile_tenant_id = tenant_id
    state.mobile_tenant_key = tenant_key
    state.mobile_tenant_label = tenant_label
    state.backend_env_flags_applied = {
        "TARIEL_V2_ANDROID_PUBLIC_CONTRACT": "1",
        "TARIEL_V2_ANDROID_ROLLOUT": "1",
        "TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY": "1",
        "TARIEL_V2_ANDROID_FEED_ENABLED": "1",
        "TARIEL_V2_ANDROID_THREAD_ENABLED": "1",
        "TARIEL_V2_ANDROID_PILOT_TENANT_KEY": tenant_key,
        "TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES": f"{tenant_key}=pilot_enabled",
        "TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES": (
            f"{tenant_key}:feed=promoted,{tenant_key}:thread=promoted"
        ),
    }
    write_json(
        state.artifacts_dir / "backend_env_flags_applied.json",
        {
            "tenant_id": tenant_id,
            "tenant_key": tenant_key,
            "tenant_label": tenant_label or None,
            "resolved_mobile_email": mobile_email or None,
            "backend_env_flags_applied": state.backend_env_flags_applied,
            "rollout_public_contract_enabled": True,
            "rollout_enabled": True,
            "rollout_observability_enabled": True,
            "rollout_state_overrides": state.backend_env_flags_applied[
                "TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES"
            ],
            "rollout_surface_state_overrides": state.backend_env_flags_applied[
                "TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES"
            ],
        },
    )
    append_note(
        state,
        "Backend local configurado com flags V2 do rollout mobile apenas no ambiente do runner "
        f"para o tenant demo {tenant_key}{f' ({tenant_label})' if tenant_label else ''}.",
    )


def configured_sqlite_path(state: ExecutionState | None = None) -> pathlib.Path | None:
    if state is not None and state.mobile_sqlite_path:
        return pathlib.Path(state.mobile_sqlite_path)
    return sqlite_path_from_database_url(os.getenv("DATABASE_URL", ""))


def inspect_sqlite_database(path: pathlib.Path | None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "sqlite_path": str(path) if path else "",
        "db_file_exists": False,
        "db_file_size_bytes": None,
        "usuarios_table_exists": False,
        "usuarios_count": None,
        "seed_users_present": False,
        "seed_users": {email: False for email in MOBILE_REQUIRED_SEED_EMAILS},
        "error": "",
    }
    if path is None:
        payload["error"] = "DATABASE_URL nao aponta para SQLite local."
        return payload
    payload["db_file_exists"] = path.exists()
    if path.exists():
        payload["db_file_size_bytes"] = path.stat().st_size
    else:
        return payload

    try:
        with sqlite3.connect(path) as connection:
            connection.row_factory = sqlite3.Row
            usuarios_table = connection.execute(
                """
                select 1
                from sqlite_master
                where type = 'table' and name = 'usuarios'
                limit 1
                """
            ).fetchone()
            payload["usuarios_table_exists"] = usuarios_table is not None
            if usuarios_table is None:
                return payload

            payload["usuarios_count"] = connection.execute(
                "select count(*) from usuarios"
            ).fetchone()[0]
            rows = connection.execute(
                """
                select lower(email) as email, ativo
                from usuarios
                where lower(email) in ({})
                """.format(",".join("?" for _ in MOBILE_REQUIRED_SEED_EMAILS)),
                tuple(MOBILE_REQUIRED_SEED_EMAILS),
            ).fetchall()
            seed_users = {email: False for email in MOBILE_REQUIRED_SEED_EMAILS}
            for row in rows:
                seed_users[str(row["email"]).strip().lower()] = bool(row["ativo"])
            payload["seed_users"] = seed_users
            payload["seed_users_present"] = all(seed_users.values())
    except sqlite3.DatabaseError as exc:
        payload["error"] = str(exc)
    return payload


def write_mobile_database_preflight(
    state: ExecutionState,
    *,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    path = state.artifacts_dir / "mobile_database_preflight.json"
    existing: dict[str, Any] = {}
    if path.exists() and (before is None or after is None):
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}
    payload = {
        "database_url_redacted": state.mobile_database_url_redacted,
        "sqlite_path": state.mobile_sqlite_path,
        "cwd_prepare": state.mobile_database_cwd_prepare,
        "cwd_api": state.mobile_database_cwd_api,
        "db_file_exists": state.mobile_db_file_exists_after_prepare,
        "usuarios_table_exists": state.mobile_usuarios_table_exists_after_prepare,
        "seed_users_present": state.mobile_seed_users_present,
        "schema_prepare_executed": state.mobile_schema_prepare_executed,
        "seed_prepare_executed": state.mobile_seed_prepare_executed,
        "pilot_seed_prepare_executed": state.mobile_pilot_seed_prepare_executed,
        "prepare_command": state.mobile_db_prepare_command,
        "prepare_status": state.mobile_db_prepare_status,
        "prepare_detail": state.mobile_db_prepare_detail,
        "before_prepare": (
            before if before is not None else existing.get("before_prepare", {})
        ),
        "after_prepare": (
            after if after is not None else existing.get("after_prepare", {})
        ),
    }
    write_json(path, payload)


def prepare_mobile_local_database(state: ExecutionState) -> None:
    global _RUNNER_DB_SNAPSHOT_CACHE

    state.mobile_database_url = build_mobile_database_url(state)
    state.mobile_database_url_redacted = redact_database_url(state.mobile_database_url)
    sqlite_path = sqlite_path_from_database_url(state.mobile_database_url)
    state.mobile_sqlite_path = str(sqlite_path or "")
    state.mobile_database_cwd_prepare = str(WEB_ROOT)
    state.mobile_database_cwd_api = str(WEB_ROOT)
    state.mobile_db_prepare_command = (
        f"cd {WEB_ROOT} && DATABASE_URL={state.mobile_database_url_redacted} "
        "SEED_DEV_BOOTSTRAP=1 DB_BOOTSTRAP_RUN_MIGRATIONS=1 "
        f"{resolve_web_python_binary()} -c 'app.shared.database.inicializar_banco()'"
    )

    before = inspect_sqlite_database(sqlite_path)
    state.mobile_db_file_exists_before_prepare = bool(before.get("db_file_exists"))
    state.mobile_usuarios_table_exists_before_prepare = bool(
        before.get("usuarios_table_exists")
    )
    state.mobile_seed_users_present_before_prepare = bool(
        before.get("seed_users_present")
    )

    script = textwrap.dedent(
        """
        import app.shared.database as banco_dados

        banco_dados.inicializar_banco()
        """
    ).strip()
    command = [resolve_web_python_binary(), "-c", script]
    log_step("Preparando banco local temporario do smoke mobile.")
    try:
        result = run_command(
            command,
            cwd=WEB_ROOT,
            env=mobile_backend_env(state),
            timeout=180,
            check=False,
            stream_output=state.visual_mode,
        )
    except subprocess.TimeoutExpired as exc:
        state.mobile_db_prepare_status = "failed"
        state.mobile_db_prepare_detail = "timeout ao executar bootstrap/migrations do banco mobile"
        write_mobile_database_preflight(state, before=before)
        raise RunnerError(
            "Preflight de banco mobile expirou antes de iniciar a API local. "
            f"Banco alvo: {state.mobile_database_url_redacted}; "
            f"responsavel: {state.mobile_db_prepare_command}"
        ) from exc

    state.commands_used.append(state.mobile_db_prepare_command)
    save_command_artifact(state.artifacts_dir / "mobile_database_prepare.txt", result)
    if result.returncode != 0:
        state.mobile_db_prepare_status = "failed"
        state.mobile_db_prepare_detail = (
            "bootstrap/migrations do banco mobile retornaram "
            f"{result.returncode}; veja mobile_database_prepare.txt"
        )
        write_mobile_database_preflight(state, before=before)
        raise RunnerError(
            "Preflight de banco mobile falhou antes de iniciar a API local. "
            f"Banco alvo: {state.mobile_database_url_redacted}; "
            f"responsavel: {state.mobile_db_prepare_command}; "
            "artefato: mobile_database_prepare.txt"
        )

    state.mobile_schema_prepare_executed = True
    state.mobile_seed_prepare_executed = True
    after = inspect_sqlite_database(sqlite_path)
    state.mobile_db_file_exists_after_prepare = bool(after.get("db_file_exists"))
    state.mobile_usuarios_table_exists_after_prepare = bool(
        after.get("usuarios_table_exists")
    )
    state.mobile_seed_users_present = bool(after.get("seed_users_present"))
    if not state.mobile_usuarios_table_exists_after_prepare:
        state.mobile_db_prepare_status = "failed"
        state.mobile_db_prepare_detail = (
            "tabela usuarios ausente apos bootstrap/migrations do banco mobile"
        )
        write_mobile_database_preflight(state, before=before, after=after)
        raise RunnerError(
            "Banco local do smoke mobile foi criado sem a tabela usuarios. "
            f"Banco usado: {state.mobile_database_url_redacted}; "
            f"sqlite_path: {state.mobile_sqlite_path}; "
            f"responsavel: {state.mobile_db_prepare_command}"
        )
    if not state.mobile_seed_users_present:
        state.mobile_db_prepare_status = "failed"
        state.mobile_db_prepare_detail = (
            "seed dev nao deixou admin/inspetor/revisor ativos no banco mobile"
        )
        write_mobile_database_preflight(state, before=before, after=after)
        raise RunnerError(
            "Seed minimo de usuarios ausente no banco local do smoke mobile. "
            f"Banco usado: {state.mobile_database_url_redacted}; "
            f"sqlite_path: {state.mobile_sqlite_path}; "
            "esperado: admin@tariel.ia, inspetor@tariel.ia e revisor@tariel.ia; "
            f"responsavel: {state.mobile_db_prepare_command}"
        )

    os.environ["DATABASE_URL"] = state.mobile_database_url
    _RUNNER_DB_SNAPSHOT_CACHE = None
    state.mobile_db_prepare_status = "ok"
    state.mobile_db_prepare_detail = "schema e seed dev preparados no SQLite temporario da lane"
    write_mobile_database_preflight(state, before=before, after=after)
    append_note(
        state,
        "Banco local temporario do smoke mobile preparado com migrations e seed dev.",
    )


def sqlite_rows(
    query: str,
    params: tuple[Any, ...] = (),
    *,
    state: ExecutionState | None = None,
) -> list[sqlite3.Row]:
    db_path = configured_sqlite_path(state)
    if db_path is None:
        return []
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        try:
            cursor = connection.execute(query, params)
            return cursor.fetchall()
        except sqlite3.OperationalError as exc:
            raise RunnerError(
                "Banco SQLite da lane mobile sem schema esperado. "
                f"sqlite_path: {db_path}; erro: {exc}. "
                "Execute o preflight de banco do runner antes de resolver credenciais."
            ) from exc


def load_runner_db_snapshot(
    state: ExecutionState | None = None,
) -> dict[str, Any]:
    global _RUNNER_DB_SNAPSHOT_CACHE

    if _RUNNER_DB_SNAPSHOT_CACHE is not None:
        return dict(_RUNNER_DB_SNAPSHOT_CACHE)

    script = textwrap.dedent(
        """
        import json
        from sqlalchemy import case, select

        import app.shared.database as banco_dados
        from app.shared.database import Empresa, NivelAcesso, Usuario

        with banco_dados.SessaoLocal() as banco:
            mobile_row = banco.execute(
                select(
                    Usuario.email,
                    Usuario.empresa_id,
                    Empresa.nome_fantasia,
                )
                .join(Empresa, Empresa.id == Usuario.empresa_id, isouter=True)
                .where(Usuario.nivel_acesso == int(NivelAcesso.INSPETOR))
                .where(Usuario.ativo.is_(True))
                .order_by(
                    case((Usuario.email == "inspetor@tariel.ia", 0), else_=1),
                    case((Empresa.nome_fantasia == "Empresa Demo (DEV)", 0), else_=1),
                    Usuario.id.asc(),
                )
                .limit(1)
            ).first()

            admin_row = banco.execute(
                select(Usuario.email, Usuario.mfa_secret_b32)
                .where(Usuario.nivel_acesso == int(NivelAcesso.DIRETORIA))
                .where(Usuario.ativo.is_(True))
                .order_by(
                    case(
                        (Usuario.email == "admin@tariel.ia", 0),
                        (Usuario.email == "admin-legado@tariel.ia", 1),
                        else_=2,
                    ),
                    Usuario.id.asc(),
                )
                .limit(1)
            ).first()

        payload = {
            "mobile_email": str(getattr(mobile_row, "email", "") or "").strip() or None,
            "mobile_tenant_id": int(getattr(mobile_row, "empresa_id", 0) or 0) or None,
            "mobile_tenant_label": (
                str(getattr(mobile_row, "nome_fantasia", "") or "").strip() or None
            ),
            "admin_email": str(getattr(admin_row, "email", "") or "").strip() or None,
            "admin_mfa_secret": str(getattr(admin_row, "mfa_secret_b32", "") or "").strip().upper() or None,
        }
        print(json.dumps(payload, ensure_ascii=False))
        """
    ).strip()

    result = run_command(
        [resolve_web_python_binary(), "-c", script],
        cwd=WEB_ROOT,
        env=mobile_backend_env(state) if state is not None else None,
        timeout=20,
        check=False,
    )
    if result.returncode != 0:
        _RUNNER_DB_SNAPSHOT_CACHE = {}
        return {}

    try:
        payload = json.loads(str(result.stdout or "").strip() or "{}")
    except json.JSONDecodeError:
        _RUNNER_DB_SNAPSHOT_CACHE = {}
        return {}

    snapshot = {
        "mobile_email": str(payload.get("mobile_email") or "").strip() or None,
        "mobile_tenant_id": positive_int(payload.get("mobile_tenant_id")),
        "mobile_tenant_label": str(payload.get("mobile_tenant_label") or "").strip() or None,
        "admin_email": str(payload.get("admin_email") or "").strip() or None,
        "admin_mfa_secret": str(payload.get("admin_mfa_secret") or "").strip().upper() or None,
    }
    _RUNNER_DB_SNAPSHOT_CACHE = snapshot
    return dict(snapshot)


def _normalize_totp_secret(secret: str) -> str:
    normalized = "".join(
        ch for ch in str(secret or "").strip().upper() if ch in _BASE32_ALPHABET
    )
    if not normalized:
        raise RunnerError("Segredo TOTP do Admin-CEO inválido ou ausente.")
    return normalized


def _decode_totp_secret(secret: str) -> bytes:
    normalized = _normalize_totp_secret(secret)
    padded = normalized + "=" * ((8 - len(normalized) % 8) % 8)
    return base64.b32decode(padded, casefold=True)


def current_totp(secret: str, *, at_time: int | float | None = None) -> str:
    timestamp = int(time.time() if at_time is None else at_time)
    counter = timestamp // 30
    digest = hmac.new(
        _decode_totp_secret(secret),
        struct.pack(">Q", int(counter)),
        hashlib.sha1,
    ).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(binary % 1_000_000).zfill(6)


def lookup_admin_totp_secret(
    email: str,
    state: ExecutionState | None = None,
) -> str | None:
    snapshot = load_runner_db_snapshot(state)
    snapshot_email = str(snapshot.get("admin_email") or "").strip().lower()
    if snapshot_email and snapshot_email == str(email or "").strip().lower():
        value = str(snapshot.get("admin_mfa_secret") or "").strip().upper()
        if value:
            return value

    rows = sqlite_rows(
        """
        select mfa_secret_b32
        from usuarios
        where lower(email) = lower(?) and ativo = 1
        limit 1
        """,
        (email,),
        state=state,
    )
    if not rows:
        return None
    value = str(rows[0]["mfa_secret_b32"] or "").strip().upper()
    return value or None


def extract_csrf_token(html_body: str) -> str:
    match = re.search(r'name="csrf_token" value="([^"]+)"', html_body)
    csrf_token = html.unescape(match.group(1)) if match else ""
    if not csrf_token:
        raise RunnerError("Não foi possível extrair csrf_token da página do Admin-CEO.")
    return csrf_token


def extract_totp_secret_from_html(html_body: str) -> str | None:
    match_uri = re.search(r"secret=([A-Z2-7]+)", html_body)
    if match_uri:
        return match_uri.group(1)
    match_code = re.search(r"Segredo TOTP:\s*<code>([A-Z2-7 ]+)</code>", html_body)
    if match_code:
        return re.sub(r"\s+", "", match_code.group(1))
    match_text = re.search(r"Segredo TOTP:\s*([A-Z2-7 ]+)", html_body)
    if match_text:
        return re.sub(r"\s+", "", match_text.group(1))
    return None


def submit_admin_mfa(
    opener: urllib.request.OpenerDirector,
    *,
    path: str,
    html_body: str,
    email: str,
    state: ExecutionState | None = None,
) -> str:
    csrf_token = extract_csrf_token(html_body)
    # The setup page reflects the secret from the backend that is currently
    # serving the local smoke. Prefer that over the configured DB fallback.
    secret = extract_totp_secret_from_html(html_body) or lookup_admin_totp_secret(
        email,
        state=state,
    )
    if not secret:
        raise RunnerError("Segredo TOTP do Admin-CEO indisponível para concluir MFA.")
    payload = urllib.parse.urlencode(
        {
            "csrf_token": csrf_token,
            "codigo": current_totp(secret),
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"http://127.0.0.1:8000{path}",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with opener.open(request, timeout=20) as response:
        final_url = response.geturl()
        response.read()
    return final_url


def resolve_credentials(
    web_env: dict[str, str],
    state: ExecutionState,
) -> tuple[str, str, str]:
    mobile_password = (
        web_env.get("SEED_INSPETOR_SENHA")
        or web_env.get("SEED_DEV_SENHA_PADRAO")
        or DEFAULT_MOBILE_PASSWORD
    )
    admin_password = (
        web_env.get("SEED_ADMIN_SENHA")
        or web_env.get("SEED_DEV_SENHA_PADRAO")
        or DEFAULT_MOBILE_PASSWORD
    )

    snapshot = load_runner_db_snapshot(state)
    tenant_id = positive_int(snapshot.get("mobile_tenant_id"))

    if tenant_id is not None:
        mobile_candidates = sqlite_rows(
            """
            select email
            from usuarios
            where empresa_id = ? and nivel_acesso = 1 and ativo = 1
            order by case when email = 'inspetor@tariel.ia' then 0 else 1 end, id
            """,
            (tenant_id,),
            state=state,
        )
    else:
        mobile_candidates = sqlite_rows(
            """
            select email
            from usuarios
            where nivel_acesso = 1 and ativo = 1
            order by case when email = 'inspetor@tariel.ia' then 0 else 1 end, id
            """,
            state=state,
        )
    admin_candidates = sqlite_rows(
        """
        select email
        from usuarios
        where nivel_acesso = 99 and ativo = 1
        order by
            case
                when email = 'admin@tariel.ia' then 0
                when email = 'admin-legado@tariel.ia' then 1
                else 2
            end,
            id
        """,
        state=state,
    )
    mobile_email = str(snapshot.get("mobile_email") or "").strip()
    if not mobile_email:
        mobile_email = (
            str(mobile_candidates[0]["email"]).strip()
            if mobile_candidates
            else "inspetor@tariel.ia"
        )

    admin_email = str(snapshot.get("admin_email") or "").strip()
    if not admin_email:
        admin_email = (
            str(admin_candidates[0]["email"]).strip()
            if admin_candidates
            else "admin@tariel.ia"
        )
    return mobile_email, mobile_password, admin_email


def build_environment_report(package_info: dict[str, Any]) -> str:
    sections = [
        f"timestamp_utc={now_utc()}",
        f"repo_root={REPO_ROOT}",
        f"android_root={ANDROID_ROOT}",
        f"web_root={WEB_ROOT}",
        f"package_name={package_info['package_name']}",
        f"main_activity={package_info['main_activity']}",
        f"preferred_install_script={package_info['preferred_install_script']}",
    ]
    for command in (
        ["adb", "version"],
        ["adb", "devices", "-l"],
        ["node", "--version"],
        ["npm", "--version"],
        ["python3", "--version"],
        ["maestro", "--version"],
    ):
        try:
            result = run_command(command, check=False, timeout=DEFAULT_TIMEOUT)
            sections.extend(
                [
                    "",
                    f"$ {command_display(command)}",
                    result.stdout.strip() or result.stderr.strip(),
                ]
            )
        except Exception as exc:  # pragma: no cover - defensive
            sections.extend(["", f"$ {command_display(command)}", str(exc)])
    return "\n".join(sections).strip() + "\n"


def healthcheck() -> bool:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=3) as response:
            return response.status == 200
    except Exception:
        return False


def parse_adb_devices_output(output: str) -> list[tuple[str, str]]:
    devices: list[tuple[str, str]] = []
    for line in output.splitlines():
        if line.startswith("List of devices attached"):
            continue
        parts = line.split()
        if len(parts) >= 2:
            devices.append((parts[0], parts[1]))
    return devices


def probe_device_health_by_serial(serial: str) -> dict[str, Any]:
    def _probe(command: list[str]) -> CommandResult:
        return run_command(command, check=False, timeout=12)

    sys_boot = _probe(["adb", "-s", serial, "shell", "getprop", "sys.boot_completed"])
    dev_boot = _probe(["adb", "-s", serial, "shell", "getprop", "dev.bootcomplete"])
    bootanim = _probe(["adb", "-s", serial, "shell", "getprop", "init.svc.bootanim"])
    package_probe = _probe(
        [
            "adb",
            "-s",
            serial,
            "shell",
            "cmd",
            "package",
            "resolve-activity",
            "--brief",
            "com.android.settings",
        ]
    )
    uptime_probe = _probe(["adb", "-s", serial, "shell", "cat", "/proc/uptime"])
    package_output = f"{package_probe.stdout}\n{package_probe.stderr}".strip()
    uptime_seconds = None
    uptime_first = str(uptime_probe.stdout or "").strip().split()
    if uptime_first:
        try:
            uptime_seconds = float(uptime_first[0])
        except ValueError:
            uptime_seconds = None

    return {
        "serial": serial,
        "sys_boot_completed": str(sys_boot.stdout or "").strip(),
        "dev_bootcomplete": str(dev_boot.stdout or "").strip(),
        "bootanim_state": str(bootanim.stdout or "").strip(),
        "package_service_ready": package_probe.returncode == 0
        and "com.android.settings" in package_output
        and "/" in package_output,
        "package_service_detail": package_output or str(package_probe.returncode),
        "uptime_seconds": uptime_seconds,
    }


def device_health_ready(health: dict[str, Any]) -> bool:
    sys_boot = str(health.get("sys_boot_completed") or "").strip()
    dev_boot = str(health.get("dev_bootcomplete") or "").strip()
    bootanim_state = str(health.get("bootanim_state") or "").strip()
    package_ready = bool(health.get("package_service_ready"))
    return (
        sys_boot == "1"
        and (not dev_boot or dev_boot == "1")
        and (not bootanim_state or bootanim_state == "stopped")
        and package_ready
    )


def start_backend(state: ExecutionState) -> None:
    if healthcheck():
        append_note(
            state,
            "Backend local ja estava ativo em 127.0.0.1:8000; a lane vai reiniciar "
            "para garantir o DATABASE_URL temporario auditado.",
        )

    script = REPO_ROOT / "scripts" / "start_local_mobile_api_background.sh"
    result = run_command(
        [str(script)],
        cwd=REPO_ROOT,
        env=mobile_backend_env(state),
        timeout=90,
    )
    state.commands_used.append(command_display([str(script)]))
    save_command_artifact(state.artifacts_dir / "backend_start.txt", result)

    deadline = time.time() + 45
    while time.time() < deadline:
        if healthcheck():
            state.backend_started_here = True
            pid_file = REPO_ROOT / "local-mobile-api.pid"
            if pid_file.exists():
                try:
                    state.backend_pid = int(pid_file.read_text(encoding="utf-8").strip())
                except ValueError:
                    state.backend_pid = None
            return
        time.sleep(1)

    raise RunnerError("Backend local não respondeu em http://127.0.0.1:8000/health.")


def stop_backend_if_needed(state: ExecutionState) -> None:
    if not state.backend_started_here or not state.backend_pid:
        return
    try:
        os.kill(state.backend_pid, signal.SIGTERM)
        time.sleep(1)
    except ProcessLookupError:
        return
    except Exception as exc:  # pragma: no cover - cleanup defensivo
        append_note(state, f"Falha ao encerrar backend local iniciado pelo runner: {exc}")


def boot_emulator_with_policy(
    state: ExecutionState,
    *,
    label: str,
    wipe_data: bool,
) -> None:
    script = REPO_ROOT / "scripts" / "dev" / "run_android_emulator_stack.sh"
    if not script.exists():
        raise RunnerError("Lane Android do devkit nao encontrada para subir o emulador.")

    fresh_boot = should_force_fresh_emulator_boot() or wipe_data
    command = [
        str(script),
        "--mode",
        "boot",
        "--boot-timeout",
        str(ANDROID_BOOT_TIMEOUT_SECONDS),
    ]
    if fresh_boot:
        command.append("--force-cold-boot")
    if wipe_data:
        command.append("--wipe-data")
    if not state.visual_mode:
        command.append("--headless")

    detail_parts = []
    if wipe_data:
        detail_parts.append("wipe-data")
    if fresh_boot:
        detail_parts.append("cold-boot")
    if not detail_parts:
        detail_parts.append("reuse-allowed")
    detail = " + ".join(detail_parts)
    log_step(
        f"Garantindo emulador Android {'visível' if state.visual_mode else 'headless'} com {detail}."
    )
    record_phase_event(
        state,
        phase=label,
        status="running",
        detail=detail,
        extra={"visual_mode": state.visual_mode, "wipe_data": wipe_data},
    )
    result = run_command(
        command,
        cwd=REPO_ROOT,
        timeout=ANDROID_BOOT_TIMEOUT_SECONDS + 180,
        stream_output=True,
    )
    state.commands_used.append(command_display(command))
    save_command_artifact(state.artifacts_dir / f"{label}.txt", result)
    record_phase_event(
        state,
        phase=label,
        status="ok",
        detail=detail,
    )


def ensure_local_emulator(state: ExecutionState) -> None:
    preferred_device = (
        os.getenv("ANDROID_SERIAL", "").strip()
        or os.getenv("MOBILE_DEVICE_ID", "").strip()
    )
    if preferred_device and not preferred_device.startswith("emulator-"):
        append_note(
            state,
            f"Bootstrap do emulador foi pulado porque um device físico foi fixado: {preferred_device}.",
        )
        return

    boot_emulator_with_policy(
        state,
        label="emulator_boot",
        wipe_data=False,
    )


def resolve_device(state: ExecutionState) -> str:
    result = run_command(["adb", "devices", "-l"])
    state.commands_used.append(command_display(["adb", "devices", "-l"]))
    save_command_artifact(state.artifacts_dir / "adb_devices.txt", result)

    connected = parse_adb_devices_output(result.stdout)
    devices = [serial for serial, device_state in connected if device_state == "device"]
    if not devices:
        raise RunnerError("Nenhum device/emulador ADB em estado 'device' foi encontrado.")

    preferred_device = (
        os.getenv("ANDROID_SERIAL", "").strip()
        or os.getenv("MOBILE_DEVICE_ID", "").strip()
    )
    if preferred_device:
        if preferred_device not in devices:
            raise RunnerError(
                f"Dispositivo solicitado não está disponível via adb: {preferred_device}"
            )
        return preferred_device

    emulators = [serial for serial in devices if serial.startswith("emulator-")]
    if emulators:
        return emulators[0]

    return devices[0]


def wait_for_device_disconnect(serial: str, *, timeout_seconds: int = 40) -> None:
    deadline = time.time() + max(timeout_seconds, 5)
    while time.time() < deadline:
        result = run_command(["adb", "devices", "-l"], check=False, timeout=10)
        current_serials = {
            device_serial
            for device_serial, _device_state in parse_adb_devices_output(result.stdout)
        }
        if serial not in current_serials:
            return
        time.sleep(2)
    raise RunnerError(f"Serial do emulador nao saiu do adb apos kill: {serial}")


def ensure_adb_reverse(state: ExecutionState, ports: tuple[int, ...]) -> None:
    lines = []
    for port in ports:
        command = [
            "adb",
            "-s",
            state.device_id,
            "reverse",
            f"tcp:{port}",
            f"tcp:{port}",
        ]
        result = run_command(command, check=False)
        state.commands_used.append(command_display(command))
        status = "ok" if result.returncode == 0 else f"erro:{result.returncode}"
        lines.append(f"{port}: {status}")
        if result.stdout.strip():
            lines.append(result.stdout.strip())
        if result.stderr.strip():
            lines.append(result.stderr.strip())
    write_text(state.artifacts_dir / "adb_reverse.txt", "\n".join(lines).strip() + "\n")


def adb_reverse_list(state: ExecutionState) -> list[str]:
    command = ["adb", "-s", state.device_id, "reverse", "--list"]
    result = run_command(command, check=False, timeout=15)
    lines = [
        line.strip()
        for line in (result.stdout or "").splitlines()
        if line.strip()
    ]
    if result.stderr.strip():
        lines.extend(
            line.strip()
            for line in result.stderr.splitlines()
            if line.strip()
        )
    return lines


def adb_reverse_contains_port(reverse_lines: list[str], port: int) -> bool:
    expected = f"tcp:{port} tcp:{port}"
    return any(expected in line for line in reverse_lines)


def local_http_url(value: str) -> bool:
    parsed = urllib.parse.urlparse(str(value or "").strip())
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "http" and host in {"127.0.0.1", "localhost", "10.0.2.2"}


def mobile_android_localhost_strategy() -> str:
    raw = (
        os.getenv("MOBILE_ANDROID_LOCALHOST_STRATEGY", "reverse")
        .strip()
        .lower()
    )
    if raw in {"reverse", "emulator_alias"}:
        return raw
    return "reverse"


def mobile_api_base_url_for_build(state: ExecutionState) -> str:
    if (
        state.device_id.startswith("emulator-")
        and mobile_android_localhost_strategy() == "emulator_alias"
    ):
        return EMULATOR_MOBILE_API_BASE_URL
    return LOCAL_MOBILE_API_BASE_URL


def infer_mobile_runtime_api_base_url(build_url: str, state: ExecutionState) -> str:
    value = str(build_url or LOCAL_MOBILE_API_BASE_URL).strip().rstrip("/")
    if (
        not state.device_id.startswith("emulator-")
        or state.android_localhost_strategy_for_build == "reverse"
    ):
        return value
    return re.sub(
        r"://(127\.0\.0\.1|localhost)(?=[:/]|$)",
        "://10.0.2.2",
        value,
        flags=re.IGNORECASE,
    )


def probe_host_backend_health() -> dict[str, Any]:
    payload: dict[str, Any] = {
        "ok": False,
        "url": HEALTH_URL,
        "status_code": None,
        "error": None,
    }
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=5) as response:
            payload["status_code"] = response.status
            payload["ok"] = response.status == 200
    except Exception as exc:  # noqa: BLE001 - artefato operacional.
        payload["error"] = str(exc)
    return payload


def probe_device_http_health(state: ExecutionState, host: str, port: int = 8000) -> dict[str, Any]:
    request = (
        "printf 'GET /health HTTP/1.1\\r\\n"
        f"Host: {host}\\r\\n"
        "Connection: close\\r\\n\\r\\n' "
        f"| nc -w 5 -n {host} {port}"
    )
    command = ["adb", "-s", state.device_id, "shell", request]
    payload: dict[str, Any] = {
        "ok": False,
        "host": host,
        "port": port,
        "command": command_display(command),
        "returncode": None,
        "tcp_connected": False,
        "status_line": "",
        "status_code": None,
        "stdout_excerpt": "",
        "stderr_excerpt": "",
        "error": None,
    }
    try:
        result = run_command(command, check=False, timeout=15)
    except subprocess.TimeoutExpired:
        payload["returncode"] = 124
        payload["error"] = "timeout"
        return payload

    payload["returncode"] = result.returncode
    payload["tcp_connected"] = result.returncode == 0
    payload["stdout_excerpt"] = (result.stdout or "")[:600]
    payload["stderr_excerpt"] = (result.stderr or "")[:600]
    for line in (result.stdout or "").splitlines():
        if line.startswith("HTTP/"):
            payload["status_line"] = line.strip()
            match = re.search(r"\s(\d{3})(?:\s|$)", line)
            if match:
                payload["status_code"] = int(match.group(1))
            break
    payload["ok"] = result.returncode == 0 and payload.get("status_code") == 200
    return payload


def release_cleartext_http_allowed() -> bool:
    candidates = [
        ANDROID_NATIVE_PROJECT_ROOT
        / "app"
        / "build"
        / "intermediates"
        / "merged_manifests"
        / "release"
        / "processReleaseManifest"
        / "AndroidManifest.xml",
        ANDROID_NATIVE_PROJECT_ROOT
        / "app"
        / "build"
        / "intermediates"
        / "packaged_manifests"
        / "release"
        / "processReleaseManifestForPackage"
        / "AndroidManifest.xml",
        ANDROID_MANIFEST_PATH,
    ]
    for path in candidates:
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8", errors="replace")
        match = re.search(r'android:usesCleartextTraffic="([^"]+)"', content)
        if match:
            return match.group(1).strip().lower() == "true"
    return False


def write_mobile_network_preflight(
    state: ExecutionState,
    payload: dict[str, Any],
) -> None:
    state.mobile_network_preflight = payload
    write_json(state.artifacts_dir / "mobile_network_preflight.json", payload)


def ensure_mobile_network_preflight(state: ExecutionState) -> None:
    api_base_url_for_build = (
        state.api_base_url_for_build or mobile_api_base_url_for_build(state)
    )
    auth_web_base_url_for_build = (
        state.auth_web_base_url_for_build or api_base_url_for_build
    )
    android_localhost_strategy = (
        state.android_localhost_strategy_for_build
        or mobile_android_localhost_strategy()
    )
    runtime_api_base_url = (
        state.api_base_url_runtime_if_available
        or infer_mobile_runtime_api_base_url(api_base_url_for_build, state)
    )
    host_health = probe_host_backend_health()
    reverse_before = adb_reverse_list(state)
    ensure_adb_reverse(state, DEFAULT_PORTS)
    reverse_after = adb_reverse_list(state)
    reverse_configured = adb_reverse_contains_port(reverse_after, 8000)
    probe_127 = probe_device_http_health(state, "127.0.0.1")
    probe_10 = probe_device_http_health(state, "10.0.2.2")
    cleartext_allowed = release_cleartext_http_allowed()

    parsed_runtime = urllib.parse.urlparse(runtime_api_base_url)
    runtime_host = (parsed_runtime.hostname or "").lower()
    runtime_is_local_http = local_http_url(runtime_api_base_url)
    runtime_uses_reverse = runtime_host in {"127.0.0.1", "localhost"}
    runtime_uses_emulator_alias = runtime_host == "10.0.2.2"
    failure_classification: str | None = None
    failure_detail = ""

    if not host_health.get("ok"):
        failure_classification = "backend local"
        failure_detail = "backend local nao respondeu no host em /health"
    elif runtime_is_local_http and not cleartext_allowed:
        failure_classification = "cleartext_http_blocked"
        failure_detail = "APK release preview nao permite HTTP cleartext para API local"
    elif runtime_uses_reverse and not reverse_configured:
        failure_classification = "rede/reverse proxy"
        failure_detail = "adb reverse tcp:8000 nao aparece na lista do device selecionado"
    elif runtime_uses_reverse and not probe_127.get("tcp_connected"):
        failure_classification = "rede/reverse proxy"
        failure_detail = "device nao abre conexao TCP via 127.0.0.1:8000"
    elif runtime_uses_emulator_alias and not probe_10.get("ok"):
        failure_classification = "rede/reverse proxy"
        failure_detail = "emulador nao alcanca /health via 10.0.2.2:8000"

    payload = {
        "generated_at": now_utc(),
        "api_base_url_for_build": api_base_url_for_build,
        "auth_web_base_url_for_build": auth_web_base_url_for_build,
        "android_localhost_strategy_for_build": android_localhost_strategy,
        "api_base_url_runtime_if_available": runtime_api_base_url,
        "backend_health_host_status": host_health,
        "backend_health_host_url": HEALTH_URL,
        "adb_reverse_list_before": reverse_before,
        "adb_reverse_configured": reverse_configured,
        "adb_reverse_list_after": reverse_after,
        "device_serial": state.device_id,
        "device_network_probe_127001_8000": probe_127,
        "device_network_probe_10_0_2_2_8000": probe_10,
        "cleartext_http_allowed": cleartext_allowed,
        "runtime_uses_reverse": runtime_uses_reverse,
        "runtime_uses_emulator_alias": runtime_uses_emulator_alias,
        "failure_classification": failure_classification,
        "failure_detail": failure_detail,
    }
    write_mobile_network_preflight(state, payload)

    if failure_classification:
        record_phase_event(
            state,
            phase="mobile_network_preflight",
            status="failed",
            detail=f"{failure_classification}: {failure_detail}",
            extra=payload,
        )
        raise RunnerError(
            "Preflight de rede mobile falhou antes do Maestro: "
            f"{failure_classification}. {failure_detail}."
        )

    record_phase_event(
        state,
        phase="mobile_network_preflight",
        status="ok",
        detail=f"runtime_api_base_url={runtime_api_base_url}",
        extra=payload,
    )
    append_note(
        state,
        f"Preflight de rede mobile confirmou backend host, cleartext preview e acesso do device via {runtime_api_base_url}.",
    )


def restart_emulator_instance(
    state: ExecutionState,
    *,
    label: str,
    wipe_data: bool = False,
) -> None:
    if not state.device_id.startswith("emulator-"):
        raise RunnerError(
            f"Tentativa de restart controlado em device nao-emulador: {state.device_id}"
        )

    kill_command = ["adb", "-s", state.device_id, "emu", "kill"]
    state.commands_used.append(command_display(kill_command))
    try:
        kill_result = run_command(
            kill_command,
            check=False,
            timeout=12,
        )
    except subprocess.TimeoutExpired:
        kill_result = CommandResult(
            command=kill_command,
            returncode=124,
            stdout="",
            stderr="timeout",
        )
        append_note(
            state,
            f"Encerramento controlado do emulador excedeu timeout ({label}); o runner tentou subir uma nova instancia mesmo assim.",
        )
    save_command_artifact(state.artifacts_dir / f"{label}_emu_kill.txt", kill_result)
    if kill_result.returncode == 0:
        wait_for_device_disconnect(state.device_id)
    time.sleep(5)
    boot_emulator_with_policy(state, label=f"{label}_boot", wipe_data=wipe_data)
    state.device_id = resolve_device(state)
    ensure_adb_reverse(state, DEFAULT_PORTS)
    wait_for_package_service_ready(state, timeout_seconds=240)
    if state.visual_mode:
        keep_device_visible(state)


def keep_device_visible(state: ExecutionState) -> None:
    lines = []
    commands = [
        ["adb", "-s", state.device_id, "shell", "svc", "power", "stayon", "true"],
        ["adb", "-s", state.device_id, "shell", "input", "keyevent", "KEYCODE_WAKEUP"],
        ["adb", "-s", state.device_id, "shell", "wm", "dismiss-keyguard"],
    ]
    for command in commands:
        lines.append(f"$ {command_display(command)}")
        try:
            result = run_command(command, check=False, timeout=8)
            state.commands_used.append(command_display(command))
            if result.stdout.strip():
                lines.append(result.stdout.strip())
            if result.stderr.strip():
                lines.append(result.stderr.strip())
            lines.append(f"[returncode] {result.returncode}")
        except subprocess.TimeoutExpired:
            append_note(
                state,
                f"Comando de visibilidade do device excedeu timeout e foi ignorado: {command_display(command)}",
            )
            lines.append("[timeout] true")
        lines.append("")
    write_text(state.artifacts_dir / "device_visibility.txt", "\n".join(lines).strip() + "\n")


def prime_device_for_automation(state: ExecutionState, *, label: str) -> None:
    lines = []
    commands = [
        ["adb", "-s", state.device_id, "shell", "input", "keyevent", "KEYCODE_WAKEUP"],
        ["adb", "-s", state.device_id, "shell", "wm", "dismiss-keyguard"],
        ["adb", "-s", state.device_id, "shell", "input", "keyevent", "KEYCODE_HOME"],
        ["adb", "-s", state.device_id, "shell", "settings", "put", "global", "window_animation_scale", "0"],
        ["adb", "-s", state.device_id, "shell", "settings", "put", "global", "transition_animation_scale", "0"],
        ["adb", "-s", state.device_id, "shell", "settings", "put", "global", "animator_duration_scale", "0"],
    ]
    for command in commands:
        lines.append(f"$ {command_display(command)}")
        try:
            result = run_command(command, check=False, timeout=12)
            state.commands_used.append(command_display(command))
            if result.stdout.strip():
                lines.append(result.stdout.strip())
            if result.stderr.strip():
                lines.append(result.stderr.strip())
            lines.append(f"[returncode] {result.returncode}")
        except subprocess.TimeoutExpired:
            append_note(
                state,
                f"Comando de preparo do device excedeu timeout e foi ignorado: {command_display(command)}",
            )
            lines.append("[timeout] true")
        lines.append("")
    write_text(
        state.artifacts_dir / f"{label}_device_prime.txt",
        "\n".join(lines).strip() + "\n",
    )
    time.sleep(2)


def package_service_ready(state: ExecutionState) -> tuple[bool, str]:
    result = run_command(
        [
            "adb",
            "-s",
            state.device_id,
            "shell",
            "cmd",
            "package",
            "resolve-activity",
            "--brief",
            "com.android.settings",
        ],
        check=False,
        timeout=12,
    )
    state.commands_used.append(
        command_display(
            [
                "adb",
                "-s",
                state.device_id,
                "shell",
                "cmd",
                "package",
                "resolve-activity",
                "--brief",
                "com.android.settings",
            ]
        )
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip() or str(result.returncode)
        return False, detail
    output = result.stdout or ""
    if "com.android.settings" in output and "/" in output:
        return True, "package_service_present"
    return False, "package_service_missing"


def wait_for_package_service_ready(state: ExecutionState, *, timeout_seconds: int = 120) -> None:
    deadline = time.time() + max(timeout_seconds, 10)
    stable_passes = 0
    last_health: dict[str, Any] = {
        "sys_boot_completed": "",
        "dev_bootcomplete": "",
        "bootanim_state": "",
        "package_service_detail": "package_service_missing",
    }
    while time.time() < deadline:
        try:
            health = probe_device_health_by_serial(state.device_id)
        except subprocess.TimeoutExpired:
            last_health = {
                "sys_boot_completed": "",
                "dev_bootcomplete": "",
                "bootanim_state": "",
                "package_service_detail": "health_probe_timeout",
            }
            stable_passes = 0
            time.sleep(2)
            continue
        last_health = health
        if device_health_ready(health):
            stable_passes += 1
            if stable_passes >= ANDROID_HEALTH_STABLE_PASSES:
                write_json(
                    state.artifacts_dir / "package_service_wait_health.json",
                    {
                        "stable_passes_required": ANDROID_HEALTH_STABLE_PASSES,
                        "stable_passes_observed": stable_passes,
                        "health": health,
                    },
                )
                return
        else:
            stable_passes = 0
        time.sleep(2)
    raise RunnerError(
        "Package service do Android indisponivel: "
        f"sys={last_health.get('sys_boot_completed') or '0'} "
        f"dev={last_health.get('dev_bootcomplete') or '0'} "
        f"bootanim={last_health.get('bootanim_state') or 'unknown'} "
        f"package={last_health.get('package_service_detail') or 'missing'} "
        f"stable={stable_passes}/{ANDROID_HEALTH_STABLE_PASSES}"
    )


def ensure_device_package_service_ready(state: ExecutionState) -> None:
    try:
        wait_for_package_service_ready(state, timeout_seconds=90)
        return
    except RunnerError as exc:
        detail = str(exc)

    if state.device_id.startswith("emulator-"):
        log_step("Package service indisponivel no emulador; reiniciando a instancia para recuperar o Android.")
        restart_emulator_instance(state, label="package_service_recovery")
        if state.visual_mode:
            keep_device_visible(state)
        return

    raise RunnerError(f"Package service do Android indisponivel no device: {detail}")


def ensure_mobile_pilot_seed_data(
    state: ExecutionState,
    *,
    inspector_email: str,
) -> None:
    script = WEB_ROOT / "scripts" / "seed_mobile_pilot_data.py"
    if not script.exists():
        raise RunnerError(f"Script de seed do piloto mobile nao encontrado: {script}")

    command = [
        resolve_web_python_binary(),
        str(script),
        "--inspetor-email",
        inspector_email,
    ]
    log_step("Garantindo seed local minimo do piloto mobile.")
    result = run_command(
        command,
        cwd=WEB_ROOT,
        env=mobile_backend_env(state),
        timeout=120,
        stream_output=state.visual_mode,
    )
    state.mobile_pilot_seed_prepare_executed = True
    write_mobile_database_preflight(state)
    state.commands_used.append(command_display(command))
    save_command_artifact(state.artifacts_dir / "mobile_pilot_seed.txt", result)
    try:
        payload = json.loads(str(result.stdout or "").strip())
    except json.JSONDecodeError as exc:
        raise RunnerError(
            "Seed do piloto mobile nao retornou JSON valido. "
            "Confira mobile_pilot_seed.txt para o stdout/stderr completo."
        ) from exc

    seed_tenant_id = positive_int(payload.get("tenant_id"))
    seed_tenant_key = str(seed_tenant_id) if seed_tenant_id is not None else ""
    if not seed_tenant_key:
        raise RunnerError(
            "Seed do piloto mobile nao informou tenant_id valido. "
            "Confira mobile_pilot_seed.txt."
        )
    if state.mobile_tenant_key and seed_tenant_key != state.mobile_tenant_key:
        raise RunnerError(
            "Seed do piloto mobile resolveu tenant diferente do backend local configurado. "
            f"backend_tenant={state.mobile_tenant_key}; seed_tenant={seed_tenant_key}. "
            "Confira backend_env_flags_applied.json e mobile_pilot_seed.txt."
        )
    state.mobile_tenant_id = seed_tenant_id
    state.mobile_tenant_key = seed_tenant_key
    state.mobile_tenant_label = (
        str(payload.get("tenant_label") or "").strip() or state.mobile_tenant_label
    )
    state.mobile_seed_resolved_targets = {
        str(surface): [int(item) for item in items]
        for surface, items in dict(payload.get("resolved_targets") or {}).items()
    }
    write_json(state.artifacts_dir / "mobile_pilot_seed_payload.json", payload)


def capture_screenshot(state: ExecutionState, name: str) -> pathlib.Path:
    remote_path = f"{DEVICE_TMP_DIR}/{name}.png"
    local_path = state.screenshots_dir / f"{name}.png"
    try:
        capture = run_command(
            ["adb", "-s", state.device_id, "shell", "screencap", "-p", remote_path],
            check=False,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        append_note(
            state,
            f"Falha ao capturar screenshot {name}: timeout no adb screencap.",
        )
        return local_path
    if capture.returncode != 0:
        append_note(
            state,
            f"Falha ao capturar screenshot {name}: {(capture.stderr or capture.stdout).strip() or capture.returncode}",
        )
        return local_path
    pull = run_command(
        ["adb", "-s", state.device_id, "pull", remote_path, str(local_path)],
        check=False,
        timeout=20,
    )
    if pull.returncode != 0:
        append_note(
            state,
            f"Falha ao puxar screenshot {name}: {(pull.stderr or pull.stdout).strip() or pull.returncode}",
        )
    run_command(
        ["adb", "-s", state.device_id, "shell", "rm", "-f", remote_path],
        check=False,
    )
    return local_path


def capture_ui_dump(state: ExecutionState, name: str) -> pathlib.Path:
    remote_path = f"{DEVICE_TMP_DIR}/{name}.xml"
    local_path = state.ui_dumps_dir / f"{name}.xml"
    try:
        dump = run_command(
            ["adb", "-s", state.device_id, "shell", "uiautomator", "dump", remote_path],
            check=False,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        append_note(
            state,
            f"Falha ao capturar UI dump {name}: timeout no adb uiautomator dump.",
        )
        return local_path
    if dump.returncode != 0:
        append_note(
            state,
            f"Falha ao capturar UI dump {name}: {(dump.stderr or dump.stdout).strip() or dump.returncode}",
        )
        return local_path
    pull = run_command(
        ["adb", "-s", state.device_id, "pull", remote_path, str(local_path)],
        check=False,
        timeout=20,
    )
    if pull.returncode != 0:
        append_note(
            state,
            f"Falha ao puxar UI dump {name}: {(pull.stderr or pull.stdout).strip() or pull.returncode}",
        )
    run_command(["adb", "-s", state.device_id, "shell", "rm", "-f", remote_path], check=False)
    return local_path


def extract_ui_test_ids(path: pathlib.Path) -> set[str]:
    if not path.exists():
        return set()
    content = path.read_text(encoding="utf-8", errors="replace")
    return {
        item
        for item in re.findall(r'resource-id="([^"]+)"', content)
        if item and item != "android:id/content"
    }


def extract_ui_content_descs(path: pathlib.Path) -> list[str]:
    if not path.exists():
        return []
    content = path.read_text(encoding="utf-8", errors="replace")
    return [
        html.unescape(item)
        for item in re.findall(r'content-desc="([^"]*)"', content)
        if item
    ]


def extract_ui_texts(path: pathlib.Path) -> list[str]:
    if not path.exists():
        return []
    content = path.read_text(encoding="utf-8", errors="replace")
    return [
        html.unescape(item)
        for item in re.findall(r'text="([^"]*)"', content)
        if item
    ]


def extract_ui_text_for_resource_id(path: pathlib.Path, resource_id: str) -> str | None:
    if not path.exists() or not resource_id:
        return None
    content = path.read_text(encoding="utf-8", errors="replace")
    pattern = re.compile(
        rf'text="([^"]*)" resource-id="{re.escape(resource_id)}"'
    )
    match = pattern.search(content)
    if not match:
        return None
    return html.unescape(match.group(1))


def detect_environment_failure_signals(
    ui_dump_path: pathlib.Path,
    *,
    screenshot_path: pathlib.Path | None = None,
    maestro_output: str = "",
) -> list[str]:
    texts = [item.lower() for item in extract_ui_texts(ui_dump_path)]
    content_descs = [item.lower() for item in extract_ui_content_descs(ui_dump_path)]
    combined = texts + content_descs
    signals: list[str] = []

    if not ui_dump_path.exists():
        signals.append("ui_dump_unavailable")
    if screenshot_path is not None and not screenshot_path.exists():
        signals.append("screenshot_unavailable")

    if any("isn't responding" in item or "nao esta respondendo" in item or "não está respondendo" in item for item in combined):
        if any("system ui" in item or "sistema ui" in item for item in combined):
            signals.append("system_ui_not_responding")
        else:
            signals.append("app_not_responding_dialog")
    if any(item in {"wait", "esperar"} or "close app" in item or "fechar app" in item for item in combined):
        signals.append("system_dialog_action_visible")
    if (
        "Assert that id: login-email-input is visible... FAILED" in maestro_output
        and not combined
    ):
        signals.append("failed_before_login_without_ui_dump")
    return sorted(set(signals))


def read_focused_activity(state: ExecutionState) -> str | None:
    command = [
        "adb",
        "-s",
        state.device_id,
        "shell",
        "dumpsys",
        "window",
        "windows",
    ]
    result = run_command(command, check=False, timeout=15)
    state.commands_used.append(command_display(command))
    output = "\n".join(
        item for item in (result.stdout.strip(), result.stderr.strip()) if item
    )
    patterns = (
        r"mCurrentFocus=Window\{[^\}]+\s([^\s]+\.[^\s/]+/[^\s\}]+)\}",
        r"mCurrentFocus=Window\{[^\}]+\s([^\s]+/[^\s\}]+)\}",
        r"mFocusedApp=.*? ([^\s]+/[^\s\}]+)\}",
    )
    for pattern in patterns:
        match = re.search(pattern, output)
        if match:
            return match.group(1)
    return None


def write_device_health_snapshot(state: ExecutionState, *, label: str) -> dict[str, Any]:
    health = probe_device_health_by_serial(state.device_id)
    focused_activity = read_focused_activity(state)
    payload = {
        "timestamp_utc": now_utc(),
        "label": label,
        "boot_completed": str(health.get("sys_boot_completed") or "") == "1",
        "boot_completed_raw": health.get("sys_boot_completed"),
        "dev_bootcomplete_raw": health.get("dev_bootcomplete"),
        "bootanim_state": health.get("bootanim_state"),
        "package_service_ready": health.get("package_service_ready"),
        "package_service_detail": health.get("package_service_detail"),
        "uptime_seconds": health.get("uptime_seconds"),
        "focused_activity": focused_activity,
    }
    write_json(state.artifacts_dir / f"{label}_device_health.json", payload)
    return payload


def stabilize_device_for_maestro(state: ExecutionState, *, label: str) -> None:
    ensure_device_package_service_ready(state)
    prime_device_for_automation(state, label=label)
    write_device_health_snapshot(state, label=label)


def recover_emulator_from_environment_failure(
    state: ExecutionState,
    *,
    reason: str,
) -> None:
    if not state.device_id.startswith("emulator-"):
        raise RunnerError(
            f"Falha ambiental detectada ({reason}), mas o device atual nao e um emulador para recovery controlado."
        )

    append_note(
        state,
        f"Falha ambiental detectada antes do fluxo funcional ({reason}); o runner reiniciou o emulador e repetira o Maestro uma vez.",
    )
    restart_emulator_instance(state, label="environment_retry")
    stabilize_device_for_maestro(state, label="post_environment_recovery")
    force_stop_app(state, label="post_environment_recovery")


def parse_probe_descriptor(content_descs: list[str], prefix: str) -> dict[str, str]:
    for descriptor in content_descs:
        if not descriptor.startswith(f"{prefix};"):
            continue
        parsed: dict[str, str] = {}
        for chunk in descriptor.split(";")[1:]:
            if "=" not in chunk:
                continue
            key, value = chunk.split("=", 1)
            parsed[key.strip()] = value.strip()
        return parsed
    return {}


def parse_selection_probe(content_descs: list[str]) -> dict[str, str]:
    return parse_probe_descriptor(content_descs, "pilot_selection_probe")


def parse_activity_center_probe(content_descs: list[str]) -> dict[str, str]:
    return parse_probe_descriptor(content_descs, "pilot_activity_center_probe")


def parse_login_probe(content_descs: list[str]) -> dict[str, str]:
    return parse_probe_descriptor(content_descs, "pilot_login_probe")


def summarize_ui_markers(ui_dump_path: pathlib.Path, target_laudo_id: int | None) -> dict[str, Any]:
    test_ids = extract_ui_test_ids(ui_dump_path)
    content_descs = extract_ui_content_descs(ui_dump_path)
    ui_texts = extract_ui_texts(ui_dump_path)
    history_search_query_observed = extract_ui_text_for_resource_id(
        ui_dump_path,
        "history-search-input",
    )
    selection_probe = parse_selection_probe(content_descs)
    activity_center_probe = parse_activity_center_probe(content_descs)
    login_probe = parse_login_probe(content_descs)
    target_id = int(target_laudo_id or 0) if target_laudo_id else 0
    activity_center_terminal_state = "unknown"
    if "activity-center-terminal-state-no-request" in test_ids:
        activity_center_terminal_state = "no_request"
    elif "activity-center-terminal-state-empty" in test_ids:
        activity_center_terminal_state = "empty"
    elif "activity-center-terminal-state-loaded-legacy" in test_ids:
        activity_center_terminal_state = "loaded_legacy"
    elif "activity-center-terminal-state-loaded-v2" in test_ids:
        activity_center_terminal_state = "loaded_v2"
    elif "activity-center-terminal-state-loaded-unknown" in test_ids:
        activity_center_terminal_state = "loaded_unknown"
    elif "activity-center-terminal-state-error" in test_ids:
        activity_center_terminal_state = "error"
    elif activity_center_probe.get("terminal_state") not in (None, "", "none"):
        activity_center_terminal_state = str(activity_center_probe.get("terminal_state"))

    activity_center_state = "unknown"
    if "activity-center-state-loading" in test_ids:
        activity_center_state = "loading"
    elif activity_center_terminal_state != "unknown":
        activity_center_state = activity_center_terminal_state
    elif "activity-center-empty-state" in test_ids:
        activity_center_state = "empty"

    activity_center_delivery_mode = "unknown"
    if "activity-center-feed-v2-served" in test_ids:
        activity_center_delivery_mode = "v2"
    elif "activity-center-feed-legacy-served" in test_ids:
        activity_center_delivery_mode = "legacy"
    elif "activity-center-request-not-started" in test_ids:
        activity_center_delivery_mode = "not_started"
    elif activity_center_probe.get("delivery"):
        activity_center_delivery_mode = str(activity_center_probe.get("delivery"))

    activity_center_request_dispatched = bool(
        "activity-center-request-dispatched" in test_ids
        or activity_center_probe.get("request_dispatched") == "true"
    )
    activity_center_request_not_started = bool(
        "activity-center-request-not-started" in test_ids
        or activity_center_terminal_state == "no_request"
        or activity_center_probe.get("request_dispatched") == "false"
    )
    requested_targets_raw = str(activity_center_probe.get("requested_targets") or "")
    activity_center_requested_targets = sorted(
        {
            int(item)
            for item in requested_targets_raw.split(",")
            if item.isdigit() and int(item) > 0
        }
        | {
            int(match.group(1))
            for match in (
                re.match(r"activity-center-request-target-(\d+)$", test_id)
                for test_id in test_ids
            )
            if match
        }
    )
    activity_center_skip_reason = "none"
    if "activity-center-skip-already-monitoring" in test_ids:
        activity_center_skip_reason = "already_monitoring"
    elif "activity-center-skip-network-blocked" in test_ids:
        activity_center_skip_reason = "network_blocked"
    elif "activity-center-skip-no-target" in test_ids:
        activity_center_skip_reason = "no_target"
    elif activity_center_probe.get("skip_reason") not in (None, "", "none"):
        activity_center_skip_reason = str(activity_center_probe.get("skip_reason"))

    request_status_raw = str(activity_center_probe.get("request_status") or "").strip()
    activity_center_request_status = (
        int(request_status_raw)
        if request_status_raw.isdigit()
        else None
    )
    request_attempt_sequence_raw = str(
        activity_center_probe.get("request_attempt_sequence") or ""
    ).strip()
    activity_center_request_attempt_sequence = [
        item
        for item in request_attempt_sequence_raw.split("|")
        if item and item != "none"
    ]
    activity_center_request_phase = str(
        activity_center_probe.get("request_phase") or "not_created"
    ).strip() or "not_created"
    activity_center_request_trace_id = (
        str(activity_center_probe.get("request_trace_id") or "").strip() or None
    )
    activity_center_request_flag_enabled = (
        str(activity_center_probe.get("request_flag_enabled") or "").strip()
        or "unknown"
    )
    activity_center_request_flag_raw_value = (
        str(activity_center_probe.get("request_flag_raw_value") or "").strip()
        or None
    )
    activity_center_request_flag_source = (
        str(activity_center_probe.get("request_flag_source") or "").strip()
        or None
    )
    activity_center_request_route_decision = (
        str(activity_center_probe.get("request_route_decision") or "").strip()
        or "unknown"
    )
    activity_center_request_decision_reason = (
        str(activity_center_probe.get("request_decision_reason") or "").strip()
        or None
    )
    activity_center_request_decision_source = (
        str(activity_center_probe.get("request_decision_source") or "").strip()
        or None
    )
    activity_center_request_actual_route = (
        str(activity_center_probe.get("request_actual_route") or "").strip()
        or "unknown"
    )
    activity_center_request_endpoint_path = (
        str(activity_center_probe.get("request_endpoint_path") or "").strip() or None
    )
    activity_center_request_failure_kind = (
        str(activity_center_probe.get("request_failure_kind") or "").strip() or None
    )
    activity_center_request_fallback_reason = (
        str(activity_center_probe.get("request_fallback_reason") or "").strip()
        or None
    )
    activity_center_request_backend_request_id = (
        str(activity_center_probe.get("request_backend_request_id") or "").strip()
        or None
    )
    activity_center_request_validation_session = (
        str(activity_center_probe.get("request_validation_session") or "").strip()
        or None
    )
    activity_center_request_operator_run = (
        str(activity_center_probe.get("request_operator_run") or "").strip() or None
    )
    runtime_flag_enabled = (
        str(selection_probe.get("runtime_flag_enabled") or "").strip() or "unknown"
    )
    runtime_flag_raw_value = (
        str(selection_probe.get("runtime_flag_raw_value") or "").strip() or None
    )
    runtime_flag_source = (
        str(selection_probe.get("runtime_flag_source") or "").strip() or None
    )
    login_stage = str(login_probe.get("stage") or "").strip() or "unknown"
    login_status_api = str(login_probe.get("status_api") or "").strip() or "unknown"
    login_entrando = str(login_probe.get("entrando") or "").strip() == "1"
    login_carregando = str(login_probe.get("carregando") or "").strip() == "1"
    login_error = str(login_probe.get("erro") or "").strip() or None

    selection_callback_fired = bool(
        target_id
        and (
            f"history-selection-callback-fired-{target_id}" in test_ids
            or selection_probe.get("callback_fired") == str(target_id)
        )
    )
    selection_callback_completed = bool(
        target_id
        and (
            f"history-selection-callback-completed-{target_id}" in test_ids
            or selection_probe.get("callback_completed") == str(target_id)
        )
    )
    selection_lost = bool(
        target_id
        and (
            f"authenticated-shell-selection-lost-{target_id}" in test_ids
            or selection_probe.get("selection_lost") == str(target_id)
        )
    )
    selected_target_id = bool(
        target_id
        and (
            f"selected-history-item-id-{target_id}" in test_ids
            or f"authenticated-shell-selected-laudo-id-{target_id}" in test_ids
            or selection_probe.get("selected_laudo_id") == str(target_id)
        )
    )
    shell_selection_ready = bool(
        target_id
        and (
            f"authenticated-shell-selection-ready-{target_id}" in test_ids
            or selection_probe.get("selection_ready") == str(target_id)
        )
    )

    return {
        "selected_history_item_marker": "selected-history-item-marker" in test_ids,
        "selected_history_item_none": "selected-history-item-none" in test_ids,
        "history_results_empty_visible": "history-results-empty" in test_ids,
        "history_search_query_observed": history_search_query_observed,
        "selected_target_id": selected_target_id,
        "selection_callback_fired": selection_callback_fired,
        "selection_callback_completed": selection_callback_completed,
        "shell_selection_ready": shell_selection_ready,
        "selection_lost": selection_lost,
        "history_target_visible": bool(
            target_id and f"history-target-visible-{target_id}" in test_ids
        ),
        "history_item_target_visible": bool(
            target_id and f"history-item-{target_id}" in test_ids
        ),
        "activity_center_modal": "activity-center-modal" in test_ids,
        "activity_center_state": activity_center_state,
        "activity_center_terminal_state": activity_center_terminal_state,
        "activity_center_request_dispatched": activity_center_request_dispatched,
        "activity_center_request_not_started": activity_center_request_not_started,
        "activity_center_requested_targets": activity_center_requested_targets,
        "activity_center_target_requested": bool(
            target_id
            and (
                f"activity-center-request-target-{target_id}" in test_ids
                or target_id in activity_center_requested_targets
            )
        ),
        "activity_center_delivery_mode": activity_center_delivery_mode,
        "activity_center_skip_reason": activity_center_skip_reason,
        "activity_center_request_phase": activity_center_request_phase,
        "activity_center_request_trace_id": activity_center_request_trace_id,
        "activity_center_request_flag_enabled": activity_center_request_flag_enabled,
        "activity_center_request_flag_raw_value": activity_center_request_flag_raw_value,
        "activity_center_request_flag_source": activity_center_request_flag_source,
        "activity_center_request_route_decision": activity_center_request_route_decision,
        "activity_center_request_decision_reason": activity_center_request_decision_reason,
        "activity_center_request_decision_source": activity_center_request_decision_source,
        "activity_center_request_actual_route": activity_center_request_actual_route,
        "activity_center_request_attempt_sequence": activity_center_request_attempt_sequence,
        "activity_center_request_endpoint_path": activity_center_request_endpoint_path,
        "activity_center_request_status": activity_center_request_status,
        "activity_center_request_failure_kind": activity_center_request_failure_kind,
        "activity_center_request_fallback_reason": activity_center_request_fallback_reason,
        "activity_center_request_backend_request_id": activity_center_request_backend_request_id,
        "activity_center_request_validation_session": activity_center_request_validation_session,
        "activity_center_request_operator_run": activity_center_request_operator_run,
        "login_stage": login_stage,
        "login_status_api": login_status_api,
        "login_entrando": login_entrando,
        "login_carregando": login_carregando,
        "login_error": login_error,
        "runtime_flag_enabled": runtime_flag_enabled,
        "runtime_flag_raw_value": runtime_flag_raw_value,
        "runtime_flag_source": runtime_flag_source,
        "activity_center_target_v2": bool(
            target_id and f"activity-center-feed-v2-target-{target_id}" in test_ids
        ),
        "chat_thread_surface_visible": MOBILE_PILOT_CHAT_SURFACE_TEST_ID in test_ids,
        "target_seed_text_visible": any(
            MOBILE_PILOT_TARGET_TEXT in item for item in ui_texts
        ),
        "mesa_entry_target_visible": MOBILE_PILOT_MESA_ENTRY_TEST_ID in test_ids,
        "mesa_entry_label_visible": any(
            MOBILE_PILOT_MESA_ENTRY_LABEL in item for item in ui_texts
        )
        or MOBILE_PILOT_MESA_ENTRY_LABEL in content_descs,
        "thread_surface_visible": MOBILE_PILOT_MESA_SURFACE_TEST_ID in test_ids,
        "thread_loaded_visible": MOBILE_PILOT_MESA_LOADED_TEST_ID in test_ids,
        "thread_empty_visible": "mesa-thread-empty-state" in test_ids,
        "login_probe": login_probe,
        "selection_probe": selection_probe,
        "activity_center_probe": activity_center_probe,
        "raw_content_descs": sorted(content_descs),
        "raw_test_ids": sorted(test_ids),
        "ui_dump_path": str(ui_dump_path),
    }


def start_logcat_capture(state: ExecutionState) -> None:
    run_command(["adb", "-s", state.device_id, "logcat", "-c"], check=False)
    full_log_path = state.artifacts_dir / "logcat_full.txt"
    handle = full_log_path.open("w", encoding="utf-8")
    state.logcat_process = subprocess.Popen(
        ["adb", "-s", state.device_id, "logcat", "-v", "time"],
        stdout=handle,
        stderr=subprocess.STDOUT,
        text=True,
    )


def stop_logcat_capture(state: ExecutionState) -> None:
    if not state.logcat_process:
        return
    process = state.logcat_process
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
    finally:
        state.logcat_process = None


def write_logcat_excerpt(state: ExecutionState) -> None:
    full_path = state.artifacts_dir / "logcat_full.txt"
    excerpt_path = state.artifacts_dir / "logcat_excerpt.txt"
    if not full_path.exists():
        write_text(excerpt_path, "logcat_full.txt não foi gerado.\n")
        return
    pattern = re.compile(r"(tariel|expo|fallback|validation|mobile|v2)", re.IGNORECASE)
    lines = [
        line.rstrip()
        for line in full_path.read_text(encoding="utf-8", errors="replace").splitlines()
        if pattern.search(line)
    ]
    write_text(excerpt_path, "\n".join(lines[-400:]).strip() + ("\n" if lines else ""))


def build_mobile_request(
    path: str,
    *,
    token: str | None = None,
    method: str = "GET",
    data: bytes | None = None,
    extra_headers: dict[str, str] | None = None,
) -> urllib.request.Request:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)
    return urllib.request.Request(
        f"http://127.0.0.1:8000{path}",
        data=data,
        headers=headers,
        method=method,
    )


def read_json_response(request: urllib.request.Request, opener: Any | None = None) -> dict[str, Any]:
    if opener is None:
        response = urllib.request.urlopen(request, timeout=20)
    else:
        response = opener.open(request, timeout=20)
    with response:
        body = response.read().decode("utf-8")
    return json.loads(body)


def login_mobile(email: str, password: str) -> dict[str, Any]:
    payload = json.dumps({"email": email, "senha": password, "lembrar": False}).encode("utf-8")
    request = build_mobile_request(
        "/app/api/mobile/auth/login",
        method="POST",
        data=payload,
        extra_headers={"Content-Type": "application/json"},
    )
    return read_json_response(request)


def build_admin_opener() -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def admin_login(
    opener: urllib.request.OpenerDirector,
    email: str,
    password: str,
    *,
    state: ExecutionState | None = None,
) -> None:
    with opener.open("http://127.0.0.1:8000/admin/login", timeout=20) as response:
        html_body = response.read().decode("utf-8")
    csrf_token = extract_csrf_token(html_body)

    payload = urllib.parse.urlencode(
        {
            "email": email,
            "senha": password,
            "csrf_token": csrf_token,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "http://127.0.0.1:8000/admin/login",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with opener.open(request, timeout=20) as response:
        final_url = response.geturl()
        final_body = response.read().decode("utf-8", errors="replace")

    if final_url.endswith("/admin/mfa/setup"):
        final_url = submit_admin_mfa(
            opener,
            path="/admin/mfa/setup",
            html_body=final_body,
            email=email,
            state=state,
        )
    elif final_url.endswith("/admin/mfa/challenge"):
        final_url = submit_admin_mfa(
            opener,
            path="/admin/mfa/challenge",
            html_body=final_body,
            email=email,
            state=state,
        )

    if not final_url.endswith("/admin/painel"):
        raise RunnerError(f"Login admin não concluiu no painel: {final_url}")


def admin_json(
    opener: urllib.request.OpenerDirector,
    path: str,
    *,
    method: str = "GET",
    query: str = "",
) -> dict[str, Any]:
    suffix = f"?{query}" if query else ""
    request = urllib.request.Request(
        f"http://127.0.0.1:8000{path}{suffix}",
        method=method,
        headers={"Accept": "application/json"},
    )
    return read_json_response(request, opener=opener)


def request_json_with_metadata(
    request: urllib.request.Request,
    *,
    opener: urllib.request.OpenerDirector | None = None,
) -> dict[str, Any]:
    try:
        if opener is None:
            response = urllib.request.urlopen(request, timeout=20)
        else:
            response = opener.open(request, timeout=20)
        with response:
            body = response.read().decode("utf-8", errors="replace")
            status_code = int(getattr(response, "status", 200) or 200)
            final_url = response.geturl()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        status_code = int(exc.code)
        final_url = exc.geturl()
    except urllib.error.URLError as exc:
        return {
            "status_code": None,
            "ok": False,
            "error_kind": "connection_error",
            "detail": str(getattr(exc, "reason", exc) or exc),
            "url": request.full_url,
            "json": None,
            "raw_body": None,
        }
    except Exception as exc:  # pragma: no cover - defensive networking
        return {
            "status_code": None,
            "ok": False,
            "error_kind": "unexpected_error",
            "detail": str(exc),
            "url": request.full_url,
            "json": None,
            "raw_body": None,
        }

    try:
        payload = json.loads(body) if body else None
    except json.JSONDecodeError:
        payload = None

    return {
        "status_code": status_code,
        "ok": 200 <= status_code < 300,
        "error_kind": None if 200 <= status_code < 300 else "http_error",
        "detail": None,
        "url": final_url,
        "json": payload,
        "raw_body": body if payload is None else None,
    }


def build_admin_json_request(
    path: str,
    *,
    method: str = "GET",
    query: str = "",
) -> urllib.request.Request:
    suffix = f"?{query}" if query else ""
    return urllib.request.Request(
        f"http://127.0.0.1:8000{path}{suffix}",
        method=method,
        headers={"Accept": "application/json"},
    )


def classify_operator_route_preflight(
    response: dict[str, Any],
) -> str:
    status_code = response.get("status_code")
    error_kind = str(response.get("error_kind") or "").strip()
    if error_kind == "connection_error":
        return "backend_local_unavailable"
    if status_code == 200:
        return "ok"
    if status_code == 404:
        return "api_route"
    if status_code in {401, 403}:
        return "authentication_authorization"
    if status_code is None:
        return "backend_local_unavailable"
    return "unexpected_http_status"


def ensure_admin_operator_routes_preflight(
    opener: urllib.request.OpenerDirector,
    state: ExecutionState,
) -> dict[str, Any]:
    summary_path = "/admin/api/mobile-v2-rollout/summary"
    operator_status_path = "/admin/api/mobile-v2-rollout/operator-run/status"
    summary_response = request_json_with_metadata(
        build_admin_json_request(summary_path),
        opener=opener,
    )
    operator_status_response = request_json_with_metadata(
        build_admin_json_request(operator_status_path),
        opener=opener,
    )
    summary_classification = classify_operator_route_preflight(summary_response)
    operator_status_classification = classify_operator_route_preflight(
        operator_status_response
    )
    overall_status = (
        "ok"
        if summary_classification == "ok" and operator_status_classification == "ok"
        else summary_classification
        if summary_classification != "ok"
        else operator_status_classification
    )
    payload = {
        "timestamp_utc": now_utc(),
        "tenant_id": state.mobile_tenant_id,
        "tenant_key": state.mobile_tenant_key or None,
        "tenant_label": state.mobile_tenant_label or None,
        "rollout_public_contract_enabled": (
            state.backend_env_flags_applied.get("TARIEL_V2_ANDROID_PUBLIC_CONTRACT") == "1"
        ),
        "rollout_enabled": (
            state.backend_env_flags_applied.get("TARIEL_V2_ANDROID_ROLLOUT") == "1"
        ),
        "rollout_observability_enabled": (
            state.backend_env_flags_applied.get(
                "TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY"
            )
            == "1"
        ),
        "rollout_state_overrides": state.backend_env_flags_applied.get(
            "TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES"
        ),
        "rollout_surface_state_overrides": state.backend_env_flags_applied.get(
            "TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES"
        ),
        "backend_env_flags_applied": state.backend_env_flags_applied,
        "operator_route_preflight_status": overall_status,
        "summary_route": {
            "path": summary_path,
            **summary_response,
        },
        "operator_status_route": {
            "path": operator_status_path,
            **operator_status_response,
        },
    }
    write_json(state.artifacts_dir / "operator_route_preflight.json", payload)

    state.operator_route_preflight_status = overall_status
    state.summary_route_preflight_response = summary_response
    state.operator_status_route_preflight_response = operator_status_response

    summary_json = summary_response.get("json")
    if isinstance(summary_json, dict):
        save_http_json(state.artifacts_dir / "backend_summary_preflight.json", summary_json)
    operator_status_json = operator_status_response.get("json")
    if isinstance(operator_status_json, dict):
        save_http_json(
            state.artifacts_dir / "operator_run_status_preflight.json",
            operator_status_json,
        )

    if overall_status == "ok":
        record_phase_event(
            state,
            phase="operator_route_preflight",
            status="ok",
            detail="admin_rollout_routes_available",
            extra={
                "summary_status": summary_response.get("status_code"),
                "operator_status": operator_status_response.get("status_code"),
            },
        )
        return payload

    if overall_status == "api_route":
        failed_route = (
            summary_path
            if summary_classification != "ok"
            else operator_status_path
        )
        failed_status = (
            summary_response.get("status_code")
            if summary_classification != "ok"
            else operator_status_response.get("status_code")
        )
        detail = (
            "Rota admin/operator-run do rollout mobile indisponivel no backend local. "
            f"classificacao=API route; route={failed_route}; http_status={failed_status}; "
            "flags_aplicadas="
            f"{json.dumps(state.backend_env_flags_applied, ensure_ascii=False, sort_keys=True)}"
        )
    elif overall_status == "authentication_authorization":
        failed_route = (
            summary_path
            if summary_classification != "ok"
            else operator_status_path
        )
        failed_status = (
            summary_response.get("status_code")
            if summary_classification != "ok"
            else operator_status_response.get("status_code")
        )
        detail = (
            "Preflight das rotas admin/operator-run bloqueado por autenticacao/autorizacao. "
            f"route={failed_route}; http_status={failed_status}."
        )
    elif overall_status == "backend_local_unavailable":
        failed_route = (
            summary_path
            if summary_classification != "ok"
            else operator_status_path
        )
        failed_detail = (
            summary_response.get("detail")
            if summary_classification != "ok"
            else operator_status_response.get("detail")
        )
        detail = (
            "Preflight das rotas admin/operator-run falhou porque o backend local ficou indisponivel. "
            f"route={failed_route}; detail={failed_detail}."
        )
    else:
        failed_route = (
            summary_path
            if summary_classification != "ok"
            else operator_status_path
        )
        failed_status = (
            summary_response.get("status_code")
            if summary_classification != "ok"
            else operator_status_response.get("status_code")
        )
        detail = (
            "Preflight das rotas admin/operator-run retornou status HTTP inesperado. "
            f"route={failed_route}; http_status={failed_status}; "
            f"classificacao={overall_status}."
        )

    record_phase_event(
        state,
        phase="operator_route_preflight",
        status="failed",
        detail=detail,
        extra=payload,
    )
    raise RunnerError(detail)


def save_http_json(path: pathlib.Path, payload: dict[str, Any]) -> None:
    write_json(path, payload)


def detect_installed_package(state: ExecutionState) -> bool:
    result = run_command(
        [
            "adb",
            "-s",
            state.device_id,
            "shell",
            "cmd",
            "package",
            "resolve-activity",
            "--brief",
            state.package_name,
        ],
        check=False,
        timeout=15,
    )
    return result.returncode == 0 and state.package_name in (result.stdout + result.stderr)


def install_failure_is_environmental(result: CommandResult) -> bool:
    output = "\n".join((result.stdout or "", result.stderr or "")).lower()
    signals = (
        "can't find service: package",
        "device offline",
        "device not found",
        "more than one device/emulator",
        "broken pipe",
        "closed",
        "timeout",
        "failed to commit install session",
    )
    return any(signal in output for signal in signals)


def probe_text(command: list[str], *, cwd: pathlib.Path | None = None) -> str:
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd) if cwd else None,
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return ""
    output = (completed.stdout or completed.stderr or "").strip()
    return output.splitlines()[0].strip() if output else ""


def parse_node_version(value: str | None) -> tuple[int, int, int] | None:
    if not value:
        return None
    match = re.search(r"v?(\d+)\.(\d+)\.(\d+)", value)
    if not match:
        return None
    return tuple(int(part) for part in match.groups())


def format_node_version(version: tuple[int, int, int] | None) -> str:
    if not version:
        return ""
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


def probe_nvm_node_runtime(version_text: str) -> tuple[str, str, str]:
    command = (
        'source "$HOME/.nvm/nvm.sh" && '
        f"nvm use {version_text} >/dev/null && "
        'printf "%s\\n%s\\n%s\\n" "$(node -v)" "$(npm -v)" "$(node -p process.execPath)"'
    )
    try:
        completed = subprocess.run(
            ["bash", "-lc", command],
            cwd=str(ANDROID_ROOT),
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return "", "", ""
    lines = [line.strip() for line in (completed.stdout or "").splitlines() if line.strip()]
    node_version = lines[0] if len(lines) >= 1 else ""
    npm_version = lines[1] if len(lines) >= 2 else ""
    node_binary = lines[2] if len(lines) >= 3 else ""
    return node_version, npm_version, node_binary


def select_android_preview_runtime(script_name: str) -> dict[str, Any]:
    current_node_version_text = probe_text(["node", "-v"], cwd=ANDROID_ROOT)
    current_node_version = parse_node_version(current_node_version_text)
    current_npm_version_text = probe_text(["npm", "-v"], cwd=ANDROID_ROOT)
    current_node_binary = probe_text(["node", "-p", "process.execPath"], cwd=ANDROID_ROOT)

    if is_supported_node_version(current_node_version):
        return {
            "command": ["npm", "run", script_name],
            "display": f"cd android && npm run {script_name}",
            "runtime": "current_node",
            "node_version": current_node_version_text,
            "npm_version": current_npm_version_text,
            "node_binary": current_node_binary,
            "unsupported_current_node_version": False,
        }

    compatible_versions = installed_nvm_node_versions()
    if compatible_versions:
        same_major = [
            version
            for version in compatible_versions
            if current_node_version and version[0] == current_node_version[0]
        ]
        selected = same_major[0] if same_major else compatible_versions[0]
        selected_text = format_node_version(selected)
        node_version, npm_version, node_binary = probe_nvm_node_runtime(selected_text)
        nvm_command = (
            'source "$HOME/.nvm/nvm.sh" && '
            f"nvm use {selected_text} >/dev/null && "
            f"npm run {script_name}"
        )
        return {
            "command": ["bash", "-lc", nvm_command],
            "display": f"cd android && nvm use {selected_text} && npm run {script_name}",
            "runtime": "nvm_compatible_node",
            "node_version": node_version or selected_text,
            "npm_version": npm_version,
            "node_binary": node_binary,
            "unsupported_current_node_version": True,
            "current_node_version": current_node_version_text,
            "selected_node_version": selected_text,
        }

    return {
        "command": ["npm", "run", script_name],
        "display": f"cd android && npm run {script_name}",
        "runtime": "unsupported_current_node",
        "node_version": current_node_version_text,
        "npm_version": current_npm_version_text,
        "node_binary": current_node_binary,
        "unsupported_current_node_version": True,
    }


def sha256_file(path: pathlib.Path) -> str | None:
    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def apk_snapshot(path: pathlib.Path = ANDROID_PREVIEW_APK_PATH) -> dict[str, Any]:
    exists = path.is_file()
    stat = path.stat() if exists else None
    return {
        "apk_path": str(path),
        "apk_exists": exists,
        "apk_mtime": (
            dt.datetime.fromtimestamp(stat.st_mtime, dt.timezone.utc).isoformat()
            if stat
            else None
        ),
        "apk_mtime_ns": stat.st_mtime_ns if stat else None,
        "apk_size_bytes": stat.st_size if stat else None,
        "apk_sha256": sha256_file(path) if exists else None,
    }


def source_revision_or_diff_hash() -> str:
    head = probe_text(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT)
    try:
        completed = subprocess.run(
            [
                "git",
                "diff",
                "--",
                "android",
                "scripts/run_mobile_pilot_runner.py",
                "scripts/run_mobile_native_preflight.py",
            ],
            cwd=str(REPO_ROOT),
            check=False,
            capture_output=True,
            text=False,
            timeout=30,
        )
        diff_hash = hashlib.sha256(completed.stdout or b"").hexdigest()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        diff_hash = ""
    if head and diff_hash:
        return f"head={head};diff_sha256={diff_hash}"
    return head or (f"diff_sha256={diff_hash}" if diff_hash else "")


def classify_preview_failure(result: CommandResult | None, runtime: dict[str, Any]) -> str | None:
    if runtime.get("runtime") == "unsupported_current_node":
        return "unsupported_node_version"
    if result is None or result.returncode == 0:
        return None
    output = "\n".join((result.stdout or "", result.stderr or "")).lower()
    if "@expo/metro/metro-config" in output:
        return "expo_metro_module_resolution"
    if "@expo/image-utils" in output:
        return "expo_image_utils_module_resolution"
    if "execution failed for task ':app:createbundlereleasejsandassets'" in output:
        return "android_release_bundle_failed"
    if "failed to install" in output or "performing push install" in output:
        return "apk_install_failed"
    if install_failure_is_environmental(result):
        return "adb_or_emulator_environment"
    return "android_preview_failed"


def apk_unchanged(before: dict[str, Any], after: dict[str, Any]) -> bool:
    return bool(
        before.get("apk_exists")
        and after.get("apk_exists")
        and before.get("apk_sha256") == after.get("apk_sha256")
        and before.get("apk_mtime_ns") == after.get("apk_mtime_ns")
    )


def write_apk_build_preflight(
    state: ExecutionState,
    payload: dict[str, Any],
) -> None:
    state.apk_build_preflight = payload
    write_json(state.artifacts_dir / "apk_build_preflight.json", payload)


def install_or_reuse_app(state: ExecutionState, package_info: dict[str, Any]) -> None:
    stale_apk_allowed = allow_stale_apk()
    runtime = select_android_preview_runtime(str(package_info["preferred_install_script"]))
    android_localhost_strategy = mobile_android_localhost_strategy()
    state.android_localhost_strategy_for_build = android_localhost_strategy
    api_base_url_for_build = mobile_api_base_url_for_build(state)
    auth_web_base_url_for_build = api_base_url_for_build
    runtime_api_base_url = infer_mobile_runtime_api_base_url(
        api_base_url_for_build,
        state,
    )
    build_env_flags = {
        "EXPO_PUBLIC_API_BASE_URL": api_base_url_for_build,
        "EXPO_PUBLIC_AUTH_WEB_BASE_URL": auth_web_base_url_for_build,
        "EXPO_PUBLIC_ANDROID_LOCALHOST_STRATEGY": android_localhost_strategy,
        **MOBILE_LOCAL_ANDROID_BUILD_FLAG_VALUES,
    }
    state.api_base_url_for_build = api_base_url_for_build
    state.auth_web_base_url_for_build = auth_web_base_url_for_build
    state.api_base_url_runtime_if_available = runtime_api_base_url
    apk_before = apk_snapshot()
    base_preflight = {
        "generated_at": now_utc(),
        "preview_build_executed": False,
        "preview_build_succeeded": None,
        "preferred_install_script": package_info["preferred_install_script"],
        "api_base_url_for_build": api_base_url_for_build,
        "auth_web_base_url_for_build": auth_web_base_url_for_build,
        "android_localhost_strategy_for_build": android_localhost_strategy,
        "android_v2_read_contracts_enabled_for_build": build_env_flags[
            "EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED"
        ],
        "mobile_automation_diagnostics_for_build": build_env_flags[
            "EXPO_PUBLIC_MOBILE_AUTOMATION_DIAGNOSTICS"
        ],
        "build_env_flags_applied": build_env_flags,
        "api_base_url_runtime_if_available": runtime_api_base_url,
        "preview_command": runtime.get("display"),
        "node_engine_requirement": NODE_ENGINE_REQUIREMENT,
        "node_runtime": runtime.get("runtime"),
        "node_version_used_for_preview": runtime.get("node_version"),
        "npm_version_used_for_preview": runtime.get("npm_version"),
        "node_binary_used_for_preview": runtime.get("node_binary"),
        "current_node_version": runtime.get("current_node_version")
        or runtime.get("node_version"),
        "source_revision_or_diff_hash": source_revision_or_diff_hash(),
        "stale_apk_allowed": stale_apk_allowed,
        "stale_apk_detected": False,
        "failure_classification": None,
        "apk_before": apk_before,
        "apk_after": None,
        **apk_before,
    }
    write_apk_build_preflight(state, base_preflight)

    if runtime.get("runtime") == "unsupported_current_node":
        payload = {
            **base_preflight,
            "preview_build_succeeded": False,
            "failure_classification": "unsupported_node_version",
        }
        write_apk_build_preflight(state, payload)
        raise RunnerError(
            "Node ativo incompatível com o workspace Android e nenhum runtime nvm compatível foi encontrado. "
            f"Requisito: {NODE_ENGINE_REQUIREMENT}."
        )

    if (
        state.visual_mode
        and stale_apk_allowed
        and not force_mobile_install()
        and detect_installed_package(state)
    ):
        state.build_used_existing_install = True
        payload = {
            **base_preflight,
            "preview_build_succeeded": False,
            "stale_apk_detected": True,
            "failure_classification": "stale_apk_allowed_for_visual_debug",
        }
        write_apk_build_preflight(state, payload)
        append_note(
            state,
            "Package Android ja instalado no device; runner local visual reutilizou a instalacao existente porque MOBILE_ALLOW_STALE_APK=1.",
        )
        return

    env = os.environ.copy()
    env["ANDROID_PREVIEW_CLEAN"] = "1"
    env.update(build_env_flags)
    env["TARIEL_ANDROID_PREVIEW_SKIP_LAUNCH"] = "1"
    node_binary = str(runtime.get("node_binary") or "").strip()
    if node_binary:
        env["NODE_BINARY"] = node_binary
    append_note(
        state,
        "Build Android executado com EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED=1 e EXPO_PUBLIC_MOBILE_AUTOMATION_DIAGNOSTICS=1 para materializar contrato V2 e probes do shell autenticado.",
    )
    append_note(
        state,
        f"Build Android forçado para API local {api_base_url_for_build} com limpeza fria do preview para evitar bundle stale.",
    )
    append_note(
        state,
        "Launch automatico do preview Android desabilitado; o runner valida rede antes de entregar a abertura ao Maestro.",
    )
    command = [str(item) for item in runtime["command"]]
    preview_command_display = str(runtime.get("display") or command_display(command))
    for attempt in (1, 2):
        install_log = state.artifacts_dir / (
            "android_install.log" if attempt == 1 else f"android_install_retry_{attempt}.log"
        )
        state.commands_used.append(preview_command_display)
        log_step(
            f"Instalando/atualizando o app Android via {package_info['preferred_install_script']} (tentativa {attempt}/2)."
        )
        record_phase_event(
            state,
            phase="install",
            status="running",
            detail=f"attempt={attempt}",
        )
        result = run_command(
            command,
            cwd=ANDROID_ROOT,
            env=env,
            timeout=1800,
            check=False,
            stream_output=state.visual_mode,
        )
        write_text(
            install_log,
            "\n".join(
                [
                    f"$ {preview_command_display}",
                    "",
                    "[stdout]",
                    result.stdout.strip(),
                    "",
                    "[stderr]",
                    result.stderr.strip(),
                    "",
                    f"[returncode] {result.returncode}",
                ]
            )
            .strip()
            + "\n",
        )
        apk_after = apk_snapshot()
        stale_detected = bool(result.returncode != 0 and apk_unchanged(apk_before, apk_after))
        installed_package_detected = detect_installed_package(state)
        failure_classification = classify_preview_failure(result, runtime)
        payload = {
            **base_preflight,
            "preview_build_executed": True,
            "preview_build_succeeded": result.returncode == 0,
            "preview_returncode": result.returncode,
            "preview_attempt": attempt,
            "stale_apk_detected": stale_detected or (
                result.returncode != 0 and installed_package_detected
            ),
            "installed_package_detected_after_failure": (
                installed_package_detected if result.returncode != 0 else None
            ),
            "failure_classification": failure_classification,
            "apk_after": apk_after,
            **apk_after,
        }
        write_apk_build_preflight(state, payload)

        if result.returncode == 0:
            record_phase_event(
                state,
                phase="install",
                status="ok",
                detail=f"attempt={attempt}",
            )
            append_note(
                state,
                f"APK preview atualizado e instalado a partir de {ANDROID_PREVIEW_APK_PATH}.",
            )
            return

        environmental_failure = install_failure_is_environmental(result)
        record_phase_event(
            state,
            phase="install",
            status="fail",
            detail=(
                f"attempt={attempt} environmental={str(environmental_failure).lower()} "
                f"classification={failure_classification}"
            ),
            extra={"apk_build_preflight": payload},
        )
        if (
            attempt == 1
            and environmental_failure
            and state.device_id.startswith("emulator-")
        ):
            wipe_data = should_wipe_emulator_on_install_recovery()
            append_note(
                state,
                "Falha ambiental na instalação Android detectada; o runner reiniciou o emulador e repetira a instalação uma única vez.",
            )
            restart_emulator_instance(
                state,
                label="install_environment_recovery",
                wipe_data=wipe_data,
            )
            stabilize_device_for_maestro(
                state,
                label="post_install_environment_recovery",
            )
            continue

        if installed_package_detected and stale_apk_allowed:
            state.build_used_existing_install = True
            payload = {
                **payload,
                "stale_apk_detected": True,
                "stale_apk_allowed": True,
                "failure_classification": failure_classification
                or "stale_apk_allowed_after_preview_failure",
            }
            write_apk_build_preflight(state, payload)
            append_note(
                state,
                "Build/instalação Android falhou, mas o package já estava instalado; o runner seguiu com a instalação existente porque MOBILE_ALLOW_STALE_APK=1.",
            )
            record_phase_event(
                state,
                phase="install",
                status="warn",
                detail=f"attempt={attempt} reused_existing_install",
            )
            return

        append_note(
            state,
            "Build/instalação Android falhou; o gate real abortou antes do Maestro para não reutilizar APK stale.",
        )
        raise RunnerError(
            "Não foi possível gerar/instalar o APK preview atualizado; "
            "o gate real não reutiliza APK antigo por padrão. "
            f"Classificação: {failure_classification or 'instalacao/build Android'}. "
            "Use MOBILE_ALLOW_STALE_APK=1 apenas para debug local explícito."
        )


def force_stop_app(state: ExecutionState, *, label: str) -> None:
    if not state.device_id or not state.package_name:
        return

    command = [
        "adb",
        "-s",
        state.device_id,
        "shell",
        "am",
        "force-stop",
        state.package_name,
    ]
    state.commands_used.append(command_display(command))
    try:
        result = run_command(
            command,
            check=False,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        append_note(
            state,
            f"Force-stop do pacote {state.package_name} excedeu timeout ({label}); o runner tentou recuperacao leve e repetiu o comando.",
        )
        ensure_device_package_service_ready(state)
        prime_device_for_automation(state, label=f"{label}_force_stop_recovery")
        result = run_command(
            command,
            check=False,
            timeout=30,
        )
    save_command_artifact(state.artifacts_dir / f"{label}_force_stop.txt", result)
    if result.returncode == 0:
        append_note(
            state,
            f"Processo Android do pacote {state.package_name} encerrado antes da rodada ativa ({label}).",
        )
        return
    append_note(
        state,
        f"Falha ao encerrar o pacote {state.package_name} antes da rodada ativa ({label}); o runner seguiu mesmo assim.",
    )


def launch_app(state: ExecutionState) -> None:
    activity_name = state.main_activity
    if not str(activity_name).startswith("."):
        activity_name = f".{str(activity_name).split('.')[-1]}"
    activity_spec = f"{state.package_name}/{activity_name}"

    primary_command = [
        "adb",
        "-s",
        state.device_id,
        "shell",
        "am",
        "start",
        "-W",
        "-n",
        activity_spec,
    ]
    primary_timed_out = False
    try:
        primary_result = run_command(
            primary_command,
            check=False,
            timeout=20,
        )
        state.commands_used.append(command_display(primary_command))

        combined_output = "\n".join(
            item.strip()
            for item in (primary_result.stdout, primary_result.stderr)
            if item.strip()
        )
        if primary_result.returncode == 0 and "Error:" not in combined_output:
            save_command_artifact(state.artifacts_dir / "app_launch.txt", primary_result)
            return
    except subprocess.TimeoutExpired:
        primary_timed_out = True
        primary_result = CommandResult(
            command=primary_command,
            returncode=124,
            stdout="",
            stderr="timeout",
        )
        append_note(
            state,
            "Launch primario via am start excedeu timeout; tentando fallback via monkey.",
        )
        state.commands_used.append(command_display(primary_command))

    fallback_command = [
        "adb",
        "-s",
        state.device_id,
        "shell",
        "monkey",
        "-p",
        state.package_name,
        "-c",
        "android.intent.category.LAUNCHER",
        "1",
    ]
    fallback_timed_out = False
    try:
        fallback_result = run_command(
            fallback_command,
            check=False,
            timeout=15,
        )
        state.commands_used.append(command_display(fallback_command))
    except subprocess.TimeoutExpired:
        fallback_timed_out = True
        fallback_result = CommandResult(
            command=fallback_command,
            returncode=124,
            stdout="",
            stderr="timeout",
        )
        append_note(
            state,
            "Launch fallback via monkey excedeu timeout; seguindo para o Maestro assim mesmo.",
        )
        state.commands_used.append(command_display(fallback_command))
    write_text(
        state.artifacts_dir / "app_launch.txt",
        "\n".join(
            [
                f"$ {command_display(primary_command)}",
                "",
                "[primary stdout]",
                primary_result.stdout.strip(),
                "",
                "[primary stderr]",
                primary_result.stderr.strip(),
                "",
                f"[primary returncode] {primary_result.returncode}",
                f"[primary timeout] {primary_timed_out}",
                "",
                f"$ {command_display(fallback_command)}",
                "",
                "[fallback stdout]",
                fallback_result.stdout.strip(),
                "",
                "[fallback stderr]",
                fallback_result.stderr.strip(),
                "",
                f"[fallback returncode] {fallback_result.returncode}",
                f"[fallback timeout] {fallback_timed_out}",
            ]
        ).strip()
        + "\n",
    )
    if fallback_result.returncode != 0:
        append_note(
            state,
            "Runner nao confirmou a abertura previa do app; o fluxo seguiu e delegou o launch ao Maestro.",
        )


def run_maestro_flow(state: ExecutionState, mobile_password: str) -> CommandResult:
    if not state.target_laudo_id or state.target_laudo_id <= 0:
        raise RunnerError("Operator run não expôs um target de thread válido para o Maestro.")
    command = [
        "maestro",
        "test",
        "--device",
        state.device_id,
        "--debug-output",
        str(state.maestro_debug_dir),
        "--test-output-dir",
        str(state.screenshots_dir),
        str(FLOW_PATH),
    ]
    env = os.environ.copy()
    env["MAESTRO_LOGIN_EMAIL"] = state.mobile_email
    env["MAESTRO_LOGIN_PASSWORD"] = mobile_password
    env["MAESTRO_TARGET_LAUDO_ID"] = str(state.target_laudo_id)
    state.commands_used.append(command_display(command))
    log_step(
        f"Executando o flow Maestro no device Android ({'visual' if state.visual_mode else 'headless'})."
    )
    state.maestro_attempts += 1
    result = run_command(
        command,
        env=env,
        timeout=600,
        check=False,
        stream_output=state.visual_mode,
    )
    output = result.stdout or ""
    state.maestro_history_item_visible_before_tap = (
        "Assert that id: history-item-${TARGET_LAUDO_ID} is visible... COMPLETED" in output
        or (
            state.target_laudo_id is not None
            and f"Assert that id: history-item-{state.target_laudo_id} is visible... COMPLETED"
            in output
        )
    )
    state.maestro_target_tap_completed = (
        "Tap on id: history-item-${TARGET_LAUDO_ID}... COMPLETED" in output
        or f"Tap on id: history-item-{state.target_laudo_id}... COMPLETED" in output
    )
    state.maestro_selection_callback_confirmed = (
        "Assert that id: history-selection-callback-fired-${TARGET_LAUDO_ID} is visible... COMPLETED"
        in output
        or f"Assert that id: history-selection-callback-fired-{state.target_laudo_id} is visible... COMPLETED"
        in output
    )
    state.maestro_shell_selection_confirmed = (
        "Assert that id: authenticated-shell-selection-ready-${TARGET_LAUDO_ID} is visible... COMPLETED"
        in output
        or f"Assert that id: authenticated-shell-selection-ready-{state.target_laudo_id} is visible... COMPLETED"
        in output
        or f"Assert that id: {MOBILE_PILOT_CHAT_SURFACE_TEST_ID} is visible... COMPLETED"
        in output
        or f"Assert that \"{MOBILE_PILOT_TARGET_TEXT}\" is visible... COMPLETED"
        in output
    )
    state.maestro_selection_callback_wait_failed = (
        "Assert that id: history-selection-callback-fired-${TARGET_LAUDO_ID} is visible... FAILED"
        in output
        or f"Assert that id: history-selection-callback-fired-{state.target_laudo_id} is visible... FAILED"
        in output
    )
    state.maestro_shell_selection_wait_failed = (
        "Assert that id: authenticated-shell-selection-ready-${TARGET_LAUDO_ID} is visible... FAILED"
        in output
        or f"Assert that id: authenticated-shell-selection-ready-{state.target_laudo_id} is visible... FAILED"
        in output
    )
    state.maestro_activity_center_terminal_confirmed = (
        "Assert that id: activity-center-terminal-state is visible... COMPLETED"
        in output
        or "Assert that id: activity-center-empty-state is visible... COMPLETED"
        in output
    )
    state.maestro_activity_center_v2_confirmed = (
        "Run flow when id: activity-center-feed-v2-served is visible... COMPLETED"
        in output
        or "Assert that id: activity-center-feed-v2-target-${TARGET_LAUDO_ID} is visible... COMPLETED"
        in output
        or (
            state.target_laudo_id is not None
            and f"Assert that id: activity-center-feed-v2-target-{state.target_laudo_id} is visible... COMPLETED"
            in output
        )
    )
    state.maestro_mesa_entry_target_found = (
        f"Assert that id: {MOBILE_PILOT_MESA_ENTRY_TEST_ID} is visible... COMPLETED"
        in output
    )
    state.maestro_mesa_entry_target_tapped = (
        f"Tap on id: {MOBILE_PILOT_MESA_ENTRY_TEST_ID}... COMPLETED" in output
    )
    state.maestro_thread_surface_confirmed = (
        f"Assert that id: {MOBILE_PILOT_MESA_SURFACE_TEST_ID} is visible... COMPLETED"
        in output
        or f"Assert that id: {MOBILE_PILOT_MESA_LOADED_TEST_ID} is visible... COMPLETED"
        in output
    )
    save_command_artifact(state.artifacts_dir / "maestro_run.txt", result)
    state.flow_ran = True
    return result


def resolve_operator_thread_target_id(
    operator_status: dict[str, Any] | None,
) -> int | None:
    status_payload = operator_status or {}
    run_payload = status_payload.get("operator_run") or {}
    required_targets = run_payload.get("required_targets") or []
    for item in required_targets:
        if str(item.get("surface") or "") != "thread":
            continue
        try:
            target_id = int(item.get("target_id"))
        except (TypeError, ValueError):
            continue
        if target_id > 0:
            return target_id
    return None


def resolve_operator_run_session_id(state: ExecutionState) -> str | None:
    for payload in (
        state.operator_status_before,
        state.operator_status_after,
        state.capabilities_before,
        state.capabilities_after,
    ):
        if not payload:
            continue
        for key in ("operator_run_session_id", "organic_validation_session_id"):
            value = str(payload.get(key) or "").strip()
            if value:
                return value
        run_payload = payload.get("operator_run") or {}
        value = str(run_payload.get("session_id") or "").strip()
        if value:
            return value
    return None


def resolve_operator_run_id(state: ExecutionState) -> str | None:
    for payload in (
        state.operator_status_before,
        state.operator_status_after,
        state.capabilities_before,
        state.capabilities_after,
    ):
        if not payload:
            continue
        for key in ("operator_run_id", "operator_validation_run_id"):
            value = str(payload.get(key) or "").strip()
            if value:
                return value
        run_payload = payload.get("operator_run") or {}
        value = str(run_payload.get("operator_run_id") or "").strip()
        if value:
            return value
    return None


def resolve_capabilities_version(state: ExecutionState) -> str | None:
    for payload in (state.capabilities_before, state.capabilities_after):
        if not payload:
            continue
        value = str(payload.get("capabilities_version") or "").strip()
        if value:
            return value
    return None


def resolve_rollout_bucket(state: ExecutionState) -> str | None:
    for payload in (state.capabilities_before, state.capabilities_after):
        if not payload:
            continue
        value = payload.get("rollout_bucket")
        if isinstance(value, int):
            return str(value)
        raw = str(value or "").strip()
        if raw:
            return raw
    return None


def post_mobile_human_ack(
    state: ExecutionState,
    *,
    surface: str,
    target_id: int,
) -> dict[str, Any]:
    session_id = resolve_operator_run_session_id(state)
    operator_run_id = resolve_operator_run_id(state)
    if not session_id:
        raise RunnerError("Sessão orgânica do operator run não foi resolvida para registrar human ack.")
    if not state.mobile_token:
        raise RunnerError("Token mobile ausente para registrar human ack.")

    payload = json.dumps(
        {
            "session_id": session_id,
            "surface": surface,
            "target_id": int(target_id),
            "checkpoint_kind": "rendered",
            "delivery_mode": "v2",
            "operator_run_id": operator_run_id,
        }
    ).encode("utf-8")
    extra_headers = {
        "Content-Type": "application/json",
        "X-Tariel-Mobile-Validation-Session": session_id,
    }
    capabilities_version = resolve_capabilities_version(state)
    rollout_bucket = resolve_rollout_bucket(state)
    if capabilities_version:
        extra_headers["X-Tariel-Mobile-V2-Capabilities-Version"] = capabilities_version
    if rollout_bucket:
        extra_headers["X-Tariel-Mobile-V2-Rollout-Bucket"] = rollout_bucket
    if operator_run_id:
        extra_headers["X-Tariel-Mobile-Operator-Run"] = operator_run_id

    request = build_mobile_request(
        "/app/api/mobile/v2/organic-validation/ack",
        token=state.mobile_token,
        method="POST",
        data=payload,
        extra_headers=extra_headers,
    )
    return read_json_response(request)


def record_human_acks_from_ui(state: ExecutionState) -> None:
    target_id = state.target_laudo_id
    if not target_id:
        return
    ui_summary = state.ui_marker_summary or {}
    ack_conditions = {
        "feed": bool(
            state.maestro_activity_center_v2_confirmed
            or ui_summary.get("activity_center_delivery_mode") == "v2"
            or ui_summary.get("activity_center_target_v2")
        ),
        "thread": bool(
            state.maestro_shell_selection_confirmed
            or ui_summary.get("shell_selection_ready")
            or ui_summary.get("thread_surface_visible")
        ),
    }
    for surface, should_ack in ack_conditions.items():
        if not should_ack:
            continue
        try:
            payload = post_mobile_human_ack(
                state,
                surface=surface,
                target_id=int(target_id),
            )
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            write_text(
                state.artifacts_dir / f"human_ack_{surface}_error.txt",
                body or f"HTTP {exc.code}\n",
            )
            append_note(
                state,
                f"Falha ao registrar human ack de {surface}: HTTP {exc.code}.",
            )
            continue
        except Exception as exc:
            write_text(
                state.artifacts_dir / f"human_ack_{surface}_error.txt",
                f"{exc}\n",
            )
            append_note(state, f"Falha ao registrar human ack de {surface}: {exc}")
            continue
        save_http_json(state.artifacts_dir / f"human_ack_{surface}.json", payload)
        duplicate = bool(payload.get("duplicate"))
        append_note(
            state,
            f"Human ack de {surface} registrado para o laudo {target_id} ({'duplicate' if duplicate else 'accepted'}).",
        )


def build_operator_action_diagnostics(
    state: ExecutionState,
    maestro_result: CommandResult,
) -> dict[str, Any]:
    target_id = state.target_laudo_id
    expected_history_query = str(target_id) if target_id else None
    ui_summary = state.ui_marker_summary or {}
    backend_evidence = extract_backend_evidence(state.summary_after)
    human_ack_events = backend_evidence.get("human_ack_recent_events") or []
    request_traces = backend_evidence.get("request_traces_recent") or []
    operator_progress = (state.operator_status_after or {}).get("operator_run_progress") or {}
    feed_ack_events = [
        item for item in human_ack_events if str(item.get("surface") or "") == "feed"
    ]
    thread_ack_events = [
        item
        for item in human_ack_events
        if str(item.get("surface") or "") == "thread"
    ]
    feed_ack_observed = bool(feed_ack_events)
    thread_ack_observed = bool(thread_ack_events)
    thread_v2_traces = [
        item
        for item in request_traces
        if str(item.get("endpoint") or "") == "thread"
        and str(item.get("counted_kind") or "") == "v2_served"
    ]
    thread_validation_trace = next(
        (
            item
            for item in thread_v2_traces
            if bool(item.get("metadata_available"))
            and str(item.get("usage_mode") or "") == "organic_validation"
        ),
        None,
    )
    thread_validation_session_id = (
        str((thread_validation_trace or {}).get("validation_session_id") or "").strip()
        or None
    )
    thread_operator_run_id = (
        str((thread_validation_trace or {}).get("operator_run_id") or "").strip()
        or None
    )
    if not feed_ack_observed:
        feed_only_reason = "feed_ack_missing"
    elif thread_ack_observed:
        feed_only_reason = None
    elif not state.maestro_mesa_entry_target_tapped:
        feed_only_reason = "mesa_entry_not_tapped"
    elif not (
        state.maestro_thread_surface_confirmed
        or ui_summary.get("thread_surface_visible")
    ):
        feed_only_reason = "mesa_thread_surface_not_visible"
    else:
        feed_only_reason = "thread_ack_missing_after_surface"

    return {
        "timestamp_utc": now_utc(),
        "target_expected": {
            "tenant_key": state.mobile_tenant_key,
            "tenant_label": state.mobile_tenant_label,
            "laudo_id": target_id,
            "history_item_id": f"history-item-{target_id}" if target_id else None,
            "chat_surface_id": MOBILE_PILOT_CHAT_SURFACE_TEST_ID,
            "target_text": MOBILE_PILOT_TARGET_TEXT,
            "feed_target_id": (
                f"activity-center-feed-v2-target-{target_id}" if target_id else None
            ),
            "mesa_entry_target_id": MOBILE_PILOT_MESA_ENTRY_TEST_ID,
            "mesa_entry_label": MOBILE_PILOT_MESA_ENTRY_LABEL,
            "mesa_surface_id": MOBILE_PILOT_MESA_SURFACE_TEST_ID,
            "mesa_loaded_id": MOBILE_PILOT_MESA_LOADED_TEST_ID,
        },
        "maestro_action": {
            "flow_path": str(FLOW_PATH.relative_to(REPO_ROOT)),
            "tap_selector": f"history-item-{target_id}" if target_id else None,
            "history_item_visible_before_tap": state.maestro_history_item_visible_before_tap,
            "tap_completed": state.maestro_target_tap_completed,
            "selection_confirmation": {
                "chat_surface_confirmed": state.maestro_shell_selection_confirmed,
                "legacy_callback_marker_confirmed": state.maestro_selection_callback_confirmed,
                "legacy_callback_marker_wait_failed": state.maestro_selection_callback_wait_failed,
            },
            "activity_center_terminal_confirmed": state.maestro_activity_center_terminal_confirmed,
            "activity_center_v2_confirmed": state.maestro_activity_center_v2_confirmed,
            "mesa_entry_target_found": state.maestro_mesa_entry_target_found,
            "mesa_entry_target_tapped": state.maestro_mesa_entry_target_tapped,
            "thread_surface_confirmed": state.maestro_thread_surface_confirmed,
            "returncode": maestro_result.returncode,
        },
        "target_observed": {
            "history_search_query_expected": expected_history_query,
            "history_search_query_observed": ui_summary.get("history_search_query_observed"),
            "history_results_empty_visible": bool(
                ui_summary.get("history_results_empty_visible")
            ),
            "history_item_target_visible": bool(
                ui_summary.get("history_item_target_visible")
            ),
            "chat_thread_surface_visible": bool(ui_summary.get("chat_thread_surface_visible")),
            "target_seed_text_visible": bool(ui_summary.get("target_seed_text_visible")),
            "activity_center_delivery_mode": ui_summary.get("activity_center_delivery_mode"),
            "activity_center_target_v2": bool(ui_summary.get("activity_center_target_v2")),
            "mesa_entry_target_visible": bool(ui_summary.get("mesa_entry_target_visible")),
            "mesa_entry_label_visible": bool(ui_summary.get("mesa_entry_label_visible")),
            "mesa_thread_surface_visible": bool(ui_summary.get("thread_surface_visible")),
            "mesa_thread_loaded_visible": bool(ui_summary.get("thread_loaded_visible")),
        },
        "human_ack": {
            "runner_synthetic_ack_disabled": True,
            "backend_received": bool(human_ack_events),
            "backend_recent_event_count": len(human_ack_events),
            "backend_recent_events": human_ack_events,
            "feed_ack_observed": feed_ack_observed,
            "feed_ack_target": (
                positive_int(feed_ack_events[0].get("target_id"))
                if feed_ack_events
                else None
            ),
            "feed_ack_status": (
                str(feed_ack_events[0].get("status") or "") if feed_ack_events else None
            ),
            "thread_v2_served": bool(thread_v2_traces),
            "thread_validation_metadata_present": bool(thread_validation_trace),
            "thread_ackable_state": bool(
                (
                    state.maestro_thread_surface_confirmed
                    or ui_summary.get("thread_surface_visible")
                )
                and ui_summary.get("thread_loaded_visible")
                and thread_validation_trace
            ),
            "thread_ack_handler_registered": True,
            "thread_ack_dedupe_key": (
                ":".join(
                    [
                        thread_validation_session_id,
                        "thread",
                        "rendered",
                        str(target_id),
                    ]
                )
                if thread_validation_session_id and target_id
                else None
            ),
            "thread_ack_attempted": thread_ack_observed,
            "thread_ack_request_observed": thread_ack_observed,
            "thread_ack_status": (
                str(thread_ack_events[0].get("status") or "")
                if thread_ack_events
                else None
            ),
            "thread_ack_target": (
                positive_int(thread_ack_events[0].get("target_id"))
                if thread_ack_events
                else None
            ),
            "thread_validation_session_id": thread_validation_session_id,
            "thread_operator_run_id": thread_operator_run_id,
            "feed_only_reason": feed_only_reason,
            "operator_human_confirmed_targets": operator_progress.get(
                "human_confirmed_targets"
            ),
            "operator_missing_targets": operator_progress.get("missing_targets"),
        },
    }


def summarize_surface_coverage(
    summary: dict[str, Any],
    *,
    tenant_key: str | None = None,
) -> tuple[bool, bool]:
    feed = False
    thread = False
    target_tenant_key = str(
        tenant_key or (summary.get("first_promoted_tenant") or {}).get("tenant_key") or ""
    ).strip()
    for row in summary.get("tenant_surface_states") or []:
        if target_tenant_key and str(row.get("tenant_key")) != target_tenant_key:
            continue
        surface = str(row.get("surface") or "")
        completed = bool(row.get("operator_run_surface_completed"))
        human_met = bool(row.get("human_confirmed_required_coverage_met"))
        if surface == "feed" and (completed or human_met):
            feed = True
        if surface == "thread" and (completed or human_met):
            thread = True
    return feed, thread


def extract_backend_evidence(summary: dict[str, Any] | None) -> dict[str, Any]:
    payload = summary or {}
    tenant_payload = payload.get("first_promoted_tenant") or {}
    return {
        "recent_events": payload.get("recent_events") or [],
        "request_traces_recent": payload.get("request_traces_recent") or [],
        "human_ack_recent_events": payload.get("human_ack_recent_events")
        or tenant_payload.get("human_ack_recent_events")
        or [],
        "human_confirmed_targets": payload.get("human_confirmed_targets")
        or tenant_payload.get("human_confirmed_targets")
        or {},
    }


def find_backend_request_traces(
    summary: dict[str, Any] | None,
    trace_id: str | None,
) -> list[dict[str, Any]]:
    resolved_trace_id = str(trace_id or "").strip()
    if not resolved_trace_id:
        return []
    backend_evidence = extract_backend_evidence(summary)
    return [
        item
        for item in backend_evidence.get("request_traces_recent") or []
        if str(item.get("trace_id") or "").strip() == resolved_trace_id
    ]


def extract_app_request_trace_summary(ui_summary: dict[str, Any] | None) -> dict[str, Any]:
    payload = ui_summary or {}
    return {
        "runtime_flag_enabled": payload.get("runtime_flag_enabled"),
        "runtime_flag_raw_value": payload.get("runtime_flag_raw_value"),
        "runtime_flag_source": payload.get("runtime_flag_source"),
        "request_trace_id": payload.get("activity_center_request_trace_id"),
        "request_phase": payload.get("activity_center_request_phase"),
        "request_flag_enabled": payload.get("activity_center_request_flag_enabled"),
        "request_flag_raw_value": payload.get("activity_center_request_flag_raw_value"),
        "request_flag_source": payload.get("activity_center_request_flag_source"),
        "request_route_decision": payload.get("activity_center_request_route_decision"),
        "request_decision_reason": payload.get("activity_center_request_decision_reason"),
        "request_decision_source": payload.get("activity_center_request_decision_source"),
        "request_actual_route": payload.get("activity_center_request_actual_route"),
        "request_attempt_sequence": payload.get("activity_center_request_attempt_sequence"),
        "request_endpoint_path": payload.get("activity_center_request_endpoint_path"),
        "request_status": payload.get("activity_center_request_status"),
        "request_failure_kind": payload.get("activity_center_request_failure_kind"),
        "request_fallback_reason": payload.get("activity_center_request_fallback_reason"),
        "request_backend_request_id": payload.get("activity_center_request_backend_request_id"),
        "request_validation_session": payload.get("activity_center_request_validation_session"),
        "request_operator_run": payload.get("activity_center_request_operator_run"),
    }


def wait_for_backend_evidence(
    opener: urllib.request.OpenerDirector,
    state: ExecutionState,
    *,
    timeout_seconds: int = 18,
    poll_seconds: int = 2,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    deadline = time.time() + max(timeout_seconds, poll_seconds)
    last_summary: dict[str, Any] | None = None
    last_status: dict[str, Any] | None = None

    while time.time() < deadline:
        last_status = admin_json(
            opener,
            "/admin/api/mobile-v2-rollout/operator-run/status",
        )
        last_summary = admin_json(opener, "/admin/api/mobile-v2-rollout/summary")
        feed_covered, thread_covered = summarize_surface_coverage(
            last_summary,
            tenant_key=state.mobile_tenant_key,
        )
        if feed_covered and thread_covered:
            break
        time.sleep(poll_seconds)

    return last_summary, last_status


def finish_operator_run(
    opener: urllib.request.OpenerDirector,
    state: ExecutionState,
    *,
    abort: bool,
) -> dict[str, Any]:
    query = "abort=1" if abort else ""
    payload = admin_json(
        opener,
        "/admin/api/mobile-v2-rollout/operator-run/finish",
        method="POST",
        query=query,
    )
    state.operator_run_finished = True
    return payload


def evaluate_result(state: ExecutionState) -> str:
    if not state.device_id:
        return "blocked_no_device"
    if not state.summary_after:
        return "partial_execution"
    operator_outcome = (
        state.operator_status_after or {}
    ).get("operator_run_outcome") or state.operator_run_outcome
    backend_evidence = extract_backend_evidence(state.summary_after)
    ui_summary = state.ui_marker_summary or {}
    request_trace_id = str(
        ui_summary.get("activity_center_request_trace_id") or ""
    ).strip() or None
    request_phase = str(
        ui_summary.get("activity_center_request_phase") or "not_created"
    ).strip() or "not_created"
    backend_request_traces = find_backend_request_traces(
        state.summary_after,
        request_trace_id,
    )
    backend_request_counted_kinds = {
        str(item.get("counted_kind") or "").strip()
        for item in backend_request_traces
        if str(item.get("counted_kind") or "").strip()
    }
    backend_request_delivery_paths = {
        str(item.get("delivery_path") or "").strip()
        for item in backend_request_traces
        if str(item.get("delivery_path") or "").strip()
    }
    request_flag_enabled = str(
        ui_summary.get("activity_center_request_flag_enabled") or "unknown"
    ).strip()
    runtime_flag_enabled = str(
        ui_summary.get("runtime_flag_enabled") or "unknown"
    ).strip()
    request_route_decision = str(
        ui_summary.get("activity_center_request_route_decision") or "unknown"
    ).strip()
    request_actual_route = str(
        ui_summary.get("activity_center_request_actual_route") or "unknown"
    ).strip()
    activity_center_terminal_state = str(
        ui_summary.get("activity_center_terminal_state") or "unknown"
    )
    expected_history_query = str(state.target_laudo_id) if state.target_laudo_id else ""
    observed_history_query = str(
        ui_summary.get("history_search_query_observed") or ""
    ).strip()
    history_item_target_visible = bool(ui_summary.get("history_item_target_visible"))
    history_results_empty_visible = bool(ui_summary.get("history_results_empty_visible"))
    if (
        state.flow_ran
        and expected_history_query
        and history_results_empty_visible
        and not history_item_target_visible
        and observed_history_query
        and observed_history_query != expected_history_query
    ):
        return "maestro_input_flakiness"
    if (
        state.flow_ran
        and expected_history_query
        and history_results_empty_visible
        and not history_item_target_visible
    ):
        return "history_search_empty_results"
    if ui_summary.get("selection_lost"):
        return "selection_lost_after_update"
    if state.feed_covered and state.thread_covered:
        if operator_outcome == "completed_successfully":
            return "success_human_confirmed"
        return "partial_execution"
    if (
        state.flow_ran
        and state.feed_covered
        and runtime_flag_enabled == "true"
        and (
            state.maestro_activity_center_v2_confirmed
            or ui_summary.get("activity_center_delivery_mode") == "v2"
            or ui_summary.get("activity_center_target_v2")
        )
    ):
        return "request_received_backend_v2"
    if state.flow_ran and state.feed_covered:
        return "feed_only_confirmed"
    if state.flow_ran and state.thread_covered:
        return "thread_only_confirmed"
    if ui_summary.get("activity_center_modal"):
        if request_flag_enabled == "false":
            return "flag_runtime_false"
        if (
            request_flag_enabled == "true"
            and request_route_decision == "legacy"
            and request_actual_route == "legacy"
        ):
            return "flag_runtime_true_but_gate_denied"
        if request_actual_route == "v2":
            if backend_request_traces:
                return "request_received_backend_v2"
            return "v2_route_selected"
        if request_phase == "intent_created":
            return "request_created_not_sent"
        if request_phase in {
            "request_sent",
            "response_received",
            "request_failed",
            "request_cancelled",
        } and request_trace_id and not backend_request_traces:
            return "request_sent_not_received_backend"
        if "legacy" in backend_request_delivery_paths:
            return "request_received_backend_legacy_only"
        if "v2" in backend_request_delivery_paths and (
            "v2_served" not in backend_request_counted_kinds
            or ui_summary.get("activity_center_delivery_mode") == "unknown"
        ):
            return "request_received_backend_v2_but_no_metadata"
        if activity_center_terminal_state == "no_request":
            return "central_no_request_fired"
        if activity_center_terminal_state == "empty":
            return "central_loaded_empty"
        if activity_center_terminal_state == "loaded_legacy":
            return "central_loaded_legacy"
        if activity_center_terminal_state == "loaded_v2":
            return "central_loaded_v2"
        if activity_center_terminal_state == "error":
            return "central_error"
        if (
            state.maestro_activity_center_terminal_confirmed
            or ui_summary.get("activity_center_state") == "loading"
        ):
            return "central_unknown_terminal_state"
    if (
        state.flow_ran
        and operator_outcome == "completed_inconclusive"
        and backend_evidence["human_ack_recent_events"]
    ):
        return "blocked_backend_accounting"
    if state.flow_ran and operator_outcome == "completed_inconclusive":
        return "thread_opened_but_no_human_ack"
    if (
        state.maestro_shell_selection_confirmed
        or ui_summary.get("shell_selection_ready")
        or ui_summary.get("selected_target_id")
        or (
            ui_summary.get("chat_thread_surface_visible")
            and ui_summary.get("target_seed_text_visible")
        )
    ):
        return "selected_laudo_confirmed"
    if state.maestro_target_tap_completed and state.maestro_selection_callback_wait_failed:
        return "target_tapped_but_callback_not_fired"
    if (
        (
            state.maestro_selection_callback_confirmed
            or state.maestro_target_tap_completed
        )
        and (
            ui_summary.get("selection_callback_fired")
            or ui_summary.get("selection_callback_completed")
            or state.maestro_selection_callback_confirmed
            or state.maestro_shell_selection_wait_failed
        )
    ):
        return "callback_fired_but_shell_not_updated"
    if state.flow_ran:
        if state.target_laudo_id and not ui_summary.get("selected_target_id"):
            return "app_opened_but_target_not_reached"
        return "blocked_no_ui_path"
    return "partial_execution"


def build_final_report(state: ExecutionState) -> str:
    before = state.summary_before or {}
    after = state.summary_after or {}
    operator_after = state.operator_status_after or {}
    backend_evidence_after = extract_backend_evidence(after)
    request_trace_id = str(
        (state.ui_marker_summary or {}).get("activity_center_request_trace_id") or ""
    ).strip() or None
    backend_request_traces_after = find_backend_request_traces(after, request_trace_id)
    summary_before_tenant = before.get("first_promoted_tenant") or {}
    summary_after_tenant = after.get("first_promoted_tenant") or {}
    return "\n".join(
        [
            f"timestamp_utc: {now_utc()}",
            f"device_id: {state.device_id}",
            f"tenant: {state.mobile_tenant_key or 'unknown'} - {state.mobile_tenant_label or 'unknown'}",
            f"package_name: {state.package_name}",
            f"main_activity: {state.main_activity}",
            f"native_project_root: {state.native_project_root}",
            f"native_project_root_from_workspace: {state.native_project_root_from_workspace}",
            f"native_build_gradle_path: {state.native_build_gradle_path}",
            f"native_manifest_path: {state.native_manifest_path}",
            f"native_project_present_before_preflight: {state.native_project_present_before_preflight}",
            f"native_project_present_after_preflight: {state.native_project_present_after_preflight}",
            f"native_prebuild_executed: {state.native_prebuild_executed}",
            f"native_prebuild_succeeded: {state.native_prebuild_succeeded}",
            f"native_prebuild_status: {state.native_prebuild_status}",
            f"native_prebuild_detail: {state.native_prebuild_detail}",
            f"native_prebuild_command: {state.native_prebuild_command}",
            f"native_prebuild_next_requirement: {state.native_prebuild_next_requirement}",
            f"native_preflight_state_file: {state.native_preflight_state_file}",
            f"native_preflight_artifact_dir: {state.native_preflight_artifact_dir}",
            f"database_url_redacted: {state.mobile_database_url_redacted}",
            f"sqlite_path: {state.mobile_sqlite_path}",
            f"database_cwd_prepare: {state.mobile_database_cwd_prepare}",
            f"database_cwd_api: {state.mobile_database_cwd_api}",
            f"db_file_exists_before_prepare: {state.mobile_db_file_exists_before_prepare}",
            f"db_file_exists_after_prepare: {state.mobile_db_file_exists_after_prepare}",
            f"usuarios_table_exists_before_prepare: {state.mobile_usuarios_table_exists_before_prepare}",
            f"usuarios_table_exists_after_prepare: {state.mobile_usuarios_table_exists_after_prepare}",
            f"seed_users_present_before_prepare: {state.mobile_seed_users_present_before_prepare}",
            f"seed_users_present: {state.mobile_seed_users_present}",
            f"schema_prepare_executed: {state.mobile_schema_prepare_executed}",
            f"seed_prepare_executed: {state.mobile_seed_prepare_executed}",
            f"pilot_seed_prepare_executed: {state.mobile_pilot_seed_prepare_executed}",
            f"database_prepare_status: {state.mobile_db_prepare_status}",
            f"database_prepare_detail: {state.mobile_db_prepare_detail}",
            f"database_prepare_command: {state.mobile_db_prepare_command}",
            f"mobile_email: {state.mobile_email}",
            f"admin_email: {state.admin_email}",
            f"target_laudo_id: {state.target_laudo_id}",
            f"apk_preview_build_executed: {(state.apk_build_preflight or {}).get('preview_build_executed')}",
            f"apk_preview_build_succeeded: {(state.apk_build_preflight or {}).get('preview_build_succeeded')}",
            f"apk_path: {(state.apk_build_preflight or {}).get('apk_path')}",
            f"apk_sha256: {(state.apk_build_preflight or {}).get('apk_sha256')}",
            f"apk_stale_detected: {(state.apk_build_preflight or {}).get('stale_apk_detected')}",
            f"apk_stale_allowed: {(state.apk_build_preflight or {}).get('stale_apk_allowed')}",
            f"apk_failure_classification: {(state.apk_build_preflight or {}).get('failure_classification')}",
            f"apk_node_version_used_for_preview: {(state.apk_build_preflight or {}).get('node_version_used_for_preview')}",
            f"apk_android_v2_read_contracts_enabled_for_build: {(state.apk_build_preflight or {}).get('android_v2_read_contracts_enabled_for_build')}",
            f"apk_mobile_automation_diagnostics_for_build: {(state.apk_build_preflight or {}).get('mobile_automation_diagnostics_for_build')}",
            f"network_api_base_url_for_build: {(state.mobile_network_preflight or {}).get('api_base_url_for_build')}",
            f"network_auth_web_base_url_for_build: {(state.mobile_network_preflight or {}).get('auth_web_base_url_for_build')}",
            f"network_android_localhost_strategy: {(state.mobile_network_preflight or {}).get('android_localhost_strategy_for_build')}",
            f"network_api_base_url_runtime: {(state.mobile_network_preflight or {}).get('api_base_url_runtime_if_available')}",
            f"network_backend_health_host_ok: {((state.mobile_network_preflight or {}).get('backend_health_host_status') or {}).get('ok')}",
            f"network_adb_reverse_configured: {(state.mobile_network_preflight or {}).get('adb_reverse_configured')}",
            f"network_cleartext_http_allowed: {(state.mobile_network_preflight or {}).get('cleartext_http_allowed')}",
            f"network_failure_classification: {(state.mobile_network_preflight or {}).get('failure_classification')}",
            f"maestro_attempts: {state.maestro_attempts}",
            f"maestro_environment_retry_used: {state.maestro_environment_retry_used}",
            f"environment_failure_signals: {state.environment_failure_signals}",
            f"feed_covered: {state.feed_covered}",
            f"thread_covered: {state.thread_covered}",
            f"operator_run_outcome: {operator_after.get('operator_run_outcome')}",
            f"operator_run_reason: {operator_after.get('operator_run_reason')}",
            f"v2_served_total_after: {(after.get('totals') or {}).get('v2_served')}",
            f"human_ack_recent_events_after: {len(backend_evidence_after.get('human_ack_recent_events') or [])}",
            f"ui_login_stage: {(state.ui_marker_summary or {}).get('login_stage')}",
            f"ui_login_status_api: {(state.ui_marker_summary or {}).get('login_status_api')}",
            f"ui_login_entrando: {(state.ui_marker_summary or {}).get('login_entrando')}",
            f"ui_login_carregando: {(state.ui_marker_summary or {}).get('login_carregando')}",
            f"ui_login_error: {(state.ui_marker_summary or {}).get('login_error')}",
            f"ui_selected_target_id: {(state.ui_marker_summary or {}).get('selected_target_id')}",
            f"ui_history_search_query_expected: {state.target_laudo_id if state.target_laudo_id else None}",
            f"ui_history_search_query_observed: {(state.ui_marker_summary or {}).get('history_search_query_observed')}",
            f"ui_history_results_empty_visible: {(state.ui_marker_summary or {}).get('history_results_empty_visible')}",
            f"ui_history_item_target_visible: {(state.ui_marker_summary or {}).get('history_item_target_visible')}",
            f"maestro_history_item_visible_before_tap: {state.maestro_history_item_visible_before_tap}",
            f"ui_selection_callback_fired: {(state.ui_marker_summary or {}).get('selection_callback_fired')}",
            f"ui_selection_callback_completed: {(state.ui_marker_summary or {}).get('selection_callback_completed')}",
            f"ui_shell_selection_ready: {(state.ui_marker_summary or {}).get('shell_selection_ready')}",
            f"ui_chat_thread_surface_visible: {(state.ui_marker_summary or {}).get('chat_thread_surface_visible')}",
            f"ui_target_seed_text_visible: {(state.ui_marker_summary or {}).get('target_seed_text_visible')}",
            f"ui_mesa_entry_target_visible: {(state.ui_marker_summary or {}).get('mesa_entry_target_visible')}",
            f"ui_mesa_entry_label_visible: {(state.ui_marker_summary or {}).get('mesa_entry_label_visible')}",
            f"ui_thread_surface_visible: {(state.ui_marker_summary or {}).get('thread_surface_visible')}",
            f"ui_thread_loaded_visible: {(state.ui_marker_summary or {}).get('thread_loaded_visible')}",
            f"ui_selection_lost: {(state.ui_marker_summary or {}).get('selection_lost')}",
            f"ui_runtime_flag_enabled: {(state.ui_marker_summary or {}).get('runtime_flag_enabled')}",
            f"ui_runtime_flag_raw_value: {(state.ui_marker_summary or {}).get('runtime_flag_raw_value')}",
            f"ui_runtime_flag_source: {(state.ui_marker_summary or {}).get('runtime_flag_source')}",
            f"maestro_selection_callback_confirmed: {state.maestro_selection_callback_confirmed}",
            f"maestro_shell_selection_confirmed: {state.maestro_shell_selection_confirmed}",
            f"maestro_activity_center_terminal_confirmed: {state.maestro_activity_center_terminal_confirmed}",
            f"maestro_activity_center_v2_confirmed: {state.maestro_activity_center_v2_confirmed}",
            f"maestro_mesa_entry_target_found: {state.maestro_mesa_entry_target_found}",
            f"maestro_mesa_entry_target_tapped: {state.maestro_mesa_entry_target_tapped}",
            f"maestro_thread_surface_confirmed: {state.maestro_thread_surface_confirmed}",
            f"ui_activity_center_state: {(state.ui_marker_summary or {}).get('activity_center_state')}",
            f"ui_activity_center_terminal_state: {(state.ui_marker_summary or {}).get('activity_center_terminal_state')}",
            f"ui_activity_center_delivery_mode: {(state.ui_marker_summary or {}).get('activity_center_delivery_mode')}",
            f"ui_activity_center_request_dispatched: {(state.ui_marker_summary or {}).get('activity_center_request_dispatched')}",
            f"ui_activity_center_requested_targets: {(state.ui_marker_summary or {}).get('activity_center_requested_targets')}",
            f"ui_activity_center_skip_reason: {(state.ui_marker_summary or {}).get('activity_center_skip_reason')}",
            f"ui_activity_center_request_phase: {(state.ui_marker_summary or {}).get('activity_center_request_phase')}",
            f"ui_activity_center_request_trace_id: {request_trace_id}",
            f"ui_activity_center_request_flag_enabled: {(state.ui_marker_summary or {}).get('activity_center_request_flag_enabled')}",
            f"ui_activity_center_request_flag_raw_value: {(state.ui_marker_summary or {}).get('activity_center_request_flag_raw_value')}",
            f"ui_activity_center_request_flag_source: {(state.ui_marker_summary or {}).get('activity_center_request_flag_source')}",
            f"ui_activity_center_request_route_decision: {(state.ui_marker_summary or {}).get('activity_center_request_route_decision')}",
            f"ui_activity_center_request_decision_reason: {(state.ui_marker_summary or {}).get('activity_center_request_decision_reason')}",
            f"ui_activity_center_request_decision_source: {(state.ui_marker_summary or {}).get('activity_center_request_decision_source')}",
            f"ui_activity_center_request_actual_route: {(state.ui_marker_summary or {}).get('activity_center_request_actual_route')}",
            f"ui_activity_center_request_attempt_sequence: {(state.ui_marker_summary or {}).get('activity_center_request_attempt_sequence')}",
            f"ui_activity_center_request_endpoint_path: {(state.ui_marker_summary or {}).get('activity_center_request_endpoint_path')}",
            f"ui_activity_center_request_status: {(state.ui_marker_summary or {}).get('activity_center_request_status')}",
            f"ui_activity_center_request_failure_kind: {(state.ui_marker_summary or {}).get('activity_center_request_failure_kind')}",
            f"ui_activity_center_request_fallback_reason: {(state.ui_marker_summary or {}).get('activity_center_request_fallback_reason')}",
            f"ui_activity_center_request_backend_request_id: {(state.ui_marker_summary or {}).get('activity_center_request_backend_request_id')}",
            f"backend_request_trace_matches_after: {len(backend_request_traces_after)}",
            f"backend_request_trace_counted_kinds_after: {[item.get('counted_kind') for item in backend_request_traces_after]}",
            f"rollout_enabled: {state.backend_env_flags_applied.get('TARIEL_V2_ANDROID_ROLLOUT') == '1'}",
            f"rollout_observability_enabled: {state.backend_env_flags_applied.get('TARIEL_V2_ANDROID_ROLLOUT_OBSERVABILITY') == '1'}",
            f"rollout_state_overrides: {state.backend_env_flags_applied.get('TARIEL_V2_ANDROID_ROLLOUT_STATE_OVERRIDES')}",
            f"rollout_surface_state_overrides: {state.backend_env_flags_applied.get('TARIEL_V2_ANDROID_ROLLOUT_SURFACE_STATE_OVERRIDES')}",
            f"backend_env_flags_applied: {json.dumps(state.backend_env_flags_applied, ensure_ascii=False, sort_keys=True)}",
            f"operator_route_preflight_status: {state.operator_route_preflight_status}",
            f"pilot_outcome_before: {summary_before_tenant.get('pilot_outcome')}",
            f"pilot_outcome_after: {summary_after_tenant.get('pilot_outcome')}",
            f"organic_validation_outcome_after: {summary_after_tenant.get('organic_validation_outcome')}",
            f"candidate_ready_for_real_tenant_after: {summary_after_tenant.get('candidate_ready_for_real_tenant')}",
            f"result: {state.outcome_label}",
            "",
            "notes:",
            *(f"- {note}" for note in state.notes),
            "",
            "commands:",
            *(f"- {item}" for item in state.commands_used),
        ]
    ).strip() + "\n"


def initialize_runner_artifacts_and_environment(
    state: ExecutionState,
) -> tuple[dict[str, Any], dict[str, str]]:
    ensure_native_android_project_ready(state)
    package_info = load_android_package_info()
    state.package_name = str(package_info["package_name"])
    state.main_activity = str(package_info["main_activity"])
    write_text(state.artifacts_dir / "environment.txt", build_environment_report(package_info))
    log_step("Iniciando runner operacional do smoke mobile.")
    record_phase_event(
        state,
        phase="host_preflight",
        status="running",
        detail="runner_started",
        extra={
            "visual_mode": state.visual_mode,
            "fresh_emulator_boot": should_force_fresh_emulator_boot(),
        },
    )

    web_env = load_env_file(WEB_ROOT / ".env")
    android_env = load_env_file(ANDROID_ROOT / ".env")
    write_json(
        state.artifacts_dir / "flags_snapshot.json",
        {
            "web_env": web_env,
            "android_env": android_env,
        },
    )
    return package_info, web_env


def prepare_local_backend_stack(state: ExecutionState) -> None:
    prepare_mobile_local_database(state)
    configure_mobile_backend_flags(state)
    ensure_local_emulator(state)

    log_step("Resolvendo device Android disponível.")
    state.device_id = resolve_device(state)
    log_step(f"Device selecionado: {state.device_id}")
    record_phase_event(
        state,
        phase="host_preflight",
        status="ok",
        detail="device_resolved",
        extra=probe_device_health_by_serial(state.device_id),
    )
    ensure_adb_reverse(state, DEFAULT_PORTS)
    if state.visual_mode:
        keep_device_visible(state)
    log_step("Garantindo backend local do mobile.")
    start_backend(state)


def start_operator_run_session(
    state: ExecutionState,
    *,
    web_env: dict[str, str],
) -> tuple[Any, str]:
    mobile_email, mobile_password, admin_email = resolve_credentials(web_env, state)
    state.mobile_email = mobile_email
    state.admin_email = admin_email
    append_note(state, f"Credencial mobile usada: {mobile_email}")
    append_note(state, f"Credencial admin usada: {admin_email}")
    ensure_mobile_pilot_seed_data(state, inspector_email=mobile_email)

    opener = build_admin_opener()
    admin_login(
        opener,
        admin_email,
        web_env.get("SEED_ADMIN_SENHA")
        or web_env.get("SEED_DEV_SENHA_PADRAO")
        or DEFAULT_MOBILE_PASSWORD,
        state=state,
    )
    preflight_payload = ensure_admin_operator_routes_preflight(opener, state)
    preflight_status = (
        preflight_payload.get("operator_status_route", {}).get("json") or {}
    )
    mobile_login_payload = login_mobile(mobile_email, mobile_password)
    state.mobile_token = str(mobile_login_payload.get("access_token") or "")
    if not state.mobile_token:
        raise RunnerError("Login mobile não retornou access_token.")
    write_json(state.artifacts_dir / "mobile_login.json", mobile_login_payload)
    force_stop_app(state, label="pre_operator_run")

    if preflight_status.get("operator_run_active"):
        append_note(state, "Operator run anterior estava ativo; o runner abortou o estado anterior antes da nova rodada.")
        save_http_json(
            state.artifacts_dir / "operator_run_abort_previous.json",
            finish_operator_run(opener, state, abort=True),
        )
        state.operator_run_started = False
        state.operator_run_finished = False

    start_response = admin_json(
        opener,
        "/admin/api/mobile-v2-rollout/operator-run/start",
        method="POST",
    )
    state.operator_run_started = True
    save_http_json(state.artifacts_dir / "operator_run_start.json", start_response)

    state.operator_status_before = admin_json(
        opener,
        "/admin/api/mobile-v2-rollout/operator-run/status",
    )
    save_http_json(
        state.artifacts_dir / "operator_run_status_before.json",
        state.operator_status_before,
    )
    state.target_laudo_id = resolve_operator_thread_target_id(
        state.operator_status_before
    )
    if state.target_laudo_id:
        append_note(
            state,
            f"Target de thread resolvido para automação Maestro: laudo {state.target_laudo_id}.",
        )
    state.summary_before = admin_json(opener, "/admin/api/mobile-v2-rollout/summary")
    save_http_json(state.artifacts_dir / "backend_summary_before.json", state.summary_before)
    state.capabilities_before = read_json_response(
        build_mobile_request("/app/api/mobile/v2/capabilities", token=state.mobile_token)
    )
    save_http_json(state.artifacts_dir / "capabilities_before.json", state.capabilities_before)
    return opener, mobile_password


def prepare_preview_app_for_maestro(
    state: ExecutionState,
    package_info: dict[str, Any],
) -> None:
    capture_screenshot(state, "device_before_install")
    capture_ui_dump(state, "ui_before_install")

    log_step("Iniciando captura do logcat e preparando o app.")
    start_logcat_capture(state)
    ensure_device_package_service_ready(state)
    install_or_reuse_app(state, package_info)
    ensure_mobile_network_preflight(state)
    if state.visual_mode:
        keep_device_visible(state)
    ensure_device_package_service_ready(state)
    force_stop_app(state, label="post_install")
    stabilize_device_for_maestro(state, label="pre_maestro")
    append_note(
        state,
        "Launch manual do app foi pulado; o flow do Maestro faz launchApp e virou a fonte canonica da abertura.",
    )


def run_maestro_flow_with_environment_recovery(
    state: ExecutionState,
    *,
    mobile_password: str,
) -> tuple[CommandResult, pathlib.Path]:
    maestro_result = run_maestro_flow(state, mobile_password)
    screenshot_path: pathlib.Path
    if maestro_result.returncode != 0:
        append_note(state, "O flow do Maestro falhou; o runner coletou screenshot/UI dump e prosseguiu para fechamento conservador.")
        screenshot_path = capture_screenshot(state, "device_after_maestro_failure")
        ui_dump_path = capture_ui_dump(state, "ui_after_maestro_failure")
        environment_failure_signals = detect_environment_failure_signals(
            ui_dump_path,
            screenshot_path=screenshot_path,
            maestro_output=(maestro_result.stdout or "") + "\n" + (maestro_result.stderr or ""),
        )
        state.environment_failure_signals = environment_failure_signals
        write_json(
            state.artifacts_dir / "environment_failure_signals.json",
            {
                "signals": environment_failure_signals,
                "ui_dump_path": str(ui_dump_path),
                "screenshot_path": str(screenshot_path),
            },
        )
        should_retry_for_environment = bool(
            environment_failure_signals
            and state.maestro_attempts <= MAESTRO_ENVIRONMENT_RETRY_LIMIT
            and (
                "system_ui_not_responding" in environment_failure_signals
                or "app_not_responding_dialog" in environment_failure_signals
                or "ui_dump_unavailable" in environment_failure_signals
                or "screenshot_unavailable" in environment_failure_signals
                or "failed_before_login_without_ui_dump" in environment_failure_signals
            )
        )
        if should_retry_for_environment:
            state.maestro_environment_retry_used = True
            recover_emulator_from_environment_failure(
                state,
                reason=",".join(environment_failure_signals),
            )
            maestro_result = run_maestro_flow(state, mobile_password)
            if maestro_result.returncode != 0:
                append_note(
                    state,
                    "A repeticao unica do Maestro apos recovery ambiental tambem falhou; a lane permaneceu inconclusiva.",
                )
                screenshot_path = capture_screenshot(
                    state,
                    "device_after_maestro_failure_retry",
                )
                ui_dump_path = capture_ui_dump(
                    state,
                    "ui_after_maestro_failure_retry",
                )
                state.environment_failure_signals = detect_environment_failure_signals(
                    ui_dump_path,
                    screenshot_path=screenshot_path,
                    maestro_output=(maestro_result.stdout or "")
                    + "\n"
                    + (maestro_result.stderr or ""),
                )
                write_json(
                    state.artifacts_dir / "environment_failure_signals_retry.json",
                    {
                        "signals": state.environment_failure_signals,
                        "ui_dump_path": str(ui_dump_path),
                        "screenshot_path": str(screenshot_path),
                    },
                )
            else:
                append_note(
                    state,
                    "A repeticao unica do Maestro apos recovery ambiental fechou verde.",
                )
                screenshot_path = capture_screenshot(
                    state,
                    "device_after_maestro_retry",
                )
                ui_dump_path = capture_ui_dump(state, "ui_after_maestro_retry")
    else:
        screenshot_path = capture_screenshot(state, "device_after_maestro")
        ui_dump_path = capture_ui_dump(state, "ui_after_maestro")
    return maestro_result, ui_dump_path


def collect_ui_diagnostics_after_maestro(
    state: ExecutionState,
    *,
    maestro_result: CommandResult,
    ui_dump_path: pathlib.Path,
) -> None:
    state.ui_marker_summary = summarize_ui_markers(ui_dump_path, state.target_laudo_id)
    expected_history_query = str(state.target_laudo_id) if state.target_laudo_id else None
    observed_history_query = str(
        (state.ui_marker_summary or {}).get("history_search_query_observed") or ""
    ).strip() or None
    if (
        expected_history_query
        and observed_history_query
        and observed_history_query != expected_history_query
    ):
        append_note(
            state,
            f"Busca do historico divergiu no device: esperado={expected_history_query} observado={observed_history_query}.",
        )
    save_http_json(
        state.artifacts_dir / "ui_marker_summary.json",
        state.ui_marker_summary,
    )
    save_http_json(
        state.artifacts_dir / "app_request_trace_summary.json",
        extract_app_request_trace_summary(state.ui_marker_summary),
    )
    if maestro_result.returncode == 0:
        append_note(
            state,
            "Runner nao registrou human_ack sintetico; a cobertura humana deve vir do app Android real.",
        )


def collect_backend_evidence_after_ui_wait(
    state: ExecutionState,
    *,
    opener: Any,
) -> None:
    summary_post_ui_wait, operator_status_post_ui_wait = wait_for_backend_evidence(
        opener,
        state,
    )
    if summary_post_ui_wait is not None:
        save_http_json(
            state.artifacts_dir / "backend_summary_post_ui_wait.json",
            summary_post_ui_wait,
        )
        save_http_json(
            state.artifacts_dir / "backend_evidence_post_ui_wait.json",
            extract_backend_evidence(summary_post_ui_wait),
        )
        save_http_json(
            state.artifacts_dir / "backend_request_trace_summary_post_ui_wait.json",
            {
                "trace_id": (state.ui_marker_summary or {}).get(
                    "activity_center_request_trace_id"
                ),
                "matches": find_backend_request_traces(
                    summary_post_ui_wait,
                    (state.ui_marker_summary or {}).get(
                        "activity_center_request_trace_id"
                    ),
                ),
            },
        )
    if operator_status_post_ui_wait is not None:
        save_http_json(
            state.artifacts_dir / "operator_run_status_post_ui_wait.json",
            operator_status_post_ui_wait,
        )


def finish_operator_run_and_collect_after(
    state: ExecutionState,
    *,
    opener: Any,
    maestro_result: CommandResult,
) -> None:
    if state.operator_run_started and not state.operator_run_finished:
        finish_payload = finish_operator_run(
            opener,
            state,
            abort=maestro_result.returncode != 0,
        )
        save_http_json(state.artifacts_dir / "operator_run_finish.json", finish_payload)

    state.operator_status_after = admin_json(
        opener,
        "/admin/api/mobile-v2-rollout/operator-run/status",
    )
    save_http_json(
        state.artifacts_dir / "operator_run_status_after.json",
        state.operator_status_after,
    )
    state.summary_after = admin_json(opener, "/admin/api/mobile-v2-rollout/summary")
    save_http_json(state.artifacts_dir / "backend_summary_after.json", state.summary_after)
    save_http_json(
        state.artifacts_dir / "backend_request_trace_summary_after.json",
        {
            "trace_id": (state.ui_marker_summary or {}).get(
                "activity_center_request_trace_id"
            ),
            "matches": find_backend_request_traces(
                state.summary_after,
                (state.ui_marker_summary or {}).get(
                    "activity_center_request_trace_id"
                ),
            ),
        },
    )
    state.capabilities_after = read_json_response(
        build_mobile_request("/app/api/mobile/v2/capabilities", token=state.mobile_token)
    )
    save_http_json(state.artifacts_dir / "capabilities_after.json", state.capabilities_after)


def write_final_operator_diagnostics(
    state: ExecutionState,
    *,
    maestro_result: CommandResult,
) -> None:
    state.feed_covered, state.thread_covered = summarize_surface_coverage(
        state.summary_after,
        tenant_key=state.mobile_tenant_key,
    )
    state.operator_run_outcome = str(
        (state.operator_status_after or {}).get("operator_run_outcome") or ""
    )
    state.operator_run_reason = str(
        (state.operator_status_after or {}).get("operator_run_reason") or ""
    )

    state.outcome_label = evaluate_result(state)
    save_http_json(
        state.artifacts_dir / "operator_run_action_diagnostics.json",
        build_operator_action_diagnostics(state, maestro_result),
    )
    save_http_json(
        state.artifacts_dir / "request_trace_gap_summary.json",
        {
            "result": state.outcome_label,
            "app_request_trace": extract_app_request_trace_summary(
                state.ui_marker_summary
            ),
            "backend_request_traces": find_backend_request_traces(
                state.summary_after,
                (state.ui_marker_summary or {}).get(
                    "activity_center_request_trace_id"
                ),
            ),
        },
    )
    write_text(state.artifacts_dir / "final_report.md", build_final_report(state))


def execute(state: ExecutionState) -> ExecutionState:
    package_info, web_env = initialize_runner_artifacts_and_environment(state)
    prepare_local_backend_stack(state)
    opener, mobile_password = start_operator_run_session(state, web_env=web_env)
    prepare_preview_app_for_maestro(state, package_info)
    maestro_result, ui_dump_path = run_maestro_flow_with_environment_recovery(
        state,
        mobile_password=mobile_password,
    )
    collect_ui_diagnostics_after_maestro(
        state,
        maestro_result=maestro_result,
        ui_dump_path=ui_dump_path,
    )
    collect_backend_evidence_after_ui_wait(state, opener=opener)
    finish_operator_run_and_collect_after(
        state,
        opener=opener,
        maestro_result=maestro_result,
    )
    write_final_operator_diagnostics(state, maestro_result=maestro_result)
    return state


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Executa o runner operacional do piloto Android V2 no tenant demo."
    )
    parser.add_argument(
        "--visual",
        action="store_true",
        help="Liga o modo visual local de forma explícita (emulador com janela + logs espelhados).",
    )
    parser.add_argument(
        "--no-visual",
        action="store_true",
        help="Força o modo headless do mobile mesmo fora da CI.",
    )
    args = parser.parse_args()

    visual_mode = resolve_visual_mode(
        True if args.visual else False if args.no_visual else None
    )

    artifacts_dir = ensure_dir(ARTIFACTS_ROOT / now_local_slug())
    state = ExecutionState(
        artifacts_dir=artifacts_dir,
        screenshots_dir=ensure_dir(artifacts_dir / "screenshots"),
        ui_dumps_dir=ensure_dir(artifacts_dir / "ui_dumps"),
        maestro_debug_dir=ensure_dir(artifacts_dir / "maestro_debug"),
        visual_mode=visual_mode,
    )
    try:
        state = execute(state)
        if state.outcome_label == "success_human_confirmed":
            write_mobile_pilot_lane_state(
                state,
                status="ok",
                detail="lane oficial concluida com sucesso_human_confirmed",
            )
            return 0
        write_mobile_pilot_lane_state(
            state,
            status="fail",
            detail=f"lane oficial inconclusiva: {state.outcome_label}",
        )
        print(
            f"Smoke mobile inconclusivo: {state.outcome_label}",
            file=sys.stderr,
        )
        return 1
    except Exception as exc:
        append_note(state, f"Falha operacional: {exc}")
        write_mobile_pilot_lane_state(
            state,
            status="fail",
            detail=f"falha_operacional: {exc}",
        )
        print(str(exc), file=sys.stderr)
        return 1
    finally:
        stop_logcat_capture(state)
        write_logcat_excerpt(state)
        if not (state.artifacts_dir / "final_report.md").exists():
            write_text(state.artifacts_dir / "final_report.md", build_final_report(state))
        stop_backend_if_needed(state)


if __name__ == "__main__":
    raise SystemExit(main())
