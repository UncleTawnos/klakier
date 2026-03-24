# Frontend Rules & Standards

> **Scope:** Universal rules for React/TypeScript frontend code. Reusable across projects.
>
> **Language:** MUST, MUST NOT, SHOULD, SHOULD NOT, MAY follow RFC 2119 semantics.
>
> **Project-specific overrides:** Component library choice, error tracking provider, and other project-specific decisions belong in the project's `CLAUDE.md`, not here.

---

## 1. Stack & Infrastructure

### 1.1 Core Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | React (newest stable at project init, then pin) | Pin exact version in `package.json` |
| Language | TypeScript | `strict: true` + `noUncheckedIndexedAccess` |
| Build tool | Vite | Fastest DX for React SPAs |
| Package manager | bun | Use `bun.lock` for deterministic installs |
| Styling | Tailwind CSS | With `prettier-plugin-tailwindcss` for class sorting |
| Routing | React Router | Latest stable major version |
| Formatter | Prettier | With Tailwind plugin |
| Linter | ESLint (flat config) | `eslint.config.js`, not legacy `.eslintrc` |
| Component library | _Project-specific — define in project CLAUDE.md_ | |
| Error tracking | _Default: DIY (console + error boundaries). Override per project with Sentry or equivalent._ | |

### 1.2 Node & Runtime Version

| Rule | Level |
|---|---|
| `.nvmrc` in frontend project root with pinned Node major.minor (e.g., `web/.nvmrc` in monorepos) | MUST |
| `.nvmrc` version matches Dockerfile build stage | MUST |
| `engines` field in `package.json` matching `.nvmrc` | SHOULD |

```
# .nvmrc
22.12
```

### 1.3 TypeScript Configuration

