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

      function renderEmptyState(target, options = {}) {
        const container =
          typeof target === "string" ? $(target) : target || null;
        if (!container) return false;

        clearElement(container);
        const empty = documentRef.createElement("div");
        empty.className = "empty-state";

        const title = documentRef.createElement("strong");
        title.textContent = texto(options.title || "Nenhum item encontrado");
        empty.appendChild(title);

        const detail = texto(options.detail || "").trim();
        if (detail) {
          const paragraph = documentRef.createElement("p");
          paragraph.textContent = detail;
          empty.appendChild(paragraph);
        }

        container.appendChild(empty);
        return true;
      }

      function renderHeroChipList(target, chips) {
        const container =
          typeof target === "string" ? $(target) : target || null;
        if (!container) return false;

        clearElement(container);
        (Array.isArray(chips) ? chips : [])
          .map((item) => texto(item).trim())
          .filter(Boolean)
          .forEach((item) => {
            const chip = documentRef.createElement("span");
            chip.className = "hero-chip";
            chip.textContent = item;
            container.appendChild(chip);
          });
        return true;
      }

      function renderGroupedSelectOptions(target, options, config = {}) {
        const select = typeof target === "string" ? $(target) : target || null;
        if (!select) return null;

        const itens = Array.isArray(options) ? options : [];
        const valueOf =
          typeof config.valueOf === "function"
            ? config.valueOf
            : (item) => texto(item?.value).trim();
        const labelOf =
          typeof config.labelOf === "function"
            ? config.labelOf
            : (item) => texto(item?.label).trim() || valueOf(item);
        const groupOf =
          typeof config.groupOf === "function"
            ? config.groupOf
            : (item) =>
                texto(item?.group_label).trim() ||
                texto(config.defaultGroupLabel || "Catálogo oficial").trim();
        const signature = texto(
          config.signature ||
            JSON.stringify(
              itens.map((item) => [valueOf(item), labelOf(item), groupOf(item)]),
            ),
        );

        if (signature && select.dataset.catalogSignature === signature) {
          return { changed: false, value: texto(select.value).trim() };
        }

        const valorAtual = texto(config.currentValue ?? select.value).trim();
        clearElement(select);

        const grupos = new Map();
        itens.forEach((item) => {
          const value = valueOf(item);
          if (!value) return;
          const group = groupOf(item) || "Catálogo oficial";
          if (!grupos.has(group)) {
            grupos.set(group, []);
          }
          grupos.get(group).push({ item, value });
        });

        grupos.forEach((grupoItens, grupo) => {
          const optgroup = documentRef.createElement("optgroup");
          optgroup.label = grupo;
          grupoItens.forEach(({ item, value }) => {
            const option = documentRef.createElement("option");
            option.value = value;
            option.textContent = labelOf(item);
            optgroup.appendChild(option);
          });
          select.appendChild(optgroup);
        });

        const valoresValidos = itens.map((item) => valueOf(item)).filter(Boolean);
        const valor = valoresValidos.includes(valorAtual)
          ? valorAtual
          : valoresValidos[0] || "";
        select.value = valor;
        if (signature) {
          select.dataset.catalogSignature = signature;
        } else {
          delete select.dataset.catalogSignature;
        }
        return { changed: true, value: valor };
      }

      function appendTextWithBreaks(target, value) {
        const container =
          typeof target === "string" ? $(target) : target || null;
        if (!container) return false;

        const linhas = texto(value || "").split("\n");
        linhas.forEach((linha, index) => {
          if (index > 0) {
            container.appendChild(documentRef.createElement("br"));
          }
          container.appendChild(documentRef.createTextNode(linha));
        });
        return true;
      }

      function appendAnexos(target, anexos) {
        const container =
          typeof target === "string" ? $(target) : target || null;
        if (!container) return false;

        const itens = Array.isArray(anexos) ? anexos : [];
        if (!itens.length) return true;

        const lista = documentRef.createElement("div");
        lista.className = "attachment-list";
        itens.forEach((anexo) => {
          const item = documentRef.createElement("div");
          item.className = "attachment-item";

          const copy = documentRef.createElement("div");
          copy.className = "attachment-copy";

          const name = documentRef.createElement("span");
          name.className = "attachment-name";
          name.textContent = texto(anexo?.nome || "Anexo");
          copy.appendChild(name);

          const meta = documentRef.createElement("span");
          meta.className = "attachment-meta";
          meta.textContent = `${texto(anexo?.categoria || "arquivo")} • ${formatarBytes(anexo?.tamanho_bytes || 0)}`;
          copy.appendChild(meta);

          item.appendChild(copy);
          const url = texto(anexo?.url || "").trim();
          if (url) {
            const link = documentRef.createElement("a");
            link.className = "attachment-link";
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Abrir";
            item.appendChild(link);
          } else {
            const available = documentRef.createElement("span");
            available.className = "attachment-link";
            available.setAttribute("aria-hidden", "true");
            available.textContent = "Disponivel";
            item.appendChild(available);
          }
          lista.appendChild(item);
        });

        container.appendChild(lista);
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
        appendAnexos,
        appendTextWithBreaks,
        clearElement,
        renderEmptyState,
        renderAnexos,
        renderAvisosOperacionais,
        renderGroupedSelectOptions,
        renderHeroChipList,
        renderStaticContractHtml,
      };
    };
})();
