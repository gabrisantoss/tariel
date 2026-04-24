#!/usr/bin/env python3
"""Execute a local backup/restore drill for the uploads persistent volume."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import tarfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DRILL_ROOT = REPO_ROOT / ".test-artifacts" / "restore_drill"
UPLOAD_CATEGORIES = (
    ("perfis", "profile-photo.webp", b"tariel-profile-upload-drill\n"),
    ("mesa_anexos", "mesa-evidence.txt", b"tariel-mesa-attachment-drill\n"),
    ("aprendizados_ia", "visual-learning.json", b'{"drill":"visual-learning"}\n'),
)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_obj:
        for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _build_source_tree(source_root: Path) -> dict[str, dict[str, Any]]:
    checksums: dict[str, dict[str, Any]] = {}
    for category, filename, content in UPLOAD_CATEGORIES:
        path = source_root / category / "tenant-1" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        relative_path = path.relative_to(source_root).as_posix()
        checksums[relative_path] = {
            "size_bytes": path.stat().st_size,
            "sha256": _sha256(path),
        }
    return checksums


def _create_backup(source_root: Path, backup_path: Path) -> None:
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(backup_path, "w:gz") as tar:
        tar.add(source_root, arcname="uploads")


def _safe_extract(backup_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    destination_root = destination.resolve()
    with tarfile.open(backup_path, "r:gz") as tar:
        for member in tar.getmembers():
            target = (destination / member.name).resolve()
            if not str(target).startswith(str(destination_root)):
                raise RuntimeError(f"unsafe tar member: {member.name}")
        tar.extractall(destination, filter="data")


def _verify_restored_tree(restored_uploads_root: Path, expected: dict[str, dict[str, Any]]) -> list[str]:
    failures: list[str] = []
    for relative_path, metadata in expected.items():
        path = restored_uploads_root / relative_path
        if not path.exists():
            failures.append(f"missing:{relative_path}")
            continue
        if path.stat().st_size != metadata["size_bytes"]:
            failures.append(f"size_mismatch:{relative_path}")
            continue
        if _sha256(path) != metadata["sha256"]:
            failures.append(f"sha256_mismatch:{relative_path}")
    return failures


def run_restore_drill() -> dict[str, Any]:
    if DRILL_ROOT.exists():
        shutil.rmtree(DRILL_ROOT)

    source_root = DRILL_ROOT / "source" / "uploads"
    restore_root = DRILL_ROOT / "restore"
    backup_path = DRILL_ROOT / "backups" / "uploads_restore_drill.tar.gz"

    expected = _build_source_tree(source_root)
    _create_backup(source_root, backup_path)
    _safe_extract(backup_path, restore_root)
    failures = _verify_restored_tree(restore_root / "uploads", expected)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "passed" if not failures else "failed",
        "backup_path": str(backup_path.relative_to(REPO_ROOT)),
        "source_root": str(source_root.relative_to(REPO_ROOT)),
        "restore_root": str((restore_root / "uploads").relative_to(REPO_ROOT)),
        "files_checked": len(expected),
        "failures": failures,
        "expected_checksums": expected,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print the full drill payload as JSON.")
    args = parser.parse_args()

    payload = run_restore_drill()
    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(f"status={payload['status']}")
        print(f"backup_path={payload['backup_path']}")
        print(f"files_checked={payload['files_checked']}")
        for failure in payload["failures"]:
            print(f"failure={failure}")

    return 0 if payload["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
