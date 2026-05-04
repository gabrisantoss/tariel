(function () {
    "use strict";

    if (window.TarielClientePainelPage) return;

    window.TarielClientePainelPage = function createTarielClientePainelPage(config = {}) {
        const state = config.state || {};
        const documentRef = config.documentRef || document;
        const windowRef = config.windowRef || window;
        const $ = typeof config.getById === "function"
            ? config.getById
            : (id) => documentRef.getElementById(id);
        const helpers = config.helpers || {};
        const actions = config.actions || {};
        const surfaceModule = config.surfaceModule || {};

        const api = typeof helpers.api === "function" ? helpers.api : async () => null;
        const definirTab = typeof helpers.definirTab === "function" ? helpers.definirTab : () => null;
        const texto = typeof helpers.texto === "function" ? helpers.texto : (valor) => (valor == null ? "" : String(valor));
        const escapeAttr = typeof helpers.escapeAttr === "function"
            ? helpers.escapeAttr
            : (valor) => texto(valor).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
        const escapeHtml = typeof helpers.escapeHtml === "function"
            ? helpers.escapeHtml
            : (valor) => texto(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
        const feedback = typeof helpers.feedback === "function" ? helpers.feedback : () => null;
        const withBusy = typeof helpers.withBusy === "function" ? helpers.withBusy : async (_target, _busyText, callback) => callback();

        const bootstrapPortal = typeof actions.bootstrapPortal === "function" ? actions.bootstrapPortal : async () => null;

        const abrirSecaoAdmin = typeof surfaceModule.abrirSecaoAdmin === "function" ? surfaceModule.abrirSecaoAdmin : () => "overview";
        const renderAdmin = typeof surfaceModule.renderAdmin === "function" ? surfaceModule.renderAdmin : () => null;
        const renderAdminAuditoria = typeof surfaceModule.renderAdminAuditoria === "function" ? surfaceModule.renderAdminAuditoria : () => null;
        const obterGovernancaOperacionalTenant = typeof surfaceModule.obterGovernancaOperacionalTenant === "function"
            ? surfaceModule.obterGovernancaOperacionalTenant
            : () => ({ enabled: false, operationalUsersAtLimit: false, operationalUserLimit: null, operationalUsersInUse: 0, surfacesSummary: "" });
        const renderPreviewPlano = typeof surfaceModule.renderPreviewPlano === "function" ? surfaceModule.renderPreviewPlano : () => null;
        const renderUsuarios = typeof surfaceModule.renderUsuarios === "function" ? surfaceModule.renderUsuarios : () => null;
        const resolverSecaoAdminPorTarget = typeof surfaceModule.resolverSecaoAdminPorTarget === "function" ? surfaceModule.resolverSecaoAdminPorTarget : () => null;

        function coletarAllowedPortalsCreate() {
            return ["inspetor", "revisor"].filter((portal) => {
                const node = $(`usuario-acesso-${portal}`);
                return Boolean(node?.checked);
            });
        }

        function coletarAllowedPortalsUsuario(userId) {
            return Array.from(
                documentRef.querySelectorAll(`[data-user="${Number(userId)}"][data-field="allowed_portals"]`)
            )
                .filter((node) => node.checked)
                .map((node) => texto(node.dataset.portal).trim())
                .filter((portal) => portal && portal !== "cliente");
        }

        function absolutizarUrl(url) {
            const bruto = texto(url).trim();
            if (!bruto) return "";
            try {
                return new URL(bruto, windowRef.location.origin).toString();
            } catch (_) {
                return bruto;
            }
        }

        function normalizarCredencialTemporaria(payload, fallback = {}) {
            const origem = payload && typeof payload === "object" ? payload : {};
            const usuarioNome = texto(origem.usuario_nome || origem.usuarioNome || fallback.usuario_nome || fallback.usuarioNome).trim();
            const papel = texto(origem.papel || fallback.papel).trim();
            const login = texto(origem.login || fallback.login).trim();
            const senha = texto(origem.senha || fallback.senha || fallback.senha_temporaria).trim();
            const referencia = texto(origem.referencia || fallback.referencia).trim() || "Credencial temporária";
            const empresaNome = texto(origem.empresa_nome || origem.empresaNome || fallback.empresa_nome || fallback.empresaNome).trim();
            const orientacao = texto(origem.orientacao || fallback.orientacao).trim()
                || "Compartilhe a senha em canal seguro e oriente a troca obrigatoria no primeiro acesso.";
            const acessoInicialUrl = texto(origem.acesso_inicial_url || origem.acessoInicialUrl || fallback.acesso_inicial_url).trim();
            const portais = Array.isArray(origem.portais)
                ? origem.portais
                    .map((item) => {
                        if (!item || typeof item !== "object") return null;
                        const label = texto(item.label || item.portal).trim();
                        const loginUrl = texto(item.login_url || item.loginUrl).trim();
                        if (!label || !loginUrl) return null;
                        return {
                            label,
                            loginUrl,
                        };
                    })
                    .filter(Boolean)
                : [];

            if (!login || !senha) return null;

            return {
                referencia,
                empresaNome,
                usuarioNome: usuarioNome || "Usuário operacional",
                papel: papel || "Usuário operacional",
                login,
                senha,
                orientacao,
                acessoInicialUrl,
                portais,
            };
        }

        function textoCredencialTemporaria(credencial) {
            const linhas = [
                `${credencial.referencia}`,
                `Pessoa: ${credencial.usuarioNome}`,
                `Papel: ${credencial.papel}`,
                credencial.empresaNome ? `Empresa: ${credencial.empresaNome}` : "",
                `Login: ${credencial.login}`,
                `Senha temporária: ${credencial.senha}`,
                "",
                "Portais liberados:",
                ...(credencial.portais.length
                    ? credencial.portais.map((item) => `- ${item.label}: ${absolutizarUrl(item.loginUrl)}`)
                    : ["- Portal liberado conforme cadastro atual."]),
                credencial.acessoInicialUrl ? `Primeiro acesso guiado: ${absolutizarUrl(credencial.acessoInicialUrl)}` : "",
                "",
                `Orientação: ${credencial.orientacao}`,
            ];
            return linhas.filter(Boolean).join("\n");
        }

        async function copiarTexto(textoBruto) {
            const conteudo = texto(textoBruto).trim();
            if (!conteudo) {
                throw new Error("Nenhum dado de acesso disponível para copiar.");
            }
            if (windowRef.navigator?.clipboard?.writeText) {
                await windowRef.navigator.clipboard.writeText(conteudo);
                return;
            }
            const area = documentRef.createElement("textarea");
            area.value = conteudo;
            area.setAttribute("readonly", "readonly");
            area.style.position = "fixed";
            area.style.top = "-9999px";
            area.style.opacity = "0";
            documentRef.body.append(area);
            area.select();
            const copiou = documentRef.execCommand("copy");
            area.remove();
            if (!copiou) {
                throw new Error("Nao foi possivel copiar os dados automaticamente.");
            }
        }

        function ocultarCredencialTemporaria() {
            state.ui = state.ui || {};
            state.ui.adminCredencialTemporaria = null;
            const painel = $("admin-credencial-painel");
            const resumo = $("admin-credencial-resumo");
            const corpo = $("admin-credencial-body");
            if (resumo) {
                resumo.textContent = "Use este quadro para copiar o login temporário e orientar o primeiro acesso em canal seguro.";
            }
            if (corpo) {
                corpo.innerHTML = "";
            }
            if (painel) {
                painel.hidden = true;
            }
        }

        function renderCredencialTemporaria(payload, { scroll = false } = {}) {
            const painel = $("admin-credencial-painel");
            const resumo = $("admin-credencial-resumo");
            const corpo = $("admin-credencial-body");
            if (!painel || !resumo || !corpo) return;

            const credencial = normalizarCredencialTemporaria(payload);
            if (!credencial) {
                ocultarCredencialTemporaria();
                return;
            }

            state.ui = state.ui || {};
            state.ui.adminCredencialTemporaria = credencial;
            resumo.textContent = `${credencial.usuarioNome} recebeu uma senha temporária nova. Copie os dados abaixo e compartilhe em canal seguro.`;

            const portaisResumo = credencial.portais.length
                ? credencial.portais.map((item) => item.label).join(", ")
                : "Portal liberado conforme cadastro atual";

            corpo.innerHTML = `
                <div class="admin-credential-panel__intro">
                    <div class="context-guidance" data-tone="aprovado">
                        <div class="context-guidance-copy">
                            <small>${escapeHtml(credencial.referencia)}</small>
                            <strong>${escapeHtml(credencial.usuarioNome)}</strong>
                            <p>Essa senha acabou de ser gerada. Use este quadro para copiar tudo com calma antes de sair da tela.</p>
                        </div>
                        <span class="pill" data-kind="priority" data-status="aprovado">Senha pronta</span>
                    </div>
                    <p class="admin-credential-panel__hint">${escapeHtml(credencial.orientacao)}</p>
                </div>
                <div class="admin-credential-panel__grid">
                    <article class="admin-credential-field">
                        <small>Pessoa</small>
                        <p class="admin-credential-value">${escapeHtml(credencial.usuarioNome)}</p>
                    </article>
                    <article class="admin-credential-field">
                        <small>Papel</small>
                        <p class="admin-credential-value">${escapeHtml(credencial.papel)}</p>
                    </article>
                    <article class="admin-credential-field">
                        <small>Login</small>
                        <p class="admin-credential-value admin-credential-value--secret">${escapeHtml(credencial.login)}</p>
                    </article>
                    <article class="admin-credential-field">
                        <small>Senha temporária</small>
                        <p class="admin-credential-value admin-credential-value--secret">${escapeHtml(credencial.senha)}</p>
                    </article>
                    <article class="admin-credential-field">
                        <small>Empresa</small>
                        <p class="admin-credential-value">${escapeHtml(credencial.empresaNome || "Conta atual")}</p>
                    </article>
                    <article class="admin-credential-field">
                        <small>Portais liberados</small>
                        <p class="admin-credential-value">${escapeHtml(portaisResumo)}</p>
                    </article>
                </div>
                <div class="admin-credential-panel__links">
                    ${credencial.portais.map((item) => `
                        <a class="btn ghost" href="${escapeAttr(item.loginUrl)}" target="_blank" rel="noopener noreferrer">
                            Abrir ${escapeHtml(item.label)}
                        </a>
                    `).join("")}
                    ${credencial.acessoInicialUrl
                        ? `<a class="btn ghost" href="${escapeAttr(credencial.acessoInicialUrl)}" target="_blank" rel="noopener noreferrer">Abrir quadro de primeiro acesso</a>`
                        : ""}
                </div>
            `;

            painel.hidden = false;
            if (scroll) {
                try {
                    painel.scrollIntoView({ behavior: "smooth", block: "start" });
                } catch (_) {
                    painel.scrollIntoView();
                }
            }
        }

        function sincronizarAcessosFormularioCriacao() {
            const governance = obterGovernancaOperacionalTenant();
            const papel = texto($("usuario-papel")?.value).trim() || "inspetor";
            const acessoInspetor = $("usuario-acesso-inspetor");
            const acessoRevisor = $("usuario-acesso-revisor");
            const nota = $("usuario-acesso-nota");

            if (acessoInspetor) {
                acessoInspetor.checked = papel === "inspetor" ? true : Boolean(acessoInspetor.checked);
                acessoInspetor.disabled = papel === "inspetor";
                if (papel !== "inspetor" && !governance.operationalUserCrossPortalEnabled) {
                    acessoInspetor.checked = false;
                }
            }
            if (acessoRevisor) {
                acessoRevisor.checked = papel === "revisor" ? true : Boolean(acessoRevisor.checked);
                acessoRevisor.disabled = papel === "revisor";
                if (papel !== "revisor" && !governance.operationalUserCrossPortalEnabled) {
                    acessoRevisor.checked = false;
                }
            }
            if (nota) {
                nota.textContent = governance.enabled
                    ? "Esta conta usa acesso principal unificado. Novos usuários operacionais só podem ser criados se ainda houver vaga operacional livre."
                    : "Os acessos disponíveis seguem as liberações contratadas para esta conta.";
            }
            configurarCampoCrea("usuario-crea", "usuario-crea-field", papel === "revisor");
        }

        function configurarCampoCrea(inputId, wrapperId, habilitado) {
            const input = $(inputId);
            const wrapper = $(wrapperId);
            if (wrapper) wrapper.hidden = !habilitado;
            if (!input) return;
            input.disabled = !habilitado;
            if (!habilitado) input.value = "";
        }

        function abrirDrawerCriacaoEquipe() {
            const drawer = $("cliente-team-create-drawer");
            if (!drawer) return;
            drawer.hidden = false;
            drawer.scrollTop = 0;
            documentRef.body?.classList.add("cliente-team-screen-open");
            sincronizarAcessosFormularioCriacao();
            windowRef.setTimeout(() => $("usuario-nome")?.focus(), 30);
        }

        function fecharDrawerCriacaoEquipe() {
            const drawer = $("cliente-team-create-drawer");
            if (drawer) drawer.hidden = true;
            sincronizarTelaEquipeAberta();
        }

        function sincronizarTelaEquipeAberta() {
            const createOpen = $("cliente-team-create-drawer") && !$("cliente-team-create-drawer").hidden;
            const editOpen = $("cliente-team-edit-drawer") && !$("cliente-team-edit-drawer").hidden;
            documentRef.body?.classList.toggle("cliente-team-screen-open", Boolean(createOpen || editOpen));
        }

        function obterUsuarioEquipePorId(userId) {
            const id = Number(userId || 0);
            if (!Number.isFinite(id) || id <= 0) return null;
            return (state.bootstrap?.usuarios || []).find((item) => Number(item?.id || 0) === id) || null;
        }

        function portalLiberadoParaUsuario(usuario, portal, papelFallback) {
            const portais = Array.isArray(usuario?.allowed_portals) ? usuario.allowed_portals : [];
            const papel = texto(usuario?.papel).toLowerCase();
            const slug = papel.includes("avaliador") || papel.includes("mesa") || papel.includes("revisor")
                ? "revisor"
                : Number(usuario?.nivel_acesso || 0) === 80 || papel.includes("admin") || papel.includes("cliente")
                    ? "admin_cliente"
                    : "inspetor";
            return portais.includes(portal) || slug === papelFallback;
        }

        function configurarAcessoEdicao(usuario) {
            const governance = obterGovernancaOperacionalTenant();
            const papel = texto(usuario?.papel).toLowerCase();
            const baseRole = papel.includes("avaliador") || papel.includes("mesa") || papel.includes("revisor")
                ? "revisor"
                : Number(usuario?.nivel_acesso || 0) === 80 || papel.includes("admin") || papel.includes("cliente")
                    ? "admin_cliente"
                    : "inspetor";
            const controles = [
                {
                    id: "usuario-edicao-acesso-inspetor",
                    portal: "inspetor",
                    checked: portalLiberadoParaUsuario(usuario, "inspetor", "inspetor"),
                    disabled: baseRole === "inspetor",
                },
                {
                    id: "usuario-edicao-acesso-revisor",
                    portal: "revisor",
                    checked: portalLiberadoParaUsuario(usuario, "revisor", "revisor"),
                    disabled: baseRole === "revisor" ? true : !governance.operationalUserCrossPortalEnabled,
                },
            ];
            controles.forEach((item) => {
                const input = $(item.id);
                if (!input) return;
                input.checked = Boolean(item.checked);
                input.disabled = Boolean(item.disabled);
                input.dataset.portal = item.portal;
            });
            configurarCampoCrea("usuario-edicao-crea", "usuario-edicao-crea-field", baseRole === "revisor");
        }

        function abrirDrawerEdicaoUsuario(userId) {
            const usuario = obterUsuarioEquipePorId(userId);
            const drawer = $("cliente-team-edit-drawer");
            if (!usuario || !drawer) return;
            $("usuario-edicao-id").value = texto(usuario.id);
            $("usuario-edicao-nome").value = texto(usuario.nome || "");
            $("usuario-edicao-email").value = texto(usuario.email || "");
            $("usuario-edicao-telefone").value = texto(usuario.telefone || "");
            $("usuario-edicao-crea").value = texto(usuario.crea || "");
            const titulo = $("cliente-team-edit-title");
            const subtitulo = $("cliente-team-edit-subtitle");
            if (titulo) titulo.textContent = texto(usuario.nome || usuario.email || "Editar usuário");
            if (subtitulo) subtitulo.textContent = texto(usuario.email || "Atualize dados, permissões e módulos liberados.");
            configurarAcessoEdicao(usuario);
            drawer.hidden = false;
            drawer.scrollTop = 0;
            documentRef.body?.classList.add("cliente-team-screen-open");
            windowRef.setTimeout(() => $("usuario-edicao-nome")?.focus(), 30);
        }

        function fecharDrawerEdicaoUsuario() {
            const drawer = $("cliente-team-edit-drawer");
            if (drawer) drawer.hidden = true;
            sincronizarTelaEquipeAberta();
        }

        function coletarAllowedPortalsEdicao() {
            return ["inspetor", "revisor"].filter((portal) => {
                const node = $(`usuario-edicao-acesso-${portal}`);
                return Boolean(node?.checked);
            });
        }

        function campoAtivo(inputId) {
            const input = $(inputId);
            return Boolean(input && !input.disabled);
        }

        function aplicarFiltrosUsuarios({ busca = "", papel = "todos", userId = null } = {}) {
            state.ui.usuariosBusca = texto(busca).trim();
            state.ui.usuariosPapel = texto(papel).trim() || "todos";
            state.ui.usuariosSituacao = "";
            state.ui.usuarioEmDestaque = userId ? Number(userId) : null;
            abrirSecaoAdmin("team", { ensureRendered: true });

            if ($("usuarios-busca")) {
                $("usuarios-busca").value = state.ui.usuariosBusca;
            }
            if ($("usuarios-filtro-papel")) {
                $("usuarios-filtro-papel").value = state.ui.usuariosPapel;
            }
            if ($("usuarios-filtro-status")) {
                $("usuarios-filtro-status").value = "";
            }

            renderUsuarios();
        }

        function aplicarFiltroUsuariosRapido(situacao) {
            state.ui.usuariosBusca = "";
            state.ui.usuariosPapel = "todos";
            state.ui.usuariosSituacao = texto(situacao).trim();
            state.ui.usuarioEmDestaque = null;
            abrirSecaoAdmin("team", { ensureRendered: true });
            if ($("usuarios-busca")) $("usuarios-busca").value = "";
            if ($("usuarios-filtro-papel")) $("usuarios-filtro-papel").value = "todos";
            if ($("usuarios-filtro-status")) $("usuarios-filtro-status").value = state.ui.usuariosSituacao;
            renderUsuarios();
        }

        function limparFiltroUsuariosRapido() {
            state.ui.usuariosBusca = "";
            state.ui.usuariosPapel = "todos";
            state.ui.usuariosSituacao = "";
            state.ui.usuarioEmDestaque = null;
            abrirSecaoAdmin("team", { ensureRendered: true });
            if ($("usuarios-busca")) $("usuarios-busca").value = "";
            if ($("usuarios-filtro-papel")) $("usuarios-filtro-papel").value = "todos";
            if ($("usuarios-filtro-status")) $("usuarios-filtro-status").value = "";
            renderUsuarios();
        }

        function focarUsuarioNaTabela(userId, { expandir = true } = {}) {
            const id = Number(userId || 0);
            if (!Number.isFinite(id) || id <= 0) return;

            windowRef.setTimeout(() => {
                const linha = documentRef.querySelector(`[data-user-row="${id}"]`);
                if (!linha) return;
                if (expandir) {
                    const details = linha.querySelector(".user-editor");
                    if (details && !details.open) {
                        details.open = true;
                    }
                }
                try {
                    linha.scrollIntoView({ behavior: "smooth", block: "center" });
                } catch (_) {
                    linha.scrollIntoView();
                }
            }, 40);
        }

        async function registrarInteressePlano(plano, origem, extra = {}) {
            const nomePlano = texto(plano).trim();
            if (!nomePlano) return null;

            return api("/cliente/api/empresa/plano/interesse", {
                method: "POST",
                body: {
                    plano: nomePlano,
                    origem: texto(origem).trim().toLowerCase() || "admin",
                    urgencia: texto(extra.urgencia).trim(),
                    motivo: texto(extra.motivo).trim(),
                    observacoes: texto(extra.observacoes).trim(),
                },
            });
        }

        function fecharSolicitacaoHabilitacaoProfissional() {
            const details = $("cliente-management-habilitacao-request");
            if (details) details.open = false;
        }

        async function enviarEvidenciasHabilitacaoProfissional(signatarioId, arquivos) {
            const id = Number(signatarioId || 0);
            const lista = Array.from(arquivos || []).filter(Boolean);
            if (!Number.isFinite(id) || id <= 0 || !lista.length) return [];

            const statusNode = $("habilitacao-profissional-evidencias-status");
            const enviados = [];
            for (let index = 0; index < lista.length; index += 1) {
                const arquivo = lista[index];
                if (statusNode) {
                    statusNode.textContent = `Enviando comprovação ${index + 1} de ${lista.length}...`;
                }
                const formData = new FormData();
                formData.append("arquivo", arquivo);
                const resposta = await api(`/cliente/api/habilitacao-profissional/${id}/evidencias`, {
                    method: "POST",
                    body: formData,
                });
                if (resposta?.documento) {
                    enviados.push(resposta.documento);
                }
            }
            if (statusNode) {
                statusNode.textContent = enviados.length
                    ? `${enviados.length} comprovação(ões) enviada(s).`
                    : "";
            }
            return enviados;
        }

        async function prepararUpgradeGuiado({ origem = "admin", button = null } = {}) {
            const empresa = state.bootstrap?.empresa;
            const planoSugerido = texto(empresa?.plano_sugerido).trim();
            if (!planoSugerido) {
                feedback("Nao ha plano sugerido para registrar agora.", true);
                return;
            }

            await withBusy(button, "Preparando...", async () => {
                definirTab("admin");
                abrirSecaoAdmin("capacity", { ensureRendered: true });
                const seletor = $("empresa-plano");
                if (seletor) {
                    seletor.value = planoSugerido;
                }
                renderPreviewPlano();
                await registrarInteressePlano(planoSugerido, origem);
                await bootstrapPortal({ surface: "admin", force: true });
                if (seletor) {
                    seletor.value = planoSugerido;
                }
                renderPreviewPlano();
                feedback(`Interesse em ${planoSugerido} registrado no histórico da conta.`, false, "Solicitação registrada");
            }).catch((erro) => feedback(erro.message || "Falha ao registrar interesse comercial.", true));
        }

        function deveUsarNavegacaoNativa(event) {
            return Boolean(
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            );
        }

        function bindAdminActions() {
            documentRef.querySelectorAll("[data-team-drawer-open]").forEach((button) => {
                button.addEventListener("click", () => abrirDrawerCriacaoEquipe());
            });
            documentRef.querySelectorAll("[data-team-drawer-close]").forEach((button) => {
                button.addEventListener("click", () => fecharDrawerCriacaoEquipe());
            });
            documentRef.querySelectorAll("[data-team-edit-close]").forEach((button) => {
                button.addEventListener("click", () => fecharDrawerEdicaoUsuario());
            });
            windowRef.addEventListener("keydown", (event) => {
                if (event.key !== "Escape") return;
                fecharDrawerCriacaoEquipe();
                fecharDrawerEdicaoUsuario();
            });

            $("empresa-plano")?.addEventListener("change", () => {
                abrirSecaoAdmin("capacity", { ensureRendered: true });
                renderPreviewPlano();
            });

            $("form-plano")?.addEventListener("submit", async (event) => {
                event.preventDefault();
                const button = event.submitter || event.target.querySelector('button[type="submit"]');
                const planoSelecionado = $("empresa-plano")?.value || "";
                const urgencia = $("empresa-plano-urgencia")?.value || "";
                const motivo = $("empresa-plano-motivo")?.value || "";
                const observacoes = $("empresa-plano-observacoes")?.value || "";
                abrirSecaoAdmin("capacity", { ensureRendered: true });
                await withBusy(button, "Registrando...", async () => {
                    await registrarInteressePlano(planoSelecionado, "admin", {
                        urgencia,
                        motivo,
                        observacoes,
                    });
                    await bootstrapPortal({ surface: "admin", force: true });
                    feedback(
                        `Interesse em ${planoSelecionado} registrado no histórico do portal.`,
                        false,
                        "Solicitacao registrada"
                    );
                }).catch((erro) => feedback(erro.message || "Falha ao registrar interesse no plano.", true));
            });

            $("form-habilitacao-profissional")?.addEventListener("submit", async (event) => {
                event.preventDefault();
                const button = event.submitter || event.target.querySelector('button[type="submit"]');
                const arquivos = Array.from($("habilitacao-profissional-evidencias")?.files || []);
                await withBusy(button, "Enviando...", async () => {
                    const resposta = await api("/cliente/api/habilitacao-profissional", {
                        method: "POST",
                        body: {
                            nome: $("habilitacao-profissional-nome")?.value || "",
                            tipo_profissional: $("habilitacao-profissional-tipo")?.value || "profissional_habilitado",
                            registro_profissional: $("habilitacao-profissional-registro")?.value || "",
                            email: $("habilitacao-profissional-email")?.value || "",
                            telefone: $("habilitacao-profissional-telefone")?.value || "",
                            observacoes: $("habilitacao-profissional-observacoes")?.value || "",
                        },
                    });
                    const documentos = await enviarEvidenciasHabilitacaoProfissional(resposta?.signatario_id, arquivos);
                    if (resposta?.habilitacao) {
                        state.bootstrap = state.bootstrap || {};
                        state.bootstrap.professional_habilitation = resposta.habilitacao;
                    }
                    event.target.reset();
                    fecharSolicitacaoHabilitacaoProfissional();
                    await bootstrapPortal({ surface: "admin", force: true });
                    feedback(
                        documentos.length
                            ? `Solicitação enviada com ${documentos.length} comprovação(ões).`
                            : "Solicitação enviada para análise da Tariel.",
                        false,
                        "Habilitação em análise"
                    );
                }).catch((erro) => feedback(erro.message || "Falha ao solicitar análise profissional.", true));
            });

            documentRef.querySelectorAll("[data-habilitacao-request-close]").forEach((button) => {
                button.addEventListener("click", () => {
                    $("form-habilitacao-profissional")?.reset();
                    fecharSolicitacaoHabilitacaoProfissional();
                });
            });

            $("form-usuario")?.addEventListener("submit", async (event) => {
                event.preventDefault();
                const button = event.submitter || event.target.querySelector('button[type="submit"]');
                abrirSecaoAdmin("team", { ensureRendered: true });
                const governance = obterGovernancaOperacionalTenant();
                if (governance.enabled && governance.operationalUsersAtLimit) {
                    feedback(
                        `Esta conta usa ${governance.operatingModelLabel}. A conta operacional única já está ocupada (${governance.operationalUsersInUse}/${governance.operationalUserLimit}). Libere uma vaga antes de criar outra pessoa.`,
                        true
                    );
                    return;
                }
                await withBusy(button, "Criando...", async () => {
                    const payload = {
                        nome: $("usuario-nome").value,
                        email: $("usuario-email").value,
                        nivel_acesso: $("usuario-papel").value,
                        telefone: $("usuario-telefone").value,
                        allowed_portals: coletarAllowedPortalsCreate(),
                    };
                    if (campoAtivo("usuario-crea")) {
                        payload.crea = $("usuario-crea").value;
                    }
                    const resposta = await api("/cliente/api/usuarios", {
                        method: "POST",
                        body: payload,
                    });
                    event.target.reset();
                    sincronizarAcessosFormularioCriacao();
                    fecharDrawerCriacaoEquipe();
                    await bootstrapPortal({ surface: "admin", force: true });
                    renderCredencialTemporaria(
                        resposta.credencial_onboarding || {
                            usuario_nome: resposta.usuario?.nome,
                            papel: resposta.usuario?.papel,
                            login: resposta.usuario?.email,
                            senha_temporaria: resposta.senha_temporaria,
                        },
                        { scroll: true }
                    );
                    feedback(`Usuário criado. Senha temporária: ${resposta.senha_temporaria}`);
                }).catch((erro) => feedback(erro.message || "Falha ao criar usuário.", true));
            });

            $("usuario-papel")?.addEventListener("change", () => {
                sincronizarAcessosFormularioCriacao();
            });

            $("form-usuario-edicao")?.addEventListener("submit", async (event) => {
                event.preventDefault();
                const userId = Number($("usuario-edicao-id")?.value || 0);
                if (!Number.isFinite(userId) || userId <= 0) return;
                const button = event.submitter || $("btn-usuario-edicao-salvar");
                const payload = {
                    nome: $("usuario-edicao-nome")?.value || "",
                    email: $("usuario-edicao-email")?.value || "",
                    telefone: $("usuario-edicao-telefone")?.value || "",
                    allowed_portals: coletarAllowedPortalsEdicao(),
                };
                if (campoAtivo("usuario-edicao-crea")) {
                    payload.crea = $("usuario-edicao-crea")?.value || "";
                }
                await withBusy(button, "Salvando...", async () => {
                    await api(`/cliente/api/usuarios/${userId}`, {
                        method: "PATCH",
                        body: payload,
                    });
                    fecharDrawerEdicaoUsuario();
                    await bootstrapPortal({ surface: "admin", force: true });
                    feedback("Cadastro do usuário atualizado.");
                }).catch((erro) => feedback(erro.message || "Falha ao atualizar usuário.", true));
            });

            const tratarAcaoUsuario = async (event) => {
                const button = event.target.closest("button[data-act][data-user]");
                if (!button) return;

                const userId = Number(button.dataset.user || 0);
                if (!Number.isFinite(userId) || userId <= 0) return;
                abrirSecaoAdmin("team", { ensureRendered: true });

                try {
                    if (button.dataset.act === "edit-user") {
                        abrirDrawerEdicaoUsuario(userId);
                        return;
                    }

                    if (button.dataset.act === "reset-user") {
                        await withBusy(button, "Gerando...", async () => {
                            const resposta = await api(`/cliente/api/usuarios/${userId}/resetar-senha`, { method: "POST" });
                            await bootstrapPortal({ surface: "admin", force: true });
                            renderCredencialTemporaria(
                                resposta.credencial_onboarding || {
                                    senha_temporaria: resposta.senha_temporaria,
                                },
                                { scroll: true }
                            );
                            feedback(`Senha temporária: ${resposta.senha_temporaria}`);
                        });
                        return;
                    }

                    if (button.dataset.act === "toggle-user") {
                        const nomeUsuario = String(
                            button.closest("tr")?.querySelector(".user-name")?.textContent
                            || "este usuário"
                        ).trim();
                        const confirmou = windowRef.confirm(`Alterar o status de acesso de ${nomeUsuario}?`);
                        if (!confirmou) return;

                        await withBusy(button, "Atualizando...", async () => {
                            await api(`/cliente/api/usuarios/${userId}/bloqueio`, { method: "PATCH" });
                            await bootstrapPortal({ surface: "admin", force: true });
                            feedback("Status do usuário atualizado.");
                        });
                        return;
                    }

                    if (button.dataset.act === "delete-user") {
                        const nomeUsuario = String(
                            documentRef.querySelector(`[data-user="${userId}"][data-field="nome"]`)?.value
                            || button.closest("tr")?.querySelector(".user-name")?.textContent
                            || "este usuário"
                        ).trim();
                        const confirmou = windowRef.confirm(
                            `Excluir definitivamente ${nomeUsuario}? O histórico operacional será preservado sem o cadastro do usuário.`
                        );
                        if (!confirmou) {
                            return;
                        }

                        await withBusy(button, "Excluindo...", async () => {
                            await api(`/cliente/api/usuarios/${userId}`, { method: "DELETE" });
                            await bootstrapPortal({ surface: "admin", force: true });
                            feedback("Cadastro operacional excluido.");
                        });
                        return;
                    }

                    const campos = Array.from(documentRef.querySelectorAll(`[data-user="${userId}"][data-field]`));
                    const payload = Object.fromEntries(
                        campos
                            .filter((campo) => texto(campo.dataset.field).trim() !== "allowed_portals")
                            .map((campo) => [campo.dataset.field, campo.value])
                    );
                    payload.allowed_portals = coletarAllowedPortalsUsuario(userId);

                    await withBusy(button, "Salvando...", async () => {
                        await api(`/cliente/api/usuarios/${userId}`, {
                            method: "PATCH",
                            body: payload,
                        });
                        await bootstrapPortal({ surface: "admin", force: true });
                        feedback("Cadastro do usuário atualizado.");
                    });
                } catch (erro) {
                    feedback(erro.message || "Falha ao atualizar usuário.", true);
                }
            };

            $("lista-usuarios")?.addEventListener("click", tratarAcaoUsuario);
            $("admin-onboarding-lista")?.addEventListener("click", tratarAcaoUsuario);
            $("btn-admin-credencial-ocultar")?.addEventListener("click", () => {
                ocultarCredencialTemporaria();
            });
            $("btn-admin-credencial-copiar")?.addEventListener("click", async () => {
                const credencial = state.ui?.adminCredencialTemporaria || null;
                if (!credencial) {
                    feedback("Nenhum dado temporário está aberto para cópia.", true);
                    return;
                }
                try {
                    await copiarTexto(textoCredencialTemporaria(credencial));
                    feedback("Dados de acesso copiados para a área de transferência.", false, "Acesso copiado");
                } catch (erro) {
                    feedback(erro.message || "Falha ao copiar os dados de acesso.", true);
                }
            });

            $("admin-auditoria-filtros")?.addEventListener("click", (event) => {
                const button = event.target?.closest?.("[data-audit-filter]");
                if (!button) return;
                state.ui.adminAuditFilter = texto(button.dataset.auditFilter).trim() || "all";
                abrirSecaoAdmin("support", { ensureRendered: true });
                renderAdminAuditoria();
            });

            $("admin-auditoria-busca")?.addEventListener("input", (event) => {
                state.ui.adminAuditSearch = event.target.value || "";
                abrirSecaoAdmin("support", { ensureRendered: true });
                renderAdminAuditoria();
            });

            $("btn-admin-auditoria-limpar")?.addEventListener("click", () => {
                state.ui.adminAuditFilter = "all";
                state.ui.adminAuditSearch = "";
                if ($("admin-auditoria-busca")) {
                    $("admin-auditoria-busca").value = "";
                }
                abrirSecaoAdmin("support", { ensureRendered: true });
                renderAdminAuditoria();
            });

            $("btn-exportar-diagnostico")?.addEventListener("click", () => {
                const diagnosticoUrl = texto(state.bootstrap?.portal?.diagnostico_url).trim() || "/cliente/api/diagnostico";
                windowRef.location.assign(diagnosticoUrl);
            });

            $("btn-whatsapp-suporte")?.addEventListener("click", () => {
                const whatsapp = texto(state.bootstrap?.portal?.suporte_whatsapp).trim();
                if (!whatsapp) {
                    feedback("Canal de suporte ainda não foi configurado para este portal.", true);
                    return;
                }
                windowRef.open(`https://wa.me/${encodeURIComponent(whatsapp)}`, "_blank", "noopener");
            });

            $("form-suporte-cliente")?.addEventListener("submit", async (event) => {
                event.preventDefault();
                const button = event.submitter || event.target.querySelector('button[type="submit"]');
                await withBusy(button, "Registrando...", async () => {
                    const resposta = await api("/cliente/api/suporte/report", {
                        method: "POST",
                        body: {
                            tipo: "feedback",
                            titulo: $("suporte-titulo")?.value || "",
                            email_retorno: $("suporte-email")?.value || "",
                            mensagem: $("suporte-mensagem")?.value || "",
                            contexto: `portal=cliente; empresa_id=${texto(state.bootstrap?.empresa?.id)}; tab=${texto(state.ui?.tab)}`,
                        },
                    });
                    event.target.reset();
                    await bootstrapPortal({ surface: "admin", force: true });
                    feedback(
                        `Suporte registrado com protocolo ${resposta.protocolo}.`,
                        false,
                        "Protocolo aberto"
                    );
                }).catch((erro) => feedback(erro.message || "Falha ao registrar suporte.", true));
            });

            sincronizarAcessosFormularioCriacao();
        }

        return {
            ...surfaceModule,
            aplicarFiltrosUsuarios,
            aplicarFiltroUsuariosRapido,
            bindAdminActions,
            focarUsuarioNaTabela,
            limparFiltroUsuariosRapido,
            prepararUpgradeGuiado,
            registrarInteressePlano,
            renderAdmin,
            renderPreviewPlano,
            renderUsuarios,
            resolverSecaoAdminPorTarget,
        };
    };
})();
