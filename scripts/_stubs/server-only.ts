// No-op stub for `server-only` so the calibration harness can import the
// production lib code under tsx. The published `server-only` package
// throws on import outside a Next build; Next's webpack resolves it to
// its own no-op variant during compile. tsx has no such resolver, so we
// alias `server-only` here via tsconfig.calibrate.json paths.
//
// Production Next builds use the original tsconfig.json which does NOT
// alias `server-only` — so the protection still works for client-bundle
// safety in deployed code.

export {};
