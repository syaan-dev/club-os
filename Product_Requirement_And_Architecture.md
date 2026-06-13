# Club OS PRD and Architecture Blueprint (Development Ready)

## 1. Product Summary

### 1.1 Product Name

Club OS: Mobile operating system for grassroots organizations in India.

### 1.2 Vision

Club OS helps volunteer-led clubs run with financial transparency and low admin overhead. The primary value loop is dues collection, ledger clarity, and member trust. Governance workflows (meetings, minutes, voting) support the same goal.

### 1.3 Problem Statement

Most clubs in India still run on WhatsApp threads, manual spreadsheets, and ad hoc decisions. This creates:

- Missed dues and poor collection consistency.
- Unclear cash flow and disputed expenses.
- Slow decision-making and weak documentation.
- Burnout for treasurers and secretaries.

### 1.4 Product Principle

Build for trust first:

- Every money movement is traceable.
- Every decision has a record.
- Every member sees the same truth.

## 2. Target Users and Personas

- Sports clubs (cricket, football, badminton).
- Hobby and community groups.
- Resident association sub-groups.
- Student chapters.

Primary app roles:

- Owner: creates club, manages governance and billing settings.
- Treasurer: handles dues, ledger, and reconciliation.
- Secretary: handles meetings, minutes, and action items.
- Member: views dues, pays, votes, receives updates.

## 3. Goals, Non-Goals, and Success Metrics

### 3.1 Product Goals (First 6 Months)

- Reduce overdue dues by at least 30 percent in active clubs.
- Ensure at least 90 percent of transactions have category and source evidence.
- Achieve at least 60 percent monthly active members in onboarded clubs.

### 3.2 Non-Goals (Initial Release)

- Full accounting suite for enterprises.
- Banking core replacement.
- Full legal filing automation for all state-level regulatory variants.

### 3.3 Success Metrics

- Dues collection rate (due amount vs paid amount).
- Time-to-close monthly ledger.
- Meeting completion ratio (scheduled vs completed with MoM).
- Reminder-to-payment conversion rate.
- Churn by club cohort.

## 4. Feature Scope and Roadmap

Roadmap is dues-first to maximize early retained value.

### Phase 1 (Weeks 1 to 4): Onboarding and Dues Core

Features:

- Phone OTP login.
- Club creation and invite links.
- Member directory with role assignment.
- Dues plans: one-time, monthly, quarterly.
- Manual income and expense ledger.
- Member dues dashboard: outstanding, paid, overdue.

Acceptance criteria:

- User can create a club in under 2 minutes.
- Treasurer can create a dues cycle and assign to all active members.
- Member sees due amount and due date in app.
- Ledger supports income and expense entries with audit metadata.

### Phase 2 (Weeks 5 to 8): Meetings and Governance

Features:

- Meeting scheduling and agenda management.
- Attendance tracking.
- Live minutes capture (notes, decisions, action items).
- Polls and votes with quorum check.
- Meeting summary export (PDF).

Acceptance criteria:

- Secretary can run an end-to-end meeting workflow on mobile.
- Voting result is visible in real time and persisted per member vote.
- Quorum status is computed from active membership and attendance.

### Phase 3 (Weeks 9 to 12): Payments and Automation

Features:

- Embedded UPI collection via payment gateway.
- Payment webhook reconciliation pipeline.
- Automated reminder scheduler via WhatsApp templates.
- Failed payment retry and reconciliation dashboard.

Deferred to post-MVP validation:

- OCR screenshot parsing for payment proof.
- Annual AGM compliance bundle generator.

Acceptance criteria:

- Member can complete due payment in-app.
- Webhook events are idempotent and never create duplicate receipts.
- Reminder templates are logged with delivery status.

## 5. Detailed Functional Requirements

### 5.1 Authentication and Identity

- Mobile OTP authentication.
- One user can belong to multiple clubs.
- Membership status states: invited, active, suspended, left.

### 5.2 Authorization and Role Matrix

- Owner: full access, role assignment, club settings.
- Treasurer: dues plans, transactions, reconciliation, exports.
- Secretary: meetings, minutes, action tracking, polls.
- Member: own dues, club announcements, votes where eligible.

Permission enforcement:

- App-level UI checks.
- Database-level Row Level Security (RLS) checks.

### 5.3 Financial Ledger and Dues

- Dues plans with amount, frequency, grace days, penalty rule (optional).
- Dues cycles generated per plan.
- Member dues state machine: pending, paid, overdue, waived.
- Transaction states: pending, completed, failed, reversed.

### 5.4 Payments

- Create payment order from member due.
- Verify and process gateway webhook.
- Reconcile order to transaction and member due.
- Support manual override only by treasurer or owner with audit reason.

### 5.5 Meetings and Voting

- Meeting states: scheduled, live, concluded, archived.
- Poll types: yes-no, multi-option.
- Vote visibility: public or anonymous.
- Persist individual vote records; aggregate values are derived.

### 5.6 Notifications

- In-app reminders for dues and meetings.
- WhatsApp reminders for dues and critical announcements.
- Consent tracking and opt-out handling.

### 5.7 Auditability

- Every critical write stores created_by and updated_by.
- High-risk actions store reason and source.
- Maintain append-only audit events for money and role changes.

## 6. Non-Functional Requirements (NFRs)

### 6.1 Performance

