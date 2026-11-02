import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.resolve(__dirname, "../index.css");

/**
 * Reusable WCAG 2.2 Relative Luminance and Contrast Ratio Calculation.
 * Implements W3C WCAG 2.2 formula: (L1 + 0.05) / (L2 + 0.05).
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

export function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Design System Tokens & Radius Scale Specification", () => {
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("verifies the approved component corner radius scale in @theme", () => {
    // Buttons, inputs, badges: 6px (rounded-md)
    expect(cssContent).toMatch(/--radius-md:\s*6px;/);

    // Cards, dropdowns, peek panels: 8px (rounded-lg)
    expect(cssContent).toMatch(/--radius-lg:\s*8px;/);

    // Modal dialogs: 12px (rounded-xl)
    expect(cssContent).toMatch(/--radius-xl:\s*12px;/);

    // Circular avatars: 9999px (rounded-full)
    expect(cssContent).toMatch(/--radius-full:\s*9999px;/);
  });

  it("verifies light-theme status border tokens match Research §7.3", () => {
    expect(cssContent).toMatch(/--status-todo-border:\s*#cbd5e1;/);
    expect(cssContent).toMatch(/--status-progress-border:\s*#bfdbfe;/);
    expect(cssContent).toMatch(/--status-review-border:\s*#e9d5ff;/);
    expect(cssContent).toMatch(/--status-done-border:\s*#bbf7d0;/);
    expect(cssContent).toMatch(/--status-cancelled-border:\s*#fecaca;/);
  });

  it("verifies dark-theme status border tokens match Research §7.3", () => {
    expect(cssContent).toMatch(/--status-todo-border:\s*#334155;/);
    expect(cssContent).toMatch(/--status-progress-border:\s*#1e40af;/);
    expect(cssContent).toMatch(/--status-review-border:\s*#581c87;/);
    expect(cssContent).toMatch(/--status-done-border:\s*#166534;/);
    expect(cssContent).toMatch(/--status-cancelled-border:\s*#991b1b;/);
  });

  it("verifies brand accent button token contrast values (#0369a1 light / #38bdf8 dark)", () => {
    expect(cssContent).toMatch(/--brand-accent-btn-bg:\s*#0369a1;/);
    expect(cssContent).toMatch(/--brand-accent-btn-bg:\s*#38bdf8;/);
  });

  it("verifies danger button achieves at least 4.5:1 contrast in both light and dark themes", () => {
    // Parse :root (light) values from index.css
    const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
    const lightDangerMatch = rootBlock.match(/--feedback-danger-text:\s*(#[0-9a-fA-F]{6});/);
    const lightInvertedMatch = rootBlock.match(/--text-inverted:\s*(#[0-9a-fA-F]{6});/);

    expect(lightDangerMatch).not.toBeNull();
    expect(lightInvertedMatch).not.toBeNull();

    const lightDangerBg = lightDangerMatch![1]!;
    const lightInvertedFg = lightInvertedMatch![1]!;

    const lightRatio = getContrastRatio(lightInvertedFg, lightDangerBg);
    // Light mode: #ffffff on #b91c1c yields ~6.45:1 (well above 4.5:1)
    expect(lightRatio).toBeGreaterThanOrEqual(4.5);

    // Parse .dark values from index.css
    const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";
    const darkDangerMatch = darkBlock.match(/--feedback-danger-text:\s*(#[0-9a-fA-F]{6});/);
    const darkInvertedMatch = darkBlock.match(/--text-inverted:\s*(#[0-9a-fA-F]{6});/);

    expect(darkDangerMatch).not.toBeNull();
    expect(darkInvertedMatch).not.toBeNull();

    const darkDangerBg = darkDangerMatch![1]!;
    const darkInvertedFg = darkInvertedMatch![1]!;

    const darkRatio = getContrastRatio(darkInvertedFg, darkDangerBg);
    // Dark mode: #0f172a on #fca5a5 yields ~9.34:1 (well above 4.5:1)
    expect(darkRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies the .focus-ring utility uses semantic focus and canvas tokens without hardcoded colors", () => {
    const focusRingBlock = cssContent.match(/\.focus-ring\s*\{([^}]+)\}/)?.[1] || "";
    expect(focusRingBlock).toContain("var(--border-focus)");
    expect(focusRingBlock).toContain("var(--surface-canvas)");

    // Must NOT contain hardcoded palette values
    expect(focusRingBlock).not.toContain("sky-500");
    expect(focusRingBlock).not.toContain("ring-offset-white");
    expect(focusRingBlock).not.toContain("slate-900");
  });
});
