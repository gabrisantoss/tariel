from __future__ import annotations

from pathlib import Path
from typing import Any


def build_material_real_workspace_summary(family_key: str, *, dependencies: dict[str, Any]) -> dict[str, Any] | None:
    workspace = dependencies["find_material_real_workspace"](family_key)
    if workspace is None:
        return None
    status_path = (workspace / "status_refino.json").resolve()
    briefing_path = (workspace / "briefing_real.md").resolve()
    coleta_dir = (workspace / "coleta_entrada").resolve()
    pacote_dir = (workspace / "pacote_referencia").resolve()
    manifest_path = (workspace / "manifesto_coleta.json").resolve()
    pacote_manifest = (pacote_dir / "manifest.json").resolve()
    pacote_bundle = (pacote_dir / "tariel_filled_reference_bundle.json").resolve()
    status_payload = dependencies["read_json_if_exists"](status_path) or {}
    manifest_payload = dependencies["read_json_if_exists"](manifest_path) or {}
    status_key = str(status_payload.get("status_refino") or "").strip().lower() or "workspace_bootstrapped"
    status_meta = dependencies["label_catalogo"](
        dependencies["material_workspace_status_labels"],
        status_key,
        dependencies["humanizar_slug"](status_key) or "Workspace",
    )
    material_recebido = [
        str(item).strip()
        for item in list(status_payload.get("material_recebido") or [])
        if str(item).strip()
    ]
    lacunas = [
        str(item).strip()
        for item in list(status_payload.get("lacunas_abertas") or [])
        if str(item).strip()
    ]
    validacoes = [
        item
        for item in list(status_payload.get("artefatos_externos_validados") or [])
        if isinstance(item, dict)
    ]
    has_reference_pack = pacote_manifest.exists() and pacote_bundle.exists()
    execution_track = dependencies["build_material_real_execution_track"](
        family_key=family_key,
        display_name=str(manifest_payload.get("nome_exibicao") or family_key),
        status_key=status_key,
        manifest_payload=manifest_payload,
        material_recebido=material_recebido,
        has_reference_pack=has_reference_pack,
        validations_count=len(validacoes),
        material_real_workspace={"status": status_meta},
    )
    worklist = dependencies["build_material_real_worklist"](
        family_key=family_key,
        manifest_payload=manifest_payload,
        material_recebido=material_recebido,
        has_reference_pack=has_reference_pack,
        validations_count=len(validacoes),
        status_key=status_key,
    )
    return {
        "workspace_path": dependencies["repo_relative_path_label"](workspace),
        "source_root": dependencies["repo_relative_path_label"](workspace.parent),
        "status": status_meta,
        "status_key": status_key,
        "has_briefing": briefing_path.exists(),
        "has_status_refino": status_path.exists(),
        "has_manifesto_coleta": manifest_path.exists(),
        "has_coleta_entrada": coleta_dir.exists(),
        "has_pacote_referencia": pacote_dir.exists(),
        "has_reference_manifest": pacote_manifest.exists(),
        "has_reference_bundle": pacote_bundle.exists(),
        "material_recebido_count": len(material_recebido),
        "lacunas_count": len(lacunas),
        "validations_count": len(validacoes),
        "material_recebido": material_recebido[:6],
        "lacunas_abertas": lacunas[:4],
        "proximo_passo": str(status_payload.get("proximo_passo") or "").strip() or None,
        "artefatos_externos_validados": validacoes[:3],
        "execution_track": execution_track,
        "worklist": worklist,
    }


