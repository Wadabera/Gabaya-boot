# Implementation Plan: Gebeya Boot / Telegram Shop AI Assistant (IMPLEMENTATION_PLAN.md)

## 1. Existing Project Assessment
- **Repository State**: Freshly initialized Git repository on Windows (`c:\Users\Baha\OneDrive\Desktop\gebeya boot`).
- **Available Environment**: Node.js v24.19.0, npm v11.6.2, Git v2.46.0, Docker v29.5.2.
- **SRS Source**: `Telegram_Shop_AI_Assistant_SRS_v2.docx` / `Telegram_Shop_AI_Assistant_SRS_v2.pdf` and UX/UI Design Guide (63 screens).
- **Strategy**: Clean modular monolith implementation comprising a NestJS TypeScript backend and a Next.js 14 App Router TypeScript frontend, fully grounded in the SRS specifications.

---

## 2. Requirements Mapped to Modules

| Functional Domain | SRS Requirement IDs | Backend NestJS Module | Frontend View / Screen Group |
|---|---|---|---|
| Identity & Auth | FR-01, FR-02, FR-04 | `AuthModule`, `UsersModule` | `O1` (Sign-in), `O2` (SMS Verify), Admin Login |
| Shop Management | FR-02, FR-04, FR-60, FR-66 | `ShopsModule` | `O3` (Details), `W01` (Approval wait), `W02`, `D01` (Profile) |
| Catalog & Inventory | FR-10, FR-11, FR-12 | `ProductsModule`, `CategoriesModule` | `O4` (Add), `O8` (List), `O9` (Edit) |
| Telegram Bot Engine | FR-20, FR-21, FR-22, FR-25, FR-64, FR-69 | `TelegramModule` | Telegram Bot (`L01`, `C1` to `C12`, `PAY1`, `PAY2`) |
| Order Processing | FR-30, FR-31, FR-32, FR-33, FR-65 | `OrdersModule` | `O6` (Order List), `O7` (Detail), `PAY3` (Payment Record) |
| AI Assistant Service | FR-40, FR-41, FR-42, FR-43, FR-44, FR-45 | `AiModule` | `O10` (Chats), `O11` (Correction/Rule), `D03` (AI Settings) |
| Plans & Subscriptions | FR-50, FR-51, FR-52, FR-54, FR-73 | `SubscriptionsModule` | `O13`, `D05` (Plans), `D06` (Pay), `D07` (Status) |
| Platform Administration | FR-04, FR-61, FR-62, FR-63, FR-74, FR-75 | `AdminModule` | `AD0` (Overview), `AD1`, `AD2`, `AD3`, `AD4`, `AD5`, `A1`, `A2`, `A3` |
| Analytics & Reports | FR-35, FR-70 | `AnalyticsModule` | `D00` (Home Dashboard), `O12` (Sales Summary) |
| Localization & Calendar | FR-05, FR-72 | `I18nService`, `EthiopicCalendarService` | Amharic/English toggle, Ethiopian Calendar toggle (`L02`) |
| Media & Storage | FR-10, Low-Data NFR | `StorageModule` | Photo upload & local/cloud adapter |
| Audit & Security | Security/Privacy NFRs | `AuditModule` | Audit logging for state changes and admin actions |

---

## 3. Chosen Architecture and Technology Stack

- **Monorepo Structure**:
  - `backend/`: NestJS v10, TypeScript, Prisma ORM, Passport JWT, class-validator, Swagger (`@nestjs/swagger`).
  - `frontend/`: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React, Axios / SWR.
- **Database**: PostgreSQL 15 via Prisma Client.
- **Cache / Background Jobs**: Redis adapter with in-memory fallback for local environments without Docker.
- **Bot Engine**: NestJS Telegram Webhook Controller + Telegraf / native Telegram Bot API client + Simulation test runner for local testing without active bot token.
- **AI Service**: Adapter architecture (`AiProvider` interface) supporting Gemini / OpenAI / Anthropic / Groq and a deterministic grounded fallback engine reading real database facts.

---

## 4. Database Design (Prisma Schema Overview)

Entities to be generated in `prisma/schema.prisma`:
1. `User`: `id, phone, email, role (ADMIN, OWNER, STAFF), passwordHash, isVerified, createdAt, updatedAt`
2. `Shop`: `id, ownerId, name, area, openingHours, deliveryAreas, language, status (PENDING, ACTIVE, SUSPENDED), botLink, planId, createdAt, updatedAt`
3. `Category`: `id, shopId, name, sortOrder, createdAt`
4. `Product`: `id, shopId, categoryId, name, description, price, options, stock, photoUrl, isActive, isOutOfStock, createdAt, updatedAt`
5. `Customer`: `id, telegramId, name, phone, lastArea, language, isAnonymized, createdAt, updatedAt`
6. `Order`: `id, orderNumber, shopId, customerId, total, status (NEW, CONFIRMED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED), deliveryType (DELIVERY, PICKUP), deliveryArea, paymentMethod (CASH_ON_DELIVERY, DIRECT_SHOP, PICKUP), paymentStatus (PENDING, CUSTOMER_MARKED_PAID, CONFIRMED_PAID, NOT_RECEIVED), notes, createdAt, updatedAt`
7. `OrderItem`: `id, orderId, productId, productName, option, quantity, unitPrice, totalPrice`
8. `OrderStatusHistory`: `id, orderId, fromStatus, toStatus, changedBy, note, createdAt`
9. `Conversation`: `id, shopId, customerId, status (BOT, WAITING_OWNER, CLOSED), isAiEnabled, createdAt, updatedAt`
10. `Message`: `id, conversationId, sender (CUSTOMER, AI, OWNER), text, metadata, createdAt`
11. `ShopRule`: `id, shopId, questionPattern, approvedAnswer, isActive, createdAt, updatedAt`
12. `SubscriptionPlan`: `id, name (FREE, BASIC, PRO), priceMonthly, productLimit, orderMonthlyLimit, aiMonthlyLimit, isActive`
13. `Subscription`: `id, shopId, planId, status (ACTIVE, EXPIRED, PENDING_PAYMENT), startDate, endDate, createdAt, updatedAt`
14. `SubscriptionPayment`: `id, shopId, planId, amount, paymentMethod (BANK_TRANSFER, MOBILE_MONEY), referenceNumber, receiptUrl, status (SUBMITTED, CHECKING, APPROVED, REJECTED), rejectionReason, reviewedById, reviewedAt, createdAt`
15. `Complaint`: `id, shopId, customerId, customerName, description, status (OPEN, IN_REVIEW, RESOLVED), createdAt`
16. `AuditLog`: `id, userId, shopId, action, entity, entityId, details, ipAddress, createdAt`

