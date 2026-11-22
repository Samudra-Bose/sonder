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

  it("verifies the .tabular-nums utility is defined in @layer utilities", () => {
    const tabularNumsBlock = cssContent.match(/\.tabular-nums\s*\{([^}]+)\}/)?.[1] || "";
    expect(tabularNumsBlock).toMatch(/font-variant-numeric:\s*tabular-nums;/);
  });

  it("verifies compact popover geometry tokens exist in both light and dark theme blocks", () => {
    const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
    const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";

    expect(rootBlock).toMatch(/--popover-compact-padding:\s*0\.375rem;/);
    expect(rootBlock).toMatch(/--popover-compact-min-width:\s*140px;/);
    expect(darkBlock).toMatch(/--popover-compact-padding:\s*0\.375rem;/);
    expect(darkBlock).toMatch(/--popover-compact-min-width:\s*140px;/);
  });

  it("dynamically verifies light-theme text tokens achieve WCAG 2.2 AA normal text contrast (>= 4.5:1)", () => {
    const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";

    const getToken = (name: string) => {
      const match = rootBlock.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`));
      expect(match, `Token ${name} must be declared in :root`).not.toBeNull();
      return match![1]!;
    };

    const canvas = getToken("--surface-canvas");
    const card = getToken("--surface-card");
    const muted = getToken("--surface-muted");

    const textPrimary = getToken("--text-primary");
    const textSecondary = getToken("--text-secondary");
    const textMuted = getToken("--text-muted");

    // Primary text >= 16:1
    expect(getContrastRatio(textPrimary, canvas)).toBeGreaterThanOrEqual(16.0);
    expect(getContrastRatio(textPrimary, card)).toBeGreaterThanOrEqual(16.0);
    expect(getContrastRatio(textPrimary, muted)).toBeGreaterThanOrEqual(16.0);

    // Secondary text >= 9.0:1 (WCAG AA requirement: >= 4.5:1)
    expect(getContrastRatio(textSecondary, canvas)).toBeGreaterThanOrEqual(9.0);
    expect(getContrastRatio(textSecondary, card)).toBeGreaterThanOrEqual(9.0);
    expect(getContrastRatio(textSecondary, muted)).toBeGreaterThanOrEqual(9.0);

    // Muted text >= 6.5:1 (WCAG AA requirement: >= 4.5:1)
    expect(getContrastRatio(textMuted, canvas)).toBeGreaterThanOrEqual(6.5);
    expect(getContrastRatio(textMuted, card)).toBeGreaterThanOrEqual(6.5);
    expect(getContrastRatio(textMuted, muted)).toBeGreaterThanOrEqual(6.5);

    // Verify rejected muted proposal (#94a3b8) fails on white card
    const rejectedMutedRatio = getContrastRatio("#94a3b8", card);
    expect(rejectedMutedRatio).toBeLessThan(4.5);
  });

  it("dynamically verifies dark-theme text tokens achieve WCAG 2.2 AA normal text contrast (>= 4.5:1)", () => {
    const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";

    const getToken = (name: string) => {
      const match = darkBlock.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`));
      expect(match, `Token ${name} must be declared in .dark`).not.toBeNull();
      return match![1]!;
    };

    const canvas = getToken("--surface-canvas");
    const card = getToken("--surface-card");
    const muted = getToken("--surface-muted");

    const textPrimary = getToken("--text-primary");
    const textSecondary = getToken("--text-secondary");
    const textMuted = getToken("--text-muted");

    // Primary text >= 13:1
    expect(getContrastRatio(textPrimary, canvas)).toBeGreaterThanOrEqual(13.0);
    expect(getContrastRatio(textPrimary, card)).toBeGreaterThanOrEqual(13.0);
    expect(getContrastRatio(textPrimary, muted)).toBeGreaterThanOrEqual(13.0);

    // Secondary text >= 9.0:1 (WCAG AA requirement: >= 4.5:1)
    expect(getContrastRatio(textSecondary, canvas)).toBeGreaterThanOrEqual(9.0);
    expect(getContrastRatio(textSecondary, card)).toBeGreaterThanOrEqual(9.0);
    expect(getContrastRatio(textSecondary, muted)).toBeGreaterThanOrEqual(9.0);

    // Muted text >= 5.5:1 (WCAG AA requirement: >= 4.5:1)
    expect(getContrastRatio(textMuted, canvas)).toBeGreaterThanOrEqual(5.5);
    expect(getContrastRatio(textMuted, card)).toBeGreaterThanOrEqual(5.5);
    expect(getContrastRatio(textMuted, muted)).toBeGreaterThanOrEqual(5.5);
  });

  it("dynamically verifies all 5 semantic status text tokens achieve WCAG 2.2 AA contrast (>= 4.5:1) in both themes", () => {
    const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
    const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";

    const statuses = ["todo", "progress", "review", "done", "cancelled"];

    for (const s of statuses) {
      // Light mode
      const lightBgMatch = rootBlock.match(new RegExp(`--status-${s}-bg:\\s*(#[0-9a-fA-F]{6});`));
      const lightTextMatch = rootBlock.match(new RegExp(`--status-${s}-text:\\s*(#[0-9a-fA-F]{6});`));
      expect(lightBgMatch).not.toBeNull();
      expect(lightTextMatch).not.toBeNull();
      const lightRatio = getContrastRatio(lightTextMatch![1]!, lightBgMatch![1]!);
      expect(lightRatio, `Light status ${s} must have >= 4.5:1 contrast`).toBeGreaterThanOrEqual(4.5);

      // Dark mode
      const darkBgMatch = darkBlock.match(new RegExp(`--status-${s}-bg:\\s*(#[0-9a-fA-F]{6});`));
      const darkTextMatch = darkBlock.match(new RegExp(`--status-${s}-text:\\s*(#[0-9a-fA-F]{6});`));
      expect(darkBgMatch).not.toBeNull();
      expect(darkTextMatch).not.toBeNull();
      const darkRatio = getContrastRatio(darkTextMatch![1]!, darkBgMatch![1]!);
      expect(darkRatio, `Dark status ${s} must have >= 4.5:1 contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("dynamically verifies interactive UI boundaries achieve WCAG 2.2 SC 1.4.11 non-text contrast (>= 3.0:1)", () => {
    const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
    const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";

    const getLightToken = (name: string) => rootBlock.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`))![1]!;
    const getDarkToken = (name: string) => darkBlock.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`))![1]!;

    const lightCanvas = getLightToken("--surface-canvas");
    const lightCard = getLightToken("--surface-card");
    const lightFocus = getLightToken("--border-focus");
    const lightControl = getLightToken("--border-control");

    expect(getContrastRatio(lightFocus, lightCanvas)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(lightFocus, lightCard)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(lightControl, lightCanvas)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(lightControl, lightCard)).toBeGreaterThanOrEqual(3.0);

    const darkCanvas = getDarkToken("--surface-canvas");
    const darkCard = getDarkToken("--surface-card");
    const darkFocus = getDarkToken("--border-focus");
    const darkControl = getDarkToken("--border-control");

    expect(getContrastRatio(darkFocus, darkCanvas)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(darkFocus, darkCard)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(darkControl, darkCanvas)).toBeGreaterThanOrEqual(3.0);
    expect(getContrastRatio(darkControl, darkCard)).toBeGreaterThanOrEqual(3.0);
  });

  it("evaluates status border tokens under WCAG SC 1.4.11 to confirm decorative classification (< 3.0:1)", () => {
    const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
    const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";

    const statuses = ["todo", "progress", "review", "done", "cancelled"];

    for (const s of statuses) {
      const lightBorder = rootBlock.match(new RegExp(`--status-${s}-border:\\s*(#[0-9a-fA-F]{6});`))![1]!;
      const lightBg = rootBlock.match(new RegExp(`--status-${s}-bg:\\s*(#[0-9a-fA-F]{6});`))![1]!;
      const lightBorderRatio = getContrastRatio(lightBorder, lightBg);
      // Status borders achieve < 3.0:1, confirming they are decorative aesthetic outlines and cannot serve as outline-only controls
      expect(lightBorderRatio).toBeLessThan(3.0);

      const darkBorder = darkBlock.match(new RegExp(`--status-${s}-border:\\s*(#[0-9a-fA-F]{6});`))![1]!;
      const darkBg = darkBlock.match(new RegExp(`--status-${s}-bg:\\s*(#[0-9a-fA-F]{6});`))![1]!;
      const darkBorderRatio = getContrastRatio(darkBorder, darkBg);
      expect(darkBorderRatio).toBeLessThan(3.0);
    }
  });

  describe("Phase 1 Design Foundation Tokens & Surface Elevation Scale", () => {
    it("verifies the calibrated elevation hierarchy (Levels 0 through 4) in both light and dark themes", () => {
      const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
      const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";

      // Light elevation hierarchy
      expect(rootBlock).toMatch(/--elevation-0:\s*#f8fafc;/);
      expect(rootBlock).toMatch(/--elevation-1:\s*#ffffff;/);
      expect(rootBlock).toMatch(/--elevation-2:\s*#ffffff;/);
      expect(rootBlock).toMatch(/--elevation-3:\s*#ffffff;/);
      expect(rootBlock).toMatch(/--elevation-4:\s*#ffffff;/);

      // Dark elevation hierarchy
      expect(darkBlock).toMatch(/--elevation-0:\s*#090d16;/);
      expect(darkBlock).toMatch(/--elevation-1:\s*#0f172a;/);
      expect(darkBlock).toMatch(/--elevation-2:\s*#151f32;/);
      expect(darkBlock).toMatch(/--elevation-3:\s*#1e293b;/);
      expect(darkBlock).toMatch(/--elevation-4:\s*#243247;/);
    });

    it("verifies specular highlight border token and utility class", () => {
      const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || "";
      const darkBlock = cssContent.match(/\.dark\s*\{([^}]+)\}/)?.[1] || "";

      expect(rootBlock).toMatch(/--border-specular:\s*rgba\(0,\s*0,\s*0,\s*0\.04\);/);
      expect(darkBlock).toMatch(/--border-specular:\s*rgba\(255,\s*255,\s*255,\s*0\.08\);/);

      const specularClass = cssContent.match(/\.specular-border\s*\{([^}]+)\}/)?.[1] || "";
      expect(specularClass).toContain("var(--border-specular)");
      expect(specularClass).toContain("var(--border-subtle)");
    });

    it("verifies standardized icon size utility tokens (xs, sm, md, lg)", () => {
      expect(cssContent).toMatch(/\.icon-xs\s*\{[^}]*width:\s*0\.75rem;/);
      expect(cssContent).toMatch(/\.icon-sm\s*\{[^}]*width:\s*0\.875rem;/);
      expect(cssContent).toMatch(/\.icon-md\s*\{[^}]*width:\s*1rem;/);
      expect(cssContent).toMatch(/\.icon-lg\s*\{[^}]*width:\s*1\.25rem;/);
    });

    it("verifies elevation utility classes match defined shadows and tokens", () => {
      expect(cssContent).toMatch(/\.elevation-1\s*\{[^}]*background-color:\s*var\(--elevation-1\);/);
      expect(cssContent).toMatch(/\.elevation-2\s*\{[^}]*background-color:\s*var\(--elevation-2\);/);
      expect(cssContent).toMatch(/\.elevation-3\s*\{[^}]*background-color:\s*var\(--elevation-3\);/);
      expect(cssContent).toMatch(/\.elevation-4\s*\{[^}]*background-color:\s*var\(--elevation-4\);/);
    });
  });
});