def build_material_real_priority_summary(
    row: dict[str, Any],
    material_real_workspace: dict[str, Any] | None,
    *,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    calibration_key = str((row.get("calibration_status") or {}).get("key") or "")
    commercial_key = str((row.get("commercial_status") or {}).get("key") or "")
    active_release_count = int(row.get("active_release_count") or 0)
    workspace_status_key = str((material_real_workspace or {}).get("status_key") or "")
    has_reference_pack = bool(
        (material_real_workspace or {}).get("has_reference_manifest")
        and (material_real_workspace or {}).get("has_reference_bundle")
    )
    lacunas_count = int((material_real_workspace or {}).get("lacunas_count") or 0)

    if calibration_key == "real_calibrated":
        status_key = "resolved"
    elif has_reference_pack and commercial_key == "active":
        status_key = "immediate"
    elif material_real_workspace is not None and workspace_status_key == "aguardando_material_real":
        status_key = "waiting_material"
    elif material_real_workspace is not None:
        status_key = "active_queue"
    else:
        status_key = "bootstrap"

    actions: list[str] = []
    signals: list[str] = []
    if status_key == "resolved":
        actions.extend([
            "Manter linguagem e PDF sob monitoramento de emissão.",
            "Usar a família como baseline para próximas variantes comerciais.",
        ])
    elif status_key == "immediate":
        actions.extend([
            "Calibrar o modelo oficial com o pacote validado.",
            "Homologar PDF final, anexo pack e narrativa técnica.",
            "Promover a família para operação vendável mais forte.",
        ])
    elif status_key == "active_queue":
        actions.extend([
            "Consolidar briefing, coleta e referência antes da homologação final.",
            "Fechar lacunas abertas de evidência e documentação.",
        ])
    elif status_key == "waiting_material":
        actions.extend([
            "Receber acervo real do cliente para substituir a baseline sintética.",
            "Validar ZIP, PDF e bundle antes de promover o pacote de referência.",
        ])
    else:
        actions.extend([
            "Abrir a trilha de material real para a família.",
            "Criar briefing, coleta de entrada e pacote de referência inicial.",
        ])

    if active_release_count > 0:
        signals.append(f"{active_release_count} empresa(s) já dependem desta família.")
    if lacunas_count > 0:
        signals.append(f"{lacunas_count} lacuna(s) aberta(s) na trilha de material real.")
    if material_real_workspace and material_real_workspace.get("validations_count"):
        signals.append(
            f"{int(material_real_workspace.get('validations_count') or 0)} artefato(s) externo(s) já validados."
        )
    if not signals and material_real_workspace is None:
        signals.append("A família ainda não abriu uma trilha de material real no repositório.")

    priority_rank = {
        "immediate": 4,
        "active_queue": 3,
        "waiting_material": 2,
        "bootstrap": 1,
        "resolved": 0,
    }.get(status_key, 0)
    return {
        "status": dependencies["label_catalogo"](
            dependencies["material_priority_labels"],
            status_key,
            dependencies["humanizar_slug"](status_key) or "Prioridade",
        ),
        "priority_rank": priority_rank,
        "signals": signals[:3],
        "recommended_actions": actions[:3],
        "workspace_status": (
            (material_real_workspace or {}).get("status")
            or dependencies["label_catalogo"](
                dependencies["material_workspace_status_labels"],
                "workspace_bootstrapped",
                "Workspace bootstrap",
            )
        ),
    }


def material_real_has_received_item(
    material_recebido: list[str],
    *,
    item_id: str,
    drop_folder: str | None = None,
) -> bool:
    values = [str(item).strip().lower() for item in material_recebido if str(item).strip()]
    folder_name = Path(str(drop_folder)).name.strip().lower() if drop_folder else ""
    probes = {
        str(item_id or "").strip().lower(),
        str(drop_folder or "").strip().lower(),
        folder_name,
    }
    alias_map = {
        "modelo_atual_vazio": {"modelo atual", "modelo_atual_vazio"},
        "documentos_finais_reais": {"documentos_finais_reais", "documentos finais", "pdf"},
        "padrao_linguagem_tecnica": {"padrao_linguagem_tecnica", "linguagem tecnica"},
        "regras_comerciais_e_operacionais": {"regras_comerciais_e_operacionais", "regras comerciais"},
        "evidencias_reais_associadas": {"evidencias_reais_associadas", "evidencias reais", "foto", "zip"},
        "documentos_base_e_memoria": {"documentos_base_e_memoria", "memoria", "planilha"},
        "programa_e_certificacao": {"programa_e_certificacao", "certificacao", "certificado"},
    }
    probes.update(alias_map.get(str(item_id or "").strip().lower(), set()))
    probes = {probe for probe in probes if probe}
    return any(probe in value for value in values for probe in probes)


def build_material_real_worklist_item(
    *,
    task_id: str,
    title: str,
    done: bool,
    blocking: bool,
    deliverable: str,
    owner: str,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    status_key = "done" if done else "blocking" if blocking else "pending"
    return {
        "task_id": task_id,
        "title": title,
        "status": dependencies["label_catalogo"](
            dependencies["material_worklist_status_labels"],
            status_key,
            dependencies["humanizar_slug"](status_key) or "Tarefa",
        ),
        "blocking": bool(blocking),
        "deliverable": deliverable,
        "owner": owner,
    }


def build_material_real_execution_track(
    *,
    family_key: str,
    display_name: str,
    status_key: str,
    manifest_payload: dict[str, Any],
    material_recebido: list[str],
    has_reference_pack: bool,
    validations_count: int,
    material_real_workspace: dict[str, Any],
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    preset = dict(dependencies["material_execution_track_presets"].get(family_key) or {})
    kind = str(manifest_payload.get("kind") or "").strip() or "inspection"
    material_count = len(material_recebido)
    if status_key == "material_real_calibrado":
        phase_key = "continuous"
    elif has_reference_pack or validations_count > 0:
        phase_key = "template_refinement"
    elif material_count > 0:
        phase_key = "packaging_reference"
    else:
        phase_key = "intake_pending"
    default_owner = {
        "inspection": "Curadoria Tariel + operação do cliente",
        "test": "Curadoria Tariel + operação do cliente",
        "ndt": "Curadoria Tariel + END do cliente",
        "documentation": "Curadoria Tariel + documentação técnica do cliente",
        "engineering": "Curadoria Tariel + engenharia do cliente",
        "calculation": "Curadoria Tariel + engenharia do cliente",
        "training": "Curadoria Tariel + coordenação de treinamento do cliente",
    }.get(kind, "Curadoria Tariel + operação do cliente")
    return {
        "track_id": str(preset.get("track_id") or "material_real_growth"),
        "track_label": str(preset.get("track_label") or "Fila de material real"),
        "focus_label": str(
            preset.get("focus_label")
            or f"Elevar {display_name} de base canônica para baseline premium com material real."
        ),
        "lane": str(preset.get("lane") or "portfolio_growth"),
        "recommended_owner": str(preset.get("recommended_owner") or default_owner),
        "next_checkpoint": str(preset.get("next_checkpoint") or "Sem checkpoint sugerido"),
        "sort_order": int(preset.get("sort_order") or 999),
        "phase": dependencies["label_catalogo"](
            dependencies["material_worklist_phase_labels"],
            phase_key,
            dependencies["humanizar_slug"](phase_key) or "Fase",
        ),
        "template_pressure": dependencies["catalogo_modelo_label"](
            dependencies["resolve_master_template_id_for_family"](family_key),
            fallback="Modelo oficial da família",
        ),
        "workspace_status": (
            material_real_workspace.get("status")
            or dependencies["label_catalogo"](
                dependencies["material_workspace_status_labels"],
                "workspace_bootstrapped",
                "Workspace bootstrap",
            )
        ),
    }


def build_material_real_worklist(
    *,
    family_key: str,
    manifest_payload: dict[str, Any],
    material_recebido: list[str],
    has_reference_pack: bool,
    validations_count: int,
    status_key: str,
    dependencies: dict[str, Any],
) -> dict[str, Any]:
    tasks: list[dict[str, Any]] = []
    checklist = [
        item
        for item in list(manifest_payload.get("material_real_checklist") or [])
        if isinstance(item, dict)
    ]
    required_slots = [
        item
        for item in list(manifest_payload.get("required_slots_snapshot") or [])
        if isinstance(item, dict)
    ]

    for item in checklist[:5]:
        item_id = str(item.get("item_id") or "").strip() or "material"
        drop_folder = str(item.get("drop_folder") or "").strip() or None
        min_items = max(1, int(item.get("min_items") or 1))
        done = dependencies["material_real_has_received_item"](
            material_recebido,
            item_id=item_id,
            drop_folder=drop_folder,
        )
        tasks.append(
            dependencies["build_material_real_worklist_item"](
                task_id=item_id,
                title=f"Receber {str(item.get('label') or item_id).strip().lower()}",
                done=done,
                blocking=bool(item.get("required", True)) and not done,
                deliverable=f"{min_items} item(ns) em {drop_folder or 'coleta_entrada/'}",
                owner="Operação do cliente",
            )
        )

    slots_done = any("slots_reais" in str(item).strip().lower() for item in material_recebido)
    if required_slots:
        tasks.append(
            dependencies["build_material_real_worklist_item"](
                task_id="map_slots_criticos",
                title="Mapear slots críticos com exemplos reais",
                done=slots_done,
                blocking=not slots_done,
                deliverable=f"{len(required_slots)} slot(s) obrigatórios confrontados com exemplos reais",
                owner="Curadoria Tariel",
            )
        )

    if validations_count > 0 or has_reference_pack:
        tasks.append(
            dependencies["build_material_real_worklist_item"](
                task_id="baseline_sintetica",
                title="Validar ou reaproveitar baseline sintética externa",
                done=validations_count > 0,
                blocking=False,
                deliverable="ZIP/PDF/bundle validados como fallback ou ponto de partida",
                owner="Curadoria Tariel",
            )
        )

    tasks.append(
        dependencies["build_material_real_worklist_item"](
            task_id="consolidar_pacote_referencia",
            title="Consolidar pacote de referência da família",
            done=has_reference_pack,
            blocking=not has_reference_pack,
            deliverable="manifest.json + tariel_filled_reference_bundle.json + assets/pdf em pacote_referencia/",
            owner="Curadoria Tariel",
        )
    )
    tasks.append(
        dependencies["build_material_real_worklist_item"](
            task_id="refinar_template_pdf",
            title="Refinar template mestre, overlay e PDF final",
            done=status_key == "material_real_calibrado",
            blocking=False,
            deliverable="Template, narrativa e acabamento premium homologados",
            owner="Curadoria Tariel",
        )
    )

    pending_items = [item for item in tasks if str((item.get("status") or {}).get("key") or "") != "done"]
    blocking_items = [item for item in pending_items if bool(item.get("blocking"))]
    done_items = [item for item in tasks if str((item.get("status") or {}).get("key") or "") == "done"]
    return {
        "task_count": len(tasks),
        "pending_count": len(pending_items),
        "blocking_count": len(blocking_items),
        "done_count": len(done_items),
        "next_blocking_task": (blocking_items[0].get("title") if blocking_items else None),
        "items": tasks[:7],
    }
