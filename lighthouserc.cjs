module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm --filter @sonder/web preview --port 4173",
      startServerReadyPattern: "Local:",
      url: [
        "http://localhost:4173/",
        "http://localhost:4173/my-work",
        "http://localhost:4173/inbox",
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-gpu",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["warn", { minScore: 0.85 }],
        "categories:best-practices": ["warn", { minScore: 0.85 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
      },
    },
  },
};
