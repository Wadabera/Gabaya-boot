# Architecture Specification: Gebeya Boot / Telegram Shop AI Assistant (ARCHITECTURE.md)

## 1. High-Level Architecture Overview

Gebeya Boot is designed as a **Multi-Tenant E-Commerce and AI Assistant Platform** tailored for Ethiopian merchants and Telegram shoppers. The system employs a modular monolith architecture running TypeScript on both the backend (NestJS) and frontend (Next.js).

```
                      +---------------------------------------+
                      |            Telegram Buyer             |
                      |   (Amharic / English, No Website)     |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS Telegram Bot API
                                          v
+------------------------+    +-----------------------+    +-------------------------+
|      Shop Owner        |    |                       |    |     Platform Admin      |
|  Responsive Dashboard  |<-->|     NestJS Backend    |<-->|    Admin Web Portal     |
|   (Mobile & Desktop)   |    |    (Modular Monolith) |    |  (Audit, Plans, Review) |
+------------------------+    +-----------+-----------+    +-------------------------+
                                          |
                      +-------------------+-------------------+
                      |                   |                   |
                      v                   v                   v
              +---------------+   +---------------+   +---------------+
              |  PostgreSQL   |   | Redis / Cache |   |  AI Provider  |
              |  (Prisma ORM) |   |  (PubSub/Idem)|   | (Gemini/Local)|
              +---------------+   +---------------+   +---------------+
```

---

## 2. Multi-Tenancy Architecture

Gebeya Boot implements a shared-database multi-tenant model with tenant isolation guaranteed at the application layer through NestJS request-scoped guards and Prisma query constraints:

1. **Tenant Identifier**: Every store is identified by a unique `shop_id`.
2. **Context Propagation**:
   - For Owner/Staff web requests: The JWT payload includes `{ sub: userId, shopId, role }`.
   - The `ShopGuard` validates that the resource belongs to `request.user.shopId`.
3. **Cross-Shop Access Prevention**:
   - Backend queries always inject `where: { shopId: req.user.shopId }`.
   - Direct ID lookups enforce compound matching: `prisma.product.findFirst({ where: { id, shopId } })`.
4. **Data Isolation Tests**:
   - Comprehensive test suites attempt to read and write across distinct `shopId` boundaries to verify rejection with `403 Forbidden` or `404 Not Found`.

---

## 3. Telegram Bot State Machine & Session Management

Buyers navigate the shop through a stateless or cache-persisted conversational state machine inside Telegram:

```
[Start /start shop_123]
         |
         v
[L01 Choose Language: አማርኛ / English]
         |
         v
[C1 Main Menu: ምርቶች (Products) | ትዕዛዞቼ (My Orders) | ጥያቄ (Ask) | የሱቅ መረጃ (Shop Info)]
         |
         +--> [C2 Categories] --> [C3 Product List] --> [C4 Product Detail]
                                                             |
                                                             v (Add to Cart)
                                                       [C5 Cart Review]
                                                             |
                                                             v (Checkout)
                                                       [C6 Checkout Info: Name, Phone, Area/Pickup]
                                                             |
                                                             v
                                                       [C7 Summary & Confirmation]
                                                             |
                                                             v
                                                       [PAY1 Payment Choice: COD / Direct Shop / Pickup]
                                                             |
                                                             v
                                                       [C8 Order Placed & Owner Alerted]
```

---

## 4. Grounded AI Assistant with Owner Escalation Loop

The AI customer assistant acts as a reliable customer service representative that never hallucinates facts:

```
[Customer asks question via Telegram]
                   |
                   v
  [1. Pattern Match & Deterministic Check]
  (Price, Stock, Location, Working Hours)
         |                      |
      (Match)               (No Match)
         |                      |
         v                      v
[Immediate DB Reply]    [2. Query Grounded AI Prompt]
                        (Contains only Shop catalog & approved rules)
                                |
                   +------------+------------+
                   |                         |
              (Confident)               (Uncertain / Missing)
                   |                         |
                   v                         v
          [Reply to Customer]       [1. AI Fallback Notice]
        ("AI assistant · የሱቅ ረዳት")  ("I am not sure. I will ask the shop.")
                                             |
                                             v
                                    [2. Conversation Status -> WAITING_OWNER]
                                    [3. Notify Shop Owner via Dashboard/Telegram]
                                             |
                                             v
                                    [4. Owner Replies from Dashboard (O11)]
                                             |
                                    [5. Optional: Save Reply as Approved Rule]
```

---

## 5. Security and Audit Architecture

1. **Authentication**:
   - Phone + SMS verification for shop owners.
   - Email + Password + 2FA for platform administrators.
   - Argon2 / Bcrypt hashing for password credentials.
2. **Telegram Webhook Security**:
   - Webhook URL contains secret path token (`X-Telegram-Bot-Api-Secret-Token`).
   - All incoming requests verified before processing.
3. **Idempotency Protection**:
   - In-flight and processed Telegram updates track `update_id` to prevent double checkout or double stock decrements during Telegram retries.
4. **Audit Trail**:
   - Any status change on an order (`New -> Confirmed -> Out for delivery -> Delivered / Cancelled`) is saved with timestamp, previous state, new state, and responsible actor.
   - Admin shop approvals, rejections, suspensions, and subscription approvals are immutably logged in `audit_logs`.
