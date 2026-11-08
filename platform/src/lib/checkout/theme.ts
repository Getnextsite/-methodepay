import type { CheckoutProfile } from '@prisma/client';

/**
 * Turn a merchant profile into CSS custom properties.
 *
 * The checkout is rendered on our infrastructure but has to look like the
 * merchant store, so every colour, radius and width the designer exposes
 * becomes a variable on the page root. Components reference the variables and
 * never a hardcoded colour, which is what lets one set of markup serve six
 * designs and any palette.
 */
export function themeVariables(profile: CheckoutProfile): Record<string, string> {
  return {
    '--mp-primary': profile.colorPrimary,
    '--mp-primary-contrast': readableOn(profile.colorPrimary),
    '--mp-bg-start': profile.colorBgStart,
    '--mp-bg-end': profile.colorBgEnd,
    '--mp-text': profile.colorText,
    '--mp-text-muted': withAlpha(profile.colorText, 0.62),
    '--mp-text-faint': withAlpha(profile.colorText, 0.4),
    '--mp-card': profile.colorCardBg,
    '--mp-border': withAlpha(profile.colorText, 0.12),
    '--mp-border-strong': withAlpha(profile.colorText, 0.22),
    '--mp-radius': `${profile.cardRadius}px`,
    '--mp-radius-sm': `${Math.max(4, profile.cardRadius - 6)}px`,
    '--mp-width': `${profile.layoutWidth}px`,
    '--mp-font-size': `${profile.baseFontSize}px`,
    '--mp-font': fontStack(profile.fontFamily),
  };
}

function fontStack(family: string): string {
  if (!family || family === 'System UI') {
    return 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  }
  return `"${family}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = Number.parseInt(match[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Pick black or white text for a background, by relative luminance.
 *
 * A merchant who sets a neon accent gets dark text on their pay button and one
 * who sets navy gets white, without either having to think about it. Guessing
 * wrong here makes the single most important button on the page unreadable.
 */
export function readableOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#000000';
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  return luminance > 0.42 ? '#06240f' : '#ffffff';
}

/** Font families worth pulling from Google Fonts; anything else uses the stack. */
const WEB_FONTS = new Set(['Inter', 'Roboto', 'Open Sans', 'Poppins', 'DM Sans']);

export function googleFontHref(family: string): string | null {
  if (!WEB_FONTS.has(family)) return null;
  const name = family.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${name}:wght@400;500;600;700&display=swap`;
}
