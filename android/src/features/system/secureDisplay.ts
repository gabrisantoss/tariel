import { NativeModules, Platform } from "react-native";

type TarielPrivacyModule = {
  setSecureDisplayEnabled?: (enabled: boolean) => void;
};

const tarielPrivacy = NativeModules.TarielPrivacy as
  | TarielPrivacyModule
  | undefined;

export function setSecureDisplayEnabled(_enabled: boolean) {
  if (Platform.OS !== "android") {
    return;
  }
  tarielPrivacy?.setSecureDisplayEnabled?.(false);
}