```jsonc
// tsconfig.json — required compiler options
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vite/client"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

| Rule | Level |
|---|---|
| `strict: true` enabled | MUST |
| `noUncheckedIndexedAccess: true` enabled | MUST |
| Path alias `@/*` → `src/*` configured | MUST |
| Zero TypeScript errors in CI | MUST |

### 1.4 Runtime Configuration

Application configuration MUST be loaded at runtime, not baked into the build. This allows the same build artifact to run in any environment.

```jsonc
// public/config.json — injected per environment at deploy time
{
  "api_url": "https://api.example.com",
  "features": {}
}
```

| Rule | Level |
|---|---|
| API URLs and environment-specific values in `public/config.json` | MUST |
| Config loaded via `fetch('/config.json')` before app mounts | MUST |
| Config exposed via React context (`ConfigProvider`) | MUST |
| Build-time env vars (`VITE_*`) used only for build behavior (not runtime values) | MUST |
| `config.json` listed in `.gitignore` (template committed as `config.example.json`) | MUST |

```typescript
// Minimal config loading pattern
interface AppConfig {
  api_url: string;
  features: Record<string, boolean>;
}

async function loadConfig(): Promise<AppConfig> {
  const res = await fetch('/config.json');
  if (!res.ok) throw new Error('Failed to load config');
  return res.json();
}

// main.tsx
const config = await loadConfig();
createRoot(document.getElementById('root')!).render(
  <ConfigProvider config={config}>
    <App />
  </ConfigProvider>
);
```

### 1.5 Docker

Multi-stage build: `dev` for development with HMR, `oven/bun` for build, `nginx` for serve.

```dockerfile
# Stage 1: Development (hot module replacement)
FROM oven/bun:1 AS dev
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
CMD ["bun", "run", "dev", "--host"]

# Stage 2: Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 3: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Runtime config injection: replace config.json at startup
COPY docker-entrypoint.sh /docker-entrypoint.d/40-config.sh
RUN chmod +x /docker-entrypoint.d/40-config.sh

EXPOSE 80
```

```bash
#!/bin/sh
# docker-entrypoint.d/40-config.sh
# Generates config.json from environment variables at container startup
cat <<EOF > /usr/share/nginx/html/config.json
{
  "api_url": "${API_URL:-http://localhost:8080}",
  "features": {}
}
EOF
```

```nginx
# nginx.conf — SPA routing + caching
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: all routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively (hashed filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache index.html or config.json
    location ~* ^/(index\.html|config\.json)$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

| Rule | Level |
|---|---|
| Multi-stage Dockerfile with `dev`, `build`, and `serve` targets | MUST |
| Development container uses Vite dev server with `--host` for HMR | MUST |
| Source code mounted as volume in dev, not copied | MUST |
| No local toolchain dependencies for development — Docker only | SHOULD |
| CI runs toolchains directly (not in Docker) for speed | MAY |
| `bun install --frozen-lockfile` in CI/Docker | MUST |
| `config.json` generated from env vars at container startup | MUST |
| `index.html` and `config.json` never cached | MUST |
| Static assets (`/assets/`) cached with immutable headers | MUST |
| SPA fallback (`try_files ... /index.html`) configured | MUST |
| Nginx image is `alpine` variant | SHOULD |

### 1.6 Prettier + ESLint Configuration

```jsonc
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```javascript
// eslint.config.js (flat config)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs['recommended-latest'],
  jsxA11y.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'react/no-array-index-key': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  { ignores: ['dist/', 'public/'] },
);
```

| Rule | Level |
|---|---|
| Prettier runs on save and in CI | MUST |
| ESLint flat config (`eslint.config.js`) | MUST |
| Tailwind class sorting via Prettier plugin | MUST |
| Zero lint errors in CI | MUST |
| `a11y` plugin enabled | MUST |
| `react-hooks` plugin enabled | MUST |

### 1.7 CI Checks

The following MUST pass before merge:

```bash
bun run typecheck    # tsc --noEmit
bun run lint         # eslint .
bun run format:check # prettier --check .
bun run test         # vitest run
bun run build        # vite build (catches import errors)
```

| Rule | Level |
|---|---|
| All five checks run in CI on every PR | MUST |
| Build step included (catches runtime import errors) | MUST |
| No `--fix` in CI (fix locally, not in pipeline) | MUST |

---

## 2. Architecture

### 2.1 Data Fetching

TanStack Query is the standard for server state management.

| Rule | Level |
|---|---|
| Use TanStack Query for all API data | MUST |
| Never store server data in `useState` or global state | MUST |
| Never fetch data in `useEffect` | MUST |
| One hook file per resource (`hooks/use{Resource}.ts`) | MUST |
| Stale/cache times configured per query, not globally | SHOULD |

**Hook file pattern** — each resource exports a consistent set of hooks:

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';

const KEYS = {
  all: ['products'] as const,
  list: (params: ListParams) => [...KEYS.all, 'list', params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

export function useProductList(params: ListParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => productService.list(params),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id!),
    queryFn: () => productService.get(id!),
    enabled: id !== undefined,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormData) => productService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
```

**Query key conventions:**

| Pattern | Example | Purpose |
|---|---|---|
| `[resource]` | `['products']` | Invalidate everything for a resource |
| `[resource, 'list', params]` | `['products', 'list', { page: 1 }]` | Specific list query |
| `[resource, 'detail', id]` | `['products', 'detail', '123']` | Single entity |

| Rule | Level |
|---|---|
| Query keys defined as `const KEYS` object per hook file | MUST |
| Keys are hierarchical (broad → specific) | MUST |
| Mutations invalidate at the resource level (`KEYS.all`) | SHOULD |
| `enabled: false` used when params are not yet available | MUST |

### 2.2 API Client

A single `apiClient` module handles all HTTP concerns. Services are thin wrappers that call it.

```typescript
// services/apiClient.ts
interface ApiClientConfig {
  baseUrl: string;
}

let config: ApiClientConfig;

export function initApiClient(cfg: ApiClientConfig): void {
  config = cfg;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new ApiError(res.status, error);
  }

  return res.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
```

_The SPA always uses HttpOnly cookies for authentication (`credentials: 'include'`). If the same backend serves mobile/native clients, those clients handle auth independently (typically bearer tokens) — this has no impact on frontend configuration._

```typescript
// services/productService.ts
import { apiClient } from './apiClient';

export interface ProductFormData {
  name: string;
  // ...
}

export const productService = {
  list: (params: ListParams) =>
    apiClient.get<PaginatedResponse<Product>>(`/api/v1/products?${toQueryString(params)}`),
  get: (id: string) =>
    apiClient.get<DataResponse<Product>>(`/api/v1/products/${id}`),
  create: (data: ProductFormData) =>
    apiClient.post<DataResponse<Product>>('/api/v1/products', data),
  update: (id: string, data: ProductFormData) =>
    apiClient.put<DataResponse<Product>>(`/api/v1/products/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<void>(`/api/v1/products/${id}`),
};
```

| Rule | Level |
|---|---|
| Single `apiClient` module for all HTTP requests | MUST |
| Base URL from runtime config, never hardcoded | MUST |
| `credentials: 'include'` for cookie-based auth | MUST |
| One service file per resource | MUST |
| Services are plain objects with methods, not classes | SHOULD |
| Non-OK responses throw a typed `ApiError` | MUST |
| Services build query strings, not hooks or components | MUST |

### 2.3 API Response Types

Define a standard response envelope that matches backend conventions:

```typescript
// types/api.ts
interface DataResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: ErrorResponse | Record<string, never>,
  ) {
    super(body && 'error' in body ? body.error.message : `HTTP ${status}`);
  }
}
```

| Rule | Level |
|---|---|
| API response types defined in a shared `types/api.ts` | MUST |
| Entity model types defined in `types/models.ts` | MUST |
| JSON field names always `snake_case` | MUST |
| API error responses parsed into typed `ApiError` | MUST |

### 2.4 State Management

| Scope | Solution | When |
|---|---|---|
| Server state | TanStack Query | All API data — never duplicate in client state |
| Component-local | `useState` | UI toggles, form inputs, transient UI |
| Derived | Computed in render | Anything calculable from existing state/props |
| Shared subtree | Context + `useReducer` | Auth, theme, config, locale |
| Complex local | `useReducer` | Multiple related state transitions |
| Global client | _Project-specific (e.g. Zustand, Jotai)_ | Cross-cutting client state (rare — justify the need) |

| Rule | Level |
|---|---|
| Server data managed exclusively by TanStack Query | MUST |
| No `useState` for data that comes from an API | MUST |
| No derived state stored in `useState` — compute in render | MUST |
| State lifted to lowest common ancestor, no higher | MUST |
| Global client state library added only when Context is insufficient | SHOULD |
| Global state library choice is project-specific | MAY |

### 2.5 Routing

```typescript
// router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Products = lazy(() => import('@/pages/products/ProductList'));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <SuspenseWrap><Dashboard /></SuspenseWrap> },
      { path: 'products', element: <SuspenseWrap><Products /></SuspenseWrap> },
      { path: 'products/:id', element: <SuspenseWrap><ProductDetail /></SuspenseWrap> },
    ],
  },
  { path: 'login', element: <LoginPage /> },
]);

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
```

| Rule | Level |
|---|---|
| Routes lazy-loaded with `React.lazy` | MUST |
| Lazy routes wrapped in `Suspense` with meaningful fallback | MUST |
| Layout routes used for shared UI (sidebar, header) | MUST |
| Error boundary at router level via `errorElement` | MUST |
| Protected routes check auth before rendering | MUST |
| Route constants in a shared file (not string literals scattered) | SHOULD |

**Protected route pattern:**

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

### 2.6 Form Handling

React Hook Form + Zod for validation.

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  price: z.number().positive('Price must be positive'),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function ProductForm({ defaultValues, onSubmit }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* fields */}
    </form>
  );
}
```

| Rule | Level |
|---|---|
| React Hook Form for all forms | MUST |
| Zod schemas for validation | MUST |
| Form type inferred from Zod schema (`z.infer<typeof schema>`) | MUST |
| Same component for create and edit (detect via presence of `defaultValues` or route param) | SHOULD |
| Validation errors displayed inline per field | MUST |
| Submit button disabled while submitting | MUST |
| Schema defined in the same file as the form, or co-located `*.schema.ts` | SHOULD |

### 2.7 Internationalization

_Optional per project. When i18n is needed:_

| Rule | Level |
|---|---|
| Use `react-i18next` | MUST |
| Locale files in `src/i18n/locales/{lang}.json` | MUST |
| Translation keys use dot notation (`pages.products.title`) | MUST |
| Never hardcode user-facing strings — use `t()` or `<Trans>` | MUST |
| Language switching via context/provider pattern | MUST |
| Default language and supported languages defined in config | MUST |

```
src/i18n/
  config.ts           # i18next init
  locales/
    en.json
    pl.json
