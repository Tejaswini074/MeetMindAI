# MeetMind Backend

AI Meeting Notes & Action Tracker — REST + real-time API. Node.js, Express, TypeScript, Prisma/MySQL, OpenAI (Whisper + GPT), Socket.IO.

This is the backend-first phase of the project: every functional requirement below is implemented for real against a MySQL database, with the React Native client to follow as a separate phase.

## Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+, TypeScript (strict) |
| Web framework | Express |
| Database / ORM | MySQL 8 + Prisma |
| Auth | JWT access (15m) + rotating refresh tokens (7d), RBAC (Admin / Team Lead / Team Member) |
| Validation | Zod |
| AI | OpenAI Whisper (transcription) + GPT (summary, action items, sentiment, RAG Q&A) + embeddings (semantic search) |
| Real-time | Socket.IO |
| Files | Multer + pluggable storage (local disk by default, S3 via `STORAGE_DRIVER=s3`) |
| Email | Nodemailer (SMTP) |
| Push | Firebase Cloud Messaging |
| Docs | Swagger (OpenAPI) at `/api/docs` |
| Logging | Winston |

## Getting started

1. **Start MySQL** (or point `DATABASE_URL` at your own instance):
   ```bash
   docker compose up -d
   ```
2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   At minimum, set `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to random strings. Everything else (`OPENAI_API_KEY`, SMTP, Firebase, AWS, Google) is optional — features that depend on an unset value degrade gracefully (log a warning / return a clear error) rather than crashing the server.
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Run migrations**:
   ```bash
   npm run prisma:migrate
   ```
5. **Start the dev server**:
   ```bash
   npm run dev
   ```
   API is now at `http://localhost:4000`, Swagger docs at `http://localhost:4000/api/docs`, health check at `http://localhost:4000/health`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with hot-reload (ts-node-dev) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:studio` | Prisma Studio GUI |
| `npm test` | Jest (unit + integration) |
| `npm run test:unit` / `test:integration` | Run just one suite |

## Architecture

Clean-architecture-ish layering per feature module under `src/modules/*`:

```
routes → controller → service → repository → Prisma
```

- **`src/common`** — cross-cutting: `AppError`, response envelope, pagination helper, JWT helpers, storage abstraction (`StorageProvider` interface with local/S3 implementations), Winston logger.
- **`src/middlewares`** — `authenticate`/`authorize` (RBAC), Zod `validate`, centralized `errorHandler`, rate limiters, Multer upload configs, request logging.
- **`src/modules/*`** — one folder per domain: `auth`, `users`, `teams`, `meetings`, `ai`, `tasks`, `notifications`, `search`, `analytics`, `export`, `audit`, `calendar`.
- **`src/sockets`** — Socket.IO gateway: JWT-authenticated handshake, per-meeting/team/user rooms, live (chunked) transcription, Kanban board broadcasts, attendance tracking.
- **`src/jobs`** — `node-cron` jobs: upcoming-meeting reminders, recurring-meeting occurrence generation.

Every list endpoint supports `page`, `limit`, `sort`, `order` query params via `parsePagination`. Every response is `{ success, data, meta? }` on success or `{ success: false, error: { message, details? } }` on failure.

## Feature → endpoint map

- **Auth**: `POST /api/auth/{register,login,refresh,logout}`
- **Users**: `GET/PATCH /api/users/me`, `POST /api/users/me/device-token`, `GET /api/users` (admin), `GET /api/users/:id`
- **Teams**: `POST/GET /api/teams`, `GET/PATCH/DELETE /api/teams/:id`, `/:id/members`, `/:id/invite`, `/invitations/:token/accept`
- **Meetings**: `POST/GET /api/meetings`, `GET/PATCH/DELETE /api/meetings/:id`, `/:id/participants`, `/:id/rsvp`, `/:id/attendance`, `/:id/upload-audio`, `/:id/upload-transcript`, `/:id/export?format=pdf|docx`
- **AI** (nested under meetings + a cross-meeting assistant): `POST /api/meetings/:id/{summarize,action-items,sentiment,qa}`, `POST /api/ai/qa`
- **Tasks / Kanban**: `POST/GET /api/tasks`, `GET /api/tasks/board?teamId=`, `GET/PATCH/DELETE /api/tasks/:id`, `/:id/move`, `/:id/comments`, `/:id/attachments`
- **Search**: `GET /api/search?q=&type=fulltext|semantic|all`
- **Notifications**: `GET /api/notifications`, `/read-all`, `/:id/read`
- **Analytics**: `GET /api/analytics/{dashboard,meetings,tasks,ai-usage}`
- **Audit log**: `GET /api/audit-logs` (admin)
- **Calendar**: `GET /api/calendar/google/connect`, `GET /api/calendar/google/callback`, `POST /api/calendar/google/sync/:meetingId`

Full request/response schemas are in Swagger at `/api/docs`.

## Real-time (Socket.IO)

Connect with `auth: { token: <accessToken> }` in the handshake. Events:

- `meeting:join` / `meeting:leave` — join a meeting room, tracked as an `AttendanceRecord`
- `meeting:audio-chunk` → `meeting:transcript-partial` — near-real-time transcription of short audio chunks
- `team:join` / `team:leave` — join a team's Kanban room
- `task:created` / `task:updated` / `task:moved` / `task:commented` / `task:deleted` — broadcast to the team room whenever the REST API mutates a task
- `notification:new` — pushed to a user's personal room whenever a notification is created

## Known simplifications (by design, for this phase)

- **Speaker identification** always labels segments `"Unknown"` — Whisper's API doesn't diarize. A `DiarizationProvider` seam exists for plugging in a real provider later.
- **Semantic search / RAG Q&A** compares embeddings with in-process cosine similarity (no vector database) — fine at demo scale, not meant for millions of rows.
- **Live transcription** is chunked near-real-time transcription over Socket.IO, not literal streaming ASR.
- **Calendar integration** implements Google Calendar only; Outlook would use the same service shape but isn't wired up.

## Environment variables

See `.env.example` for the full list with comments. Nothing beyond the JWT secrets is required to boot the server — AI, email, push, S3, and calendar features simply no-op or return a clear `500` explaining what's missing until configured.
