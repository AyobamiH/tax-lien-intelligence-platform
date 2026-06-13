# Dependency Security And Supply-Chain Hygiene

Phase 34 establishes an explicit dependency-risk workflow. It is intentionally
small: understand advisories, make the narrowest compatible change, verify the
whole application, and record any remaining exposure honestly.

## Phase 34 Investigation

The initial `npm audit` reported two high-severity package entries:

- direct `vite@7.3.3`, marked high because it depended on vulnerable esbuild;
- transitive `esbuild`, resolved as `0.27.7` under Vite and `0.28.0` through
  `tsx@4.22.3`.

The high advisory was
[`GHSA-gv7w-rqvm-qjhr`](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr),
covering esbuild versions before `0.28.1`. It concerns missing binary integrity
verification in the Deno npm module when registry selection is influenced
through `NPM_CONFIG_REGISTRY`. npm also attached the low-severity Windows
development-server advisory
[`GHSA-g7r4-m6w7-qqqr`](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)
to the same esbuild finding.

This code is build/development tooling. It is not imported by the Express API
or shipped in the browser bundle. The exposure was therefore developer and CI
supply-chain execution, not a deployed application request path. That does not
make the high advisory acceptable: developer and CI execution can still affect
source, credentials, and release artifacts.

## Remediation

The repo now uses:

- `vite@8.0.16`;
- `esbuild@0.28.1`, accepted by both Vite's optional peer range and
  `tsx@4.22.3`;
- Node.js `^20.19.0 || >=22.12.0`, matching Vite 8's supported engine range.

Vite 8 replaces its primary esbuild/Rollup pipeline with Oxc/Rolldown. The
official [Vite 7 to 8 migration guide](https://vite.dev/guide/migration)
documents the changed compiler and bundler behavior. This repo uses a basic
React plugin configuration and no custom esbuild, optimizer, CommonJS, manual
chunk, or Rollup plugin options, so no compatibility configuration was needed.
The production web build and full test suite verify the migration.

No npm override or replacement package was required. The lockfile records the
fixed transitive patch explicitly.

## Dependency Classification

Frontend build packages are development-only:

- `@vitejs/plugin-react`;
- `autoprefixer`;
- `postcss`;
- `tailwindcss`;
- `vite`.

They are declared in `devDependencies` so production dependency reporting does
not overstate the deployed runtime surface. Runtime packages remain under
`dependencies`.

## Enforcement Policy

`npm run audit` runs `npm audit --audit-level=high`.

- high and critical findings fail CI and the local pre-push hook;
- low and moderate findings remain visible for triage but do not automatically
  block delivery;
- every high/critical finding must be classified as runtime, build, test, or
  transitive and either remediated or documented with containment and a named
  follow-up;
- lockfile-only changes must still be reviewed and pass install, typecheck,
  tests, and build;
- major upgrades require migration review and regression verification rather
  than an automatic audit fix.

At Phase 34 completion, both full `npm audit` and production-only
`npm audit --omit=dev` report zero vulnerabilities. There is no known unresolved
dependency risk recorded by npm.