```

---

## 3. Code Standards

### 3.1 Type Safety

| Rule | Level |
|---|---|
| Explicit return types on exported functions | MUST |
| Explicit return types on internal functions | SHOULD |
| Use of `any` type | MUST NOT (use `unknown` + type guards) |
| Use of `as` type assertions | SHOULD NOT (use type guards or generics) |
| Non-null assertions (`!`) | MUST NOT (handle null explicitly) |
| `@ts-ignore` / `@ts-expect-error` | MUST NOT without linked issue comment |

**Exceptions requiring inline justification:**
```typescript
// ALLOWED: When interfacing with untyped external libraries
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- [ISSUE-123] Library X lacks types
```

### 3.2 Type Definitions

```typescript
// MUST: Use interfaces for object shapes that may be extended
interface UserProfile {
  id: string;
  name: string;
}

// MUST: Use type aliases for unions, intersections, computed types
type Status = 'pending' | 'active' | 'archived';
type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };

// SHOULD NOT: Use enums (prefer const objects or union types)
// Enums are acceptable for internal use when the value set is fixed and benefits from
// reverse mapping. Prefer union types for public APIs and props.
// AVOID:  enum Status { Pending, Active }
// PREFER: const STATUS = { PENDING: 'pending', ACTIVE: 'active' } as const;
// PREFER: type Status = typeof STATUS[keyof typeof STATUS];

