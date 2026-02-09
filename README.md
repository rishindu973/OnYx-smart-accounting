OnYx: Smart Accounting & Governance
Project Status: Frontend Integration & Infrastructure Complete (Phase 2)

This repository contains the full-stack core for OnYx, an AI-driven financial governance tool. It integrates a high-fidelity Next.js 14 frontend (Tailwind CSS, Framer Motion, Recharts) with a robust PostgreSQL backend powered by Prisma ORM.

--Project Structure Overview--

src/
├── app/               # Next.js App Router (File-based Routing)
│   ├── api/           # External Webhooks & API endpoints
│   ├── (auth)/        # Authentication routes
│   └── dashboard/     # Core application feature pages
├── components/        # Reusable UI & Layout components
│   ├── ui/            # Shadcn Primitives (Buttons, Dialogs, etc.)
│   └── dashboard/     # Feature-specific dashboard widgets
├── contexts/          # Global State (AuthContext, ThemeContext)
├── hooks/             # Custom React Hooks (useToast, useMobile)
├── lib/
│   ├── actions/       # Server Actions (Your Backend Logic)
│   ├── engines/       # Financial computation & rule engines
│   └── db.ts          # Prisma Singleton Client
├── services/          # AI Logic, Suggestion Engines, Fuzzy Matching
└── types/             # Shared TypeScript Interfaces


Post-Pull & Update Instructions
If you are pulling changes from the dev branch, follow these steps to ensure your local environment is synchronized:

Install Dependencies We have added several UI libraries (Radix UI, Recharts, Framer Motion). You must update your node_modules.

Bash
npm install
Regenerate Prisma Client Ensure your VS Code provides full TypeSafe auto-completion for our models.

Bash
npx prisma 
Client Component Awareness Most frontend pages use hooks (e.g., useState). Ensure any new UI-heavy pages start with the "use client"; directive at the top.
Backend Logic Architecture (Where to Code)
To keep the project clean, please place your code according to these designated areas:

Layer	            Location	        Purpose
User Actions	    src/lib/actions/	Logic triggered by buttons (e.g., reconcile(), saveScan()).
AI/Complex Logic	src/services/ 	    Heavy lifting like fuzzy matching or suggestion engines.
Computation	        src/lib/engines/	Financial rule engines (e.g., tax or audit validators).
External APIs	    src/app/api/	    Only for webhooks or external pings.

--Important Feature Guidelines--
Server Actions: Do not use standard API routes for internal logic. Use src/lib/actions/ to perform DB operations directly from the UI.

Audit Trail (No-Delete Policy): Never use db.table.delete(). Use the reversalOfId field in the JournalEntry model to void or reverse transactions for a permanent audit trail.

Client Directives: If your page/component uses useState or useEffect, you must add "use client"; at the very top.

Local Setup (First Time)
Prerequisites: Install PostgreSQL and Node.js.

Environment: Create a .env file in the root.

Plaintext
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/onyx-db?schema=public"
Database Sync:

Bash
npx prisma migrate dev --name init_onyx
Verification: Run npx prisma studio to view your tables.

Supabase to Prisma Transition
Notice: We are strictly using Prisma + PostgreSQL. The frontend migrated from Lovable contains legacy Supabase imports (@supabase/supabase-js). Member 5 is currently stripping these out. If you encounter a Supabase-related error:

Do not install Supabase.

If you see a supabase import error, ignore it or replace it with a placeholder for a Server Action.

Audit Trail: Remember, we never delete records. Use the reversalOfId in JournalEntry to void transactions.


--Team Roles & Logic Handover--
Member 1 (UI/UX): All visual components are in src/components/ui. Use page.tsx in src/app/ folders for routing.

Member 2,3 (Backend): Implement logic in src/lib/actions/. Distinguish between AI_SCAN and USER_INPUT in sourceType.

Member 4,5 (AI Logic): Use VendorMapping for suggestion logic and implement the fuzzy match engine in src/services/.

--Development Commands--
npm run dev: Start the development server.

npx prisma studio: Open the visual database editor to inspect local data.

npx prisma generate: Run this every time you pull changes to the schema.prisma file.

--Database Setup--
Sync the Prisma schema and generate the client

npx prisma generate
npx pgeneraterisma db push

--Running the Development Server--

Important: Due to specific Tailwind v3 configurations, run the server without Turbopack for the best experience:

npm run dev -- --turbo=false

--Project Architecture--

src/app/(dashboard): Contains all internal dashboard features wrapped in a shared sidebar layout.

src/components/dashboard: Shared UI elements like the Navigation Sidebar and Header.

src/contexts: Global state management including Authentication.

--Critical Setup Notes--

Tailwind v4 Bridge: This project uses a custom postcss.config.mjs to ensure Tailwind v3 features (like custom HSL variables) work within the Next.js 15+ environment.

Route Groups: All internal pages are located within the (dashboard) group. Ensure href paths in components match the lowercase folder structure.

