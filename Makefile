SHELL := /bin/bash
WEB_PYTHON := $(shell [ -x web/.venv-linux/bin/python ] && echo web/.venv-linux/bin/python || echo python)
WEB_PYTHON_IN_WEB := $(shell [ -x web/.venv-linux/bin/python ] && echo ./.venv-linux/bin/python || echo python)
PRE_COMMIT := $(WEB_PYTHON) -m pre_commit

.PHONY: help doctor bootstrap hooks-install web-lint web-typecheck web-test web-ci mesa-smoke mesa-acceptance document-acceptance document-pdf-qa document-pdf-qa-full observability-acceptance hygiene-check binary-assets-audit binary-assets-audit-strict hygiene-acceptance v2-acceptance post-plan-benchmarks contract-check document-contract-check smoke-web demo-local-reset full-regression-audit full-regression-audit-critical full-regression-audit-hosted full-regression-audit-human full-regression-audit-exhaustive full-regression-audit-exhaustive-hosted full-regression-audit-exhaustive-human mobile-install mobile-lint mobile-typecheck mobile-test mobile-format-check mobile-baseline mobile-preview mobile-wifi mobile-native-preflight mobile-acceptance mobile-ci smoke-mobile python-security-audit mobile-security-audit public-repo-secret-scan security-audit verify release-verify-local release-verify production-ops-check production-ops-check-strict uploads-restore-drill uploads-cleanup-check uploads-cleanup-apply post-deploy-cleanup-observation release-gate-hosted release-gate-real release-gate final-product-stamp clean-generated baseline-snapshot ci

help: ## Lista comandos úteis do repositório
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

doctor: ## Mostra versões e dependências básicas do ambiente local
	@echo "git: $$(git --version 2>/dev/null || echo missing)"
	@echo "python: $$($(WEB_PYTHON) --version 2>&1 || echo missing)"
	@echo "node: $$(node --version 2>/dev/null || echo missing)"
	@echo "npm: $$(npm --version 2>/dev/null || echo missing)"
	@echo "codex: $$(codex --version 2>/dev/null || echo missing)"
	@echo "psql: $$(psql --version 2>/dev/null || echo missing)"
	@echo "redis: $$(redis-server --version 2>/dev/null || echo missing)"
	@echo "tesseract: $$(tesseract --version 2>/dev/null | head -n 1 || echo missing)"
	@echo "exiftool: $$(exiftool -ver 2>/dev/null || echo missing)"
	@echo "vips: $$(vips --version 2>/dev/null || echo missing)"

bootstrap: mobile-install ## Instala dependências JS e lembra o setup do web
	@echo "web: confira README.md e o ambiente local em web/.venv-linux antes de rodar a baseline"

hooks-install: ## Instala hooks de pre-commit e pre-push
	$(PRE_COMMIT) install --hook-type pre-commit --hook-type pre-push

web-lint: ## Roda ruff no workspace web
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m ruff check .

web-typecheck: ## Roda mypy progressivo no workspace web
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m mypy --config-file pyproject.toml

web-test: ## Roda a suíte crítica do workspace web
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m pytest -q tests/test_smoke.py tests/test_regras_rotas_criticas.py tests/test_inspetor_comandos_dominio.py tests/test_inspetor_confianca_dominio.py tests/test_operational_memory.py
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m pytest -q tests/test_tenant_access.py

web-ci: web-lint web-typecheck web-test ## Executa os checks principais do web

mesa-smoke: ## Executa o gate oficial local da Mesa SSR
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m pytest -q \
		tests/test_reviewer_panel_boot_hotfix.py \
		tests/test_revisor_command_handlers.py \
		tests/test_revisor_command_side_effects.py \
		tests/test_revisor_mesa_api_side_effects.py \
		tests/test_revisor_realtime.py \
		tests/test_revisor_ws.py \
		tests/test_template_publish_contract.py \
		tests/test_v2_reviewdesk_projection.py \
		tests/test_v2_review_queue_projection.py \
		tests/test_mesa_mobile_sync.py

mesa-acceptance: ## Executa o aceite operacional da Mesa SSR via Playwright no workspace web
	cd web && RUN_E2E=1 PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m pytest -q \
		tests/e2e/test_portais_playwright.py::test_e2e_revisor_ui_responde_e_inspetor_recebe \
		tests/e2e/test_portais_playwright.py::test_e2e_revisor_exibe_painel_operacional_da_mesa \
		tests/e2e/test_portais_playwright.py::test_e2e_revisor_mesa_ignora_respostas_atrasadas_ao_trocar_de_laudo \
		--browser chromium \
		--tracing retain-on-failure \
		--video retain-on-failure \
		--screenshot only-on-failure \
		--output test-results/playwright-mesa \
		-s

document-acceptance: ## Executa o runner oficial da Fase 09 - Documento, template e IA
	python3 scripts/run_document_phase_acceptance.py

document-pdf-qa: ## Executa QA local rápida focada em PDF/documento
	python3 scripts/run_document_pdf_qa.py --profile quick

