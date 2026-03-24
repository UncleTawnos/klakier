# E2E Test Rules (Playwright)

> **Scope:** Opinionated rules for Playwright-based end-to-end tests. These define HOW tests must be structured, isolated, and maintained.
>
> **Out of scope:** Unit tests, integration tests, and component tests are governed by BACKEND_RULES.md (Go) and FRONTEND_RULES.md (React/TypeScript) respectively. This document covers end-to-end verification of the integrated system only.
>
> **Stack:** Playwright, TypeScript, `@playwright/test` runner.
>
> **Language:** MUST, MUST NOT, SHOULD, SHOULD NOT, MAY follow RFC 2119 semantics.
>
> **Test depth:** Smoke-level — verify that workflows complete and user-facing behavior works. Do NOT assert visual details (colors, spacing, animation). DO assert that elements appear, forms submit, data persists, and errors surface. Visual regression testing and deeper test strategies may be addressed in a future appendix.
>
> **Relationship to other rulesets:** API endpoint contracts, error response formats, and server-side conventions are defined in BACKEND_RULES. Frontend component structure, styling, and client-side conventions are defined in FRONTEND_RULES. This document tests their observable behavior through the UI and API — it does not redefine those conventions.
>
> **Code examples:** All entity names, endpoints, and page objects in this document are **illustrative**. Replace them with your project's actual resources. Do not scaffold tests for entities shown here unless they exist in your application.

---

## 1. Project Structure

### 1.1 Directory Layout

```
e2e/
├── playwright.config.ts
├── global-setup.ts              # health check + auth storageState capture
├── .auth/                       # storageState files (gitignored)
├── tsconfig.json
├── fixtures/
│   ├── auth.fixture.ts          # authenticatedAPI, authenticatedPage
│   ├── index.ts                 # re-exports all fixtures
│   └── ...
├── helpers/
│   ├── api-client.ts            # typed wrapper around APIRequestContext
│   ├── data-factory.ts          # unique test data generators
│   └── ...
├── page-objects/
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── components/
│   │   ├── toast.component.ts
│   │   └── ...
│   └── ...
├── api-safe/
│   └── ...
├── api-destructive/
│   └── ...
├── browser-safe/
│   └── ...
└── browser-destructive/
    └── ...
```

| Rule | Level |
|------|-------|
| Tests live in `e2e/` at repo root, not inside `web/` or `api/` | MUST |
| Four test directories: `api-safe`, `api-destructive`, `browser-safe`, `browser-destructive` | MUST |
| Page objects live in `e2e/page-objects/` | MUST |
| Fixtures live in `e2e/fixtures/` | MUST |
| Helpers (API client, data factories) live in `e2e/helpers/` | MUST |
| Shared reusable components (toast, nav, table) live in `e2e/page-objects/components/` | SHOULD |

### 1.2 Playwright Configuration

