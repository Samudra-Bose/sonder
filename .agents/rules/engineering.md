# Engineering & Verification Rules

- Execution Evidence: Never state a test or check passed without running it and inspecting output and exit codes.
- Context7 Queries: Retrieve latest official documentation before using newer library APIs.
- Monorepo Hygiene: Always use `pnpm`. Preserve Node 26.11.1, pnpm 12.13.0, React 19, Vite 6, TypeScript 5.7.3, and Vitest 3.0.5.
- Branch Strategy: Never push directly to `develop` or `main`. Use `feat/*` or `chore/*` branches and open Pull Requests against `develop`.
