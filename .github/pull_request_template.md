## Pull Request Summary

**Title:** `[type]: [short summary]`  
**Target branch:** `develop` (or `main` for hotfix)  
**Branch:** `[e.g. chore/setup-vs00-foundations, feat/FE-*, etc.]`  
**Linked Issue:** Resolves #[issue-number]  

---

### Description of Changes

<!-- Provide a clear, detailed summary of changes and the architectural context -->

---

### Governance & Traceability

- [ ] Complies with branch model (`feat/FE-*`, `feat/BE-*`, `feat/FS-*`, `fix/*`, `refactor/*`, `perf/*`, `docs/*`, `test/*`, `chore/*`, `hotfix/*`)
- [ ] No direct commits to `main` or `develop`
- [ ] Does not modify protected baseline documentation without explicit change approval
- [ ] Aligns with approved decision register (DEC-OPEN-*)

---

### Quality & Verification Checklist

- [ ] **TypeScript:** `pnpm run typecheck` passes with zero errors and zero unexplained suppressions
- [ ] **Lint & Format:** All linters pass cleanly
- [ ] **Tests:** Unit and integration tests executed and passing (`pnpm test`)
- [ ] **Build:** Production build succeeds (`pnpm run build`)
- [ ] **Documentation / Contracts:** Static validation passes (`python3 Community-Work-Management-v1.5/validation/validate_v1_5.py`)
- [ ] **Accessibility (UI only):** WCAG 2.2 AA checked with zero automated violations and keyboard-navigable controls

---

### Test Execution Evidence

```text
<!-- Paste terminal test output or CI run summary -->
```

---

### Rollback Strategy

<!-- Describe how to revert or disable this change if an issue occurs -->
