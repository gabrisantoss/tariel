(function attachTarielChatIndexPageRuntime(global) {
    "use strict";

    function guardOnce(inspectorRuntime, key) {
        if (typeof inspectorRuntime?.guardOnce === "function") {
            return inspectorRuntime.guardOnce(key);
        }

        const flag = `__TARIEL_${String(key || "CHAT_INDEX_PAGE").toUpperCase()}_WIRED__`;
        if (global[flag]) return false;
        global[flag] = true;
        return true;
    }

    function resolveModules(inspectorRuntime) {
        return global.TarielInspectorWorkspaceRuntimeRegistry?.resolveInspectorRuntimeModules?.(inspectorRuntime) || {};
    }

    function resolveSharedGlobals(modules = {}) {
        return modules.sharedGlobals || {
            perf: global.TarielPerf || global.TarielCore?.TarielPerf || null,
            caseLifecycle: global.TarielCaseLifecycle,
        };
    }

    function isProductionLocation(locationRef = global.location) {
        return locationRef?.hostname !== "localhost" && locationRef?.hostname !== "127.0.0.1";
    }

    function resolvePageElements(documentRef) {
        return global.TarielInspectorWorkspacePageElements?.buildInspectorPageElements?.(documentRef) || {};
    }

    function showToast(message, type = "info", duration = 3000) {
        if (typeof global.mostrarToast === "function") {
            global.mostrarToast(message, type, duration);
        }
    }

    function debug(...args) {
        if (typeof global.TarielCore?.debug === "function") {
            global.TarielCore.debug(...args);
        }
    }

    function logOnce(key, level, ...args) {
        if (typeof global.TarielCore?.logOnce === "function") {
            global.TarielCore.logOnce(key, level, ...args);
            return true;
        }
        return false;
    }

    function emitInspectorEvent(name, detail = {}, documentRef = global.document) {
        if (typeof global.TarielInspectorEvents?.emit === "function") {
            global.TarielInspectorEvents.emit(name, detail, {
                target: documentRef,
                bubbles: true,
            });
            return;
        }

        documentRef.dispatchEvent(
            new CustomEvent(name, {
                detail,
                bubbles: true,
            }),
        );
    }

    function onInspectorEvent(name, handler, documentRef = global.document) {
        if (typeof global.TarielInspectorEvents?.on === "function") {
            return global.TarielInspectorEvents.on(name, handler, {
                target: documentRef,
            });
        }

        documentRef.addEventListener(name, handler);
        return () => {
            documentRef.removeEventListener(name, handler);
        };
    }

    global.TarielChatIndexPageRuntime = {
        debug,
        emitInspectorEvent,
        guardOnce,
        isProductionLocation,
        logOnce,
        onInspectorEvent,
        resolveModules,
        resolvePageElements,
        resolveSharedGlobals,
        showToast,
    };
})(window);
