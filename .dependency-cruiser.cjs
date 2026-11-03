/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Warn or error when circular dependencies exist between source files.",
      from: { pathNot: "^(node_modules)" },
      to: {
        circular: true,
      },
    },
    {
      name: "no-contracts-importing-apps",
      severity: "error",
      comment: "Shared contracts must never depend on application-layer code.",
      from: { path: "^packages/contracts" },
      to: { path: "^apps" },
    },
    {
      name: "ui-primitive-purity",
      severity: "error",
      comment: "Shared design-system UI primitives must not import feature modules.",
      from: { path: "^apps/web/src/components/ui" },
      to: { path: "^apps/web/src/modules" },
    },
    {
      name: "no-mock-leakage-in-features",
      severity: "warn",
      comment: "Feature modules should rely on API clients or MSW server handlers via test setup, not directly import mocks.",
      from: {
        path: "^apps/web/src/(components|modules|lib)",
        pathNot: ".*\\.(test|spec|stories)\\.(ts|tsx)$",
      },
      to: { path: "^apps/web/src/mocks" },
    },
  ],
  options: {
    doNotFollow: {
      path: ["node_modules", "dist", "storybook-static", ".lighthouseci"],
    },
    exclude: {
      path: ["node_modules", "dist", "storybook-static", ".lighthouseci", "test-results"],
    },
    tsConfig: {
      fileName: "./apps/web/tsconfig.json",
    },
  },
};
