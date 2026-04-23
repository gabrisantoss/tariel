const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  cacheDirectory: "<rootDir>/.jest-cache",
  transform: {
    ...expoPreset.transform,
    "\\.[jt]sx?$": "<rootDir>/jest.transformer.cjs",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
  ],
};
