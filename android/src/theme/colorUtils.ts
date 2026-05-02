import { colors } from "./tokens";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const HEX_ALPHA_PATTERN = /^[0-9a-fA-F]{2}$/;

export function colorWithAlpha(color: string, alphaHex: string): string {
  const normalizedColor = color.trim();
  const normalizedAlpha = alphaHex.trim();

  if (
    !HEX_COLOR_PATTERN.test(normalizedColor) ||
    !HEX_ALPHA_PATTERN.test(normalizedAlpha)
  ) {
    return normalizedColor;
  }

  return `${normalizedColor}${normalizedAlpha}`;
}

export function resolveAccentColorForMode(
  accentColor: string,
  darkMode = false,
): string {
  if (darkMode && accentColor.toLowerCase() === colors.ink900.toLowerCase()) {
    return colors.textInverse;
  }

  return accentColor;
}
