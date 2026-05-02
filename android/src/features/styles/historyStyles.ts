import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../theme/tokens";

export const historyStyles = {
  historyModalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlaySoft,
    padding: spacing.md,
    justifyContent: "flex-end",
  },
  historyModalCard: {
    backgroundColor: colors.surfacePanel,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: "82%",
    borderWidth: 1,
    borderColor: colors.surfaceStrokeStrong,
    ...shadows.floating,
  },
  historyModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  historyBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 2,
  },
  historyBrandIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
  },
  historyBrandEyebrow: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  historyModalCopy: {
    flex: 1,
    gap: 4,
  },
  historyModalTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  historyModalSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  historyModalClose: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCanvas,
    borderWidth: 1,
    borderColor: colors.surfaceStrokeStrong,
  },
  historySearchShell: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    backgroundColor: colors.surfaceCanvas,
  },
  historySearchShellDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  historySearchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  historySearchInputDark: {
    color: "#F0F4F8",
  },
  historySummaryCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    backgroundColor: colors.surfacePanelRaised,
  },
  historySummaryCardDark: {
    backgroundColor: "#132231",
    borderColor: "#2C4055",
  },
  historySummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  historySummaryCopy: {
    flex: 1,
    gap: 2,
  },
  historySummaryEyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
  },
  historySummaryTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  historySummaryTitleDark: {
    color: "#F0F4F8",
  },
  historySummaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  historySummaryCountLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  historySummaryCountLabelDark: {
    color: "#AFC0D2",
  },
  historySummaryMetricGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  historySummaryMetricCard: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    backgroundColor: colors.surfaceCanvas,
  },
  historySummaryMetricCardDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  historySummaryMetricValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  historySummaryMetricValueDark: {
    color: "#F0F4F8",
  },
  historySummaryMetricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  historySummaryMetricLabelDark: {
    color: "#AFC0D2",
  },
  historySummaryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  historySummaryPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    backgroundColor: colors.surfaceCanvas,
  },
  historySummaryPillDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  historySummaryPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  historySummaryPillTextDark: {
    color: "#C7D2DF",
  },
  historySummaryText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  historySummaryTextDark: {
    color: "#AFC0D2",
  },
  historyResumeCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surfaceCanvas,
  },
  historyResumeCardDark: {
    backgroundColor: "rgba(244,123,32,0.10)",
    borderColor: "rgba(244,123,32,0.38)",
  },
  historyResumeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  historyResumeCopy: {
    flex: 1,
    gap: 2,
  },
  historyResumeEyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
  },
  historyResumeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  historyResumeTitleDark: {
    color: "#F0F4F8",
  },
  historyResumeDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  historyResumeDetailDark: {
    color: "#AFC0D2",
  },
  historyResumeEmphasisPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accentWash,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
  historyResumeEmphasisText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  historyFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  historyFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  historyFilterChipActive: {
    backgroundColor: colors.surfacePanelRaised,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  historyFilterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  historyFilterChipTextActive: {
    color: colors.textPrimary,
  },
  historyFilterCount: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfacePanelRaised,
  },
  historyFilterCountActive: {
    backgroundColor: colors.accentWash,
  },
  historyFilterCountText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  historyFilterCountTextActive: {
    color: colors.accent,
  },
  historySections: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  historySection: {
    gap: spacing.sm,
  },
  historySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  historySectionTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  historySectionTitleDark: {
    color: "#F0F4F8",
  },
  historySectionCountBadge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  historySectionCountBadgeDark: {
    backgroundColor: "#172436",
  },
  historySectionCountText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  historySectionCountTextDark: {
    color: "#AFC0D2",
  },
  historySectionItems: {
    gap: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    backgroundColor: colors.surfacePanelRaised,
    overflow: "hidden",
  },
  historySectionItemsDark: {
    backgroundColor: "#132231",
    borderColor: "#2C4055",
  },
  historyItemShell: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 0,
  },
  historyItemDeleteRail: {
    ...shadows.soft,
    position: "absolute",
    inset: 0,
    borderRadius: 18,
    backgroundColor: colors.dangerWash,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  historyItemDeleteRailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfacePanelRaised,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  historyItemDeleteRailText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceStroke,
    backgroundColor: colors.surfacePanelRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  historyItemDark: {
    backgroundColor: "#132231",
    borderBottomColor: "#26384A",
  },
  historyItemPrimary: {
    width: "100%",
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyItemActive: {
    backgroundColor: colors.surfaceCanvas,
  },
  historyItemActiveDark: {
    backgroundColor: "#1A2A3A",
  },
  historyItemLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  historyItemAccentBar: {
    width: 3,
    alignSelf: "stretch",
    minHeight: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceStrokeStrong,
  },
  historyItemAccentBarAccent: {
    backgroundColor: colors.accent,
  },
  historyItemAccentBarSuccess: {
    backgroundColor: colors.success,
  },
  historyItemAccentBarDanger: {
    backgroundColor: colors.danger,
  },
  historyItemAccentBarActive: {
    backgroundColor: colors.ink900,
  },
  historyItemCopy: {
    flex: 1,
    gap: 2,
  },
  historyItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  historyItemTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  historyItemTitleDark: {
    color: "#F0F4F8",
  },
  historyItemTitleActive: {
    color: colors.textPrimary,
  },
  historyItemTitleActiveDark: {
    color: "#F0F4F8",
  },
  historyItemPreview: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  historyItemPreviewDark: {
    color: "#AFC0D2",
  },
  historyItemPreviewActive: {
    color: colors.textSecondary,
  },
  historyItemBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 1,
  },
  historyItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    backgroundColor: colors.surfaceSoft,
  },
  historyItemBadgeDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  historyItemBadgeAccent: {
    backgroundColor: colors.accentWash,
    borderColor: colors.accentMuted,
  },
  historyItemBadgeSuccess: {
    backgroundColor: colors.successWash,
    borderColor: colors.successSoft,
  },
  historyItemBadgeDanger: {
    backgroundColor: colors.dangerWash,
    borderColor: colors.dangerSoft,
  },
  historyItemBadgeActive: {
    borderColor: colors.surfaceStrokeStrong,
    backgroundColor: colors.white,
  },
  historyItemBadgeActiveDark: {
    backgroundColor: "#243447",
    borderColor: "#3B536C",
  },
  historyItemBadgeMutedActive: {
    borderColor: colors.surfaceStrokeStrong,
    backgroundColor: colors.white,
  },
  historyItemBadgeMutedActiveDark: {
    backgroundColor: "#243447",
    borderColor: "#3B536C",
  },
  historyItemBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  historyItemBadgeTextDark: {
    color: "#C7D2DF",
  },
  historyItemBadgeTextAccent: {
    color: colors.accent,
  },
  historyItemBadgeTextSuccess: {
    color: colors.success,
  },
  historyItemBadgeTextDanger: {
    color: colors.danger,
  },
  historyItemBadgeTextActive: {
    color: colors.textPrimary,
  },
  historyItemDetailRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 4,
  },
  historyItemDetailPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  historyItemDetailPillDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  historyItemDetailPillActive: {
    backgroundColor: colors.white,
    borderColor: colors.surfaceStrokeStrong,
  },
  historyItemDetailPillActiveDark: {
    backgroundColor: "#243447",
    borderColor: "#3B536C",
  },
  historyItemDetailPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    maxWidth: 220,
  },
  historyItemDetailPillTextDark: {
    color: "#AFC0D2",
  },
  historyItemChevronBadge: {
    width: 26,
    height: 26,
    marginTop: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  historyItemChevronBadgeDark: {
    backgroundColor: "#172436",
    borderColor: "#32455D",
  },
  historyItemChevronBadgeActive: {
    backgroundColor: colors.white,
    borderColor: colors.surfaceStrokeStrong,
  },
  historyItemChevronBadgeActiveDark: {
    backgroundColor: "#243447",
    borderColor: "#3B536C",
  },
  historyItemDetailPillTextActive: {
    color: colors.textPrimary,
  },
  historyEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  historyEmptyBrand: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  historyEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  historyEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
} as const;
