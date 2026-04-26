import {
  androidV2ReadContractsEnabled,
  getAndroidV2ReadContractsRuntimeSnapshot,
} from "./mobileV2Config";

describe("mobileV2Config", () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    process.env = { ...envOriginal };
    delete process.env.EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED;
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  it("normaliza a flag EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED com snapshot explícito", () => {
    process.env.EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED = " yes ";

    expect(androidV2ReadContractsEnabled()).toBe(true);
    expect(getAndroidV2ReadContractsRuntimeSnapshot()).toEqual({
      envKey: "EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED",
      rawValue: "yes",
      normalizedValue: "yes",
      enabled: true,
      parser: "truthy_string_v1",
      source: "expo_public_env",
    });
  });

  it("habilita o contrato V2 com o valor usado pelo build preview do smoke mobile", () => {
    process.env.EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED = "1";

    expect(androidV2ReadContractsEnabled()).toBe(true);
    expect(getAndroidV2ReadContractsRuntimeSnapshot()).toMatchObject({
      rawValue: "1",
      normalizedValue: "1",
      enabled: true,
    });
  });

  it("materializa rawValue nulo quando a flag não existe no runtime", () => {
    expect(androidV2ReadContractsEnabled()).toBe(false);
    expect(getAndroidV2ReadContractsRuntimeSnapshot()).toEqual({
      envKey: "EXPO_PUBLIC_ANDROID_V2_READ_CONTRACTS_ENABLED",
      rawValue: null,
      normalizedValue: "",
      enabled: false,
      parser: "truthy_string_v1",
      source: "expo_public_env",
    });
  });
});