---

## 5. Implementation Phases (Step-by-Step)

- **Phase 0: Inspection, Requirements Checklist & Implementation Plan** *(Complete)*
- **Phase 1: Application Foundation**:
  - Monorepo setup (`backend` & `frontend`)
  - Prisma schema creation, initial migrations, and seed script
  - Common configuration, DTO validation pipes, error handling filters, and Swagger setup
- **Phase 2: Authentication & Shop Onboarding**:
  - Owner phone authentication & SMS verification simulator
  - Shop profile setup, multi-step onboarding wizard
  - Admin authentication with 2FA/two-step check
- **Phase 3: Products & Categories**:
  - Category and product CRUD endpoints with multi-tenant guards
  - Photo upload handling with compression
  - Out-of-stock toggle and stock tracking
  - QR Code generator (`qrcode` library) for shop links
- **Phase 4: Telegram Customer Experience**:
  - Telegram webhook handler with secret verification & update idempotency
  - Interactive bot conversation state machine:
    - Language selection (Amharic `አማርኛ` & English)
    - Main menu, categories, product details with photo
    - Shopping cart management (add, edit, clear)
    - Checkout flow (name, phone, delivery area vs pickup)
    - Payment choice (Cash on delivery, Pay shop directly, Pickup)
    - Customer management of personal details & GDPR-compliant data deletion
  - Local Telegram webhook simulation harness for automated testing
- **Phase 5: Order Management & Inventory Control**:
  - Order state machine: `NEW -> CONFIRMED -> OUT_FOR_DELIVERY -> DELIVERED` and `CANCELLED`
  - Atomic stock decrement on confirmation via Prisma transaction
  - Cancellation rules (customer can only cancel when order is `NEW`)
  - Owner payment reconciliation (Mark as paid / Not received)
  - Sales summary analytics (Day, Week, Month; income & best-selling items)
- **Phase 6: AI Customer Assistant**:
  - Provider-agnostic AI service (Gemini, OpenAI, Groq, fallback)
  - Strict grounding: shop products, hours, delivery areas, and approved shop rules only
  - Escalation mechanism to owner when uncertain
  - Owner conversation review, answer correction, and automatic shop rule generation
  - Shop-level and conversation-level AI toggle
- **Phase 7: Subscription Billing**:
  - Subscription plans (Free, Basic, Pro) and quota tracking
  - Manual payment submission with reference number & receipt upload
  - Plan expiration calculation and reminders
- **Phase 8: Platform Admin Dashboard**:
  - Shop review, approval, suspension, and deletion
  - Subscription payment review with audit trail
  - Complaints and failed AI answer monitoring
  - System counters & platform health metrics
- **Phase 9: Frontend Polish, Localization & Ethiopian Calendar**:
  - Mobile-first responsive UI adhering to the 63 screens in the UX/UI guide
  - Full Amharic and English translations
  - Ge'ez Ethiopian Calendar converter and display toggle
  - Empty states, loading spinners, and error alerts
- **Phase 10: Automated Testing & Production Readiness**:
  - End-to-end tests covering all 16 SRS acceptance tests
  - Docker Compose orchestration
  - Verification of all acceptance criteria

---

## 6. Testing Strategy

1. **Unit Tests**:
   - Ethiopian Calendar date conversions
   - AI prompt grounding and rule matching
   - Order total calculation and price verification
2. **Integration Tests**:
   - Multi-tenant data isolation: Verify Shop A owner cannot access Shop B data
   - Order confirmation and atomic stock decrement
   - Webhook idempotency: Ensure duplicated Telegram `update_id` causes no duplicate order
3. **End-to-End Acceptance Tests**:
   - Verification of all 16 SRS acceptance tests (orders, out-of-stock, cancellations, AI fallbacks, plan limits).

---

## 7. External Integrations & Credentials Required

| Service | Dev / Test Mode | Production Requirement |
|---|---|---|
| PostgreSQL | Local Docker / Embedded DB | Hosted PostgreSQL instance |
| Redis | In-Memory fallback / Docker Redis | Hosted Redis instance |
| Telegram Bot API | Mock Webhook Runner / Test Bot | Bot token from @BotFather + Webhook HTTPS URL |
| SMS Gateway | Built-in Mock / Test SMS Service | Ethiopian SMS provider (AfroMessage, etc.) |
| AI Service | Grounded Fallback Engine | Gemini / OpenAI / Groq API key |

---

## 8. Risks, Ambiguities & Mitigation

- **Network Constraints in Ethiopia**: Use small payloads, compressed images, and mobile-first responsive layouts.
- **Telegram Webhook Duplicates**: Guard every update with unique `update_id` tracking before processing.
- **Currency & Rounding Errors**: Strict Decimal monetary calculations in ETB.
