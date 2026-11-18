# FreelanceHub API

A robust, scalable Back-End RESTful API for **FreelanceHub** — a freelance marketplace connecting project owners (Clients) with skilled Freelancers, ensuring secure escrow-style wallet payments, role-based access control, and high performance.

---

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Authentication & Security:** JWT (Access & Refresh Tokens with Rotation), bcrypt, Helmet, Throttler (Rate Limiting)
- **Performance:** In-Memory Caching, Composite Database Indexing, Offset Pagination
- **File Handling:** Multer (Disk Storage with strict MIME-type & file-size validation + Secure File Streaming)

---

## Core Features & Business Logic

### 1. Authentication & Authorization
- **Roles:** `CLIENT`, `FREELANCER`, and `ADMIN` (Admin accounts cannot be created via public registration).
- **Session Management:** Short-lived JWT Access Tokens paired with hashed Refresh Tokens stored in the database (`Session` model) supporting token rotation and multi-device logout.
- **Account Security:**
  - Password hashing using `bcrypt`.
  - Strict rate limiting (`5 requests/minute`) on login and password recovery endpoints to prevent brute-force attacks.
  - Password Reset flow via cryptographically secure, hashed, time-limited tokens (`SHA-256`).
  - Admin ability to ban/unban violating users, immediately revoking their platform access.

### 2. Escrow Wallet & Atomic Transactions
All financial operations are wrapped in Prisma interactive `$transaction` blocks to guarantee ACID compliance and prevent race conditions:
- **Wallet Top-Up:** Clients can deposit virtual funds into their wallet and view their balance alongside a complete transaction history.
- **Offer Acceptance:**
  1. Verifies the client has sufficient balance.
  2. Deducts the offer amount from `balance` and moves it to `lockedBalance`.
  3. Marks the chosen offer as `ACCEPTED`, rejects all other pending offers, and transitions the project to `IN_PROGRESS`.
- **Work Delivery & Payment Release:**
  1. Freelancer uploads the final deliverable (`PDF` or `ZIP`).
  2. Upon client approval, `lockedBalance` is released: **90%** is credited to the freelancer's wallet, and **10%** is retained as platform commission.
  3. Project status transitions to `COMPLETED`.
- **Admin Cancellation:** Admins can cancel `IN_PROGRESS` projects if a dispute arises, atomically refunding 100% of the `lockedBalance` back to the client's available balance.

### 3. Projects, Offers & Profiles
- **Freelancer Profiles:** Publicly viewable profiles featuring bio, hourly rate, and avatar upload (images only, max `2MB`).
- **Categories:** Managed exclusively by Admins and cached for fast retrieval across the platform, with automatic cache invalidation upon updates.
- **Projects:** Supports optional attachments (Images or PDF, max `5MB`), strict lifecycle transitions (`OPEN` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`), ownership checks, pagination (`page`, `limit`, `total`, `totalPages`), category filtering, title search, and sorting.
- **Offers:** Enforces database-level and business-level constraints: one offer per freelancer per project, no self-bidding on own projects, and offers allowed only on `OPEN` projects.

---

## Business & Analytical Decisions (Edge Cases Handled)

As requested in the project brief, several unspecified business edge cases were analyzed and resolved with logical system rules:

1. **Admin Project Cancellation (`CANCELLED` State):**
   - *Gap:* The brief defined `OPEN` → `IN_PROGRESS` → `COMPLETED` states, but did not specify how disputes or stalled `IN_PROGRESS` projects are resolved.
   - *Decision:* Added a `CANCELLED` project status and an Admin-only cancellation endpoint. Cancelling an `IN_PROGRESS` project atomically refunds 100% of the `lockedBalance` back to the client's available wallet balance, records a `REFUND` transaction, and marks the accepted offer as `CANCELLED`.

2. **Protected Deliverable Streaming:**
   - *Gap:* Project deliverables (`PDF`/`ZIP`) contain paid work and should not be publicly accessible via static URLs.
   - *Decision:* Served private attachments and final submissions through guarded endpoints returning `StreamableFile`, verifying that the requester is either the project owner, the assigned freelancer, or an admin.

3. **Automatic Wallet Provisioning:**
   - *Gap:* The brief required every user to have a wallet without specifying its creation lifecycle.
   - *Decision:* Coupled user registration with automatic `Wallet` initialization (`balance: 0`, `lockedBalance: 0`) inside an atomic database transaction.

4. **Offer Withdrawal via Soft-Cancellation (`CANCELLED` Offer Status):**
   - *Gap:* The brief enforced a strict "one offer per freelancer per project" rule, without clarifying whether a freelancer can withdraw a pending offer or re-apply afterward.
   - *Decision:* Allowed freelancers to withdraw their own `PENDING` offers by transitioning the offer status to `CANCELLED` (soft-delete) rather than deleting the record. Combined with the database-level `@@unique([freelancerId, projectId])` constraint, this prevents offer spamming or re-bidding on the same project while keeping a clean audit trail.

5. **Deliverable Rejection & Admin Dispute Resolution:**
   - *Gap:* The brief only described the "happy path" where the client approves a submission to release funds, leaving open what happens if the delivered work is unsatisfactory or if the two parties enter an endless submit/reject cycle.
   - *Decision:* Enabled clients to reject a submitted deliverable with feedback while keeping the project `IN_PROGRESS` and funds safely locked. To prevent infinite submission/rejection deadlocks during a dispute, Admins were granted authority to step in and force-resolve the submission by either approving it (releasing the 90/10 payout and completing the project) or rejecting/cancelling the project (refunding the client).

## Getting Started

### Prerequisites
- Node.js (v20+ LTS)
- PostgreSQL (v15+)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd freelance-hub