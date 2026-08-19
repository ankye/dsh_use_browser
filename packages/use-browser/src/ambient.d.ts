/**
 * Ambient declaration for the `playwright` module (a runtime dependency of
 * the deployment, not of the harness monorepo build). This file is a script
 * (no top-level export/import), so the `declare module` is an ambient module
 * declaration; runtime code casts the dynamic import to the typed surface in
 * `types.ts`.
 */
declare module 'playwright' {
  export const chromium: any
}
