# Technical and Architectural Decisions (DECISIONS.md)

This document tracks all architectural, technical, and scoping decisions made during the design and implementation of Gebeya Boot / Telegram Shop AI Assistant, in accordance with the SRS v2 and UI/UX design specifications.

---

## 1. Monorepo Structure and Technology Stack

- **Decision**: Organize the project into a clean, modern TypeScript monorepo with `backend` (NestJS + Prisma + PostgreSQL) and `frontend` (Next.js 14 App Router + React + Tailwind CSS + Lucide Icons).
- **Rationale**: 
  - NestJS provides enterprise-grade modularity, strong dependency injection, built-in validation pipes (`class-validator`), Swagger documentation, and clean separation of concerns for multi-tenant applications.
  - Next.js provides server-side rendering, fast mobile-optimized client hydration, and first-class TypeScript support.
  - Prisma provides type-safe database queries, declarative migrations, and database transaction support needed for preventing race conditions and stock overselling.
- **Alternatives Considered**: 
  - Single Express server: Harder to enforce strict modular architecture as features grow.
  - Microservices: Explicitly discouraged by the master prompt and SRS; adds unnecessary operational complexity for this stage.

---

## 2. Multi-Tenancy and Shop Data Isolation

- **Decision**: Shared database schema with tenant discrimination by `shop_id` across all tenant-scoped tables (`products`, `categories`, `orders`, `conversations`, `shop_rules`, `subscriptions`). 
- **Enforcement**:
  - All authenticated requests carry the owner's `user.id` and associated `shop_id` in their JWT payload.
  - Backend NestJS Guards (`JwtAuthGuard`, `RolesGuard`, `ShopOwnerGuard`) enforce that callers can never manipulate or supply a foreign `shopId` to access or modify another shop's resources.
  - Platform administrators have a dedicated role (`ADMIN`) verified through role checks, with complete isolation from shop owner endpoints.
- **Rationale**: High performance, simple migrations, robust index-backed querying, and strong security via server-side authorization.

---

## 3. Telegram Bot Architecture and Single vs Multi-Bot Routing

- **Decision**: Single central Telegram Bot engine with shop-specific deep linking (`t.me/<bot_username>?start=shop_<shop_id>`).
- **Rationale**: 
  - Small Ethiopian merchants cannot easily set up individual Telegram Bot tokens via @BotFather. A single platform bot eliminates setup friction.
  - When a buyer clicks the seller's shop link (`t.me/GebeyaShopBot?start=shop_123` or scans a QR code), the bot extracts the deep-link parameter, attaches the session to `shop_123`, and loads that shop's catalog and profile.
  - The architecture is modular: if a Pro plan shop later demands custom bot branding (Phase 2), a dedicated bot token adapter can be plugged in without changing the core ordering engine.

---

## 4. Idempotency and Webhook Retry Protection

- **Decision**: Incoming Telegram updates carry a unique `update_id`. The backend checks and records processed `update_id`s in a dedicated table or Redis cache. If an update is redelivered by Telegram, it is acknowledged immediately (`200 OK`) without re-executing order creation or stock reduction.
- **Rationale**: Telegram guarantees at-least-once delivery; network lags can cause retried webhooks. Without idempotency, duplicate orders and double stock decrements would occur.

---

## 5. Currency, Pricing, and Stock Reduction Integrity

- **Decision**: 
  - All monetary values are stored in Ethiopian Birr (ETB) using Decimal types (`Decimal(10, 2)`) to prevent IEEE-754 floating-point inaccuracies.
  - Order checkout calculates totals strictly on the server by looking up current active product prices from the database. Client-supplied totals are discarded.
  - Stock reduction occurs inside an atomic database transaction (`prisma.$transaction`) when the shop owner moves an order from `NEW` to `CONFIRMED`.
  - Orders cannot be confirmed if any item quantity exceeds remaining stock.
  - When stock reaches 0, the product's `isOutOfStock` status is automatically updated.

---

## 6. AI Assistant Grounding and Guardrails

- **Decision**: 
  - Factual questions regarding prices, availability, store hours, and delivery locations are resolved directly by deterministic database lookups first whenever patterns match.
  - For conversational queries, a provider-independent AI service interface is employed.
  - Prompt injection defense: User questions are treated as untrusted text. The system prompt strictly limits context to the active shop's data and approved rules.
  - If the AI confidence is below threshold or info is absent, the system outputs the standardized fallback: *"I am not sure about that. I will ask the shop and reply here."* and escalates the conversation (`status = WAITING_OWNER`).
  - AI is strictly prohibited from executing state changes (orders cannot be placed or cancelled by AI, and stock cannot be modified).
  - AI responses are prepended with `AI assistant · የሱቅ ረዳት` as mandated by FR-45.
  - Fallback engine: When no external AI key is configured or when the provider is unreachable, deterministic grounding answers price/stock/hours, and safely escalates all other queries without crashing.

---

## 7. Dual Localization (Amharic & English) and Ethiopian Calendar

- **Decision**:
  - Support full bidirectional localization across both the Telegram Bot and Owner/Admin Dashboards.
  - Implement a pure TypeScript Ethiopian Calendar converter (Ge'ez calendar: 12 months of 30 days + Pagume of 5 or 6 days, starting on Meskerem 1 / September 11).
  - Dates are stored server-side in UTC ISO-8601 timestamps and converted on display according to the user's selected calendar preference (`gregorian` or `ethiopian`).
- **Rationale**: Ethiopic small merchants frequently track daily sales and events in the Ethiopian calendar (Amharic: የኢትዮጵያ ዘመን አቆጣጠር). Storing UTC ensures data portability while the converter provides natural local presentation.

---

## 8. Customer Privacy and Data Deletion

- **Decision**:
  - The bot stores only minimal buyer data: `telegram_id`, `name`, `phone`, `last_area`, `language`.
  - When a customer triggers "Delete my data (`Delete my data` / C12)" in the Telegram bot, the system anonymizes their personal identifiable info (PII) on the customer record and replaces past completed order customer references with anonymized identifiers while preserving financial records for owner sales audits.
- **Rationale**: Complies with privacy requirements (FR-69, Privacy) without destroying business-critical order accounting data.

---

## 9. Subscription Plans and Manual Ethiopian Payments

- **Decision**:
  - Free, Basic, Pro plans configured with product, order, and AI answer limits.
  - Platform never touches or holds customer purchase funds (customers pay cash on delivery, pickup, or direct to shop accounts).
  - Platform subscription billing uses the Ethiopian manual bank transfer / mobile money workflow: Shop owner transfers fee, enters transaction reference and uploads receipt screenshot; Platform Admin reviews submission and approves or rejects with reason and audit log.
- **Rationale**: Reflects Ethiopian e-commerce reality (CBE Birr, Telebirr, Awash, etc.) before automated aggregator approvals.