// MUST: Export types from the file where they are defined
// MUST: Co-locate component prop types with component
```

### 3.3 Nullability

```typescript
// MUST: Handle nullable values explicitly
function getUser(id: string): User | null { ... }

// MUST: Use optional chaining over manual null checks
const name = user?.profile?.name;

// MUST: Use nullish coalescing over OR for defaults
const value = input ?? defaultValue;  // GOOD
const value = input || defaultValue;  // BAD (fails on 0, '', false)
```

---

### 3.4 Component Structure

| Rule | Level |
|---|---|
| One component per file | MUST |
| Component file matches component name | MUST |
| Props interface named `{ComponentName}Props` | MUST |
| Default exports for components | MUST NOT (use named exports) |
| Function components only (no classes) | MUST |
| Components under 200 lines (excluding types) | SHOULD |

**File structure:**
```typescript
// ComponentName.tsx

// 1. Imports (external -> internal -> relative -> types)
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

// 2. Types (props interface, internal types)
interface ComponentNameProps {
  user: User;
  onSave: (user: User) => void;
}

// 3. Constants (component-specific only)
const MAX_NAME_LENGTH = 100;

// 4. Component
export function ComponentName({ user, onSave }: ComponentNameProps): ReactNode {
  // hooks first
  // derived state
  // handlers
  // effects
  // render
}

// 5. Sub-components (if tightly coupled and small)
function ComponentNameItem({ ... }) { ... }
```

### 3.5 Props

```typescript
// MUST: Destructure props in function signature
export function Button({ label, onClick, disabled }: ButtonProps) { ... }

// MUST NOT: Pass entire objects when only specific fields are used
// BAD:  <UserCard user={user} />  // if only using user.name, user.avatar
// GOOD: <UserCard name={user.name} avatar={user.avatar} />

// MUST: Use children prop for composition, not render props (unless dynamic)
// GOOD: <Card><Title>Hello</Title></Card>
// BAD:  <Card renderTitle={() => <Title>Hello</Title>} />

