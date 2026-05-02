import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Text, View } from "react-native";

import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { TARIEL_APP_MARK } from "../InspectorMobileApp.constants";
import { styles } from "../InspectorMobileApp.styles";

export function BrandIntroMark({
  compact = false,
  title,
  brandColor = colors.accent,
}: {
  compact?: boolean;
  title?: string;
  brandColor?: string;
}) {
  const { t } = useAppTranslation();

  return (
    <View
      style={compact ? styles.brandStageCompact : styles.threadEmptyBrandStage}
    >
      <View
        style={[
          compact ? styles.brandHaloCompact : styles.threadEmptyBrandHalo,
          { backgroundColor: `${brandColor}14` },
        ]}
      />
      <Image
        resizeMode="cover"
        source={TARIEL_APP_MARK}
        style={compact ? styles.brandMarkCompact : styles.threadEmptyBrandMark}
      />
      {title ? <Text style={styles.threadEmptyTitle}>{t(title)}</Text> : null}
    </View>
  );
}

export function BrandLaunchOverlay({
  onDone,
  visible,
  animationsEnabled = true,
  accentColor = colors.accent,
}: {
  onDone: () => void;
  visible: boolean;
  animationsEnabled?: boolean;
  accentColor?: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const halo = useRef(new Animated.Value(0.85)).current;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!animationsEnabled) {
      opacity.setValue(1);
      scale.setValue(1);
      halo.setValue(1);
      const timeout = setTimeout(() => onDoneRef.current(), 180);
      return () => clearTimeout(timeout);
    }

    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.04,
          duration: 240,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    sequence.start(({ finished }) => {
      if (finished) {
        onDoneRef.current();
      }
    });

    return () => sequence.stop();
  }, [animationsEnabled, halo, opacity, scale, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.launchOverlay}>
      <LinearGradient
        colors={[
          "rgba(255,249,243,0.96)",
          "rgba(252,248,242,0.98)",
          "rgba(246,239,231,0.99)",
        ]}
        style={styles.launchOverlayGradient}
      >
        <Animated.View
          style={[
            styles.launchOverlayInner,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.launchOverlayHalo,
              {
                backgroundColor: `${accentColor}18`,
                transform: [{ scale: halo }],
              },
            ]}
          />
          <View
            style={[
              styles.launchOverlayMark,
              {
                backgroundColor: colors.surfacePanelRaised,
                borderColor: colors.surfaceStrokeStrong,
                borderWidth: 1,
              },
            ]}
          >
            <Image
              resizeMode="cover"
              source={TARIEL_APP_MARK}
              style={styles.launchOverlayLogo}
            />
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
