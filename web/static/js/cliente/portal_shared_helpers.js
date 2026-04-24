(function () {
  "use strict";

  if (window.TarielClientePortalSharedHelpers) return;

  window.TarielClientePortalSharedHelpers =
    function createTarielClientePortalSharedHelpers(config = {}) {
      const state = config.state || {};
      const documentRef = config.documentRef || document;
      const $ =
        typeof config.getById === "function"
          ? config.getById
          : (id) => documentRef.getElementById(id);
      const helpers = config.helpers || {};

      const escapeAttr =
        typeof helpers.escapeAttr === "function"
          ? helpers.escapeAttr
          : (valor) => String(valor ?? "");
      const escapeHtml =
        typeof helpers.escapeHtml === "function"
          ? helpers.escapeHtml
          : (valor) => String(valor ?? "");
      const formatarBytes =
        typeof helpers.formatarBytes === "function"
          ? helpers.formatarBytes
          : (valor) => String(Number(valor || 0));
      const resumoCanalOperacional =
        typeof helpers.resumoCanalOperacional === "function"
          ? helpers.resumoCanalOperacional
          : (canal) => String(canal ?? "");
      const texto =
        typeof helpers.texto === "function"
          ? helpers.texto
          : (valor) => (valor == null ? "" : String(valor));

      const STATIC_HTML_CONTRACTS = Object.freeze({
        mesaReplyPolicyHint: Object.freeze({
          readOnly: '<span class="hero-chip">Superfície indisponível</span>',
          editable:
            '<span class="hero-chip">Resposta contextual mantém o caso na mesa</span>',
        }),
        mesaReplyPolicyNote: Object.freeze({
          readOnly:
            '<div class="form-hint" data-tone="aguardando"><strong>Mesa indisponível</strong><span>Esta superfície precisa estar contratada para operar avaliações pelo portal cliente.</span></div>',
          editable: "",
        }),
        mesaMessagePolicyNote: Object.freeze({
          readOnly:
            '<div class="form-hint" data-tone="aguardando"><strong>Mesa indisponível</strong><span>Esta superfície precisa estar contratada para responder, anexar ou resolver pendências.</span></div>',
          editable:
            '<div class="form-hint" data-tone="aguardando"><strong>Resposta contextual</strong><span>Enviar resposta ou anexo não devolve o caso automaticamente. Use <em>Devolver</em> quando o laudo precisar voltar para correção.</span></div>',
        }),
        chatReadOnlyHint: Object.freeze({
          readOnly: '<span class="hero-chip">Superfície indisponível</span>',
          editable: "",
        }),
        chatCasePolicyNote: Object.freeze({
          readOnly:
            '<div class="form-hint" data-tone="aguardando"><strong>Chat indisponível</strong><span>Esta superfície precisa estar contratada para operar casos pelo portal cliente.</span></div>',
          editable: "",
        }),
        chatMessagePolicyNote: Object.freeze({
          readOnly:
            '<div class="form-hint" data-tone="aguardando"><strong>Escrita bloqueada</strong><span>Você pode acompanhar o caso e marcar avisos como lidos, mas não pode enviar mensagem, documento nem abrir novo laudo.</span></div>',
          editable: "",
        }),
      });

      function renderStaticContractHtml(
        targetId,
        contractName,
        variant,
        options = {},
      ) {
        const container = $(targetId);
        if (!container) return false;

        const contract = STATIC_HTML_CONTRACTS[contractName];
        const key = texto(variant || "default");
        const html =
          contract && Object.prototype.hasOwnProperty.call(contract, key)
            ? contract[key]
            : "";

        if (typeof options.hidden === "boolean") {
          container.hidden = options.hidden;
        }
        container.innerHTML = html;
        return true;
      }

      function clearElement(target) {
        const container =
          typeof target === "string" ? $(target) : target || null;
        if (!container) return false;
        if (typeof container.replaceChildren === "function") {
          container.replaceChildren();
        } else {
          container.textContent = "";
        }
        return true;
      }

      function renderAnexos(anexos) {
        const itens = Array.isArray(anexos) ? anexos : [];
        if (!itens.length) return "";

        return `
                <div class="attachment-list">
                    ${itens
                      .map((anexo) => {
                        const url = texto(anexo.url || "");
                        const link = url
                          ? `<a class="attachment-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">Abrir</a>`
                          : `<span class="attachment-link" aria-hidden="true">Disponivel</span>`;

                        return `
                            <div class="attachment-item">
                                <div class="attachment-copy">
                                    <span class="attachment-name">${escapeHtml(anexo.nome || "Anexo")}</span>
                                    <span class="attachment-meta">${escapeHtml(anexo.categoria || "arquivo")} • ${formatarBytes(anexo.tamanho_bytes || 0)}</span>
                                </div>
                                ${link}
                            </div>
                        `;
                      })
                      .join("")}
                </div>
            `;
      }

      function renderAvisosOperacionais(canal, targetId) {
        const container = $(targetId);
        if (!container) return;

        const avisos = (
          state.bootstrap?.empresa?.avisos_operacionais || []
        ).filter((item) => texto(item?.canal) === canal);
        if (!avisos.length) {
          clearElement(container);
          return;
        }

        container.innerHTML = avisos
          .map(
            (item) => `
                <div class="context-guidance operational-warning" data-tone="${escapeAttr(item.tone || "aberto")}">
                    <div class="context-guidance-copy">
                        <small>${escapeHtml(resumoCanalOperacional(canal))}</small>
                        <strong>${escapeHtml(item.titulo || item.badge || "Aviso operacional")}</strong>
                        <p>${escapeHtml(item.detalhe || "")}</p>
                        ${item.acao ? `<p>${escapeHtml(item.acao)}</p>` : ""}
                        ${
                          state.bootstrap?.empresa?.plano_sugerido
                            ? `<div class="toolbar-meta"><button class="btn" type="button" data-act="preparar-upgrade" data-origem="${escapeAttr(canal)}">Registrar interesse em ${escapeHtml(state.bootstrap.empresa.plano_sugerido)}</button></div>`
                            : ""
                        }
                    </div>
                    <span class="pill" data-kind="priority" data-status="${escapeAttr(item.tone || "aberto")}">${escapeHtml(item.badge || "Acompanhar")}</span>
                </div>
            `,
          )
          .join("");
      }

      return {
        clearElement,
        renderAnexos,
        renderAvisosOperacionais,
        renderStaticContractHtml,
      };
    };
})();
