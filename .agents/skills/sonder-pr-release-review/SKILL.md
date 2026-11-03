---
name: sonder-pr-release-review
description: >-
  Pull request verification, quality gate validation, and release readiness review for Git workflows.
  Use when conducting final PR code reviews, pre-merge sanity checks, develop synchronization, and release audits.
---

# PR Review & Release Readiness Runbook

## 1. Purpose
Provides a strict, reproducible review framework to ensure every pull request is fully validated, non-destructive, documented, and ready for squash merge.

## 2. When to Activate
- Prior to pushing a branch or opening a pull request to `develop`.
- Conducting pre-merge review on an open PR.
- Performing final synchronization and verification before merging.

## 3. Required Verification Suite
Before approving or opening a PR, the following commands must be executed and succeed with code 0:
```bash
python3 Community-Work-Management-v1.5/validation/validate_v1_5.py
pnpm typegen:check
pnpm typecheck
pnpm test
pnpm --filter @sonder/web build
pnpm depcruise
git diff --check
```

## 4. Step-by-Step Review Process
1. **Branch Hygiene**:
   - Confirm branch name matches convention (`feat/*`, `chore/*`, `fix/*`).
   - Confirm target branch is `develop` (never `main` directly).
   - Confirm working tree is clean and local branch matches remote.
2. **Quality Gate Verification**:
   - Run all 7 baseline commands listed in Section 3.
   - Record exact pass/fail counts and test totals.
3. **Diff Inspection**:
   - Run `git diff origin/develop...HEAD` to verify all changed files.
   - Confirm no generated artifacts (`storybook-static`, `.artifacts`, `test-results`) are committed.
   - Confirm no canonical product specifications or decision registers were altered.
4. **Documentation Sync**:
   - Verify implementation blueprints or tooling guides are updated to reflect changes.
5. **PR Presentation**:
   - Formulate clear PR description using `.github/pull_request_template.md`.
   - List what was done, test evidence, and open user actions.

## 5. Validation Checklist
- [ ] Working tree clean.
- [ ] All 7 baseline verification checks pass with exit code 0.
- [ ] No extraneous files or secrets committed.
- [ ] PR description follows template.
- [ ] Do not auto-merge PR.

## 6. Prohibited Actions
- Never force-push or reset hard.
- Never auto-merge pull requests.
- Never claim tests passed without executing them.
