# AGENTS.md - Coding Agent Instructions for daily-mod

## Project Overview

A Deno (TypeScript) web application for managing weekly rotation lists (round-robin "whose turn is it this week?" tool).
Server-rendered HTML with Pico CSS, flat-file JSON database, no client-side JS framework.

**Runtime:** Deno (NOT Node.js -- no `package.json`, no `node_modules`, no npm) **Framework:** `@changke/mybe` -- a
micro HTTP framework

| File            | Role                                                |
| --------------- | --------------------------------------------------- |
| `main.ts`       | HTTP routes / controller layer + HTML rendering     |
| `db.ts`         | Data access / persistence (JSON files in `./data/`) |
| `date_utils.ts` | Pure date utility functions                         |
| `*_test.ts`     | Co-located test files                               |
| `data/*.json`   | Flat-file database (UUID-named JSON files)          |

## Build / Run / Test Commands

```bash
# Start the dev server (port 8000)
deno task start

# Run ALL tests
deno task test

# Run a single test file
deno test --allow-net --allow-read --allow-write db_test.ts

# Run a specific test by name (substring match with --filter)
deno test --allow-net --allow-read --allow-write --filter "createList" db_test.ts

# Format code (applies rules from deno.json "fmt" section)
deno fmt

# Check formatting without writing
deno fmt --check

# Lint
deno lint
```

**Required permissions for tests:** `--allow-net --allow-read --allow-write` (all three are needed because tests
exercise HTTP handlers and file-based DB operations).

## Dependencies

Managed via import maps in `deno.json`. No package.json or npm.

| Alias           | Source              | Purpose                       |
| --------------- | ------------------- | ----------------------------- |
| `@std/fs`       | `jsr:@std/fs`       | Filesystem helpers (`exists`) |
| `@std/path`     | `jsr:@std/path`     | Path manipulation (`join`)    |
| `@std/assert`   | `jsr:@std/assert`   | Test assertions               |
| `@changke/mybe` | `jsr:@changke/mybe` | Micro web framework           |

## Code Style Guidelines

### Formatting (enforced by `deno fmt` via `deno.json`)

- **Indentation:** 2 spaces
- **Quotes:** Single quotes always (`singleQuote: true`)
- **Semicolons:** Always used
- **Trailing commas:** Never (`"trailingCommas": "never"`)
- **Line width:** 120 characters max
- **Object literal braces:** No spaces inside (`{recursive: true}`, not `{ recursive: true }`)
- **Line endings:** LF
- **Final newline:** Always insert

Run `deno fmt` before committing. Run `deno fmt --check` to verify.

### Imports

- **Named imports only.** Never use default imports.
- **No spaces inside braces:** `{foo, bar}` not `{ foo, bar }`
- **External imports first**, then local imports.
- **Local imports use explicit `.ts` extension:** `import {foo} from './bar.ts';`
- **External packages use import map aliases:** `import {join} from '@std/path';`

```typescript
// Correct
import {assertEquals, assertStringIncludes} from '@std/assert';
import {createList, getData} from './db.ts';

// Wrong - no default imports, no missing extensions, no spaces in braces
import assert from '@std/assert';
import {createList} from './db';
```

### Types

- **Use `interface` over `type` for object shapes.**
- **No `any`.** Zero uses of `any` in the codebase.
- **Explicit return types on exported functions** that return data (e.g., `Promise<string>`, `Promise<Data>`). Return
  types may be omitted on functions returning `Promise<void>` and on non-exported helpers/callbacks.
- **`as` type assertions** are acceptable for form data values (where the DOM API returns `FormDataEntryValue | null`).
- Deno's built-in TypeScript runs in strict mode by default. No `tsconfig.json` is needed.

### Naming Conventions

| Element    | Convention                   | Example                        |
| ---------- | ---------------------------- | ------------------------------ |
| Files      | `snake_case.ts`              | `date_utils.ts`, `db.ts`       |
| Test files | `<module>_test.ts`           | `db_test.ts`, `main_test.ts`   |
| Functions  | `camelCase`                  | `getWeekInfo`, `checkRotation` |
| Variables  | `camelCase`                  | `weekInfo`, `listsHtml`        |
| Constants  | `UPPER_SNAKE_CASE`           | `DATA_DIR`, `ONE_WEEK_MS`      |
| Interfaces | `PascalCase` (no `I` prefix) | `Data`                         |

### Function Style

- **`function` declarations** for exported functions and named helpers.
- **Arrow functions** for route handlers, callbacks, and inline expressions.

```typescript
// Exported function - use function declaration
export async function createList(name: string): Promise<string> { ... }

// Route handler - use arrow function
app.get('/', async (c) => { ... });

// Non-exported helper - function declaration, return type optional
function getDbPath(id: string) { return join(DATA_DIR, `${id}.json`); }
```

### Exports

- **Named exports only.** No default exports anywhere.
- **Inline `export` on function declarations:** `export async function foo() { ... }`
- Exception: `main.ts` uses a bottom-of-file re-export `export {app};` for test access.
- No barrel files or index.ts re-exports.

### Error Handling

- **`throw new Error(...)`** for domain errors in the data layer.
- **`try/catch`** in route handlers to convert errors to HTTP responses (e.g., 404).
- **Prefix unused catch variables with underscore:** `catch (_e) { ... }`
- **Bare `catch {}`** (no binding) for non-critical/expected failures (e.g., bad JSON files).
- **Early returns** for guard clauses: `if (index < 0) return;`
- **`try/finally`** in tests for cleanup (always clean up data files, even on test failure).

### Comments

- Sparse `//` inline comments only. No JSDoc. No block comments.
- Section headers in long files (e.g., `// Dashboard`, `// List View`).
- Numbered step comments in tests (e.g., `// 1. Create list`).
- Explanatory comments for non-obvious logic (e.g., ISO week calculation).

### HTML Templates

- Server-side rendered using `String.raw` tagged template literals.
- Wrapped with a `layout()` function that provides the HTML shell (Pico CSS from CDN).
- Standard `<form>` with POST/redirect/GET pattern. No client-side JS frameworks.

### Testing Conventions

- **Framework:** Deno's built-in `Deno.test()` with `@std/assert`.
- **Test naming:** `'module - what it tests'` (e.g., `'db - createList and getLists'`).
- **Integration tests** use `app.fetch()` directly (no real HTTP server started).
- **Always clean up** test data with `try/finally` and a `cleanup()` helper.
- **Tests are self-contained** and do not depend on each other.

### Entry Point Guard

Use the Deno idiom to prevent the server from starting when the module is imported for testing:

```typescript
if (import.meta.main) {
  app.listen({port: 8000});
}
```
