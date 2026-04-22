(function attachTarielInspectorWorkspaceRuntimeRegistry(global) {
    "use strict";

    function resolveInspectorRuntimeModules(runtime = global.TarielInspectorRuntime || null) {
        return {
            sharedGlobals:
                runtime?.resolveSharedGlobals?.() || {
                    perf: global.TarielPerf || global.TarielCore?.TarielPerf || null,
                    caseLifecycle: global.TarielCaseLifecycle,
                },
            InspectorStateSnapshots: global.TarielInspectorStateSnapshots || {},
            InspectorStateAuthority: global.TarielInspectorStateAuthority || {},
            InspectorStateRuntimeSync: global.TarielInspectorStateRuntimeSync || {},
            InspectorStateNormalization: global.TarielInspectorStateNormalization || {},
            InspectorHistoryBuilders: global.TarielInspectorHistoryBuilders || {},
            InspectorWorkspaceHistoryContext: global.TarielInspectorWorkspaceHistoryContext || {},
            InspectorWorkspaceMesaStatus: global.TarielInspectorWorkspaceMesaStatus || {},
            InspectorSidebarHistory: global.TarielInspectorSidebarHistory || {},
            InspectorWorkspaceRail: global.TarielInspectorWorkspaceRail || {},
            InspectorWorkspaceRuntimeState: global.TarielInspectorWorkspaceRuntimeState || {},
            InspectorWorkspaceRuntimeScreen: global.TarielInspectorWorkspaceRuntimeScreen || {},
            InspectorWorkspaceScreen: global.TarielInspectorWorkspaceScreen || {},
            InspectorWorkspaceThread: global.TarielInspectorWorkspaceThread || {},
            InspectorWorkspaceUtils: global.TarielInspectorWorkspaceUtils || {},
            InspectorWorkspaceStage: global.TarielInspectorWorkspaceStage || {},
            InspectorWorkspaceMesaAttachments: global.TarielInspectorWorkspaceMesaAttachments || {},
            InspectorWorkspaceContextFlow: global.TarielInspectorWorkspaceContextFlow || {},
            InspectorWorkspaceHomeFlow: global.TarielInspectorWorkspaceHomeFlow || {},
            InspectorWorkspaceComposer: global.TarielInspectorWorkspaceComposer || {},
            InspectorWorkspaceDeliveryFlow: global.TarielInspectorWorkspaceDeliveryFlow || {},
            InspectorWorkspaceOrchestration: global.TarielInspectorWorkspaceOrchestration || {},
            InspectorWorkspacePageBoot: global.TarielInspectorWorkspacePageBoot || {},
        };
    }

    global.TarielInspectorWorkspaceRuntimeRegistry = {
        resolveInspectorRuntimeModules,
    };
})(window);
