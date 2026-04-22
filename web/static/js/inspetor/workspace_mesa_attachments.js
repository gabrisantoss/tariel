(function attachTarielInspectorWorkspaceMesaAttachments(global) {
    "use strict";

    function escapeHtml(texto = "") {
        return String(texto)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function formatarTamanhoBytes(totalBytes) {
        const valor = Number(totalBytes || 0);
        if (!Number.isFinite(valor) || valor <= 0) return "0 KB";
        if (valor >= 1024 * 1024) {
            return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
        }
        return `${Math.max(1, Math.round(valor / 1024))} KB`;
    }

    function normalizarAnexoMesa(payload = {}) {
        const id = Number(payload?.id || 0) || null;
        const nome = String(payload?.nome || "").trim();
        const mimeType = String(payload?.mime_type || "").trim().toLowerCase();
        const categoria = String(payload?.categoria || "").trim().toLowerCase();
        const url = String(payload?.url || "").trim();
        if (!id || !nome || !url) return null;
        return {
            id,
            nome,
            mime_type: mimeType,
            categoria,
            url,
            tamanho_bytes: Number(payload?.tamanho_bytes || 0) || 0,
            eh_imagem: !!payload?.eh_imagem,
        };
    }

    function renderizarLinksAnexosMesa(anexos = []) {
        const itens = Array.isArray(anexos) ? anexos.filter(Boolean) : [];
        if (!itens.length) return "";

        return `
            <div class="mesa-widget-anexos">
                ${itens.map((anexo) => `
                    <a
                        class="anexo-mesa-link ${anexo?.eh_imagem ? "imagem" : "documento"}"
                        href="${escapeHtml(anexo?.url || "#")}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span class="material-symbols-rounded" aria-hidden="true">${anexo?.eh_imagem ? "image" : "description"}</span>
                        <span class="anexo-mesa-link-texto">
                            <strong>${escapeHtml(anexo?.nome || "anexo")}</strong>
                            <small>${escapeHtml(formatarTamanhoBytes(anexo?.tamanho_bytes || 0))}</small>
                        </span>
                    </a>
                `).join("")}
            </div>
        `;
    }

    global.TarielInspectorWorkspaceMesaAttachments = {
        formatarTamanhoBytes,
        normalizarAnexoMesa,
        renderizarLinksAnexosMesa,
    };
})(window);
