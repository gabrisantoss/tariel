(function attachTarielInspectorWorkspaceDeliveryFlow(global) {
    "use strict";

    function montarDiagnosticoPreviewWorkspace(dependencies = {}) {
        const diagnosticoAtual = String(global.TarielAPI?.obterUltimoDiagnosticoBruto?.() || "").trim();
        if (diagnosticoAtual) {
            return diagnosticoAtual;
        }

        const linhas = dependencies.coletarLinhasWorkspace?.() || [];
        if (!linhas.length) {
            return "";
        }

        const titulo = String(dependencies.estado?.workspaceVisualContext?.title || "Registro Técnico").trim();
        const subtitulo = String(dependencies.estado?.workspaceVisualContext?.subtitle || "").trim();
        const pendencias = Number(dependencies.estado?.qtdPendenciasAbertas || 0) || 0;
        const evidencias = dependencies.contarEvidenciasWorkspace?.() || 0;
        const blocos = [
            `Registro Técnico: ${titulo}`,
            subtitulo || "Sem subtítulo operacional disponível.",
            `Evidências mapeadas: ${evidencias}`,
            `Pendências abertas: ${pendencias}`,
            "",
            "Resumo auditável da sessão:",
        ];

        linhas.slice(-12).forEach((linha) => {
            const meta = dependencies.extrairMetaLinhaWorkspace?.(linha) || {};
            const resumo = String(meta.resumo || "").trim();
            if (!resumo) return;

            const prefixo = [meta.autor, meta.tempo].filter(Boolean).join(" • ");
            blocos.push(`- ${prefixo ? `${prefixo}: ` : ""}${resumo}`);
        });

        return blocos.join("\n").trim();
    }

    async function abrirPreviewWorkspace(dependencies = {}) {
        const diagnostico = montarDiagnosticoPreviewWorkspace(dependencies);
        if (!diagnostico) {
            dependencies.mostrarToast?.(
                "Ainda não há pré-visualização disponível para este laudo.",
                "aviso",
                2600
            );
            return;
        }

        const laudoId = Number(dependencies.obterLaudoAtivoIdSeguro?.() || 0) || null;
        const response = await fetch("/app/api/gerar_pdf", {
            method: "POST",
            credentials: "same-origin",
            headers: dependencies.obterHeadersComCSRF?.({
                Accept: "application/pdf",
                "Content-Type": "application/json",
            }),
            body: JSON.stringify({
                diagnostico,
                inspetor: String(global.TARIEL?.usuario || "Inspetor"),
                empresa: String(global.TARIEL?.empresa || "Empresa"),
                setor: "geral",
                data: new Date().toLocaleDateString("pt-BR"),
                laudo_id: laudoId,
                tipo_template: String(dependencies.estado?.tipoTemplateAtivo || "padrao"),
            }),
        });

        if (!response.ok) {
            throw new Error(
                await dependencies.extrairMensagemErroHTTP?.(
                    response,
                    "Falha ao abrir a pré-visualização."
                )
            );
        }

        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.includes("application/pdf")) {
            throw new Error("Resposta inválida para pré-visualização.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const previewTab = global.open(url, "_blank", "noopener,noreferrer");

        if (!previewTab) {
            const link = document.createElement("a");
            link.href = url;
            link.download = `preview_laudo_${laudoId || "tariel"}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }

        global.setTimeout(() => URL.revokeObjectURL(url), 45000);
    }

    async function finalizarInspecao(dependencies = {}) {
        const estado = dependencies.estado || {};
        if (estado.finalizandoInspecao) return null;

        if (
            global.TarielAPI?.estaRespondendo?.() ||
            document.body?.dataset?.iaRespondendo === "true"
        ) {
            dependencies.mostrarToast?.(
                "Aguarde a IA terminar antes de finalizar.",
                "aviso",
                2600
            );
            return null;
        }

        estado.finalizandoInspecao = true;
        dependencies.definirBotaoFinalizarCarregando?.(true);

        try {
            if (typeof global.finalizarInspecaoCompleta === "function") {
                return await global.finalizarInspecaoCompleta();
            }

            if (global.TarielAPI?.finalizarRelatorio) {
                const confirmou = typeof global.confirm === "function"
                    ? global.confirm(
                        "Deseja encerrar a coleta? A política do caso definirá se a revisão será interna ou pela Mesa."
                    )
                    : true;
                if (!confirmou) return null;
                return await global.TarielAPI.finalizarRelatorio({ direto: true });
            }

            dependencies.mostrarToast?.(
                "A finalização do relatório não está disponível.",
                "erro",
                3000
            );
            return null;
        } finally {
            estado.finalizandoInspecao = false;
            dependencies.definirBotaoFinalizarCarregando?.(false);
        }
    }

    global.TarielInspectorWorkspaceDeliveryFlow = {
        abrirPreviewWorkspace,
        finalizarInspecao,
        montarDiagnosticoPreviewWorkspace,
    };
})(window);