document-pdf-qa-full: ## Executa QA local ampla focada em PDF/documento
	python3 scripts/run_document_pdf_qa.py --profile full

observability-acceptance: ## Executa o runner oficial da Fase 10 - Observabilidade, operação e segurança
	python3 scripts/run_observability_phase_acceptance.py

hygiene-check: ## Valida a política de artifacts, ignores e disciplina operacional local
	python3 scripts/check_workspace_hygiene.py

binary-assets-audit: ## Audita binarios rastreados no Git sem alterar historico
	python3 scripts/audit_tracked_binaries.py

binary-assets-audit-strict: ## Falha se houver binario rastreado acima de 10 MiB
	python3 scripts/audit_tracked_binaries.py --strict --threshold-mb 10

hygiene-acceptance: ## Executa o runner oficial da Fase 11 - Higiene permanente e governança
	python3 scripts/run_hygiene_phase_acceptance.py

v2-acceptance: ## Executa o runner oficial da Fase 12 - Evolução estrutural V2
	python3 scripts/run_v2_phase_acceptance.py

post-plan-benchmarks: ## Executa o runner versionado dos benchmarks pós-plano
	python3 scripts/run_post_plan_benchmarks.py

contract-check: ## Valida contratos sensíveis do backend e mobile público
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m pytest -q tests/test_transaction_contract.py tests/test_tenant_access.py tests/test_v2_android_public_contract.py tests/test_v2_admin_contract_catalogs.py

document-contract-check: ## Valida o PDF do chat livre; requer `pypdf` no Python do workspace web
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -c "import importlib.util, sys; modulo = importlib.util.find_spec('pypdf'); print('pypdf: ok' if modulo else 'pypdf: missing'); sys.exit(0 if modulo else 1)"
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m pytest -q tests/test_free_chat_report_pdf.py

smoke-web: ## Executa smoke crítico do inspetor e fluxos web
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) -m pytest -q tests/test_smoke.py tests/test_regras_rotas_criticas.py

demo-local-reset: ## Recria o tenant de demo local com empresa, usuarios e laudo prontos para apresentacao
	cd web && PYTHONPATH=. $(WEB_PYTHON_IN_WEB) scripts/seed_local_demo_company.py --reset

full-regression-audit: ## Executa regressão ampla local no perfil broad
	python3 scripts/run_full_regression_audit.py --profile broad

full-regression-audit-critical: ## Executa a rodada crítica e mais curta do runner
	python3 scripts/run_full_regression_audit.py --profile critical

