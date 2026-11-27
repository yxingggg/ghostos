---
inclusion: always
---

# GhostOS — TypeScript Standards

- `tsconfig` runs in `strict` mode. Keep it strict; do not relax `strict`,
  `noImplicitAny`, `strictNullChecks`, or related flags to make code compile.
- Do not use `any`. Prefer precise types, `unknown` at boundaries with narrowing, and
  generics where appropriate. Avoid non-null assertions (`!`); narrow instead.
- Model variants with discriminated unions (e.g., VFS `kind: 'file' | 'folder'`, WM
  actions, fallible results) and exhaustively handle them (use a `never` default branch).
- Prefer `type`/`interface` definitions colocated with the module they describe; export
  shared domain types from the owning core module.
- Keep functions small and typed at their signatures; avoid implicit return-type widening
  on exported functions — annotate public function return types.
- No `// @ts-ignore`/`// @ts-expect-error` to silence real errors; fix the type instead.
  If a suppression is genuinely required, comment why.
- The `typecheck` script (`tsc --noEmit`) must pass with zero errors before a task is
  considered done.
