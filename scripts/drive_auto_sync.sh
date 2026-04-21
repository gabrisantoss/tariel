#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="${LOCAL_DIR:-/home/gabriel/Área de trabalho/tariel-web}"
REMOTE_ID="${REMOTE_ID:-1p2HxAkgdzWbxjptkaSX8Nb_MMeYlKVeB}"
REMOTE_NAME="${REMOTE_NAME:-drive}"
REMOTE_TARGET="${REMOTE_NAME},root_folder_id=${REMOTE_ID}:"
DEBOUNCE_SECONDS="${DEBOUNCE_SECONDS:-3}"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/tariel-drive-sync"
LOG_FILE="${LOG_DIR}/sync.log"
LOCK_DIR="${XDG_RUNTIME_DIR:-/tmp}/tariel-drive-sync.lock"

mkdir -p "${LOG_DIR}"

log() {
    printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S %z')" "$*" | tee -a "${LOG_FILE}"
}

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || {
        log "ERRO: comando obrigatório ausente: $1"
        exit 1
    }
}

run_sync() {
    log "Iniciando sync: ${LOCAL_DIR} -> ${REMOTE_TARGET}"
    rclone sync \
        "${LOCAL_DIR}" \
        "${REMOTE_TARGET}" \
        --create-empty-src-dirs \
        --fast-list \
        --transfers=8 \
        --checkers=16 \
        --drive-skip-gdocs \
        --log-file "${LOG_FILE}" \
        --log-format "date,time" \
        --log-level INFO
    log "Sync concluído com sucesso."
}

watch_loop() {
    require_cmd inotifywait
    require_cmd rclone

    if [[ ! -d "${LOCAL_DIR}" ]]; then
        log "ERRO: diretório local não encontrado: ${LOCAL_DIR}"
        exit 1
    fi

    mkdir "${LOCK_DIR}" 2>/dev/null || {
        log "Watcher já está em execução."
        exit 0
    }
    trap 'rmdir "${LOCK_DIR}" 2>/dev/null || true' EXIT

    run_sync
    log "Observando alterações em ${LOCAL_DIR}"

    while true; do
        inotifywait \
            --quiet \
            --recursive \
            --event modify,attrib,close_write,move,create,delete \
            --exclude '(\.git/|__pycache__/|\.pytest_cache/|\.mypy_cache/|\.ruff_cache/|node_modules/|\.venv|/\.cache/|/\.test-artifacts/)' \
            "${LOCAL_DIR}"

        log "Alteração detectada. Aguardando debounce de ${DEBOUNCE_SECONDS}s."
        sleep "${DEBOUNCE_SECONDS}"

        while inotifywait \
            --quiet \
            --timeout "${DEBOUNCE_SECONDS}" \
            --recursive \
            --event modify,attrib,close_write,move,create,delete \
            --exclude '(\.git/|__pycache__/|\.pytest_cache/|\.mypy_cache/|\.ruff_cache/|node_modules/|\.venv|/\.cache/|/\.test-artifacts/)' \
            "${LOCAL_DIR}" >/dev/null 2>&1; do
            log "Novas alterações durante debounce. Reiniciando janela."
        done

        run_sync || log "ERRO: sync falhou; watcher continuará observando."
    done
}

case "${1:-watch}" in
    once)
        require_cmd rclone
        run_sync
        ;;
    watch)
        watch_loop
        ;;
    *)
        echo "Uso: $0 [once|watch]" >&2
        exit 1
        ;;
esac