- P95 mobile API latency under 500 ms for common reads.
- Meeting vote updates visible to attendees under 2 seconds.

### 6.2 Reliability

- Target monthly uptime: 99.5 percent for MVP.
- Retry strategy for webhooks and background jobs with dead-letter logging.

### 6.3 Security and Privacy

- RLS on all club-scoped tables.
- Webhook signature verification.
- Encrypted secrets and key rotation policy.
- PII minimization and role-restricted data exposure.

### 6.4 Data and Recovery

- Daily backups of primary database.
- Recovery point objective (RPO): 24 hours.
- Recovery time objective (RTO): 4 hours for MVP.

### 6.5 Observability

- Structured logs with request and correlation IDs.
- Error tracking with alert rules.
- Dashboard for payment failures and retry status.

## 7. Technical Architecture

### 7.1 Architecture Style

Managed serverless architecture with Supabase as system of record and Node.js serverless functions for integrations and asynchronous workflows.

### 7.2 Core Components

- Mobile app: React Native (Expo).
- Core backend: Supabase (Auth, Postgres, Storage, Realtime).
- Integration compute: Node.js serverless functions (webhooks, PDF, notification pipeline).

### 7.3 Data and Control Flow

1. App reads and writes club-scoped data through Supabase with RLS.
2. Payment gateway calls secure webhook endpoint.
3. Webhook handler validates signature and enqueues reconciliation task.
4. Reconciliation updates payment orders, dues, and ledger atomically.
5. Notification worker sends due reminders and writes delivery logs.

### 7.4 Integration Requirements

- Payment gateway: Razorpay (or equivalent) with idempotency key handling.
- WhatsApp Cloud API for template-based reminders.
- Optional OCR service reserved for post-MVP.

## 8. Development-Ready Data Model (PostgreSQL)

This schema is intentionally explicit for implementation planning. It can be split into migrations by module.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core clubs and membership
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner','treasurer','secretary','member')),
    membership_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (membership_status IN ('invited','active','suspended','left')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (club_id, user_id)
);

CREATE TABLE club_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    invited_phone VARCHAR(20),
    invited_email VARCHAR(255),
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES members(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dues planning and cycles
CREATE TABLE dues_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('one_time','monthly','quarterly')),
    grace_days INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dues_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    dues_plan_id UUID NOT NULL REFERENCES dues_plans(id) ON DELETE CASCADE,
    cycle_label VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE member_dues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    dues_cycle_id UUID NOT NULL REFERENCES dues_cycles(id) ON DELETE CASCADE,
    amount_due NUMERIC(12,2) NOT NULL,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','waived')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (member_id, dues_cycle_id)
);

-- Ledger and payments
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id),
    recorded_by UUID NOT NULL REFERENCES members(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
    amount NUMERIC(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
    description TEXT,
    source VARCHAR(30) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','gateway','adjustment')),
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    member_due_id UUID NOT NULL REFERENCES member_dues(id) ON DELETE CASCADE,
    gateway VARCHAR(30) NOT NULL,
    gateway_order_id VARCHAR(255) NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created','authorized','captured','failed','expired')),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    gateway_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processed','failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Meetings and governance
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','concluded','archived')),
    created_by UUID NOT NULL REFERENCES members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meeting_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (meeting_id, member_id)
);

CREATE TABLE mom_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('note','decision','action_item')),
    content TEXT NOT NULL,
    assigned_to UUID REFERENCES members(id),
    due_date DATE,
    created_by UUID NOT NULL REFERENCES members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    poll_type VARCHAR(20) NOT NULL DEFAULT 'yes_no' CHECK (poll_type IN ('yes_no','multi_option')),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    choice VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (poll_id, member_id)
);

-- Notifications and audit
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app','whatsapp')),
    template_key VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued','sent','delivered','failed')),
    provider_message_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
    is_opted_in BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (member_id, channel)
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    actor_member_id UUID REFERENCES members(id),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for club-scoped data (expand with table-specific policies)
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Example baseline policy for members visibility within same club scope
CREATE POLICY members_club_scope ON members
    FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM members WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );
```

## 9. Monetization Strategy

MVP monetization should optimize adoption and trust.

- Free tier: core onboarding, basic ledger, manual dues tracking.
- Pro tier (club subscription): automated reminders, payment reconciliation dashboard, meeting export bundles.
- Transaction fee strategy: evaluate after product-market fit; avoid high upfront friction during early rollout.

## 10. Delivery Plan and Engineering Milestones

- Milestone A: Auth, clubs, members, dues core, manual ledger.
- Milestone B: Meetings, attendance, MoM, polls, exports.
- Milestone C: Payment integration, webhooks, reminder automation.

Definition of done for each milestone:

- All acceptance criteria met.
- RLS policies reviewed and tested.
- Observability checks in place.
- Basic regression test suite green.

## 11. Key Risks and Mitigations

- Risk: payment mismatch or duplicate event ingestion.
  Mitigation: strict idempotency keys, event table uniqueness, retry with backoff.

- Risk: role misuse and data leakage.
  Mitigation: RLS-first design, explicit role matrix tests.

- Risk: reminder spam and consent violations.
  Mitigation: consent records, rate limits, opt-out support.

- Risk: over-scoped MVP.
  Mitigation: defer OCR and annual compliance bundle until usage validates demand.
