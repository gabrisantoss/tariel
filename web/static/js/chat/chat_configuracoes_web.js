// Painel web de configuracoes da Inspecao IA.
(function () {
    "use strict";

    if (window.__TARIEL_CHAT_CONFIGURACOES_WEB_WIRED__) return;
    window.__TARIEL_CHAT_CONFIGURACOES_WEB_WIRED__ = true;

    const STORAGE_KEY = "tariel:web:inspecao:configuracoes";
    const API_SETTINGS_URL = "/app/api/configuracoes";
    const API_SESSOES_URL = "/app/api/sessoes";
    const SAVE_REMOTE_DELAY_MS = 420;
    const SECOES_PERMITIDAS = new Set(["conta", "preferencias", "notificacoes", "seguranca", "sistema"]);
    const RESPOSTAS_PERMITIDAS = new Set(["objetiva", "detalhada", "tecnica"]);
    const DENSIDADES_PERMITIDAS = new Set(["compacta", "confortavel", "ampla"]);
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
        sessionsSummary: document.getElementById("configuracoes-web-sessions-summary"),
        sessionsList: document.getElementById("configuracoes-web-sessions-list"),
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
        carregandoRemoto: false,
        carregadoRemoto: false,
        salvandoRemotoTimer: 0,
        avisouFalhaSync: false,
        settingsMobile: null,
        carregandoSessoes: false,
        sessoesCarregadas: false,
    };

    const SELETOR_FOCAVEIS = [
        "button:not([disabled])",
        "[href]",
        "input:not([disabled]):not([type='hidden'])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    function normalizarSettingsWeb(dados) {
        const bruto = dados && typeof dados === "object" ? dados : {};
        return {
            section: SECOES_PERMITIDAS.has(String(bruto.section || ""))
                ? String(bruto.section)
                : DEFAULTS.section,
            resposta: RESPOSTAS_PERMITIDAS.has(String(bruto.resposta || ""))
                ? String(bruto.resposta)
                : DEFAULTS.resposta,
            densidade: DENSIDADES_PERMITIDAS.has(String(bruto.densidade || ""))
                ? String(bruto.densidade)
                : DEFAULTS.densidade,
            animacoes: typeof bruto.animacoes === "boolean" ? bruto.animacoes : DEFAULTS.animacoes,
            economiaDados:
                typeof bruto.economiaDados === "boolean" ? bruto.economiaDados : DEFAULTS.economiaDados,
            notificaIa:
                typeof bruto.notificaIa === "boolean" ? bruto.notificaIa : DEFAULTS.notificaIa,
            notificaRevisao:
                typeof bruto.notificaRevisao === "boolean" ? bruto.notificaRevisao : DEFAULTS.notificaRevisao,
            alertasCriticos:
                typeof bruto.alertasCriticos === "boolean" ? bruto.alertasCriticos : DEFAULTS.alertasCriticos,
            emailResumo:
                typeof bruto.emailResumo === "boolean" ? bruto.emailResumo : DEFAULTS.emailResumo,
        };
    }

    function carregarSettings() {
        try {
            const bruto = window.localStorage.getItem(STORAGE_KEY);
            if (!bruto) return { ...DEFAULTS };
            const dados = JSON.parse(bruto);
            return normalizarSettingsWeb({ ...DEFAULTS, ...(dados && typeof dados === "object" ? dados : {}) });
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

    function tokenCsrf() {
        return document.querySelector('meta[name="csrf-token"]')?.content || "";
    }

    function registro(valor) {
        return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
    }

    function payloadApiSettings(settings, mobileSettings = {}) {
        const atual = normalizarSettingsWeb(settings);
        const mobile = registro(mobileSettings);
        const notificacoesAtuais = registro(mobile.notificacoes);
        const privacidadeAtual = registro(mobile.privacidade);
        const permissoesAtuais = registro(mobile.permissoes);
        const experienciaAtual = registro(mobile.experiencia_ia);
        return {
            notificacoes: {
                ...notificacoesAtuais,
                notifica_respostas: atual.notificaIa,
                notifica_push:
                    typeof notificacoesAtuais.notifica_push === "boolean" ? notificacoesAtuais.notifica_push : true,
                som_notificacao: notificacoesAtuais.som_notificacao || "Ping",
                vibracao_ativa:
                    typeof notificacoesAtuais.vibracao_ativa === "boolean" ? notificacoesAtuais.vibracao_ativa : true,
                emails_ativos: atual.emailResumo,
                notifica_revisao: atual.notificaRevisao,
                alertas_criticos: atual.alertasCriticos,
            },
            privacidade: {
                ...privacidadeAtual,
                mostrar_conteudo_notificacao:
                    typeof privacidadeAtual.mostrar_conteudo_notificacao === "boolean"
                        ? privacidadeAtual.mostrar_conteudo_notificacao
                        : false,
                ocultar_conteudo_bloqueado:
                    typeof privacidadeAtual.ocultar_conteudo_bloqueado === "boolean"
                        ? privacidadeAtual.ocultar_conteudo_bloqueado
                        : true,
                mostrar_somente_nova_mensagem:
                    typeof privacidadeAtual.mostrar_somente_nova_mensagem === "boolean"
                        ? privacidadeAtual.mostrar_somente_nova_mensagem
                        : true,
                salvar_historico_conversas:
                    typeof privacidadeAtual.salvar_historico_conversas === "boolean"
                        ? privacidadeAtual.salvar_historico_conversas
                        : true,
                compartilhar_melhoria_ia:
                    typeof privacidadeAtual.compartilhar_melhoria_ia === "boolean"
                        ? privacidadeAtual.compartilhar_melhoria_ia
                        : false,
                retencao_dados: privacidadeAtual.retencao_dados || "90 dias",
            },
            permissoes: {
                ...permissoesAtuais,
                microfone_permitido:
                    typeof permissoesAtuais.microfone_permitido === "boolean" ? permissoesAtuais.microfone_permitido : true,
                camera_permitida:
                    typeof permissoesAtuais.camera_permitida === "boolean" ? permissoesAtuais.camera_permitida : true,
                arquivos_permitidos:
                    typeof permissoesAtuais.arquivos_permitidos === "boolean" ? permissoesAtuais.arquivos_permitidos : true,
                notificacoes_permitidas:
                    typeof permissoesAtuais.notificacoes_permitidas === "boolean"
                        ? permissoesAtuais.notificacoes_permitidas
                        : true,
                biometria_permitida:
                    typeof permissoesAtuais.biometria_permitida === "boolean" ? permissoesAtuais.biometria_permitida : true,
            },
            experiencia_ia: {
                ...experienciaAtual,
                modelo_ia: experienciaAtual.modelo_ia || "equilibrado",
                entry_mode_preference: experienciaAtual.entry_mode_preference || "auto_recommended",
                remember_last_case_mode:
                    typeof experienciaAtual.remember_last_case_mode === "boolean"
                        ? experienciaAtual.remember_last_case_mode
                        : false,
                estilo_resposta: atual.resposta,
                densidade_interface: atual.densidade,
                animacoes_ativas: atual.animacoes,
                economia_dados: atual.economiaDados,
            },
        };
    }

    function aplicarWebSettingsRemoto(webSettings) {
        const sectionAtual = SECOES_PERMITIDAS.has(String(estado.settings.section || ""))
            ? estado.settings.section
            : DEFAULTS.section;
        estado.settings = normalizarSettingsWeb({
            ...estado.settings,
            ...(webSettings && typeof webSettings === "object" ? webSettings : {}),
            section: sectionAtual,
        });
        salvarSettings();
        aplicarEstadoControles();
        aplicarSecao(estado.settings.section);
    }

    async function carregarSettingsRemoto({ silencioso = true } = {}) {
        if (estado.carregandoRemoto) return false;
        estado.carregandoRemoto = true;
        try {
            const resposta = await fetch(API_SETTINGS_URL, {
                method: "GET",
                credentials: "same-origin",
                headers: { Accept: "application/json" },
            });
            const dados = await resposta.json();
            if (!resposta.ok || !dados?.ok) {
                throw new Error("Resposta inválida.");
            }
            estado.settingsMobile = registro(dados.settings);
            aplicarWebSettingsRemoto(dados.web_settings || {});
            estado.carregadoRemoto = true;
            estado.avisouFalhaSync = false;
            if (el.status) el.status.textContent = "Sincronizado";
            return true;
        } catch (_) {
            if (el.status) el.status.textContent = "Local";
            if (!silencioso) {
                mostrarToast("Não consegui carregar as configurações salvas.", "erro", 2800);
            }
            return false;
        } finally {
            estado.carregandoRemoto = false;
        }
    }

    async function salvarSettingsRemoto({ toastSucesso = false } = {}) {
        window.clearTimeout(estado.salvandoRemotoTimer);
        estado.salvandoRemotoTimer = 0;

        try {
            const headers = {
                Accept: "application/json",
                "Content-Type": "application/json",
            };
            const csrf = tokenCsrf();
            if (csrf) headers["X-CSRF-Token"] = csrf;

            const resposta = await fetch(API_SETTINGS_URL, {
                method: "PUT",
                credentials: "same-origin",
                headers,
                body: JSON.stringify(payloadApiSettings(estado.settings, estado.settingsMobile)),
            });
            const dados = await resposta.json();
            if (!resposta.ok || !dados?.ok) {
                throw new Error("Resposta inválida.");
            }

            estado.settingsMobile = registro(dados.settings);
            aplicarWebSettingsRemoto(dados.web_settings || {});
            estado.avisouFalhaSync = false;
            if (el.status) el.status.textContent = "Sincronizado";
            if (toastSucesso) mostrarToast("Configurações salvas.", "sucesso", 2200);
        } catch (_) {
            if (el.status) el.status.textContent = "Local";
            if (!estado.avisouFalhaSync) {
                mostrarToast("Preferências salvas neste navegador. Sincronização indisponível agora.", "erro", 3200);
                estado.avisouFalhaSync = true;
            }
        }
    }

    function agendarSalvarSettingsRemoto() {
        window.clearTimeout(estado.salvandoRemotoTimer);
        estado.salvandoRemotoTimer = window.setTimeout(() => {
            void salvarSettingsRemoto();
        }, SAVE_REMOTE_DELAY_MS);
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

        if (proxima === "seguranca") {
            void carregarSessoes({ silencioso: true });
        }
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
        void carregarSettingsRemoto({ silencioso: true });

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

    function formatarDataSessao(valor) {
        const data = new Date(String(valor || ""));
        if (Number.isNaN(data.getTime())) return "";
        try {
            return new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            }).format(data);
        } catch (_) {
            return data.toLocaleString();
        }
    }

    function botoesAcao(action) {
        return Array.from(el.modal.querySelectorAll(`[data-settings-action="${action}"]`));
    }

    function renderSessoes(payload) {
        const sessoes = Array.isArray(payload?.sessions) ? payload.sessions : [];
        const total = Number(payload?.total ?? sessoes.length) || 0;
        const temOutras = Boolean(payload?.has_other_sessions);

        if (el.sessionsSummary) {
            el.sessionsSummary.textContent = total === 1 ? "1 sessão ativa." : `${total} sessões ativas.`;
        }

        botoesAcao("end-other-sessions").forEach((botao) => {
            botao.disabled = !temOutras;
            botao.title = temOutras ? "Encerrar outras sessões ativas" : "Nenhuma outra sessão ativa";
        });

        if (!el.sessionsList) return;
        el.sessionsList.innerHTML = "";

        if (!sessoes.length) {
            const vazio = document.createElement("small");
            vazio.textContent = "Nenhuma sessão ativa encontrada.";
            el.sessionsList.appendChild(vazio);
            return;
        }

        sessoes.forEach((sessao) => {
            const item = document.createElement("div");
            item.className = "configuracoes-web-session-item";

            const copy = document.createElement("span");
            const titulo = document.createElement("strong");
            titulo.textContent = String(sessao.title || "Sessão ativa");
            const detalhe = document.createElement("small");
            const ultimaAtividade = formatarDataSessao(sessao.last_seen_at);
            detalhe.textContent = ultimaAtividade
                ? `${String(sessao.details || "Acesso ativo")} | última atividade ${ultimaAtividade}`
                : String(sessao.details || "Acesso ativo");
            copy.appendChild(titulo);
            copy.appendChild(detalhe);

            const badge = document.createElement("span");
            badge.className = "configuracoes-web-session-item__badge";
            badge.textContent = sessao.current ? "Atual" : sessao.persistent ? "Persistente" : "Ativa";

            item.appendChild(copy);
            item.appendChild(badge);
            el.sessionsList.appendChild(item);
        });
    }

    async function carregarSessoes({ silencioso = false } = {}) {
        if (estado.carregandoSessoes) return false;
        estado.carregandoSessoes = true;
        if (el.sessionsSummary) el.sessionsSummary.textContent = "Carregando sessões ativas.";
        botoesAcao("refresh-sessions").forEach((botao) => {
            botao.disabled = true;
        });

        try {
            const resposta = await fetch(API_SESSOES_URL, {
                method: "GET",
                credentials: "same-origin",
                headers: { Accept: "application/json" },
            });
            const dados = await resposta.json();
            if (!resposta.ok || !dados?.ok) {
                throw new Error("Resposta inválida.");
            }
            renderSessoes(dados);
            estado.sessoesCarregadas = true;
            return true;
        } catch (_) {
            if (el.sessionsSummary) el.sessionsSummary.textContent = "Não foi possível carregar sessões.";
            if (el.sessionsList) {
                el.sessionsList.innerHTML = "";
                const erro = document.createElement("small");
                erro.textContent = "Tente atualizar novamente.";
                el.sessionsList.appendChild(erro);
            }
            if (!silencioso) mostrarToast("Não consegui carregar as sessões agora.", "erro", 2800);
            return false;
        } finally {
            estado.carregandoSessoes = false;
            botoesAcao("refresh-sessions").forEach((botao) => {
                botao.disabled = false;
            });
        }
    }

    async function encerrarOutrasSessoes() {
        botoesAcao("end-other-sessions").forEach((botao) => {
            botao.disabled = true;
        });
        try {
            const headers = { Accept: "application/json" };
            const csrf = tokenCsrf();
            if (csrf) headers["X-CSRF-Token"] = csrf;

            const resposta = await fetch(`${API_SESSOES_URL}/encerrar-outras`, {
                method: "POST",
                credentials: "same-origin",
                headers,
            });
            const dados = await resposta.json();
            if (!resposta.ok || !dados?.ok) {
                throw new Error("Resposta inválida.");
            }
            renderSessoes(dados);
            const removidas = Number(dados.removed || 0);
            mostrarToast(
                removidas === 1 ? "1 outra sessão encerrada." : `${removidas} outras sessões encerradas.`,
                "sucesso",
                2400
            );
        } catch (_) {
            mostrarToast("Não consegui encerrar as outras sessões agora.", "erro", 3000);
            void carregarSessoes({ silencioso: true });
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
        void salvarSettingsRemoto({ toastSucesso: true });
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
                agendarSalvarSettingsRemoto();
            });
        });

        el.prefInputs.forEach((input) => {
            input.addEventListener("change", () => {
                const chave = input.dataset.settingsPref;
                if (!chave) return;
                estado.settings[chave] = !!input.checked;
                salvarSettings();
                aplicarEstadoControles();
                agendarSalvarSettingsRemoto();
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

            if (action === "refresh-sessions") {
                event.preventDefault();
                void carregarSessoes({ silencioso: false });
                return;
            }

            if (action === "end-other-sessions") {
                event.preventDefault();
                void encerrarOutrasSessoes();
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
    void carregarSettingsRemoto({ silencioso: true });
})();