// MUST: Boolean props use positive naming (no negative booleans)
// GOOD: disabled, visible, loading, open, isOpen, isLoading
// BAD:  notDisabled, isNotVisible (no negative booleans)

// SHOULD: Provide default values for optional props via destructuring
function Button({ variant = 'primary', size = 'medium' }: ButtonProps) { ... }
```

### 3.6 Refs

React 19+ passes `ref` as a regular prop. `forwardRef` is deprecated.

```typescript
// MUST: Accept ref as a prop, not via forwardRef
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ value, onChange, ref }: InputProps) {
  return <input ref={ref} value={value} onChange={e => onChange(e.target.value)} />;
}

// MUST NOT: Use forwardRef (deprecated in React 19)
```

### 3.7 Component Composition

```typescript
// MUST: Prefer composition over prop drilling
// BAD:  <Page user={user} theme={theme} locale={locale} />
// GOOD: <Page><UserSection user={user} /></Page>  // theme/locale from context

// SHOULD: Separate data-fetching logic (hooks) from rendering. Avoid components
// that both fetch data and render complex UI. Do not create wrapper "container"
// components solely for the sake of the pattern — hooks already provide this separation.

// MUST NOT: Nest component definitions
// BAD:
function Parent() {
  function Child() { return <div />; }  // Re-created every render
  return <Child />;
}
// GOOD:
function Child() { return <div />; }
function Parent() { return <Child />; }
```

---

### 3.8 Built-in Hooks

```typescript
// useState
// MUST: Use functional updates when new state depends on previous
setCount(prev => prev + 1);  // GOOD
setCount(count + 1);         // BAD — stale closure risk

// useEffect
// MUST: Include all dependencies in the dependency array
// MUST: Clean up subscriptions, timers, listeners in return function
// MUST NOT: Use empty dependency array unless truly mount-only
// MUST NOT: Fetch data in useEffect (use TanStack Query)
// Exception: streaming connections (WebSocket, SSE) and third-party SDK init are exempt

// useMemo
// MUST: Only use for expensive computations (>1ms) or referential stability
// MUST NOT: Use as premature optimization

// useCallback
// MUST: Only use when passing callbacks to memoized children or as effect deps
// MUST NOT: Wrap every handler "just in case"

// useRef
// MUST: Use for values that shouldn't trigger re-render (timers, previous values)
// MUST: Use for DOM element access
// MUST NOT: Use as mutable state that affects render output
```

### 3.9 Custom Hooks

```typescript
// MUST: Prefix with "use"
// MUST: Extract when logic is reused OR when component becomes complex
// MUST: Return tuple for single value + setter: [value, setValue]
// MUST: Return object for multiple values: { data, loading, error, refetch }
// MUST NOT: Return more than 4-5 values (split into multiple hooks)

// Hook file naming: use{HookName}.ts (not .tsx unless returns JSX)
// Location: src/hooks/ for shared, co-locate for single-use
```

---

### 3.10 Performance

| Rule | Level |
|---|---|
| Lists use stable, unique `key` prop (not index) | MUST |
| Expensive computations wrapped in `useMemo` | MUST |
| Event handlers in memoized components wrapped in `useCallback` | MUST |
| Avoid inline object/array literals in JSX props | SHOULD |

_Note: If React Compiler is enabled in the project, manual `useMemo` and `useCallback` are unnecessary — the compiler handles memoization automatically. The rules above apply to projects without the compiler._

```typescript
// MUST NOT: Create objects/arrays in render that cause child re-renders
// BAD:
<Child style={{ margin: 10 }} />
<Child items={items.filter(x => x.active)} />

// GOOD:
const style = useMemo(() => ({ margin: 10 }), []);
const activeItems = useMemo(() => items.filter(x => x.active), [items]);
<Child style={style} items={activeItems} />

// SHOULD: Use React.memo for pure presentational components receiving objects
export const Card = memo(function Card({ data }: CardProps) { ... });

