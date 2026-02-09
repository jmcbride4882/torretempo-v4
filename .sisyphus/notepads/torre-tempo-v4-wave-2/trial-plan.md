Wave 2 Trial Period Handling Plan

- Objective: Complete Wave 2 for Trial Period Handling (backend)
  - Add lightweight logger
  - Replace email source from subscription_details to organization
  - Remove duplicate imports and ensure correct payment service usage
  - Guard trial_ends_at nulls; ensure date arithmetic safe
  - Add trialQueue to queue.ts
  - Wire trial worker into API bootstrap
  - Compile & verify (lsp_diagnostics, typecheck, tests)
  - Update notepad with learnings

## Tasks (Wave A) - 8 max
- [x] T1: Add free logger module (logger.ts) and import it as default in trial.worker.ts
- T2: Replace email source: subscription_details.email -> organization.email (join) and update types
- T3: Remove/resolve duplicate imports for payment cancellations; ensure correct symbols
- T4: Guard trial_ends_at usage; handle nulls and safe date arithmetic
- T5: Add trialQueue to apps/api/src/lib/queue.ts and export it
- T6: Wire trial worker import into index.ts (API bootstrap)
- T7: Run TypeScript compile (tsc --noEmit); fix issues
- T8: Verify with lsp_diagnostics; Notepad learnings entry; plan ready for execution

## Notepad: Inherited Wisdom
- Use existing Drizzle ORM join patterns
- Use BullMQ queue patterns
- Keep changes small and incremental

## Dependencies
- trial.worker.ts
- apps/api/src/lib/queue.ts
- Organization schema (for emails)

## Verification Plan
- lsp_diagnostics: ZERO errors
- TypeScript: ZERO errors on modified files
- Manual inspection: verify plan alignment and changes
- Notepad: append learnings of Wave 2 steps
