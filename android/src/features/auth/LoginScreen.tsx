import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { RefObject } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardAvoidingViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTranslation } from "../../i18n/appTranslation";
import { colors } from "../../theme/tokens";
import { TARIEL_APP_MARK } from "../InspectorMobileApp.constants";
import { styles } from "../InspectorMobileApp.styles";
import { BrandLaunchOverlay } from "../common/BrandElements";

export interface LoginScreenProps {
  appGradientColors: readonly [string, string, ...string[]];
  keyboardAvoidingBehavior: KeyboardAvoidingViewProps["behavior"];
  loginKeyboardVerticalOffset: number;
  keyboardVisible: boolean;
  loginKeyboardBottomPadding: number;
  accentColor: string;
  carregando: boolean;
  fontScale: number;
  email: string;
  senha: string;
  erro: string;
  entrando: boolean;
  automationDiagnosticsEnabled?: boolean;
  mostrarSenha: boolean;
  animacoesAtivas: boolean;
  introVisivel: boolean;
  loginAutomationMarkerIds?: string[];
  loginAutomationProbeLabel?: string;
  emailInputRef: RefObject<TextInput | null>;
  senhaInputRef: RefObject<TextInput | null>;
  onEmailChange: (value: string) => void;
  onSenhaChange: (value: string) => void;
  onEmailSubmit: () => void;
  onSenhaSubmit: () => void;
  onToggleMostrarSenha: () => void;
  onEsqueciSenha: () => void;
  onLogin: () => void;
  onLoginSocial: (provider: "Google" | "Microsoft") => void;
  onIntroDone: () => void;
}

