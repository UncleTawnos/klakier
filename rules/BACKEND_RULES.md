# Backend Rules & Standards (Go + Gin + PostgreSQL)

> **Scope:** Opinionated rules for Go API backends. These define WHAT code must be, not HOW to write it.
>
> **Go Version:** 1.26+ required. All examples use modern Go syntax.
>
> **Stack:** Go, Gin, GORM, PostgreSQL, Viper, Goose.
>
> **Language:** MUST, MUST NOT, SHOULD, SHOULD NOT, MAY follow RFC 2119 semantics.
>
> **Foundation:** Based on [Effective Go](https://go.dev/doc/effective_go), [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments), and [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md).

---

## 1. Code Style & Formatting

### 1.1 Formatting

| Rule | Level |
|------|-------|
| Code formatted with `gofmt` or `goimports` | MUST |
| Imports grouped: stdlib, external, internal (blank line between) | MUST |
| Line length under 100 characters | SHOULD |
| No trailing whitespace | MUST |

```go
// GOOD: Import grouping
import (
    "context"
    "fmt"
    "net/http"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"

    "myproject/internal/domain/model"
    "myproject/internal/domain/port"
)
```

### 1.2 Naming

| Entity | Convention | Example |
|--------|------------|---------|
| Packages | lowercase, single word, no underscores | `auth`, `model`, `handler` |
| Exported identifiers | PascalCase | `UserService`, `HandleLogin` |
| Unexported identifiers | camelCase | `validateInput`, `userCache` |
| Acronyms | Consistent case | `HTTPHandler`, `xmlParser`, `userID` |
| Interfaces (single method) | Method name + "er" | `Reader`, `Validator`, `Sender` |
| Getters | No "Get" prefix | `user.Name()` not `user.GetName()` |
| Package-level vars | Descriptive, no stutter | `auth.Token` not `auth.AuthToken` |
| Sentinel errors | `Err` prefix | `ErrNotFound`, `ErrUnauthorized` |
| Error types | `Error` suffix | `ValidationError`, `ConflictError` |

```go
// MUST NOT: Package name stutter
// BAD:  auth.AuthToken, user.UserService
// GOOD: auth.Token, user.Service

// MUST: Acronyms maintain consistent case
// BAD:  UserId, XmlParser, HttpHandler
// GOOD: UserID, XMLParser, HTTPHandler (or userID, xmlParser, httpHandler)

// MUST: Interface names describe behavior
type Reader interface { Read(p []byte) (n int, err error) }
type Validator interface { Validate() error }
type UserStore interface { ... }  // Multi-method: noun describing capability
```

### 1.3 Comments

```go
// MUST: Exported identifiers have doc comments starting with identifier name
// Package auth provides authentication and authorization utilities.
package auth

// User represents an authenticated user in the system.
type User struct { ... }

// Validate checks if the user data meets all requirements.
func (u *User) Validate() error { ... }

// MUST NOT: Comments that restate the obvious
// BAD:  // increment i by 1
//       i++

// SHOULD: Comment the "why", not the "what"
// Retry 3 times because the upstream service has transient failures during deployments
for i := 0; i < 3; i++ { ... }
```

### 1.4 Type Preferences

| Rule | Level |
|------|-------|
| Use `any` instead of `interface{}` | MUST |
| Prefer generic type parameters with constraints over unconstrained `any` | SHOULD |

```go
// MUST: Use any (Go 1.18+)
// BAD:  func process(v interface{}) interface{} { ... }
// GOOD: func process(v any) any { ... }

// SHOULD: Prefer constrained generics over any
// BAD:  func Max(a, b any) any { ... }
// GOOD: func Max[T cmp.Ordered](a, b T) T { ... }
```

### 1.5 Pointer vs Value Receivers

| Rule | Level |
|------|-------|
| Pointer receivers for methods that modify the receiver | MUST |
| Pointer receivers for large structs (> ~64 bytes or many fields) | SHOULD |
| Value receivers for small, immutable structs | SHOULD |
| All methods on a type use the same receiver kind | MUST |

```go
// MUST: Pointer receiver when modifying state
func (u *User) SetName(name string) { u.Name = name }

// SHOULD: Value receiver for small, read-only types
func (p Point) Distance(other Point) float64 {
    return math.Sqrt(math.Pow(p.X-other.X, 2) + math.Pow(p.Y-other.Y, 2))
}

// MUST: Consistent receiver type within a struct
// BAD:
func (u User) Name() string { ... }     // value
func (u *User) SetName(s string) { ... } // pointer — inconsistent

// GOOD: All pointer receivers when any method needs pointer
func (u *User) Name() string { ... }
func (u *User) SetName(s string) { ... }

// MUST: Pointer receiver if the struct embeds a sync.Mutex or similar
type Cache struct {
    mu    sync.RWMutex
    items map[string]Item
}
func (c *Cache) Get(key string) (Item, bool) { ... }  // always pointer
```

---

## 2. Error Handling

### 2.1 Error Fundamentals

| Rule | Level |
|------|-------|
| Errors checked immediately after function call | MUST |
| Errors not silently discarded | MUST |
| Error messages lowercase, no punctuation | MUST |
| Errors wrapped with context using `fmt.Errorf` + `%w` | MUST |
| Sentinel errors for expected conditions | SHOULD |

```go
// MUST: Check errors immediately
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doing something: %w", err)
}
// use result here

// MUST NOT: Ignore errors
_ = file.Close()  // BAD
if err := file.Close(); err != nil {  // GOOD
    log.Printf("closing file: %v", err)
}

// MUST: Error messages are lowercase, no trailing punctuation
// BAD:  return fmt.Errorf("Failed to connect to database.")
// GOOD: return fmt.Errorf("connecting to database: %w", err)

// MUST: Wrap errors with context
// BAD:  return err
// GOOD: return fmt.Errorf("fetching user %s: %w", userID, err)
```

### 2.2 Error Types

```go
// MUST: Sentinel errors use Err prefix
var (
    ErrNotFound      = errors.New("not found")
    ErrUnauthorized  = errors.New("unauthorized")
    ErrInvalidInput  = errors.New("invalid input")
)

// Check with errors.Is
if errors.Is(err, ErrNotFound) {
    // handle not found
}

// SHOULD: Custom error types use Error suffix and provide additional context
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Check with errors.As
var valErr *ValidationError
if errors.As(err, &valErr) {
    // handle validation error with access to Field, Message
}

// MUST NOT: Use panic for error handling
// panic is for unrecoverable programmer errors only
```

### 2.3 Error Returns

```go
// MUST: Error is always the last return value
func GetUser(id string) (*User, error) { ... }

// MUST: Return early on errors (no else after error return)
// BAD:
if err != nil {
    return nil, err
} else {
    return result, nil
}

// GOOD:
if err != nil {
    return nil, err
}
return result, nil

// MUST: Named return values only when they improve clarity
// GOOD: Multiple same-type returns benefit from names
func Parse(input string) (value int, remaining string, err error)

// BAD: Names add nothing
func GetUser(id string) (user *User, err error)  // just use (*User, error)
```

---

## 3. Architecture & Project Structure

### 3.1 Hexagonal Architecture

This standard uses hexagonal architecture (ports & adapters). All projects MUST follow this structure.

```
.
├── cmd/api/main.go                    # Composition root (wiring only)
├── internal/
│   ├── domain/                        # Core — ZERO external imports
│   │   ├── model/                     # Entities, value objects
│   │   │   ├── user.go
│   │   │   ├── habit.go
│   │   │   └── ...
│   │   └── port/                      # Interface definitions (per resource)
│   │       ├── user.go                # UserInboundPort + UserOutboundPort
│   │       ├── habit.go
│   │       └── ...
│   ├── app/                           # Application layer — orchestration
│   │   └── service/                   # Implements inbound ports
│   │       ├── user.go
│   │       ├── habit.go
│   │       └── ...
│   ├── adapter/                       # External world connections
│   │   ├── inbound/                   # Driving adapters (outside → app)
│   │   │   ├── handler/              # Gin HTTP handlers
│   │   │   │   ├── user.go
│   │   │   │   ├── habit.go
│   │   │   │   └── ...
│   │   │   ├── middleware/           # HTTP middleware
│   │   │   └── router/              # Route registration
│   │   └── outbound/                  # Driven adapters (app → outside)
│   │       ├── postgres/             # GORM repository implementations
│   │       │   ├── user.go
│   │       │   ├── habit.go
│   │       │   └── ...
│   │       └── client/               # External HTTP/gRPC clients
│   └── config/                        # Viper config loading + validation
├── migrations/                        # Goose SQL migration files
├── docs/                              # Swagger + project docs
├── go.mod
├── go.sum
└── Makefile
```

> **Note:** All paths are relative. In a monorepo the Go backend may live under `api/` (e.g., `api/cmd/api/main.go`). The internal structure remains identical.

### 3.2 Dependency Rules

| Rule | Level |
|------|-------|
| `domain/` has zero external imports (no Gin, no GORM, no third-party) | MUST |
| Ports (interfaces) defined in `domain/port/`, not in adapters | MUST |
| Adapters implement domain ports, never the reverse | MUST |
| Dependencies point inward: adapter → app → domain | MUST |
| No circular dependencies | MUST |
| `cmd/api/main.go` is the only composition root | MUST |

```
adapter/inbound/handler → app/service → domain/port ← adapter/outbound/postgres
                                         domain/model
```

```go
// MUST: domain/port defines what the application needs and offers
// domain/port/user.go

// UserInboundPort defines what the application offers (use cases)
type UserInboundPort interface {
    GetByID(ctx context.Context, id string) (*model.User, error)
    Create(ctx context.Context, user *model.User) error
    List(ctx context.Context, params model.PaginationParams) ([]model.User, int64, error)
}

// UserOutboundPort defines what the application needs (driven)
type UserOutboundPort interface {
    FindByID(ctx context.Context, id string) (*model.User, error)
    Save(ctx context.Context, user *model.User) error
    FindAll(ctx context.Context, params model.PaginationParams) ([]model.User, int64, error)
}
```

```go
// MUST: app/service implements inbound ports, depends on outbound ports
// app/service/user.go

type UserService struct {
    repo port.UserOutboundPort  // Depends on interface, not implementation
}

func NewUserService(repo port.UserOutboundPort) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) GetByID(ctx context.Context, id string) (*model.User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("finding user %s: %w", id, err)
    }
    return user, nil
}
```

```go
// MUST: adapter/outbound implements outbound ports
// adapter/outbound/postgres/user.go

type UserRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
    var user model.User
    if err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error; err != nil {
        return nil, fmt.Errorf("querying user: %w", err)
    }
    return &user, nil
}
```

### 3.3 Package Design

```go
// MUST: Avoid package sprawl — don't create packages for single files
// BAD:  internal/utils/, internal/helpers/, internal/common/
// GOOD: Put utilities in the package that uses them, or create specific packages

// MUST: Package names are directories, not generic
// BAD:  internal/util/string.go, internal/util/time.go
// GOOD: internal/stringutil/, internal/timeutil/ OR inline in calling package

// MUST NOT: Import from cmd/ or main packages
// cmd/api/main.go imports internal/, never the reverse
```

### 3.4 Dependency Injection

| Rule | Level |
|------|-------|
| Constructor injection for all dependencies | MUST |
| Single composition root in `cmd/api/main.go` or `router/` | MUST |
| No global mutable state | MUST NOT |
| No `init()` for dependency setup | MUST NOT |
| No DI frameworks (Wire, dig, fx) | MUST NOT |

```go
// MUST: Constructor injection — dependencies are explicit parameters
func NewUserService(repo port.UserOutboundPort) *UserService {
    return &UserService{repo: repo}
}

// MUST: Wiring happens in the composition root
// cmd/api/main.go
func main() {
    cfg := config.Load()
    db := setupDB(cfg)

    userRepo := postgres.NewUserRepository(db)
    userSvc := service.NewUserService(userRepo)
    userHandler := handler.NewUserHandler(userSvc)
    // ... register routes
}

// MUST NOT: Global mutable state
// BAD:
var db *gorm.DB  // package-level mutable variable

// MUST NOT: init() for dependency setup
// BAD:
func init() {
    db, _ = gorm.Open(...)
}
```

### 3.5 Interfaces

```go
// MUST: Keep interfaces small (1-5 methods per port)
// MUST: One port file per resource in domain/port/
// SHOULD: Accept interfaces, return concrete types

func NewUserService(repo port.UserOutboundPort) *UserService { ... }  // GOOD
```

---

## 4. Concurrency

### 4.1 Core Rules (Apply to All Code)

| Rule | Level |
|------|-------|
| `context.Context` is the first parameter of every function that does I/O | MUST |
| Context propagated to all downstream calls (DB, HTTP, services) | MUST |
| No unmanaged goroutines (every goroutine has ownership and lifecycle) | MUST |
| Tests run with `-race` flag | MUST |
| No data races in production code | MUST |

```go
// MUST: context.Context is always the first parameter
func (s *UserService) GetByID(ctx context.Context, id string) (*model.User, error) {
    // MUST: Propagate context to all downstream calls
    return s.repo.FindByID(ctx, id)
}

// MUST: Handlers extract and propagate context
func (h *UserHandler) GetUser(c *gin.Context) {
    ctx := c.Request.Context()
    user, err := h.service.GetByID(ctx, c.Param("id"))
    // ...
}

// MUST: GORM calls use WithContext
func (r *UserRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error
    return &user, err
}

// MUST NOT: Drop context or use context.Background() in request paths
// BAD:
func (s *UserService) GetByID(ctx context.Context, id string) (*model.User, error) {
    return s.repo.FindByID(context.Background(), id)  // context lost!
}
```

### 4.2 Extended: Goroutine Management

> Apply these rules when introducing goroutines beyond what Gin manages for you. Most CRUD handlers do not need goroutines.

| Rule | Level |
|------|-------|
| Goroutines have clear ownership and lifecycle | MUST |
| Goroutines can be stopped (via context or channel) | MUST |
| Wait for goroutines to complete before returning | MUST |
| No goroutines leaked | MUST |

```go
// MUST: Goroutines are stoppable and awaited
func (s *Server) Start(ctx context.Context) error {
    g, ctx := errgroup.WithContext(ctx)

    g.Go(func() error {
        return s.runHTTP(ctx)
    })
    g.Go(func() error {
        return s.runWorker(ctx)
    })

    return g.Wait()
}

// MUST: Background goroutines respect context cancellation
func (w *Worker) Run(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case job := <-w.jobs:
            w.process(job)
        }
    }
}

// MUST NOT: Fire-and-forget goroutines
// BAD:
go doSomething()  // Who waits? How to stop?

// GOOD (Go 1.25+): Use WaitGroup.Go for cleaner goroutine management
var wg sync.WaitGroup
wg.Go(func() {
    doSomething(ctx)
})
wg.Go(func() {
    doOtherThing(ctx)
})
wg.Wait()

// GOOD (classic): Add/Done pattern when Go < 1.25
s.wg.Add(1)
go func() {
    defer s.wg.Done()
    doSomething(ctx)
}()
```

### 4.3 Extended: Channels & Synchronization

> Apply when using channels or shared mutable state.

```go
// MUST: Channel direction specified in function signatures
func consume(ch <-chan Event) { ... }   // receive-only
func produce(ch chan<- Event) { ... }   // send-only

// MUST: Sender closes channel, never receiver
// MUST: Document who owns (closes) the channel

// MUST: Protect shared mutable state
type Cache struct {
    mu    sync.RWMutex
    items map[string]Item
}

func (c *Cache) Get(key string) (Item, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    item, ok := c.items[key]
    return item, ok
}

// MUST NOT: Copy sync primitives (Mutex, WaitGroup, etc.)
// They must be passed by pointer or embedded

// MUST NOT: Concurrent map access without synchronization
```

---

## 5. Configuration

### 5.1 Loading

| Rule | Level |
|------|-------|
| Use Viper for all configuration | MUST |
| No direct `os.Getenv` calls | MUST NOT |
| Environment variables override file config | MUST |
| All required config validated at startup (fail fast) | MUST |

```go
// MUST: Use Viper for config loading
func Load() *Config {
    v := viper.New()
    v.SetConfigName("config")
    v.SetConfigType("yaml")
    v.AddConfigPath(".")

    v.AutomaticEnv()
    v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

    if err := v.ReadInConfig(); err != nil {
        log.Fatal().Err(err).Msg("reading config")
    }

    var cfg Config
    if err := v.Unmarshal(&cfg); err != nil {
        log.Fatal().Err(err).Msg("unmarshaling config")
    }

    if err := cfg.Validate(); err != nil {
        log.Fatal().Err(err).Msg("validating config")
    }

    return &cfg
}

// MUST: Validate all required fields at startup
func (c *Config) Validate() error {
    if c.DB.Host == "" {
        return errors.New("db.host is required")
    }
    if c.DB.User == "" {
        return errors.New("db.user is required")
    }
    if c.DB.Password == "" {
        return errors.New("db.password is required")
    }
    if c.DB.Name == "" {
        return errors.New("db.name is required")
    }
    if c.JWTSecret == "" {
        return errors.New("jwt_secret is required")
    }
    return nil
}

// MUST NOT: Use os.Getenv directly
// BAD:
jwtSecret := os.Getenv("JWT_SECRET")

// GOOD:
jwtSecret := cfg.JWTSecret  // loaded via Viper
```

### 5.2 Database Connection

| Rule | Level |
|------|-------|
| Database connection via separate config fields | MUST |
| No connection URI or DSN strings | MUST NOT |
| Application assembles connection internally | MUST |

```yaml
# config.yaml
db:
  host: localhost
  port: 5432        # default
  user: admin
  password: ""      # override via DB_PASSWORD env var
  name: myapp
  sslmode: require  # default for production
```

```go
// MUST: Assemble DSN from individual fields internally
func buildDSN(cfg DatabaseConfig) string {
    if cfg.Port == 0 {
        cfg.Port = 5432
    }
    if cfg.SSLMode == "" {
        cfg.SSLMode = "require"
    }
    return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
        cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode)
}
```

---

## 6. API Design

### 6.1 Routing

| Rule | Level |
|------|-------|
| Public endpoints under `/public/api/` prefix | MUST |
| Internal (service-to-service) endpoints under `/internal/api/` prefix | MUST |
| `/internal/` routes never exposed to public network | MUST |
| Versioning only when project owner confirms it's needed | SHOULD |
| When versioning is used, never mix versioned and unversioned API routes | MUST |
| Infrastructure endpoints (`/healthz`, `/readyz`) are unversioned and live outside `/public/` and `/internal/` groups | MUST |

```go
// MUST: Route prefix structure
public := r.Group("/public/api")
{
    // JWT auth, rate limiting, CSRF, full input validation
    public.POST("/auth/login", authHandler.Login)
    public.GET("/users/:id", userHandler.GetUser)
}

internal := r.Group("/internal/api")
{
    // Service-to-service auth (API key, mTLS, or network-level)
    // No rate limiting, relaxed validation where trust is established
    internal.GET("/users/:id", userHandler.GetUserInternal)
}

// MUST: Agent/developer must confirm with project owner whether
// API versioning is needed before scaffolding routes.
// If versioning is required:
public := r.Group("/public/api/v1")

// MUST: Infrastructure endpoints at root level, unversioned, no auth
r.GET("/healthz", healthHandler.Liveness)
r.GET("/readyz", healthHandler.Readiness)
```

### 6.2 HTTP Handlers (Gin)

```go
// MUST: Handlers use Gin context, propagate request context downstream
func (h *UserHandler) GetUser(c *gin.Context) {
    ctx := c.Request.Context()

    id := c.Param("id")
    user, err := h.service.GetByID(ctx, id)
    if err != nil {
        h.handleError(c, err)
        return
    }

    c.JSON(http.StatusOK, DataResponse{Data: user})
}

// MUST: Set appropriate status codes
// 200 OK - Success with body
// 201 Created - Resource created
// 204 No Content - Success without body
// 400 Bad Request - Client error (validation, malformed)
// 401 Unauthorized - Authentication required
// 403 Forbidden - Authenticated but not authorized
// 404 Not Found - Resource doesn't exist
// 429 Too Many Requests - Rate limited
// 500 Internal Server Error - Server error (never expose details)

// MUST: Never expose internal errors to clients
// BAD:  c.JSON(500, gin.H{"error": err.Error()})  // Leaks internals
// GOOD: c.JSON(500, ErrorResponse{...}); logger.Error().Err(err).Msg("...")
```

### 6.3 Response Envelopes

Three distinct response types. `Data` and `Error` MUST NOT appear in the same response.

```go
// Single resource response
type DataResponse struct {
    Data any `json:"data"`
}

// List response with pagination metadata
type ListResponse struct {
    Data any           `json:"data"`
    Meta PaginationMeta `json:"meta"`
}

type PaginationMeta struct {
    Page    int   `json:"page"`
    PerPage int   `json:"per_page"`
    Total   int64 `json:"total"`
}

// Error response
type ErrorResponse struct {
    Error APIError `json:"error"`
}

type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

// Error codes: VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR, UNAUTHORIZED, FORBIDDEN, RATE_LIMITED
```

```go
// GOOD: Usage
c.JSON(http.StatusOK, DataResponse{Data: user})
c.JSON(http.StatusOK, ListResponse{Data: users, Meta: meta})
c.JSON(http.StatusBadRequest, ErrorResponse{Error: APIError{Code: "VALIDATION_ERROR", Message: "invalid email"}})
```

### 6.4 Request Handling

```go
// MUST: Validate all input using Gin binding
func (h *UserHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: APIError{Code: "VALIDATION_ERROR", Message: "invalid json"},
        })
        return
    }

    if err := req.Validate(); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
        })
        return
    }

    // proceed with validated input
}

// MUST: Use struct tags for binding/validation
type CreateUserRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Name     string `json:"name" binding:"required,min=1,max=100"`
    Password string `json:"password" binding:"required,min=8"`
}

// MUST: JSON field names always snake_case
// BAD:  `json:"firstName"`
// GOOD: `json:"first_name"`
```

### 6.5 Pagination

> SHOULD: Implement pagination on list endpoints with potentially large result sets. MUST ask project owner about expected data volume before adding pagination — don't paginate endpoints that return a handful of results.

| Rule | Level |
|------|-------|
| When pagination is needed, whitelist sort fields per resource | MUST |
| Never accept arbitrary sort fields | MUST |
| Paginated responses include `meta` with page, per_page, total | MUST |

```go
// Query string format: ?page=1&per_page=20&sort=name&order=asc&search=term

// MUST: Sort field whitelist per resource in the service layer
var userSortFields = map[string]bool{
    "name":       true,
    "email":      true,
    "created_at": true,
}

func (s *UserService) List(ctx context.Context, params model.PaginationParams) ([]model.User, int64, error) {
    if params.Sort != "" && !userSortFields[params.Sort] {
        return nil, 0, ErrInvalidSortField
    }
    return s.repo.FindAll(ctx, params)
}
```

### 6.6 Middleware

```go
// MUST: Middleware order is intentional
// Order: Recovery → Logger → CORS → Auth → RateLimit → CSRF → Handler

// MUST: Recovery middleware catches panics
router.Use(gin.Recovery())

// MUST: Context values use unexported key types
type contextKey string
const userContextKey contextKey = "user"

func WithUser(ctx context.Context, user *model.User) context.Context {
    return context.WithValue(ctx, userContextKey, user)
}

func UserFromContext(ctx context.Context) (*model.User, bool) {
    user, ok := ctx.Value(userContextKey).(*model.User)
    return user, ok
}
```

### 6.7 Timeouts

```go
// MUST: All external calls have timeouts
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

result, err := externalService.Call(ctx, request)

// MUST: HTTP clients have timeouts configured
client := &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
        TLSHandshakeTimeout: 5 * time.Second,
        IdleConnTimeout:     90 * time.Second,
    },
}

// MUST: Server has read/write timeouts
server := &http.Server{
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
}
```

### 6.8 Graceful Shutdown

| Rule | Level |
|------|-------|
| Server handles SIGTERM/SIGINT gracefully | MUST |
| In-flight requests complete before shutdown | MUST |
| Database connections closed on shutdown | MUST |

```go
// MUST: Graceful shutdown in cmd/api/main.go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    // ... setup db, services, router ...

    srv := &http.Server{
        Addr:         cfg.Server.Addr(),
        Handler:      router,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    // Start server in goroutine
    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatal().Err(err).Msg("server failed")
        }
    }()

    // Wait for interrupt signal
    <-ctx.Done()
    log.Info().Msg("shutting down gracefully")

    // Give in-flight requests time to complete
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := srv.Shutdown(shutdownCtx); err != nil {
        log.Error().Err(err).Msg("server forced shutdown")
    }

    // Close database
    sqlDB, _ := db.DB()
    sqlDB.Close()

    log.Info().Msg("server stopped")
}
```

### 6.9 Swagger / OpenAPI

| Rule | Level |
|------|-------|
| Every public handler has Swagger annotations | MUST |
| `swag init` runs clean with no errors | MUST |
| Swagger UI exposed in non-production environments | SHOULD |

```go
// MUST: Swagger annotations on every handler in adapter/inbound/handler/

// GetUser godoc
// @Summary Get a user by ID
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} DataResponse{data=model.User}
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /public/api/users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) { ... }
```

### 6.10 HTTP Client Design (Outbound Adapters)

> Apply when building clients in `adapter/outbound/client/` that call external HTTP services.

| Rule | Level |
|------|-------|
| Client struct holds only configuration and `*http.Client` | MUST |
| No `*http.Request` or per-request state stored on the client struct | MUST NOT |
| Each method constructs a fresh `*http.Request` | MUST |
| `*http.Client` configured with timeouts and safe for concurrent use | MUST |
| Response bodies closed with `defer resp.Body.Close()` | MUST |

```go
// MUST: Client struct is stateless per-request
type NotificationClient struct {
    baseURL    string
    apiKey     string
    httpClient *http.Client
}

func NewNotificationClient(baseURL, apiKey string) *NotificationClient {
    return &NotificationClient{
        baseURL: baseURL,
        apiKey:  apiKey,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
            Transport: &http.Transport{
                DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
                TLSHandshakeTimeout: 5 * time.Second,
                MaxIdleConns:        100,
                IdleConnTimeout:     90 * time.Second,
            },
        },
    }
}

// MUST: Fresh request per method call, context accepted as first param
func (c *NotificationClient) Send(ctx context.Context, msg Message) error {
    body, err := json.Marshal(msg)
    if err != nil {
        return fmt.Errorf("marshaling message: %w", err)
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/send", bytes.NewReader(body))
    if err != nil {
        return fmt.Errorf("creating request: %w", err)
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.apiKey)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("sending notification: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("notification service returned %d", resp.StatusCode)
    }
    return nil
}

// MUST NOT: Store request state on the client
// BAD:
type BadClient struct {
    baseURL string
    req     *http.Request  // per-request state on long-lived struct
    body    []byte         // stale between calls
}
```

---

## 7. Database (PostgreSQL + GORM)

### 7.1 Connections

| Rule | Level |
|------|-------|
| Connection pool configured | MUST |
| Connections closed on shutdown | MUST |
| Health checks verify connectivity | MUST |

```go
// MUST: Configure GORM with connection pool
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
    Logger: gormLogger,
})
if err != nil {
    log.Fatal().Err(err).Msg("connecting to database")
}

sqlDB, err := db.DB()
if err != nil {
    log.Fatal().Err(err).Msg("getting underlying sql.DB")
}

sqlDB.SetMaxOpenConns(25)
sqlDB.SetMaxIdleConns(5)
sqlDB.SetConnMaxLifetime(5 * time.Minute)
sqlDB.SetConnMaxIdleTime(1 * time.Minute)

// MUST: Ping on startup
if err := sqlDB.PingContext(ctx); err != nil {
    log.Fatal().Err(err).Msg("pinging database")
}
```

### 7.2 GORM Queries

```go
// MUST: Always use WithContext for context propagation
db.WithContext(ctx).Where("email = ?", email).First(&user)

// MUST: Use parameterized queries — never string concatenation
// BAD:  db.Where(fmt.Sprintf("email = '%s'", email)).First(&user)
// GOOD: db.WithContext(ctx).Where("email = ?", email).First(&user)

// MUST: Check errors from all GORM operations
if err := db.WithContext(ctx).Create(&user).Error; err != nil {
    return fmt.Errorf("creating user: %w", err)
}

// MUST: Validate dynamic column names (sort fields) via whitelist
// Never pass user input directly to Order()
// BAD:  db.Order(userInput)
// GOOD: if allowedSortFields[field] { db.Order(field + " " + direction) }

// SHOULD: Use scopes for reusable query logic
func Paginate(page, perPage int) func(db *gorm.DB) *gorm.DB {
    return func(db *gorm.DB) *gorm.DB {
        offset := (page - 1) * perPage
        return db.Offset(offset).Limit(perPage)
    }
}

db.WithContext(ctx).Scopes(Paginate(params.Page, params.PerPage)).Find(&users)

// MUST NOT: Use GORM AutoMigrate — always use Goose SQL migrations
// BAD:  db.AutoMigrate(&User{})
```

### 7.3 GORM Transactions

```go
// MUST: Transactions are committed or rolled back
func (r *Repository) Transfer(ctx context.Context, from, to string, amount int) error {
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        if err := tx.Model(&Account{}).Where("id = ?", from).
            Update("balance", gorm.Expr("balance - ?", amount)).Error; err != nil {
            return fmt.Errorf("debiting account: %w", err)
        }

        if err := tx.Model(&Account{}).Where("id = ?", to).
            Update("balance", gorm.Expr("balance + ?", amount)).Error; err != nil {
            return fmt.Errorf("crediting account: %w", err)
        }

        return nil  // Commit
    })
    // Automatic rollback on error return
}
```

### 7.4 GORM Footguns

```go
// MUST: Be aware of N+1 queries — use Preload explicitly
// BAD:  Accessing user.Posts triggers lazy load per user
// GOOD: db.WithContext(ctx).Preload("Posts").Find(&users)

// MUST: Use Select to limit columns when needed
db.WithContext(ctx).Select("id", "name", "email").Find(&users)

// MUST NOT: Use Save() for partial updates — it writes ALL fields
// BAD:  db.Save(&user)  // Overwrites all columns
// GOOD: db.Model(&user).Updates(map[string]any{"name": "new name"})
```

### 7.5 Migrations

| Rule | Level |
|------|-------|
| All schema changes via Goose SQL migrations | MUST |
| Migrations use timestamp naming format | MUST |
| Migrations are idempotent (up) and reversible (down) | SHOULD |
| Migrations run automatically on startup or via CLI | MUST |
| No destructive migrations without explicit approval | MUST |

```sql
-- MUST: Timestamp-based naming
-- migrations/20260309143000_create_users.sql

-- +goose Up
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS users;
```

---

## 8. Security

### 8.1 Input Validation

| Rule | Level |
|------|-------|
| All external input validated | MUST |
| Validation before business logic | MUST |
| Whitelist over blacklist | MUST |
| Size limits on all inputs | MUST |

```go
// MUST: Validate all input
func (r *CreateUserRequest) Validate() error {
    if r.Email == "" {
        return errors.New("email is required")
    }
    if !isValidEmail(r.Email) {
        return errors.New("invalid email format")
    }
    if len(r.Name) > 100 {
        return errors.New("name too long")
    }
    if len(r.Password) < 8 {
        return errors.New("password too short")
    }
    return nil
}
```

### 8.2 SQL Injection Prevention

```go
// MUST: Always use GORM parameterized queries
// BAD:  db.Where(fmt.Sprintf("email = '%s'", email))
// GOOD: db.Where("email = ?", email)

// MUST: Whitelist dynamic column/table names
allowedColumns := map[string]bool{"name": true, "email": true, "created_at": true}
if !allowedColumns[sortColumn] {
    return ErrInvalidSortField
}
```

### 8.3 Authentication & Authorization

```go
// MUST: Hash passwords with bcrypt (or argon2)
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

// MUST: Use constant-time comparison for secrets
if subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
    return ErrUnauthorized
}

// MUST: JWT tokens have expiration
claims := jwt.MapClaims{
    "sub": userID,
    "exp": time.Now().Add(24 * time.Hour).Unix(),
    "iat": time.Now().Unix(),
}

// MUST: Validate JWT signature and claims
token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
    if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
        return nil, errors.New("unexpected signing method")
    }
    return []byte(secretKey), nil
})

// MUST: Check authorization on every protected endpoint
func (h *UserHandler) DeleteUser(c *gin.Context) {
    user, _ := UserFromContext(c.Request.Context())
    if user.Role != "admin" {
        c.JSON(http.StatusForbidden, ErrorResponse{
            Error: APIError{Code: "FORBIDDEN", Message: "admin required"},
        })
        return
    }
    // proceed
}
```

### 8.4 Rate Limiting

| Rule | Level |
|------|-------|
| Rate limit authentication endpoints under `/public/api/` | MUST |
| Rate limit other `/public/api/` endpoints based on project needs | SHOULD |
| No rate limiting on `/internal/api/` endpoints (trusted callers) | MUST NOT |

### 8.5 CORS

| Rule | Level |
|------|-------|
| CORS configured explicitly per environment | MUST |
| Wildcard origin (`*`) with credentials | MUST NOT |
| Restrict to known frontend origins | SHOULD |

```go
// MUST: Explicit CORS configuration
router.Use(cors.New(cors.Config{
    AllowOrigins:     cfg.CORS.AllowedOrigins,  // from config, never hardcoded
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-CSRF-Token"},
    AllowCredentials: true,
    MaxAge:           12 * time.Hour,
}))

// MUST NOT: Wildcard with credentials
// BAD:  AllowOrigins: []string{"*"}, AllowCredentials: true
```

### 8.6 CSRF Protection

| Rule | Level |
|------|-------|
| CSRF protection on state-changing `/public/api/` endpoints when serving a browser UI with cookie auth | MUST |
| When building API-only (no browser UI), ask project owner whether CSRF is needed | SHOULD |
| Never rely solely on SameSite cookies as CSRF protection when a UI is present | MUST NOT |

### 8.7 Secrets Management

| Rule | Level |
|------|-------|
| Secrets loaded via Viper config (env var overrides) | MUST |
| Secrets never in code or version control | MUST |
| Secrets not logged | MUST |
| Secrets rotatable without redeployment | SHOULD |

```go
// MUST: Secrets via Viper config, never direct os.Getenv or hardcoded
// BAD:  const jwtSecret = "super-secret-key"
// BAD:  jwtSecret := os.Getenv("JWT_SECRET")
// GOOD: jwtSecret := cfg.JWTSecret  // loaded by Viper

// MUST NOT: Log secrets
// BAD:  logger.Info().Str("password", dbPassword).Msg("connecting")
// GOOD: logger.Info().Str("host", dbHost).Str("user", dbUser).Msg("connecting")
```

---

## 9. Testing

### 9.1 Test Strategy (Hexagonal)

| Layer | Test Type | What's Mocked | Location |
|-------|-----------|---------------|----------|
| `domain/model/` | Pure unit tests | Nothing — no dependencies | Co-located `*_test.go` |
| `app/service/` | Unit tests | Outbound ports (repository interfaces) | Co-located `*_test.go` |
| `adapter/inbound/handler/` | Unit tests | Inbound ports (service interfaces) | Co-located `*_test.go` |
| `adapter/outbound/postgres/` | Integration tests | Real PostgreSQL (test container) | Co-located `*_test.go` with `//go:build integration` |

### 9.2 Mocking Rules

| Rule | Level |
|------|-------|
| Unit tests use mock interfaces only | MUST |
| No real database connections in unit tests | MUST |
| No SQLite as test database substitute | MUST NOT |
| No `gorm.Open` with any driver in unit tests | MUST NOT |
| Use `testify/mock` or hand-written mocks | MUST |
| Integration tests (outbound adapters) may use real PostgreSQL via test containers | SHOULD |
| Integration tests tagged with `//go:build integration` | MUST |

```go
// MUST: Mock outbound ports in service tests
type mockUserRepo struct {
    mock.Mock
}

func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*model.User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*model.User), args.Error(1)
}

func TestUserService_GetByID(t *testing.T) {
    repo := new(mockUserRepo)
    svc := service.NewUserService(repo)

    repo.On("FindByID", mock.Anything, "123").Return(&model.User{ID: "123"}, nil)

    user, err := svc.GetByID(context.Background(), "123")
    assert.NoError(t, err)
    assert.Equal(t, "123", user.ID)
    repo.AssertExpectations(t)
}

// MUST NOT: SQLite as test database
// BAD:
db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
// This hides PostgreSQL-specific behavior (JSONB, ILIKE, gen_random_uuid)

// MUST NOT: Any real database in unit tests
// BAD:
db, _ := gorm.Open(postgres.Open(testDSN), &gorm.Config{})
// Unit tests must be fast, isolated, and runnable without infrastructure
```

### 9.3 Handler Tests

```go
// MUST: Mock inbound ports (service interfaces) in handler tests
func TestUserHandler_GetUser(t *testing.T) {
    gin.SetMode(gin.TestMode)

    svc := new(mockUserService)
    handler := handler.NewUserHandler(svc)

    svc.On("GetByID", mock.Anything, "123").Return(&model.User{
        ID:   "123",
        Name: "Test",
    }, nil)

    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Params = gin.Params{{Key: "id", Value: "123"}}
    c.Request = httptest.NewRequest("GET", "/public/api/users/123", nil)

    handler.GetUser(c)

    assert.Equal(t, http.StatusOK, w.Code)

    var resp DataResponse
    err := json.Unmarshal(w.Body.Bytes(), &resp)
    assert.NoError(t, err)
}
```

### 9.4 Test Structure

```go
// MUST: Use table-driven tests
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid email", "user@example.com", false},
        {"missing @", "userexample.com", true},
        {"empty", "", true},
        {"with plus", "user+tag@example.com", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail(%q) error = %v, wantErr %v", tt.email, err, tt.wantErr)
            }
        })
    }
}

// MUST: Test names describe the scenario
// BAD:  TestGetUser1, TestGetUser2
// GOOD: TestGetUser_ReturnsUser_WhenExists, TestGetUser_ReturnsNotFound_WhenMissing

// MUST: Use t.Helper() for test helpers
func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

// MUST: Tests are independent and parallelizable
func TestUserService(t *testing.T) {
    t.Parallel()

    t.Run("Create", func(t *testing.T) {
        t.Parallel()
        // test with own fixtures and own mocks
    })
}
```

### 9.5 Test Commands

```bash
# Run unit tests only
go test ./...

# Run with race detector (MUST for CI)
go test -race ./...

# Run integration tests (requires PostgreSQL)
go test -race -tags=integration ./...

# Run with coverage
go test -cover ./...

# Run specific test
go test -run TestUserService ./internal/app/service/

# Verbose output
go test -v ./...
```

---

## 10. Observability

### 10.1 Logging

| Rule | Level |
|------|-------|
| Structured logging (JSON in production) | MUST |
| Log levels used appropriately | MUST |
| Request ID in all request-scoped logs | MUST |
| No sensitive data in logs | MUST |

```go
// MUST: Use structured logging
logger.Info().
    Str("user_id", user.ID).
    Str("email", maskEmail(user.Email)).
    Str("request_id", requestID).
    Msg("user created")

// MUST: Appropriate log levels
// DEBUG: Detailed diagnostic info (disabled in production)
// INFO:  Normal operations (request completed, job started)
// WARN:  Unexpected but handled (retry succeeded, deprecated API used)
// ERROR: Failures requiring attention (request failed, dependency down)

// MUST: Include request context in Gin middleware
func LoggingMiddleware(logger zerolog.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }

        c.Set("request_id", requestID)
        l := logger.With().Str("request_id", requestID).Logger()
        c.Set("logger", l)

        c.Next()

        l.Info().
            Int("status", c.Writer.Status()).
            Str("method", c.Request.Method).
            Str("path", c.Request.URL.Path).
            Msg("request completed")
    }
}

// MUST NOT: Log sensitive data
// BAD:  logger.Info().Str("password", req.Password).Msg("login")
// BAD:  logger.Info().Interface("headers", c.Request.Header).Msg("request")
// GOOD: logger.Info().Str("email", req.Email).Msg("login attempt")
```

### 10.2 Metrics

```go
// SHOULD: Expose standard metrics
// - Request count by endpoint, method, status
// - Request latency histogram
// - Active connections
// - Error rates

// SHOULD: Business metrics for key operations
```

### 10.3 Health Checks

```go
// MUST: Liveness endpoint (is the process alive?)
// GET /healthz → 200 OK

// MUST: Readiness endpoint (can it serve traffic?)
// GET /readyz → 200 OK or 503 Service Unavailable

func (h *HealthHandler) Readiness(c *gin.Context) {
    ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
    defer cancel()

    sqlDB, err := h.db.DB()
    if err != nil {
        c.String(http.StatusServiceUnavailable, "database unavailable")
        return
    }

    if err := sqlDB.PingContext(ctx); err != nil {
        c.String(http.StatusServiceUnavailable, "database unavailable")
        return
    }

    c.String(http.StatusOK, "ok")
}

// SHOULD: Detailed health for debugging
// GET /health → {"status": "ok", "checks": {"db": "ok", "redis": "ok"}}
```

### 10.4 Tracing

```go
// SHOULD: Distributed tracing for request flows
func (h *UserHandler) GetUser(c *gin.Context) {
    ctx, span := tracer.Start(c.Request.Context(), "GetUser")
    defer span.End()

    span.SetAttributes(attribute.String("user.id", c.Param("id")))

    user, err := h.service.GetByID(ctx, c.Param("id"))
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        // handle error
    }
}

// MUST: Propagate trace context to downstream services
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
```

---

## 11. Performance

### 11.1 Memory Management

```go
// SHOULD: Preallocate slices when size is known
// BAD:
var users []User
for _, row := range rows {
    users = append(users, parseUser(row))
}

// GOOD:
users := make([]User, 0, len(rows))
for _, row := range rows {
    users = append(users, parseUser(row))
}

// MUST NOT: Hold references to large slices
// BAD:  keeps entire original slice in memory
small := largeSlice[0:10]

// GOOD: copy if you need a small portion
small := make([]byte, 10)
copy(small, largeSlice[0:10])
```

### 11.2 Profiling

| Rule | Level |
|------|-------|
| pprof endpoint available in non-production | SHOULD |
| Profile before optimizing | MUST |
| Benchmarks for hot paths | SHOULD |

```go
// SHOULD: Expose pprof in development
import _ "net/http/pprof"

go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()

// SHOULD: Benchmark hot paths
func BenchmarkParseUser(b *testing.B) {
    data := []byte(`{"id": "123", "name": "Test"}`)
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        ParseUser(data)
    }
}
```

### 11.3 Optimization Guidelines

```go
// MUST: Measure before optimizing
// MUST NOT: Premature optimization

// SHOULD: Avoid allocations in hot paths
// SHOULD: Use strings.Builder for string concatenation
var b strings.Builder
for _, s := range parts {
    b.WriteString(s)
}
result := b.String()
```

---

## 12. Docker

### 12.1 Multi-Stage Dockerfile

Three-stage build: `dev` for development with hot reload, `build` for compilation, `prod` for production runtime.

```dockerfile
# Stage 1: Development (hot reload via air)
FROM golang:1.26-alpine AS dev
RUN go install github.com/air-verse/air@latest
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
CMD ["air"]

# Stage 2: Build
FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/api ./cmd/api

# Stage 3: Production runtime
FROM gcr.io/distroless/static AS prod
COPY --from=build /bin/api /bin/api
ENTRYPOINT ["/bin/api"]
```

### 12.2 Development Workflow

Development uses Docker containers with volume-mounted source code. No local Go toolchain required.

| Rule | Level |
|------|-------|
| Multi-stage Dockerfile with `dev`, `build`, and `prod` targets | MUST |
| Development container uses `air` for hot reload | MUST |
| Source code mounted as volume in dev, not copied | MUST |
| Production image uses distroless or alpine base | SHOULD |
| No local toolchain dependencies for development — Docker only | SHOULD |
| CI runs toolchains directly (not in Docker) for speed | MAY |

---

## 13. Definition of Done

Code is complete when ALL of the following are true:

### 13.1 Functionality
- [ ] Implements requirements as specified
- [ ] Handles error cases gracefully
- [ ] Works with expected load

### 13.2 Architecture
- [ ] Follows hexagonal architecture (domain → app → adapter)
- [ ] Domain has zero external imports
- [ ] Dependencies point inward only
- [ ] Constructor injection, no global state

### 13.3 Code Quality
- [ ] Follows all rules in this document
- [ ] `go build` succeeds with no errors
- [ ] `go vet` passes with no warnings
- [ ] `golangci-lint run` passes
- [ ] No `TODO` comments without linked issue
- [ ] No commented-out code

### 13.4 Testing
- [ ] Unit tests for domain models and application services
- [ ] Unit tests for handlers (mocked services)
- [ ] No real database connections in unit tests
- [ ] `go test -race ./...` passes
- [ ] No skipped tests without linked issue

### 13.5 Security
- [ ] Input validation on all `/public/api/` endpoints
- [ ] No SQL injection vulnerabilities
- [ ] Auth/authz checks where required
- [ ] No secrets in code
- [ ] CSRF protection when serving browser UI

### 13.6 Observability
- [ ] Structured logging with appropriate levels
- [ ] Request IDs propagated via context
- [ ] Health endpoints implemented
- [ ] Metrics for key operations

### 13.7 Documentation
- [ ] Exported identifiers have doc comments
- [ ] Swagger annotations on all public handlers
- [ ] README updated if new setup steps
- [ ] API documentation updated if endpoints changed

---

## Appendix A: Linter Configuration

```yaml
# .golangci.yml
run:
  timeout: 5m
  go: "1.26"

linters:
  enable:
    # Core (included by default, listed explicitly for clarity)
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - typecheck
    - unused

    # Formatting
    - gofmt
    - goimports

    # Style & correctness
    - revive
    - gocritic
    - errname
    - misspell
    - unconvert
    - noctx

    # Database safety
    - sqlclosecheck
    - rowserrcheck
    - bodyclose

linters-settings:
  errcheck:
    check-blank: true
  revive:
    rules:
      - name: var-shadowing
        disabled: false
      - name: early-return
        disabled: false
      - name: context-as-argument
        disabled: false
      - name: error-return
        disabled: false
      - name: bare-return
        disabled: false
      - name: unused-parameter
        disabled: false
      - name: indent-error-flow
        disabled: false
  gocritic:
    enabled-tags:
      - diagnostic
      - style
      - performance

issues:
  exclude-use-default: false
```

---

## Appendix B: Quick Reference Card

| Category | MUST | MUST NOT |
|----------|------|----------|
| Architecture | Hexagonal (domain → app → adapter), constructor injection | Circular deps, global state, `init()` for DI |
| Errors | Check immediately, wrap with `%w`, `Err` prefix, `Error` suffix | Ignore, return bare err, panic |
| Naming | Match conventions, no stutter | Get prefix, package stutter |
| Types | `any` over `interface{}`, constrained generics, consistent receivers | Mixed receiver kinds on same type, `interface{}` |
| Receivers | Pointer for mutation/large structs/sync fields, consistent per type | Mixed pointer/value on same type, value receiver with sync fields |
| Context | First param, propagated to all I/O | Drop context, use `context.Background()` in request path |
| Config | Viper for everything, validate at startup | Direct `os.Getenv`, hardcoded values |
| Routing | `/public/api/` for external, `/internal/api/` for service-to-service | Mix prefixes, expose `/internal/` publicly |
| HTTP Clients | Config + `*http.Client` only, fresh request per call, timeouts | Store `*http.Request` on struct, per-request state on client |
| Database | GORM `WithContext`, parameterized queries, Goose migrations | AutoMigrate, string concat SQL, raw `database/sql` |
| Security | Validate input, hash passwords, CSRF with UI | Hardcode secrets, log PII, wildcard CORS + credentials |
| Testing | Mocks for unit tests, table-driven, `-race` flag | SQLite as test DB, real DB in unit tests, `gorm.Open` in tests |
| Logging | Structured (zerolog), levels, request ID | Sensitive data, `fmt.Printf` |
