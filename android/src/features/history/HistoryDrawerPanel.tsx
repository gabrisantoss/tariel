import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type PanResponderInstance,
} from "react-native";

import { EmptyState } from "../../components/EmptyState";
import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { styles } from "../InspectorMobileApp.styles";
import { HistoryDrawerListItem } from "./HistoryDrawerListItem";
import type {
  HistoryDrawerPanelItem,
  HistoryDrawerSection,
} from "./historyDrawerTypes";

export type {
  HistoryDrawerPanelItem,
  HistoryDrawerSection,
} from "./historyDrawerTypes";

export interface HistoryDrawerPanelProps<TItem extends HistoryDrawerPanelItem> {
  darkMode?: boolean;
  historyDrawerPanResponder: PanResponderInstance;
  historicoDrawerX: Animated.Value;
  onCloseHistory: () => void;
  onHistorySearchFocusChange: (focused: boolean) => void;
  buscaHistorico: string;
  onBuscaHistoricoChange: (value: string) => void;
  conversasOcultasTotal: number;
  historicoAgrupadoFinal: HistoryDrawerSection<TItem>[];
  laudoSelecionadoId: number | null;
  onSelecionarHistorico: (item: TItem) => void;
  onExcluirConversaHistorico: (item: TItem) => void;
  historicoVazioTitulo: string;
  historicoVazioTexto: string;
  brandMarkSource: ImageSourcePropType;
}

export function HistoryDrawerPanel<TItem extends HistoryDrawerPanelItem>({
  darkMode = false,
  historyDrawerPanResponder,
  historicoDrawerX,
  onCloseHistory,
  onHistorySearchFocusChange,
  buscaHistorico,
  onBuscaHistoricoChange,
  conversasOcultasTotal,
  historicoAgrupadoFinal,
  laudoSelecionadoId,
  onSelecionarHistorico,
  onExcluirConversaHistorico,
  historicoVazioTitulo,
  historicoVazioTexto,
}: HistoryDrawerPanelProps<TItem>) {
  const { t } = useAppTranslation();
  const totalVisiveis = historicoAgrupadoFinal.reduce(
    (total, section) => total + section.items.length,
    0,
  );
  const totalHistorico = totalVisiveis + conversasOcultasTotal;
  const exibirBusca = totalHistorico > 0 || Boolean(buscaHistorico.trim());

  return (
    <Animated.View
      {...historyDrawerPanResponder.panHandlers}
      style={[
        styles.sidePanelDrawer,
        styles.sidePanelDrawerLeft,
        darkMode ? styles.sidePanelDrawerPrintDark : null,
        { transform: [{ translateX: historicoDrawerX }] },
      ]}
      testID="history-drawer"
    >
      <View style={styles.sidePanelHeader}>
        <View style={styles.sidePanelCopy}>
          <Text
            style={[
              styles.sidePanelTitle,
              darkMode ? styles.sidePanelTitlePrintDark : null,
            ]}
          >
            {t("Histórico")}
          </Text>
          <Text
            style={[
              styles.sidePanelDescription,
              darkMode ? styles.sidePanelDescriptionPrintDark : null,
            ]}
          >
            {t("Conversas recentes")}
          </Text>
        </View>
        <Pressable
          onPress={onCloseHistory}
          style={[
            styles.sidePanelCloseButton,
            darkMode ? styles.sidePanelCloseButtonPrintDark : null,
          ]}
          testID="close-history-drawer-button"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={darkMode ? "#F0F4F8" : colors.textPrimary}
          />
        </Pressable>
      </View>

      {exibirBusca ? (
        <View
          style={[
            styles.historySummaryCard,
            darkMode ? styles.historySummaryCardDark : null,
          ]}
          testID="history-summary-card"
        >
          <View
            style={[
              styles.historySearchShell,
              darkMode ? styles.historySearchShellDark : null,
            ]}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={darkMode ? "#AFC0D2" : colors.textSecondary}
            />
            <TextInput
              onChangeText={onBuscaHistoricoChange}
              onBlur={() => onHistorySearchFocusChange(false)}
              onFocus={() => onHistorySearchFocusChange(true)}
              placeholder={t("Buscar histórico")}
              placeholderTextColor={darkMode ? "#8999AB" : colors.textSecondary}
              style={[
                styles.historySearchInput,
                darkMode ? styles.historySearchInputDark : null,
              ]}
              testID="history-search-input"
              value={buscaHistorico}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.historySections}
        keyboardShouldPersistTaps="handled"
        testID={
          historicoAgrupadoFinal.length
            ? "history-results-loaded"
            : "history-results-empty"
        }
      >
        {historicoAgrupadoFinal.length ? (
          historicoAgrupadoFinal.map((section, sectionIndex) => (
            <View
              key={section.key}
              style={styles.historySection}
              testID={`history-section-${section.key}`}
            >
              <View style={styles.historySectionHeader}>
                <Text
                  style={[
                    styles.historySectionTitle,
                    darkMode ? styles.historySectionTitleDark : null,
                  ]}
                >
                  {t(section.title)}
                </Text>
                <View
                  style={[
                    styles.historySectionCountBadge,
                    darkMode ? styles.historySectionCountBadgeDark : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.historySectionCountText,
                      darkMode ? styles.historySectionCountTextDark : null,
                    ]}
                  >
                    {section.items.length}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.historySectionItems,
                  darkMode ? styles.historySectionItemsDark : null,
                ]}
              >
                {section.items.map((item, itemIndex) => {
                  const ativo = item.id === laudoSelecionadoId;
                  const isFirstHistoryItem =
                    sectionIndex === 0 && itemIndex === 0;
                  return (
                    <HistoryDrawerListItem
                      key={`history-${section.key}-${item.id}`}
                      ativo={ativo}
                      containerTestID={
                        isFirstHistoryItem
                          ? "history-first-item-button"
                          : undefined
                      }
                      isLastItem={itemIndex === section.items.length - 1}
                      item={item}
                      darkMode={darkMode}
                      onExcluir={() => onExcluirConversaHistorico(item)}
                      onSelecionar={() => onSelecionarHistorico(item)}
                      testID={`history-item-${item.id}`}
                    />
                  );
                })}
                <View
                  collapsable={false}
                  pointerEvents="none"
                  style={{ height: 0, opacity: 0, width: 0 }}
                >
                  {section.items.map((item) => {
                    const ativo = item.id === laudoSelecionadoId;
                    return (
                      <View
                        key={`history-marker-${section.key}-${item.id}`}
                        collapsable={false}
                      >
                        <View
                          collapsable={false}
                          testID={`history-target-visible-${item.id}`}
                        />
                        {ativo ? (
                          <View
                            collapsable={false}
                            testID={`history-item-selected-${item.id}`}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.historyEmptyState} testID="history-empty-state">
            <EmptyState
              compact
              darkMode={darkMode}
              description={t(historicoVazioTexto)}
              icon="history"
              title={t(historicoVazioTitulo)}
            />
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