export function LoginScreen({
  appGradientColors,
  keyboardAvoidingBehavior,
  loginKeyboardVerticalOffset,
  keyboardVisible,
  loginKeyboardBottomPadding,
  accentColor,
  carregando,
  fontScale,
  email,
  senha,
  erro,
  entrando,
  automationDiagnosticsEnabled,
  mostrarSenha,
  animacoesAtivas,
  introVisivel,
  loginAutomationMarkerIds,
  loginAutomationProbeLabel,
  emailInputRef,
  senhaInputRef,
  onEmailChange,
  onSenhaChange,
  onEmailSubmit,
  onSenhaSubmit,
  onToggleMostrarSenha,
  onEsqueciSenha,
  onLogin,
  onLoginSocial,
  onIntroDone,
}: LoginScreenProps) {
  const { t } = useAppTranslation();

  return (
    <LinearGradient colors={appGradientColors} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={keyboardAvoidingBehavior}
          keyboardVerticalOffset={loginKeyboardVerticalOffset}
          style={styles.keyboard}
        >
          <ScrollView
            contentContainerStyle={[
              styles.loginScrollContent,
              keyboardVisible ? styles.loginScrollContentKeyboardVisible : null,
              { paddingBottom: loginKeyboardBottomPadding },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.loginScreen,
                keyboardVisible ? styles.loginScreenKeyboardVisible : null,
              ]}
            >
              {automationDiagnosticsEnabled ? (
                <View
                  accessible
                  collapsable={false}
                  pointerEvents="none"
                  style={{
                    alignItems: "flex-end",
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 6,
                    zIndex: 9999,
                  }}
                  testID="login-automation-probe"
                  accessibilityLabel={loginAutomationProbeLabel}
                >
                  {(loginAutomationMarkerIds || []).map((markerId, index) => (
                    <View
                      accessibilityLabel={markerId}
                      collapsable={false}
                      key={markerId}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.02)",
                        borderRadius: 1,
                        height: 2,
                        marginTop: index === 0 ? 0 : 1,
                        width: 2,
                      }}
                      testID={markerId}
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.loginCard}>
                {carregando ? (
                  <View style={styles.loadingState}>
                    <Image
                      resizeMode="cover"
                      source={TARIEL_APP_MARK}
                      style={styles.loadingLogo}
                    />
                    <Text style={styles.loadingText}>
                      {t("Preparando o app do inspetor...")}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.loginHero}>
                      <View style={styles.loginIdentityMark}>
                        <Image
                          resizeMode="cover"
                          source={TARIEL_APP_MARK}
                          style={styles.loginIdentityLogo}
                        />
                      </View>
                    </View>

                    <View style={styles.loginFields}>
                      <View style={styles.loginFieldBlock}>
                        <View style={styles.mobileField}>
                          <TextInput
                            ref={emailInputRef}
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect={false}
                            importantForAutofill="yes"
                            keyboardType="email-address"
                            onChangeText={onEmailChange}
                            onSubmitEditing={onEmailSubmit}
                            placeholder="nome@empresa.com"
                            placeholderTextColor={colors.textMuted}
                            returnKeyType="next"
                            style={[
                              styles.mobileFieldInput,
                              { fontSize: 17 * fontScale },
                            ]}
                            testID="login-email-input"
                            textContentType="emailAddress"
                            value={email}
                          />
                        </View>
                      </View>

                      <View style={styles.loginFieldBlock}>
                        <View style={styles.mobileField}>
                          <TextInput
                            ref={senhaInputRef}
                            autoCapitalize="none"
                            autoComplete="password"
                            importantForAutofill="yes"
                            onChangeText={onSenhaChange}
                            onSubmitEditing={onSenhaSubmit}
                            placeholder={t("Digite sua senha")}
                            placeholderTextColor={colors.textMuted}
                            returnKeyType="done"
                            secureTextEntry={!mostrarSenha}
                            style={[
                              styles.mobileFieldInput,
                              { fontSize: 17 * fontScale },
                            ]}
                            testID="login-password-input"
                            textContentType="password"
                            value={senha}
                          />
                          <Pressable
                            onPress={onToggleMostrarSenha}
                            style={styles.mobileFieldAction}
                            testID="toggle-password-visibility-button"
                          >
                            <MaterialCommunityIcons
                              color={colors.textMuted}
                              name={
                                mostrarSenha ? "eye-off-outline" : "eye-outline"
                              }
                              size={20}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <View style={styles.loginMetaRow}>
                      <Pressable onPress={onEsqueciSenha}>
                        <Text style={styles.loginForgotLink}>
                          {t("Esqueceu a senha?")}
                        </Text>
                      </Pressable>
                    </View>

                    {!!erro && <Text style={styles.errorText}>{t(erro)}</Text>}

                    <Pressable
                      disabled={entrando}
                      onPress={onLogin}
                      style={[
                        styles.loginPrimaryButton,
                        {
                          backgroundColor: accentColor,
                          shadowColor: accentColor,
                        },
                        entrando ? styles.primaryButtonDisabled : null,
                      ]}
                      testID="login-submit-button"
                    >
                      {entrando ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.loginPrimaryButtonText}>
                          {t("Entrar")}
                        </Text>
                      )}
                    </Pressable>

                    <View style={styles.loginDividerRow}>
                      <View style={styles.loginDividerLine} />
                      <Text style={styles.loginDividerText}>{t("ou")}</Text>
                      <View style={styles.loginDividerLine} />
                    </View>

                    <View style={styles.loginSocialStack}>
                      <Pressable
                        onPress={() => onLoginSocial("Google")}
                        style={styles.loginSocialButton}
                        testID="login-google-button"
                      >
                        <View style={styles.loginSocialIconShell}>
                          <MaterialCommunityIcons
                            color={colors.textPrimary}
                            name="google"
                            size={18}
                          />
                        </View>
                        <Text style={styles.loginSocialButtonText}>
                          {t("Entrar com Google")}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => onLoginSocial("Microsoft")}
                        style={styles.loginSocialButton}
                        testID="login-microsoft-button"
                      >
                        <View style={styles.loginSocialIconShell}>
                          <MaterialCommunityIcons
                            color={colors.textPrimary}
                            name="microsoft"
                            size={18}
                          />
                        </View>
                        <Text style={styles.loginSocialButtonText}>
                          {t("Entrar com Microsoft")}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BrandLaunchOverlay
        accentColor={accentColor}
        animationsEnabled={animacoesAtivas}
        onDone={onIntroDone}
        visible={introVisivel}
      />
    </LinearGradient>
  );
}
