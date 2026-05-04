(function () {
    "use strict";

    function feedbackFor(element) {
        const shell = element.closest(".auth-card-shell") || document;
        return shell.querySelector("[data-auth-feedback]");
    }

    function showFeedback(element, message) {
        const feedback = feedbackFor(element);
        if (!feedback) return;
        feedback.hidden = false;
        feedback.textContent = message;
    }

    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
        const targetId = button.getAttribute("data-password-target") || button.getAttribute("data-target");
        const input = targetId ? document.getElementById(targetId) : null;
        const label = button.querySelector("[data-password-toggle-label]") || button;
        if (!input) return;

        button.addEventListener("click", () => {
            const willShow = input.type === "password";
            input.type = willShow ? "text" : "password";
            button.setAttribute("aria-pressed", willShow ? "true" : "false");
            button.setAttribute("aria-label", willShow ? "Ocultar senha" : "Mostrar senha");
            label.textContent = willShow ? "Ocultar" : "Mostrar";
            input.focus({ preventScroll: true });
        });
    });

    document.querySelectorAll("[data-auth-standard-form]").forEach((form) => {
        form.addEventListener("submit", (event) => {
            if (event.defaultPrevented) return;

            if (form.hasAttribute("data-auth-clear-inspetor")) {
                try {
                    sessionStorage.removeItem("tariel_force_home_landing");
                    sessionStorage.removeItem("tariel_workspace_retomada_home_pendente");
                    localStorage.removeItem("tariel_laudo_atual");
                } catch (_) {
                    // O armazenamento local e de sessao pode estar indisponivel.
                }
            }

            const button = form.querySelector(".auth-button");
            if (!button) return;
            button.disabled = true;
            button.textContent = button.getAttribute("data-loading-label") || "Entrando...";
        });
    });

    document.querySelectorAll("[data-provider-link]").forEach((button) => {
        button.addEventListener("click", () => {
            const provider = button.getAttribute("data-provider-link") || "provedor";
            const url = button.getAttribute("data-provider-url") || "";
            const message = button.getAttribute("data-provider-feedback-message")
                || `Login com ${provider} sera liberado para contas autorizadas da empresa.`;

            if (url) {
                window.location.assign(url);
                return;
            }
            showFeedback(button, message);
        });
    });

    document.querySelectorAll("[data-auth-support-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const context = button.getAttribute("data-auth-support-context") || "este portal";
            const message = button.getAttribute("data-auth-support-message")
                || `Para recuperar senha de ${context}, fale com o administrador responsavel pelo acesso.`;
            showFeedback(button, message);
        });
    });
})();