Each test directory maps to a Playwright **project**. Projects define which tests run together and in what order.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalSetup: './global-setup',
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: '.auth/admin.json',
  },

  projects: [
    {
      name: 'api-safe',
      testDir: './api-safe',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api-destructive',
      testDir: './api-destructive',
      dependencies: ['api-safe'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'browser-safe',
      testDir: './browser-safe',
      dependencies: ['api-safe'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'browser-destructive',
      testDir: './browser-destructive',
      dependencies: ['browser-safe'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

| Rule | Level |
|------|-------|
| Each of the 4 test directories is a separate Playwright project | MUST |
| `api-safe` has no dependencies (runs first) | MUST |
| Destructive projects depend on their safe counterpart | MUST |
| `globalSetup` verifies the app is reachable and captures auth `storageState` | MUST |
| `retries: 0` — flaky tests are bugs, not retry candidates | MUST |
| `trace: 'retain-on-failure'` enabled | MUST |
| `screenshot: 'only-on-failure'` enabled | MUST |
| `fullyParallel: true` — tests within a project run in parallel | SHOULD |
| Timeouts set explicitly (not relying on defaults) | MUST |

### 1.3 TypeScript Configuration

```jsonc
// e2e/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@fixtures/*": ["fixtures/*"],
      "@helpers/*": ["helpers/*"],
      "@pages/*": ["page-objects/*"]
    }
  },
  "include": ["./**/*.ts"]
}
```

### 1.4 Test Environment

Tests assume the application is already running and reachable. CI integration, container orchestration, and infra bootstrap are out of scope — handle them in CI config.

| Environment Variable | Purpose | Default |
|---|---|---|
| `BASE_URL` | Application root URL | `http://localhost:3000` |
| `TEST_ADMIN_EMAIL` | Pre-existing admin account for authenticated tests | `admin@e2e.local` |
| `TEST_ADMIN_PASSWORD` | Password for admin account | `admin-password` |

| Rule | Level |
|------|-------|
| Tests MUST NOT start, stop, or provision the application under test | MUST |
| All environment-specific values come from environment variables with sensible local defaults | MUST |
| Tests MUST work against any reachable instance — local or remote — without code changes | MUST |

### 1.5 Browser & Viewport Coverage

| Rule | Level |
|------|-------|
| Initial test suite targets `Desktop Chrome` only | MUST |
| Additional browsers (Firefox, WebKit) MAY be added as separate projects once the suite is stable | MAY |
| Mobile viewport testing MAY be added via a dedicated project with a viewport override | MAY |

---

## 2. Test Classification

### 2.1 Safe vs Destructive

| Category | What it does | Examples |
|----------|-------------|----------|
| **Safe** | Read-only operations. No persistent data created, modified, or deleted. | GET endpoints, page loads, login/logout, navigation, search, filtering, validation error display |
| **Destructive** | Write operations. Creates, updates, or deletes data. | Form submissions, CRUD workflows, state transitions, bulk operations |

| Rule | Level |
|------|-------|
| Safe tests MUST NOT create, update, or delete any persistent data | MUST |
| Safe tests MAY create transient state (login sessions) that expires naturally | MAY |
| Destructive tests MUST clean up all data they create (see §3) | MUST |
| A test that _reads_ data which was created by its own setup is **destructive** (the setup mutated state) | MUST |

### 2.2 API vs Browser

| Category | Channel | Setup/Teardown channel |
|----------|---------|----------------------|
| `api-safe` | `APIRequestContext` | `APIRequestContext` |
| `api-destructive` | `APIRequestContext` | `APIRequestContext` |
| `browser-safe` | `Page` (browser) | `APIRequestContext` |
| `browser-destructive` | `Page` (browser) | `APIRequestContext` |

| Rule | Level |
|------|-------|
| API tests use `APIRequestContext` exclusively — no browser | MUST |
| Browser tests interact with the application through `Page` | MUST |
| Browser test **setup and teardown** use API calls, not browser actions | MUST |

### 2.3 File Naming

| Pattern | Example |
|---------|---------|
| `{entity}-{operation}.spec.ts` for destructive | `item-crud.spec.ts`, `order-lifecycle.spec.ts` |
| `{entity}-{aspect}.spec.ts` for safe | `item-list.spec.ts`, `auth-read.spec.ts` |
| One `describe` block per file, named `{Entity} > {operation}` | `describe('Item > CRUD')` |
| Split a spec file when it exceeds ~10 tests or covers more than one distinct workflow | SHOULD |

---

## 3. Test Isolation & State Management

### 3.1 Self-Contained Tests

Each test owns its setup, action, assertion, and teardown. No test depends on another test's side effects. This prevents **chains of death** — cascading failures where test N fails because test N-1 didn't create the data it expected.

```typescript
// BAD: Chain of death — test 2 depends on test 1's created data
test('create item via form', async ({ page }) => { /* ... */ });
test('edit the item we just created', async ({ page }) => {
  // If create failed, this fails with "item not found" — misleading
});
```

```typescript
// GOOD: Each test is self-contained
test('delete item via form', async ({ authenticatedPage, authenticatedAPI }) => {
  // SETUP: via API (fast, reliable — not what we're testing)
  const item = await authenticatedAPI.createItem({ name: uniqueName('del'), email: uniqueEmail('del') });
  // ACT: delete via browser (this is what we're testing)
  const itemPage = new ItemListPage(authenticatedPage);
  await itemPage.deleteItem(item.id);
  await itemPage.expectItemAbsent(item.email);
});
```

| Rule | Level |
|------|-------|
| Each test is self-contained: own setup, own action, own assertion, own teardown | MUST |
| Tests MUST NOT depend on execution order or the result of other tests | MUST |
| The action under test uses the channel being tested (browser or API) | MUST |
| Setup and teardown use API calls (the most reliable channel) | MUST |

### 3.2 Clean State Guarantee

Every test MUST leave the system in the same state it found it. This is non-negotiable for parallel execution and re-runnability.

```typescript
test.describe('Widget > CRUD', () => {
  let createdId: string | undefined;

  test.afterEach(async ({ authenticatedAPI }) => {
    if (createdId) {
      await authenticatedAPI.deleteWidget(createdId).catch(() => {});
      createdId = undefined;
    }
  });

  test('create widget via form', async ({ authenticatedPage, authenticatedAPI }) => {
    const name = uniqueName('widget');
    const widgetPage = new WidgetFormPage(authenticatedPage);
    await widgetPage.fillAndSubmit({ name });
    await widgetPage.expectSuccessToast();
    createdId = await authenticatedAPI.getWidgetByName(name).then(w => w.id);
  });
});
```

| Rule | Level |
|------|-------|
| Tests clean up all data they create, even on failure | MUST |
| Cleanup logic lives in `afterEach` or `finally` blocks, not at the end of the test body | MUST |
| Cleanup errors are caught and swallowed (`.catch(() => {})`) — cleanup must not mask the real failure | MUST |
| Tests MUST NOT depend on a pre-seeded database state beyond what the application starts with (auth users, default config) | MUST |

### 3.3 Unique Test Data

Tests running in parallel MUST NOT collide on entity names, emails, or other unique fields.

```typescript
// e2e/helpers/data-factory.ts
import { randomUUID } from 'crypto';

export function uniqueId(prefix = 'test'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@e2e.local`;
}

export function uniqueName(prefix = 'test'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}
```

| Rule | Level |
|------|-------|
| Every entity created in a test uses a unique, generated identifier | MUST |
| Unique identifiers include a human-readable prefix for debugging | SHOULD |
| Hard-coded entity names in test data are forbidden | MUST NOT |
| Data factory functions live in `e2e/helpers/data-factory.ts` | MUST |

### 3.4 Parallel Safety

| Rule | Level |
|------|-------|
| Tests within a project run in parallel by default | SHOULD |
| Tests that cannot run in parallel MUST use `test.describe.configure({ mode: 'serial' })` with a comment explaining why | MUST |
| Parallel tests MUST NOT share mutable state (no module-level variables mutated across tests) | MUST |
| `describe`-scoped variables (e.g., `createdId`) are permitted because Playwright isolates workers | MAY |

### 3.5 `beforeAll` / `afterAll` Gotchas

`test.beforeAll` and `test.afterAll` run once **per worker**, not once per file. With `fullyParallel: true`, multiple workers may execute tests from the same file.

| Rule | Level |
|------|-------|
| Prefer `beforeEach`/`afterEach` over `beforeAll`/`afterAll` | SHOULD |
| `beforeAll` MAY be used for expensive read-only setup shared across tests in one `describe` | MAY |
| `beforeAll` MUST NOT create data that individual tests mutate — use `beforeEach` instead | MUST NOT |
| `afterAll` cleanup MUST be idempotent (safe to run multiple times across workers) | MUST |

---

## 4. Page Objects (Browser Tests)

### 4.1 Structure

Every page or major UI section that browser tests interact with has a page object. Page objects encapsulate locators and actions — tests read like specifications.

```typescript
// e2e/page-objects/login.page.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() { await this.page.goto('/login'); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
```

| Rule | Level |
|------|-------|
| Every page that browser tests touch has a page object class | MUST |
| Page objects own all locators — tests never call `page.getByRole(...)` directly | MUST |
| Page objects expose **actions** (verbs: `login`, `fillAndSubmit`, `deleteItem`) and **assertions** (`expectError`, `expectVisible`) | MUST |
| Page objects MUST NOT contain test logic (`test()`, `expect` on business rules) | MUST |
| Assertions in page objects are limited to UI state (`toBeVisible`, `toContainText`, `toHaveURL`) | MUST |
| Reusable components (toast, nav bar, data table) are separate classes in `page-objects/components/` | SHOULD |
| Page object constructor takes `Page` as its only argument | MUST |
| Locators are assigned in the constructor as `readonly` properties | MUST |

### 4.2 Locator Priority

| Priority | Locator | When to use |
|----------|---------|-------------|
| 1st | `getByRole('button', { name: '...' })` | Interactive elements — buttons, links, inputs, headings |
| 2nd | `getByLabel('...')` | Form inputs associated with a label |
| 3rd | `getByText('...')` | Static text content, messages |
| 4th | `getByTestId('...')` | When no semantic locator exists (complex widgets, data cells) |
| Forbidden | CSS selectors (`.class`, `#id`), XPath | Never — brittle, couples tests to markup |

| Rule | Level |
|------|-------|
| Use semantic locators (`getByRole`, `getByLabel`, `getByText`) before `getByTestId` | MUST |
| CSS selectors and XPath are forbidden | MUST NOT |
| `data-testid` attributes may be added to frontend code when no semantic locator is possible | MAY |
| `data-testid` values use kebab-case: `data-testid="user-row-actions"` | MUST |

---

## 5. Assertions & Waiting

Playwright locators auto-wait for elements to be actionable. Do NOT add manual waits.

```typescript
// BAD
await page.waitForTimeout(2000);
await page.waitForSelector('.modal');
const text = await page.getByRole('heading').textContent();
expect(text).toBe('Dashboard');  // No auto-retry, race condition

// GOOD
await expect(page.getByRole('dialog')).toBeVisible();
await expect(page.getByRole('heading')).toHaveText('Dashboard');
await page.getByRole('button', { name: 'Save' }).click();  // auto-waits
```

| Rule | Level |
|------|-------|
| `page.waitForTimeout()` is forbidden | MUST NOT |
| `page.waitForSelector()` is forbidden — use `expect(locator).toBeVisible()` instead | MUST NOT |
| Use web-first assertions (`expect(locator).toBeVisible()`) not raw checks (`locator.isVisible()`) | MUST |
| Do not extract values then assert — use `expect(locator)` directly | MUST |
| `page.waitForURL()` or `expect(page).toHaveURL()` for navigation assertions | MUST |
| `page.waitForResponse()` MAY be used to wait for a specific API call to complete before asserting | MAY |
| `test.slow()` MAY be used for legitimately long workflows — it triples the timeout | MAY |
| Per-test timeout overrides via `test.setTimeout()` SHOULD be avoided; prefer `test.slow()` | SHOULD NOT |
| Assert **behavior**, not **implementation** — "toast appears" not "CSS class added" | MUST |

---

## 6. API Helpers

### 6.1 Typed API Client

A shared API client wraps `APIRequestContext` with typed methods for setup and teardown. In `api-*` tests, the **action under test** uses raw `request` to verify the real HTTP contract — `APIClient` is reserved for arranging and cleaning up state.

```typescript
// e2e/helpers/api-client.ts — illustrative
import { type APIRequestContext } from '@playwright/test';

export class APIClient {
  constructor(private request: APIRequestContext, private baseURL: string) {}

  async createItem(data: { name: string; email: string }) {
    const res = await this.request.post(`${this.baseURL}/api/v1/items`, { data });
    if (!res.ok()) throw new Error(`createItem failed: ${res.status()}`);
    return res.json() as Promise<{ id: string; name: string; email: string }>;
  }

  async deleteItem(id: string) {
    // 404 is success for cleanup — the entity may already be gone
    const res = await this.request.delete(`${this.baseURL}/api/v1/items/${id}`);
    if (!res.ok() && res.status() !== 404) {
      throw new Error(`deleteItem failed: ${res.status()}`);
    }
  }

  async getItemByEmail(email: string) {
    const res = await this.request.get(`${this.baseURL}/api/v1/items`, { params: { email } });
    if (!res.ok()) throw new Error(`getItemByEmail failed: ${res.status()}`);
    const body = await res.json() as { items: Array<{ id: string; email: string }> };
    return body.items[0];
  }
}
```

| Rule | Level |
|------|-------|
| Setup and teardown API calls go through `APIClient` — not raw `request` | MUST |
| In `api-*` tests, the **action under test** SHOULD use raw `request` to verify the HTTP contract | SHOULD |
| In `browser-*` tests, raw `request` in test files is forbidden — use `APIClient` for all API calls | MUST |
| `APIClient` methods are typed — input parameters and return types | MUST |
| Delete methods treat `404` as success (idempotent cleanup). All other methods MUST throw on non-OK responses. | MUST |
| Error messages include the HTTP status code | MUST |

### 6.2 API Test Assertions

| Rule | Level |
|------|-------|
| Assert HTTP status code on every API response | MUST |
| Assert presence and type of key fields, not exact values (unless testing a specific value) | SHOULD |
| Assert error response structure matches the API's error format | MUST |
| Do not assert on timestamps, auto-generated IDs, or other non-deterministic fields unless specifically testing them | SHOULD NOT |

---

## 7. Fixtures

### 7.1 Auth Fixtures

Auth state is captured **once** in `globalSetup` and reused via `storageState`:

1. `globalSetup` authenticates and writes `.auth/admin.json`.
2. `playwright.config.ts → use.storageState` sets `.auth/admin.json` as the default — so the built-in `request` fixture carries the admin session automatically.
3. `authenticatedAPI` wraps the built-in `request` in an `APIClient`.
4. `authenticatedPage` creates its own `BrowserContext` with `storageState` — giving each test an isolated context that is closed after the test, preventing cookie/localStorage leakage.

The config-level `storageState` and the fixture-level `storageState` are not redundant. The config covers the built-in fixtures (including `request` used in API tests). The fixture creates a fresh, isolated context per test while reusing the same auth state.

```typescript
// e2e/global-setup.ts — runs once before all tests
import { request } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@e2e.local';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin-password';

async function globalSetup() {
  const check = await fetch(`${BASE_URL}/api/v1/health`);
  if (!check.ok) throw new Error(`App not reachable at ${BASE_URL}: ${check.status}`);

  const ctx = await request.newContext({ baseURL: BASE_URL });
  const loginRes = await ctx.post('/api/v1/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!loginRes.ok()) {
    await ctx.dispose();
    throw new Error(`Auth failed: ${loginRes.status()} — check TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD`);
  }
  await ctx.storageState({ path: '.auth/admin.json' });
  await ctx.dispose();
}

export default globalSetup;
```

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';
import { APIClient } from '@helpers/api-client';

type AuthFixtures = {
  authenticatedAPI: APIClient;
  authenticatedPage: import('@playwright/test').Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedAPI: async ({ request }, use) => {
    const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
    await use(new APIClient(request, baseURL));
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
      storageState: '.auth/admin.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

For **multiple roles**, extend `globalSetup` to capture one storageState file per role (`.auth/admin.json`, `.auth/user.json`) and add role-specific fixtures (`userPage`, `unauthenticatedPage`) following the same pattern — own context, own cleanup. Tests verifying unauthenticated behavior use a fixture with no `storageState`.

| Rule | Level |
|------|-------|
| All test files import `test` and `expect` from `@fixtures/index`, not from `@playwright/test` | MUST |
| Auth state captured once in `globalSetup`, reused via `storageState` | MUST |
| Auth credentials read from environment variables, not hard-coded | MUST |
| `authenticatedPage` creates its own `BrowserContext` and closes it after use | MUST |
| Each role has its own storageState file; role credentials come from env vars | MUST |
| `.auth/` directory MUST be in `.gitignore` | MUST |
| New fixtures added to `e2e/fixtures/` and re-exported from `index.ts` | MUST |

### 7.2 When to Create a Fixture vs a Helper

| Use a fixture when... | Use a helper when... |
|---|---|
| The object needs setup AND teardown (lifecycle) | It's a pure function with no lifecycle |
| It should be injected automatically into tests | It's called explicitly when needed |
| It carries per-test state (e.g., an authenticated session) | It's stateless (e.g., `uniqueEmail()`) |

---

## 8. Test Anatomy

### 8.1 Standard Test Structure

Every test follows **Setup → Act → Assert → Cleanup**. The pattern is identical across all four test categories — only the channels differ:

| Category | Act via | Setup/teardown via |
|---|---|---|
| `api-safe` | raw `request` | — (read-only) |
| `api-destructive` | raw `request` | `APIClient` |
| `browser-safe` | `Page` | — (read-only) |
| `browser-destructive` | `Page` | `APIClient` |

```typescript
// Browser destructive — full pattern (illustrative)
import { test, expect } from '@fixtures/index';
import { ItemFormPage } from '@pages/item-form.page';
import { uniqueEmail, uniqueName } from '@helpers/data-factory';

test.describe('Item > Create via form', () => {
  let createdId: string | undefined;

  test.afterEach(async ({ authenticatedAPI }) => {
    if (createdId) {
      await authenticatedAPI.deleteItem(createdId).catch(() => {});
      createdId = undefined;
    }
  });

  test('creates an item and shows success toast', async ({
    authenticatedPage,
    authenticatedAPI,
  }) => {
    const email = uniqueEmail('create');
    // ACT: create via browser
    const itemPage = new ItemFormPage(authenticatedPage);
    await itemPage.goto();
    await itemPage.fillAndSubmit({ name: uniqueName('item'), email });
    // ASSERT
    await itemPage.expectSuccessToast('Item created');
    // Capture for cleanup
    createdId = (await authenticatedAPI.getItemByEmail(email))?.id;
  });
});
```

| Rule | Level |
|------|-------|
| Every test follows Setup → Act → Assert → Cleanup | MUST |
| Cleanup in `afterEach`, not at the end of the test body | MUST |
| Each test tests **one behavior** — one act, one set of related assertions | MUST |
| Test names describe the expected outcome: `'creates an item and shows success toast'` | MUST |
| Test names SHOULD NOT start with "should" — use active voice | SHOULD |
| `describe` blocks group tests by entity and operation | MUST |

### 8.2 What NOT to Test

| Rule | Level |
|------|-------|
| Tests assert on **user-visible behavior**: elements appear, forms submit, data persists, errors display | MUST |
| Tests MUST NOT assert on CSS classes, inline styles, or DOM structure | MUST NOT |
| Tests MUST NOT assert on internal application state (Redux store, React state) | MUST NOT |
| Do not test third-party library internals, animation/transition completion, or exact error message wording beyond identifying the error type | — |

---

## 9. Error Handling & Debugging

### 9.1 Traces and Screenshots

| Rule | Level |
|------|-------|
| `trace: 'retain-on-failure'` in config | MUST |
| `screenshot: 'only-on-failure'` in config | MUST |
| Trace files and screenshots in `.gitignore` | MUST |

### 9.2 Debugging Tips (Non-Normative)

- Run a single test: `npx playwright test item-crud --project=browser-destructive`
- Debug mode (headed + inspector): `npx playwright test --debug`
- UI mode for interactive development: `npx playwright test --ui`
- View trace: `npx playwright show-trace test-results/.../trace.zip`

### 9.3 Flaky Tests & Quarantine

| Rule | Level |
|------|-------|
| Flaky tests are treated as bugs — they MUST be fixed, not retried | MUST |
| `retries` is set to `0` in config | MUST |
| A flaky test MUST be fixed or quarantined within one sprint of detection | MUST |
| Quarantined tests use `test.fixme('reason — link to tracking issue')` | MUST |
| `test.skip()` MAY be used for environment-conditional skips with a reason | MAY |
| CI SHOULD report the total `fixme` + `skip` count; an increasing trend is a quality regression signal | SHOULD |
| Quarantined tests that remain unfixed for two consecutive sprints MUST be escalated or deleted | MUST |

---

## 10. Network & External Dependencies

E2E tests verify the real integrated system. The application's own API is never mocked — if a test needs specific server state, create it via API setup.

External services (payment gateways, SSO providers, email services, feature flag services) that the application depends on MAY be stubbed at the network boundary when their behavior cannot be reliably controlled in a test environment.

```typescript
// PERMITTED: Stub an external payment gateway to simulate timeout
test('shows payment error when gateway times out', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.route('**/api.stripe.com/**', (route) => route.abort('timedout'));

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByRole('alert')).toContainText('Payment service unavailable');

  await page.unrouteAll();
});
```

| Rule | Level |
|------|-------|
| E2E tests run against real application services — no mocked internal APIs | MUST |
| `page.route()` MUST NOT intercept the application's own API endpoints | MUST NOT |
| `page.route()` MAY intercept external/third-party services to simulate error conditions | MAY |
| `page.route()` MAY simulate network conditions (latency, disconnection) for resilience tests | MAY |
| All intercepted routes MUST be removed after the test (`page.unrouteAll()`) | MUST |
| If a test needs specific server state, create it via API setup — do not mock | MUST |

---

## 11. Test Tagging

Tags enable selective test execution in CI and local development.

| Tag | Meaning | When to apply |
|-----|---------|---------------|
| `@smoke` | Critical happy-path tests that gate deployment. Failure = release blocker. | One test per core user journey (login, primary CRUD, key workflow) |
| `@regression` | Broader coverage beyond smoke. Runs on main branch, not necessarily on every PR. | Edge cases, secondary flows, error handling |
| `@slow` | Tests that legitimately exceed 15 seconds (multi-step wizards, file uploads). | Pair with `test.slow()` in the test body |

```typescript
test('creates an order @smoke', async ({ authenticatedPage }) => { /* ... */ });
test('validates 50-char name limit @regression', async ({ authenticatedPage }) => { /* ... */ });
test('uploads CSV and processes 100 rows @slow', async ({ authenticatedPage }) => {
  test.slow();
  // ...
});
```

Run tagged subsets: `npx playwright test --grep @smoke`

| Rule | Level |
|------|-------|
| Every test in `browser-destructive` and `api-destructive` MUST have at least one tag | MUST |
| `@smoke` tests MUST pass before any deployment (CI gate) | MUST |
| A project SHOULD have no more than ~20% of tests tagged `@smoke` | SHOULD |
| Tags are applied as suffixes in the test name string | MUST |
| Untagged safe tests are treated as `@regression` by default | — |

---

## 12. Quick Reference — Decision Matrix

| I want to test... | Package | Setup via | Act via | Cleanup via |
|---|---|---|---|---|
| GET endpoint returns correct data | `api-safe` | — | API | — |
| Auth endpoint rejects bad credentials | `api-safe` | — | API | — |
| POST endpoint creates an entity | `api-destructive` | — | API | API |
| PUT endpoint updates an entity | `api-destructive` | API (create) | API (update) | API (delete) |
| DELETE endpoint removes an entity | `api-destructive` | API (create) | API (delete) | — (already deleted) |
| Page loads and displays content | `browser-safe` | — | Browser | — |
| Login form works | `browser-safe` | — | Browser | — |
| Form creates an entity | `browser-destructive` | — | Browser | API |
| UI updates an entity | `browser-destructive` | API (create) | Browser (update) | API (delete) |
| UI deletes an entity | `browser-destructive` | API (create) | Browser (delete) | — (already deleted) |
| UI shows validation errors | `browser-safe` | — | Browser (submit invalid) | — |
| External service unavailable | `browser-safe` | `page.route()` stub | Browser | `page.unrouteAll()` |
