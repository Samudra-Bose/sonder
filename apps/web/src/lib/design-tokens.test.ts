import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.resolve(__dirname, "../index.css");

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
});
