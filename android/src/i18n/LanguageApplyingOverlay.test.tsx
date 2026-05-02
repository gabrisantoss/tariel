import { act, render } from "@testing-library/react-native";

import { createDefaultAppSettings } from "../settings/schema/defaults";
import type { AppSettings } from "../settings/schema/types";
import {
  LANGUAGE_APPLYING_DURATION_MS,
  LanguageApplyingOverlay,
} from "./LanguageApplyingOverlay";

let mockStoreValue: {
  hydrated: boolean;
  state: AppSettings;
};

jest.mock("../settings/store/SettingsStoreProvider", () => ({
  useOptionalSettingsStoreContext: () => mockStoreValue,
  useSettingsStoreContext: () => mockStoreValue,
}));

function buildStoreValue(
  language: AppSettings["system"]["language"],
  hydrated = true,
) {
  return {
    hydrated,
    state: {
      ...createDefaultAppSettings(),
      system: {
        ...createDefaultAppSettings().system,
        language,
      },
    },
  };
}

describe("LanguageApplyingOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockStoreValue = buildStoreValue("Português");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ignora a primeira hidratação e aparece por 3 segundos ao trocar idioma", () => {
    const { getByText, queryByTestId, rerender } = render(
      <LanguageApplyingOverlay />,
    );

    expect(queryByTestId("language-applying-overlay")).toBeNull();

    mockStoreValue = buildStoreValue("Inglês");
    rerender(<LanguageApplyingOverlay />);

    expect(queryByTestId("language-applying-overlay")).toBeTruthy();
    expect(getByText("Applying language...")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(LANGUAGE_APPLYING_DURATION_MS - 1);
    });
    expect(queryByTestId("language-applying-overlay")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(queryByTestId("language-applying-overlay")).toBeNull();
  });

  it("não aparece quando apenas conclui a hidratação inicial", () => {
    mockStoreValue = buildStoreValue("Português", false);
    const { queryByTestId, rerender } = render(<LanguageApplyingOverlay />);

    mockStoreValue = buildStoreValue("Português", true);
    rerender(<LanguageApplyingOverlay />);

    expect(queryByTestId("language-applying-overlay")).toBeNull();
  });
});
