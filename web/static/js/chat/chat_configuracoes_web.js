// Painel web de configuracoes da Inspecao IA.
(function () {
    "use strict";

    if (window.__TARIEL_CHAT_CONFIGURACOES_WEB_WIRED__) return;
    window.__TARIEL_CHAT_CONFIGURACOES_WEB_WIRED__ = true;

    const STORAGE_KEY = "tariel:web:inspecao:configuracoes";
    const DEFAULTS = {
        section: "conta",
        resposta: "detalhada",
        densidade: "confortavel",
        animacoes: true,
        economiaDados: false,
        notificaIa: true,
        notificaRevisao: true,
        alertasCriticos: true,
        emailResumo: false,
    };

    const LABELS = {
        resposta: {
            objetiva: "Objetiva",
            detalhada: "Detalhada",
            tecnica: "Técnica",
        },
        densidade: {
            compacta: "Compacta",
            confortavel: "Confortável",
            ampla: "Ampla",
        },
    };

    const el = {
        modal: document.getElementById("modal-configuracoes-web"),
        btnFechar: document.getElementById("btn-fechar-configuracoes-web"),
        btnPerfil: document.getElementById("btn-abrir-perfil-chat"),
        avatar: document.getElementById("configuracoes-web-avatar"),
        nome: document.getElementById("configuracoes-web-nome"),
        email: document.getElementById("configuracoes-web-email"),
        status: document.getElementById("configuracoes-web-status"),
        health: document.getElementById("configuracoes-web-health"),
        versao: document.getElementById("configuracoes-web-versao"),
        navItems: Array.from(document.querySelectorAll("[data-settings-section]")),
        sections: Array.from(document.querySelectorAll("[data-settings-panel-section]")),
        choiceButtons: Array.from(document.querySelectorAll("[data-settings-choice]")),
        prefInputs: Array.from(document.querySelectorAll("[data-settings-pref]")),
    };

    if (!el.modal) return;

    const estado = {
        settings: carregarSettings(),
        ultimoFoco: null,
        overflowAnteriorBody: "",
    };

    const SELETOR_FOCAVEIS = [
        "button:not([disabled])",
        "[href]",
        "input:not([disabled]):not([type='hidden'])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    function carregarSettings() {
        try {
            const bruto = window.localStorage.getItem(STORAGE_KEY);
            if (!bruto) return { ...DEFAULTS };
            const dados = JSON.parse(bruto);
            return { ...DEFAULTS, ...(dados && typeof dados === "object" ? dados : {}) };
        } catch (_) {
            return { ...DEFAULTS };
        }
    }

    function salvarSettings() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado.settings));
        } catch (_) {
            // localStorage pode estar bloqueado; a sessao atual continua funcional.
        }
    }

    function mostrarToast(mensagem, tipo = "info", duracao = 2600) {
        if (typeof window.mostrarToast === "function") {
            window.mostrarToast(mensagem, tipo, duracao);
            return;
        }
        const texto = String(mensagem || "").trim();
        if (texto) window.setTimeout(() => console.info(texto), 0);
    }

    function obterIniciais(nome) {
        const texto = String(nome || "").trim();
        if (!texto) return "US";
        const partes = texto.split(/\s+/).filter(Boolean);
        if (!partes.length) return "US";
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return `${partes[0][0] || ""}${partes[partes.length - 1][0] || ""}`.toUpperCase() || "US";
    }

    function renderAvatar(target, { nome = "", foto = "" } = {}) {
        if (!target) return;
        const nomeLimpo = String(nome || "").trim();
        const fotoLimpa = String(foto || "").trim();
        const iniciais = obterIniciais(nomeLimpo);

        target.dataset.iniciais = iniciais;
        target.classList.toggle("possui-foto", !!fotoLimpa);

        if (fotoLimpa) {
            target.innerHTML = "";
            const img = document.createElement("img");
            img.src = fotoLimpa;
            img.alt = `Foto de perfil de ${nomeLimpo || "usuário"}`;
            img.loading = "lazy";
            img.decoding = "async";
            target.appendChild(img);
            return;
        }

        target.textContent = iniciais;
    }

    function perfilAtual() {
        return {
            nome: el.btnPerfil?.dataset?.nome || "Usuário",
            email: el.btnPerfil?.dataset?.email || "",
            foto: el.btnPerfil?.dataset?.fotoUrl || "",
        };
    }

    function sincronizarResumoConta() {
        const perfil = perfilAtual();
        if (el.nome) el.nome.textContent = perfil.nome || "Usuário";
        if (el.email) el.email.textContent = perfil.email || "E-mail não informado";
        renderAvatar(el.avatar, perfil);
    }

    function aplicarSecao(section) {
        const proxima = el.sections.some((item) => item.dataset.settingsPanelSection === section)
            ? section
            : "conta";

        estado.settings.section = proxima;
        salvarSettings();

        el.navItems.forEach((item) => {
            const ativa = item.dataset.settingsSection === proxima;
            item.classList.toggle("is-active", ativa);
            item.setAttribute("aria-current", ativa ? "page" : "false");
        });

        el.sections.forEach((item) => {
            const ativa = item.dataset.settingsPanelSection === proxima;
            item.classList.toggle("is-active", ativa);
            item.hidden = !ativa;
        });
    }

    function aplicarEstadoControles() {
        el.choiceButtons.forEach((button) => {
            const chave = button.dataset.settingsChoice;
            const valor = button.dataset.settingsValue;
            const ativo = chave && valor && estado.settings[chave] === valor;
            button.classList.toggle("is-active", !!ativo);
            button.setAttribute("aria-pressed", String(!!ativo));
        });

        el.prefInputs.forEach((input) => {
            const chave = input.dataset.settingsPref;
            if (!chave) return;
            input.checked = !!estado.settings[chave];
        });

        Object.entries(LABELS).forEach(([chave, labels]) => {
            const alvo = document.getElementById(`settings-value-${chave}`);
            if (!alvo) return;
            alvo.textContent = labels[estado.settings[chave]] || String(estado.settings[chave] || "");
        });

        document.body.dataset.inspecaoSettingsDensidade = String(estado.settings.densidade || "confortavel");
        document.body.dataset.inspecaoSettingsResposta = String(estado.settings.resposta || "detalhada");
        document.body.classList.toggle("inspecao-settings-reduced-motion", !estado.settings.animacoes);
        document.body.classList.toggle("inspecao-settings-data-saver", !!estado.settings.economiaDados);
    }

    function obterFocaveis() {
        return Array.from(el.modal.querySelectorAll(SELETOR_FOCAVEIS)).filter(
            (item) => item instanceof HTMLElement && !item.hidden && item.offsetParent !== null
        );
    }

    function abrirConfiguracoes(section) {
        sincronizarResumoConta();
        aplicarEstadoControles();
        aplicarSecao(section || estado.settings.section || "conta");

        estado.ultimoFoco = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        estado.overflowAnteriorBody = document.body.style.overflow || "";

        el.modal.hidden = false;
        el.modal.setAttribute("aria-hidden", "false");
        el.modal.classList.add("ativo");
        document.body.style.overflow = "hidden";

        window.requestAnimationFrame(() => {
            el.modal.querySelector(".configuracoes-web-nav__item.is-active")?.focus?.();
        });
    }

    function fecharConfiguracoes() {
        el.modal.classList.remove("ativo");
        el.modal.setAttribute("aria-hidden", "true");
        el.modal.hidden = true;
        document.body.style.overflow = estado.overflowAnteriorBody || "";
        estado.overflowAnteriorBody = "";

        try {
            estado.ultimoFoco?.focus?.();
        } catch (_) {
            // foco pode nao existir mais.
        }
    }

    async function verificarSaudeSistema() {
        if (el.health) el.health.textContent = "Verificando...";
        try {
            const resposta = await fetch("/health", {
                method: "GET",
                credentials: "same-origin",
                headers: { Accept: "application/json" },
            });
            const dados = await resposta.json();
            if (!resposta.ok || !dados?.status) {
                throw new Error("Resposta inválida.");
            }
            if (el.health) {
                el.health.textContent = dados.status === "ok" ? "Online e pronto." : `Status: ${dados.status}`;
            }
            if (el.status) {
                el.status.textContent = dados.ambiente ? String(dados.ambiente) : "Online";
            }
            if (el.versao && dados.versao) {
                el.versao.textContent = String(dados.versao);
            }
            mostrarToast("Status do sistema atualizado.", "sucesso", 2200);
        } catch (_) {
            if (el.health) el.health.textContent = "Não foi possível verificar agora.";
            mostrarToast("Não consegui verificar o status agora.", "erro", 2800);
        }
    }

    function limparPreferenciasLocais() {
        estado.settings = { ...DEFAULTS, section: estado.settings.section || "conta" };
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (_) {
            // sem acao
        }
        aplicarEstadoControles();
        mostrarToast("Preferências locais restauradas.", "sucesso", 2200);
    }

    function bindEventos() {
        document.addEventListener("tariel:configuracoes:abrir", (event) => {
            const section = event.detail?.section || "";
            abrirConfiguracoes(section);
        });

        el.btnFechar?.addEventListener("click", fecharConfiguracoes);

        el.modal.addEventListener("click", (event) => {
            if (event.target === el.modal) {
                fecharConfiguracoes();
            }
        });

        el.navItems.forEach((item) => {
            item.addEventListener("click", () => aplicarSecao(item.dataset.settingsSection || "conta"));
        });

        el.choiceButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const chave = button.dataset.settingsChoice;
                const valor = button.dataset.settingsValue;
                if (!chave || !valor) return;
                estado.settings[chave] = valor;
                salvarSettings();
                aplicarEstadoControles();
            });
        });

        el.prefInputs.forEach((input) => {
            input.addEventListener("change", () => {
                const chave = input.dataset.settingsPref;
                if (!chave) return;
                estado.settings[chave] = !!input.checked;
                salvarSettings();
                aplicarEstadoControles();
            });
        });

        el.modal.addEventListener("click", (event) => {
            const action = event.target.closest("[data-settings-action]")?.dataset?.settingsAction;
            if (!action) return;

            if (action === "open-profile") {
                event.preventDefault();
                fecharConfiguracoes();
                document.dispatchEvent(new CustomEvent("tariel:perfil:abrir"));
                return;
            }

            if (action === "browser-permissions") {
                event.preventDefault();
                mostrarToast("Permissões são controladas pelo navegador nesta versão web.", "info", 3200);
                return;
            }

            if (action === "clear-local") {
                event.preventDefault();
                limparPreferenciasLocais();
                return;
            }

            if (action === "check-health") {
                event.preventDefault();
                void verificarSaudeSistema();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || el.modal.hidden) return;
            event.preventDefault();
            fecharConfiguracoes();
        });

        el.modal.addEventListener("keydown", (event) => {
            if (event.key !== "Tab" || el.modal.hidden) return;
            const focaveis = obterFocaveis();
            if (!focaveis.length) return;
            const primeiro = focaveis[0];
            const ultimo = focaveis[focaveis.length - 1];

            if (event.shiftKey && document.activeElement === primeiro) {
                event.preventDefault();
                ultimo.focus();
                return;
            }

            if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primeiro.focus();
            }
        });
    }

    aplicarEstadoControles();
    bindEventos();
})();
