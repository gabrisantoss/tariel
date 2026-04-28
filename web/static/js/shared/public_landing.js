(function () {
    "use strict";

    const form = document.getElementById("demo-form");
    if (!form) {
        return;
    }

    const status = document.getElementById("demo-form-status");
    const setStatus = (message) => {
        if (status) {
            status.textContent = message;
        }
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        const data = new FormData(form);
        const subject = "Quero uma demonstração da Tariel";
        const body = [
            "Olá, quero uma demonstração da Tariel.",
            "",
            `Nome: ${data.get("nome") || ""}`,
            `Empresa: ${data.get("empresa") || ""}`,
            `E-mail: ${data.get("email") || ""}`,
            `Telefone/WhatsApp: ${data.get("telefone") || ""}`,
            `Tipo de operação: ${data.get("operacao") || ""}`,
            "",
            "Contexto:",
            `${data.get("mensagem") || ""}`,
        ].join("\n");

        const mailto = new URL("mailto:contato@tariel.ia");
        mailto.searchParams.set("subject", subject);
        mailto.searchParams.set("body", body);
        window.location.href = mailto.toString();
        setStatus("Abrindo seu aplicativo de e-mail com a solicitação preenchida.");
    });
})();