full-regression-audit-hosted: ## Executa regressão broad local + jornada online hospedada
	TARIEL_AUDIT_BASE_URL=$${TARIEL_AUDIT_BASE_URL:-https://tariel-web-free.onrender.com} python3 scripts/run_full_regression_audit.py --profile broad

full-regression-audit-human: ## Executa auditoria mais lenta e visual no perfil exaustivo
	TARIEL_AUDIT_BASE_URL=$${TARIEL_AUDIT_BASE_URL:-https://tariel-web-free.onrender.com} python3 scripts/run_full_regression_audit.py --profile exhaustive --human-paced

full-regression-audit-exhaustive: ## Executa a varredura automatizada mais ampla do repositório
	python3 scripts/run_full_regression_audit.py --profile exhaustive

full-regression-audit-exhaustive-hosted: ## Executa a varredura automatizada mais ampla + jornada online hospedada
	TARIEL_AUDIT_BASE_URL=$${TARIEL_AUDIT_BASE_URL:-https://tariel-web-free.onrender.com} python3 scripts/run_full_regression_audit.py --profile exhaustive

full-regression-audit-exhaustive-human: ## Executa a varredura mais ampla com ritmo humano e jornada online
	TARIEL_AUDIT_BASE_URL=$${TARIEL_AUDIT_BASE_URL:-https://tariel-web-free.onrender.com} python3 scripts/run_full_regression_audit.py --profile exhaustive --human-paced

mobile-install: ## Instala dependências do workspace mobile
	cd android && npm install

mobile-lint: ## Roda ESLint no workspace mobile
	cd android && npm run lint

mobile-typecheck: ## Roda TypeScript no workspace mobile
	cd android && npm run typecheck

mobile-test: ## Roda Jest no workspace mobile
	cd android && npm run test:baseline

mobile-format-check: ## Confere formatação do workspace mobile
	cd android && npm run format:check

mobile-baseline: mobile-typecheck mobile-lint mobile-format-check mobile-test ## Executa a baseline local do workspace mobile

mobile-preview: ## Gera e instala a APK preview local do mobile
	cd android && npm run android:preview

mobile-wifi: ## Religa app Android real por Wi-Fi com API local + Metro em LAN
	./scripts/dev/run_mobile_wifi.sh

mobile-native-preflight: ## Materializa o projeto nativo Android se a lane real exigir prebuild
	python3 scripts/run_mobile_native_preflight.py

mobile-acceptance: mobile-native-preflight ## Executa o runner oficial de smoke real controlado do mobile
	python3 scripts/run_mobile_pilot_runner.py

mobile-ci: mobile-baseline ## Executa os checks principais do mobile

smoke-mobile: mobile-native-preflight mobile-acceptance ## Executa smoke real controlado do workspace mobile via emulator + Maestro

python-security-audit: ## Audita dependencias Python em venv descartavel local
	python3 scripts/run_python_security_audit.py

mobile-security-audit: ## Audita dependencias mobile de runtime com severidade alta
	cd android && npm audit --omit=dev --audit-level=high

public-repo-secret-scan: ## Varre historico Git com gitleaks via Docker para repo publico
	mkdir -p artifacts/security
	docker run --rm --user "$$(id -u):$$(id -g)" -v "$$PWD":/repo zricethezav/gitleaks:latest detect --source=/repo --redact --report-format=json --report-path=/repo/artifacts/security/gitleaks_report.json

security-audit: python-security-audit mobile-security-audit ## Executa auditoria de seguranca Python + mobile runtime

verify: web-ci mobile-ci mesa-smoke ## Gate principal local do repositório

release-verify-local: verify contract-check hygiene-check security-audit binary-assets-audit-strict production-ops-check-strict uploads-restore-drill document-contract-check ## Gate forte local antes da promoção

production-ops-check: ## Imprime e valida o resumo operacional canônico de produção
	python3 scripts/run_production_ops_check.py --json

production-ops-check-strict: ## Valida a política canônica de produção no modo estrito
	AMBIENTE=production \
	DATABASE_URL=$${TARIEL_PRODUCTION_OPS_DATABASE_URL:-sqlite:////tmp/tariel-production-ops-check.db} \
	PASTA_UPLOADS_PERFIS=/opt/render/project/src/web/static/uploads/perfis \
	PASTA_ANEXOS_MESA=/opt/render/project/src/web/static/uploads/mesa_anexos \
	PASTA_APRENDIZADOS_VISUAIS_IA=/opt/render/project/src/web/static/uploads/aprendizados_ia \
	TARIEL_UPLOADS_STORAGE_MODE=persistent_disk \
	TARIEL_UPLOADS_CLEANUP_ENABLED=1 \
	TARIEL_UPLOADS_CLEANUP_GRACE_DAYS=14 \
	TARIEL_UPLOADS_CLEANUP_INTERVAL_HOURS=24 \
	TARIEL_UPLOADS_CLEANUP_MAX_DELETIONS_PER_RUN=200 \
	TARIEL_UPLOADS_BACKUP_REQUIRED=1 \
	TARIEL_UPLOADS_RESTORE_DRILL_REQUIRED=1 \
	SESSAO_FAIL_CLOSED_ON_DB_ERROR=1 \
	python3 scripts/run_production_ops_check.py --json --strict

uploads-restore-drill: ## Executa drill local de backup/restore de uploads persistentes
	python3 scripts/run_uploads_restore_drill.py --json

uploads-cleanup-check: ## Executa dry-run estrito do cleanup seguro de uploads/anexos
	python3 scripts/run_uploads_cleanup.py --json --strict

uploads-cleanup-apply: ## Executa cleanup real seguro de uploads/anexos
	python3 scripts/run_uploads_cleanup.py --apply --json --strict

post-deploy-cleanup-observation: ## Observa a primeira execucao automatica do cleanup em ambiente production-like equivalente
	python3 scripts/run_post_deploy_cleanup_observation.py --json --strict

release-gate-hosted: verify mesa-acceptance document-acceptance observability-acceptance ## Gate canônico executável em CI hospedada, sem depender de Android real

release-gate-real: release-gate-hosted smoke-mobile production-ops-check-strict uploads-restore-drill uploads-cleanup-check ## Gate canônico de pronto real do produto, incluindo mobile real e operação de produção

release-verify: release-verify-local release-gate-real ## Gate completo de promoção, combinando o gate forte local e a validação real pré-deploy

release-gate: release-gate-real ## Alias oficial do gate canônico de release

final-product-stamp: release-gate post-deploy-cleanup-observation ## Executa o gate final do produto com observacao production-like do cleanup automatizado

clean-generated: ## Limpa saídas geradas locais seguras
	rm -rf web/.pytest_cache web/.ruff_cache web/.mypy_cache web/htmlcov web/.coverage
	rm -rf android/.expo android/.turbo android/dist android/android/build
	rm -rf .test-artifacts _tmp_pdf_preview
	rm -f local-mobile-api.log local-mobile-api.error.log local-mobile-api.pid android/expo-mobile.log android/expo-mobile.pid
	rm -rf .tmp_online/baseline

baseline-snapshot: ## Executa a baseline e imprime um snapshot textual com data
	@./scripts/dev/write_baseline_snapshot.sh

ci: release-gate-hosted ## Executa o gate canônico hospedado do repositório
