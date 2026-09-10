# Orbit

A private, full-stack project workspace with a responsive dashboard, project cards, a four-stage task board, search, assignees, priorities, deadlines, and an activity feed.

## Stack

- React 19, TypeScript, Vinext and Vite
- Cloudflare Workers API routes
- Cloudflare D1 (SQLite), prepared queries, Drizzle migrations
- Tailwind CSS, Radix/Shadcn accessible controls, Lucide icons
- Zod request validation

## Run locally

Requires Node.js 22.13 or later.

1. `npm run install:ci`
2. `npm run build`
3. `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tough_mauler.sql`
4. `npm run dev`
5. Open the Local URL printed in the terminal.

Apply the initial migration only once per local database. Subsequent schema changes should generate new migrations with `npm run db:generate`.

The workspace starts empty. Choose **Load example workspace** to add three clearly described sample projects and nine tasks. Example loading is optional and only allowed once per database.

## API

`GET /api/workspace` returns projects, tasks, and the latest 30 activity entries.

`POST /api/workspace` accepts `{ kind, action, id?, data? }`. Kinds are `project` and `task`; actions are `create`, `update`, and `delete`. The special `{ action: "seed" }` request loads examples.

Projects contain name, description, color and due date. Tasks contain project_id, title, description, status, priority, assignee and due date. Statuses: Backlog, In progress, In review, Done. Priorities: Low, Medium, High.

## Access and persistence

This deployment uses Sites owner-only access. It is a single shared workspace behind that access policy, not a multi-tenant service. Assignees are text labels, not invited user accounts. Do not expose it publicly without adding application authentication and authorization.

All workspace records persist in D1; browser storage is not used for application data. The API validates fields and uses parameterized SQL. Deleting a project deletes its tasks. The activity list retains a history of changes.

## Verification

The implementation was checked with TypeScript, ESLint, a production build, and local API tests covering creation, reload persistence, status updates, invalid input, cascading deletion, sample loading, and duplicate sample protection. Browser interaction testing was not performed.
