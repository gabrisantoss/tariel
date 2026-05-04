(function () {
    "use strict";

    const initReportZoom = () => {
        const zoomAreas = Array.from(document.querySelectorAll(".report-a4-zoom"));
        const shouldDisableZoom = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;

        if (!zoomAreas.length || shouldDisableZoom) {
            return;
        }

        const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

        zoomAreas.forEach((area) => {
            const img = area.querySelector("img");
            const lens = area.querySelector(".report-a4-zoom__lens");
            const preview = area.querySelector(".report-a4-zoom__preview");
            const zoom = Number.parseFloat(area.dataset.zoom || "2.2");

            if (!img || !lens || !preview) {
                return;
            }

            const setPreviewImage = () => {
                const imageUrl = img.currentSrc || img.src;
                preview.style.backgroundImage = `url("${imageUrl}")`;
            };

            const moveZoom = (event) => {
                const imgRect = img.getBoundingClientRect();
                const x = clamp(event.clientX - imgRect.left, 0, imgRect.width);
                const y = clamp(event.clientY - imgRect.top, 0, imgRect.height);
                const lensWidth = lens.offsetWidth;
                const lensHeight = lens.offsetHeight;
                const previewWidth = preview.offsetWidth;
                const previewHeight = preview.offsetHeight;

                lens.style.left = `${clamp(x - lensWidth / 2, 0, imgRect.width - lensWidth)}px`;
                lens.style.top = `${clamp(y - lensHeight / 2, 0, imgRect.height - lensHeight)}px`;

                const zoomedWidth = imgRect.width * zoom;
                const zoomedHeight = imgRect.height * zoom;
                const maxPositionX = Math.max(0, zoomedWidth - previewWidth);
                const maxPositionY = Math.max(0, zoomedHeight - previewHeight);
                const positionX = clamp(x * zoom - previewWidth / 2, 0, maxPositionX);
                const positionY = clamp(y * zoom - previewHeight / 2, 0, maxPositionY);

                preview.style.backgroundSize = `${zoomedWidth}px ${zoomedHeight}px`;
                preview.style.backgroundPosition = `-${positionX}px -${positionY}px`;
            };

            area.addEventListener("mouseenter", (event) => {
                setPreviewImage();
                area.classList.add("is-active");
                moveZoom(event);
            });

            area.addEventListener("mousemove", moveZoom);

            area.addEventListener("mouseleave", () => {
                area.classList.remove("is-active");
            });
        });
    };

    initReportZoom();

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
