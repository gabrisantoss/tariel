(function () {
    "use strict";

    function normalizarLaudoAtualId(valor) {
        const id = Number(valor);
        return Number.isFinite(id) && id > 0 ? id : null;
    }

    function normalizarModoInspecaoUI(valor) {
        return String(valor || "").trim().toLowerCase() === "home" ? "home" : "workspace";
    }

    function normalizarWorkspaceStage(valor) {
        return String(valor || "").trim().toLowerCase() === "inspection" ? "inspection" : "assistant";
    }

    function normalizarThreadTab(valor) {
        const normalizado = String(valor || "").trim().toLowerCase();
        if (normalizado === "chat" || normalizado === "conversa") return "conversa";
        if (normalizado === "history" || normalizado === "historico") return "historico";
        if (normalizado === "attachments" || normalizado === "anexos") return "anexos";
        if (
            normalizado === "correcoes" ||
            normalizado === "correção" ||
            normalizado === "correcao" ||
            normalizado === "correction" ||
            normalizado === "corrections"
        ) return "correcoes";
        if (normalizado === "mesa") return "mesa";
        return "conversa";
    }

    function normalizarEntryModePreference(valor, fallback = "auto_recommended") {
        const normalizado = String(valor || "").trim().toLowerCase();
        if (normalizado === "chat_first" || normalizado === "chatfirst" || normalizado === "conversa") {
            return "chat_first";
        }
        if (
            normalizado === "evidence_first" ||
            normalizado === "evidencefirst" ||
            normalizado === "evidencia" ||
            normalizado === "evidencias" ||
            normalizado === "guided" ||
            normalizado === "checklist"
        ) {
            return "evidence_first";
        }
        if (
            normalizado === "auto_recommended" ||
            normalizado === "autorecommended" ||
            normalizado === "auto" ||
            normalizado === "automatico" ||
            normalizado === "automatic"
        ) {
            return "auto_recommended";
        }

        const fallbackNormalizado = String(fallback || "").trim().toLowerCase();
        if (fallbackNormalizado === "chat_first" || fallbackNormalizado === "evidence_first") {
            return fallbackNormalizado;
        }
        return "auto_recommended";
    }

    function normalizarEntryModeEffective(valor, fallback = "chat_first") {
        const normalizado = String(valor || "").trim().toLowerCase();
        if (normalizado === "evidence_first" || normalizado === "evidencefirst" || normalizado === "evidencia") {
            return "evidence_first";
        }
        if (normalizado === "chat_first" || normalizado === "chatfirst" || normalizado === "conversa") {
            return "chat_first";
        }
        return String(fallback || "").trim().toLowerCase() === "evidence_first"
            ? "evidence_first"
            : "chat_first";
    }

    function normalizarEntryModeEffectiveOpcional(valor) {
        if (valor == null || String(valor || "").trim() === "") return null;
        return normalizarEntryModeEffective(valor);
    }

    function normalizarEntryModeReason(valor, fallback = "default_product_fallback") {
        const normalizado = String(valor || "").trim().toLowerCase();
        if (
            [
                "hard_safety_rule",
                "family_required_mode",
                "tenant_policy",
                "role_policy",
                "user_preference",
                "last_case_mode",
                "auto_recommended",
                "default_product_fallback",
                "existing_case_state",
            ].includes(normalizado)
        ) {
            return normalizado;
        }
        return String(fallback || "").trim().toLowerCase() || "default_product_fallback";
    }

    function normalizarOverlayOwner(valor) {
        return String(valor || "").trim().toLowerCase() === "new_inspection"
            ? "new_inspection"
            : "";
    }

    function normalizarBooleanoEstado(valor, fallback = false) {
        if (valor === true || valor === false) return valor;
        if (valor == null || valor === "") return !!fallback;

        const texto = String(valor).trim().toLowerCase();
        if (texto === "true" || texto === "1" || texto === "yes") return true;
        if (texto === "false" || texto === "0" || texto === "no") return false;
        return !!fallback;
    }

    window.TarielInspectorStateNormalization = Object.assign(
        window.TarielInspectorStateNormalization || {},
        {
            normalizarBooleanoEstado,
            normalizarEntryModeEffective,
            normalizarEntryModeEffectiveOpcional,
            normalizarEntryModePreference,
            normalizarEntryModeReason,
            normalizarLaudoAtualId,
            normalizarModoInspecaoUI,
            normalizarOverlayOwner,
            normalizarThreadTab,
            normalizarWorkspaceStage,
        }
    );
})();
