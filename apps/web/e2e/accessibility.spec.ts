import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as fs from "node:fs";
import * as path from "node:path";

interface AuditResult {
  route: string;
  viewport: string;
  violationsCount: number;
  violations: Array<{
    id: string;
    impact: string | null;
    description: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary?: string;
    }>;
  }>;
}

const auditLog: AuditResult[] = [];

test.afterAll(() => {
  const outputDir = path.resolve(process.cwd(), "test-results");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outputDir, "axe-accessibility-audit.json"),
    JSON.stringify(auditLog, null, 2)
  );
});

test.describe("WCAG Accessibility Audits", () => {
  test("Dashboard view and application shell accessibility audit", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.waitForSelector("header");

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    auditLog.push({
      route: "/",
      viewport: isMobile ? "mobile" : "desktop",
      violationsCount: result.violations.length,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target.map(String),
          failureSummary: n.failureSummary,
        })),
      })),
    });

    // Zero critical violations invariant; documented pre-existing violations tracked in audit log
    const criticalViolations = result.violations.filter((v) => v.impact === "critical");
    expect(criticalViolations).toEqual([]);
  });

  test("My Work placeholder view accessibility audit", async ({ page, isMobile }) => {
    await page.goto("/my-work");
    await page.waitForSelector("header");

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    auditLog.push({
      route: "/my-work",
      viewport: isMobile ? "mobile" : "desktop",
      violationsCount: result.violations.length,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target.map(String),
          failureSummary: n.failureSummary,
        })),
      })),
    });

    const criticalViolations = result.violations.filter((v) => v.impact === "critical");
    expect(criticalViolations).toEqual([]);
  });

  test("Inbox placeholder view accessibility audit", async ({ page, isMobile }) => {
    await page.goto("/inbox");
    await page.waitForSelector("header");

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    auditLog.push({
      route: "/inbox",
      viewport: isMobile ? "mobile" : "desktop",
      violationsCount: result.violations.length,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target.map(String),
          failureSummary: n.failureSummary,
        })),
      })),
    });

    const criticalViolations = result.violations.filter((v) => v.impact === "critical");
    expect(criticalViolations).toEqual([]);
  });

  test("Login view accessibility audit", async ({ page, isMobile }) => {
    await page.goto("/login");
    await page.waitForSelector("form");

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    auditLog.push({
      route: "/login",
      viewport: isMobile ? "mobile" : "desktop",
      violationsCount: result.violations.length,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target.map(String),
          failureSummary: n.failureSummary,
        })),
      })),
    });

    const criticalViolations = result.violations.filter((v) => v.impact === "critical");
    expect(criticalViolations).toEqual([]);
  });

  test("Register view accessibility audit", async ({ page, isMobile }) => {
    await page.goto("/register");
    await page.waitForSelector("form");

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    auditLog.push({
      route: "/register",
      viewport: isMobile ? "mobile" : "desktop",
      violationsCount: result.violations.length,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target.map(String),
          failureSummary: n.failureSummary,
        })),
      })),
    });

    const criticalViolations = result.violations.filter((v) => v.impact === "critical");
    expect(criticalViolations).toEqual([]);
  });

  test("Mobile navigation drawer accessibility audit when open", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile drawer test only applies to mobile viewports");

    await page.goto("/");
    await page.waitForSelector("header");

    const menuButton = page.getByRole("button", { name: /open navigation menu/i });
    await menuButton.click();
    await page.waitForSelector('[aria-label="Navigation drawer"]');

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    auditLog.push({
      route: "/ (mobile drawer open)",
      viewport: "mobile",
      violationsCount: result.violations.length,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "minor",
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target.map(String),
          failureSummary: n.failureSummary,
        })),
      })),
    });

    const criticalViolations = result.violations.filter((v) => v.impact === "critical");
    expect(criticalViolations).toEqual([]);
  });
});
