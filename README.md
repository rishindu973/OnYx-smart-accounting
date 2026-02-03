This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

OnYx: Smart Accounting & Governance
Project Status: Initial Database & Infrastructure Complete (Phase 1)

This repository contains the core infrastructure for OnYx, an AI-driven financial governance tool. The database is powered by PostgreSQL and Prisma ORM, featuring a company-centric multi-tenant architecture.

📂 Project Structure Overview
prisma/schema.prisma: The single source of truth for our database design.

src/generated/prisma/: Auto-generated TypeSafe client for interacting with the database.

src/services/: (Reserved) AI Logic, Vendor Mapping, and Suggestion Engine.

src/app/api/: (Reserved) Next.js API routes for backend operations.

🛠️ Local Setup Instructions
Follow these steps to synchronize your local environment with the project schema.

1. Prerequisites
Ensure PostgreSQL is installed and running on your machine.

Ensure you have Node.js installed.

2. Environment Configuration
Create a .env file in the root directory and add your local database connection string:

Bash
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/onyx-db?schema=public"
Note: Replace YOUR_PASSWORD with your actual local PostgreSQL password.

3. Installation & Database Sync
Run the following commands in your terminal:

Bash
# Install dependencies
npm install

# Create the tables in your local Postgres
npx prisma migrate dev --name init_onyx

# Generate the Prisma Client for TypeScript support
npx prisma generate
4. Verification
Launch Prisma Studio to verify your local database tables:

Bash
npx prisma studio
You should see all core tables: User, Company, ChartOfAccounts, JournalEntry, LedgerLine, DailyLimit, and VendorMapping.

🧠 Database Logic (For Team Members)
Member 1 (UI/UX): Use the JournalEntry and LedgerLine models to populate the Dashboard and Virtual Ledger.

Member 3 (Backend): The sourceType field on JournalEntry tracks whether data came from AI_SCAN or USER_INPUT.

Member 5 (The Brain): Use the VendorMapping table to create the auto-suggestion logic for new documents.

Governance: The reversalOfId in JournalEntry creates an immutable audit trail—never delete records; always reverse them.

🚀 GitHub Push Instructions
Once you've saved this README, run these commands to share the directory with your team:

Initialize Git (if not already done): git init

Add all files: git add . (Ensure .env is in your .gitignore!)

Commit: git commit -m "feat: Initial database infrastructure and Prisma schema"

Add Remote: git remote add origin <YOUR_REPO_URL>

Push: git push -u origin main