// MUST NOT: Use index as key when list can reorder, filter, or insert
// BAD:  {items.map((item, i) => <Item key={i} />)}
// GOOD: {items.map(item => <Item key={item.id} />)}
```

### 3.11 Code Splitting

```typescript
// MUST: Lazy load routes (covered in Section 2.5)
// MUST: Lazy load heavy components (>50KB — charts, editors, maps)
const Chart = lazy(() => import('./components/Chart'));

// MUST: Wrap lazy components in Suspense with meaningful fallback
<Suspense fallback={<ChartSkeleton />}>
  <Chart />
</Suspense>

// SHOULD: Preload critical lazy components on hover/focus
const preloadDashboard = () => import('./pages/Dashboard');
<Link onMouseEnter={preloadDashboard} to="/dashboard">Dashboard</Link>
```

### 3.12 Bundle Size

| Rule | Level |
|---|---|
| Import only what's used (tree-shakeable imports) | MUST |
| No duplicate dependencies in bundle | MUST verify |
| Heavy deps (`moment`, full `lodash`) avoided | MUST |
| Bundle analyzer run before releases | SHOULD |

```typescript
// MUST: Use specific imports
import { format } from 'date-fns';           // GOOD
import * as dateFns from 'date-fns';          // BAD

import { debounce } from 'lodash-es';         // GOOD
import _ from 'lodash';                        // BAD
```

---

### 3.13 Directory Structure

```
src/
  components/           # Shared/reusable components
    Button/
      Button.tsx
      Button.test.tsx
      index.ts          # Re-export
  pages/                # Route-level components (one dir per feature)
    products/
      ProductList.tsx
      ProductForm.tsx
  hooks/                # Shared custom hooks
  contexts/             # React contexts + providers
  services/             # API client + resource services
  types/                # Shared type definitions (api.ts, models.ts)
  utils/                # Pure utility functions
  constants/            # App-wide constants
  i18n/                 # i18next config + locale files (if used)
  assets/               # Static assets (images, fonts)
```

### 3.14 Import Order

```typescript
// 1. External dependencies (react first)
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

// 3. Relative imports (parent -> sibling -> child)
import { validate } from '../utils';
import { CONSTANTS } from './constants';

// 4. Type imports
import type { User } from '@/types';

// 5. Style imports (rare — most styling is Tailwind classes in JSX)
```

### 3.15 Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `UserProfile`, `AuthState` |
| Props interfaces | `{Component}Props` | `ButtonProps` |
| Test files | `{file}.test.tsx` | `Button.test.tsx` |
| Schema files | `{entity}.schema.ts` | `product.schema.ts` |

---

## 4. Quality Gates

### 4.1 Error Handling

**Error Boundaries:**

```typescript
// MUST: Error boundary at router level (covered in Section 2.5 via errorElement)
// MUST: Additional error boundaries per independent UI section for graceful degradation
// MUST: Provide meaningful fallback UI, not blank screen

<ErrorBoundary fallback={<ErrorCard title="Failed to load comments" />}>
  <CommentsSection />
</ErrorBoundary>
```

**Async Error Handling:**

```typescript
// MUST: Handle loading, error, and success states for all async operations
function UserProfile({ userId }: { userId: string }): ReactNode {
  const { data, isLoading, error } = useUser(userId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <Profile user={data} />;
}

// MUST NOT: Swallow errors silently
// BAD:  try { ... } catch (e) { }
// GOOD: try { ... } catch (e) { logError(e); showToast('Failed to save'); }

// MUST: Show user-friendly error messages (not raw error text or stack traces)
```

| Rule | Level |
|---|---|
| Error boundary at router level | MUST |
| Error boundaries around independent UI sections | SHOULD |
| Fallback UI is meaningful (not blank screen) | MUST |
| Loading, error, and success states handled for async | MUST |
| Errors never swallowed silently | MUST |
| User-facing error messages are human-readable | MUST |

**Error Monitoring:**

| Rule | Level |
|---|---|
| Production apps report errors to a monitoring service | SHOULD |
| Source maps uploaded to monitoring service for readable stack traces | SHOULD |
| Error monitoring tool is project-specific (default: DIY, override with Sentry or equivalent) | — |

```typescript
// Minimal DIY error logging — replace with Sentry or equivalent in production
function logError(error: unknown, context?: Record<string, unknown>): void {
  console.error('[app]', error, context);
}

// Wire into error boundaries
<ErrorBoundary
  fallback={<ErrorPage />}
  onError={(error, info) => logError(error, { componentStack: info.componentStack })}
>
  <App />
</ErrorBoundary>
```

---

### 4.2 Accessibility (Code-Owned)

_Visual design accessibility (color contrast, heading hierarchy, information architecture) is a design responsibility. This section covers only what developers control in implementation._

**Semantic HTML:**

| Rule | Level |
|---|---|
| Use semantic elements (`button`, `nav`, `main`, `article`) over generic `div`/`span` | MUST |
| Clickable non-button elements have `role` + keyboard handler | MUST |
| Images have `alt` text (empty string for decorative) | MUST |
| Form inputs have associated `<label>` | MUST |

```typescript
// MUST NOT: Use div/span for interactive elements
// BAD:  <div onClick={handleClick}>Click me</div>
// GOOD: <button onClick={handleClick}>Click me</button>

// If a non-button element must be clickable:
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

**Keyboard Behavior:**

| Rule | Level |
|---|---|
| All interactive elements focusable via Tab | MUST |
| Focus order matches DOM order | MUST |
| Escape closes modals/dropdowns | MUST |
| Focus trapped inside open modals | MUST |
| Focus returned to trigger element when modal closes | MUST |
| Arrow keys navigate within composite widgets (tabs, menus) | MUST |

**ARIA:**

```typescript
// MUST: Prefer semantic HTML over ARIA
// BAD:  <div role="navigation">
// GOOD: <nav>

// MUST: Use ARIA only when semantic HTML is insufficient
<button aria-busy={loading} aria-disabled={loading}>
  {loading ? 'Saving...' : 'Save'}
</button>

// MUST: Announce dynamic content changes
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// MUST: Modals have aria-modal="true"
// MUST: Custom widgets implement full ARIA pattern for their role
```

**Focus Management in React:**

| Rule | Level |
|---|---|
| Client-side route changes announce the new page (document title or live region) | MUST |
| Conditional rendering that removes focused element must move focus to a sensible target | MUST |
| Lazy-loaded content areas show accessible loading state (`aria-busy`) | SHOULD |

---

### 4.3 Security

**XSS Prevention:**

| Rule | Level |
|---|---|
| Render raw HTML from user input | MUST NOT |
| User input rendered as text, not HTML | MUST |
| URLs validated before use in `href`/`src` | MUST |
| Sanitize HTML if absolutely required (DOMPurify) | MUST |

```typescript
// MUST NOT: Render user content as HTML without sanitization
// BAD:  <div dangerouslySetInnerHTML={{ __html: userComment }} />
// GOOD: <div>{userComment}</div>

// If HTML rendering is absolutely required:
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(content);

// MUST: Validate URLs
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

**Authentication & Authorization:**

```typescript
// MUST: Auth tokens in HttpOnly cookies (see Section 2.2)
// MUST NOT: Store tokens in localStorage
// BAD:  localStorage.setItem('token', jwt);

// MUST: Clear auth state on logout (cookies, cached user data, query cache)
// MUST: Redirect to login on 401 responses
// MUST: Check permissions before rendering privileged UI
{user.role === 'admin' && <AdminPanel />}

// MUST: Never trust client-side auth checks alone (server must verify)
```

**Data Handling:**

| Rule | Level |
|---|---|
| Never log sensitive data (passwords, tokens, PII) | MUST |
| Never include secrets in client bundle | MUST |
| Validate/sanitize all user inputs before use | MUST |
| All API requests over HTTPS | MUST |
| Runtime secrets via `config.json`, not `VITE_*` env vars | MUST |

---

### 4.4 Testing

**Coverage Requirements:**

| Category | Requirement |
|---|---|
| Utility functions (pure logic) | MUST have unit tests |
| Custom hooks | MUST have tests via `renderHook` from Testing Library |
| Components with logic | MUST have integration tests |
| User flows (multi-step) | SHOULD have E2E tests |
| Presentational components (no logic) | MAY have snapshot tests |

**Test Quality:**

```typescript
// MUST: Test behavior, not implementation
// BAD:  expect(component.state.isOpen).toBe(true);
// GOOD: expect(screen.getByRole('dialog')).toBeVisible();

// MUST: Use Testing Library queries by accessibility role
// Priority: getByRole > getByLabelText > getByPlaceholderText > getByText > getByTestId

// MUST: Assert on user-visible outcomes
// MUST: Test error states, not just happy path
// MUST: Test loading states
// MUST NOT: Test internal state directly

// MUST: Async tests wait for elements, not arbitrary timeouts
// BAD:  await sleep(1000);
// GOOD: await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());
```

**Test Organization:**

```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx       # Co-located
  hooks/
    useAuth.ts
    useAuth.test.ts         # Co-located
  utils/
    formatDate.ts
    formatDate.test.ts      # Co-located
e2e/
  flows/
    login.spec.ts           # E2E tests separate
    checkout.spec.ts
```

| Rule | Level |
|---|---|
| Unit/integration tests co-located with source files | MUST |
| E2E tests in separate `e2e/` directory | MUST |
| Test file naming: `{file}.test.tsx` | MUST |
| No skipped tests without linked issue | MUST |
| Default test runner: Vitest (unit/integration), Playwright (E2E) | SHOULD |
| All `console.log` debug statements removed before merge | MUST |

**Mocking:**

| Rule | Level |
|---|---|
| MSW for integration tests, `vi.mock` for isolated unit tests — both are valid | — |
| When mocking hooks, mock at the hook level, not internals | MUST |
| Reset mocks between tests | MUST |
| Type-safe mocks (no `as any` to satisfy mock types) | SHOULD |

---

### 4.5 Definition of Done

Code is complete when ALL applicable items are true:

**Functionality:**
- [ ] Implements requirements as specified
- [ ] Handles error states gracefully
- [ ] Handles loading states appropriately

**Code Quality:**
- [ ] Follows all rules in this document
- [ ] TypeScript compiles with zero errors
- [ ] Linter and formatter pass with zero errors
- [ ] No `console.log` statements (except error logging)
- [ ] No commented-out code
- [ ] No TODO comments without linked issue

**Testing:**
- [ ] Tests exist per Section 4.4 requirements
- [ ] All tests pass
- [ ] No skipped tests without linked issue

**Accessibility:**
- [ ] Interactive elements use semantic HTML or have correct `role` + keyboard handler
- [ ] Keyboard navigable (Tab, Escape, Enter work as expected)
- [ ] Focus management correct (modals trap, route changes announce)

**Performance:**
- [ ] No unnecessary re-renders (React DevTools verified)
- [ ] Bundle size impact reviewed for new dependencies
- [ ] Lazy loading implemented for heavy components

**Security:**
- [ ] No XSS vulnerabilities
- [ ] No sensitive data exposure
- [ ] Auth/permissions checked where required

---

## Appendix: Quick Reference Card

| Category | MUST | MUST NOT |
|---|---|---|
| Types | Explicit returns, interfaces for objects | `any`, `as` assertions, `!` operator |
| Components | Named exports, one per file, <200 lines | Default exports, nested definitions, `forwardRef` |
| Props | Destructure, specific fields only | Pass entire objects, negative boolean names |
| State | TanStack Query for server data, derive in render | `useState` for API data, store derived state |
| Hooks | All deps in arrays, cleanup effects | Empty deps unless mount-only, fetch in useEffect |
| Performance | Stable keys, memo expensive work | Index keys, inline objects in JSX |
| A11y | Semantic HTML, keyboard handlers, ARIA when needed | `div` for buttons, skip focus management |
| Security | Validate URLs, HttpOnly cookies for auth | Raw HTML rendering, localStorage for tokens |
| Testing | Test behavior, role queries, co-locate tests | Test implementation, arbitrary waits |
