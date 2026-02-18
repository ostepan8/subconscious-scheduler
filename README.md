# Subconscious Agent Scheduler

Schedule and run [Subconscious](https://subconscious.dev) AI agents on autopilot. Chat with an AI assistant to create tasks, set cron schedules, and get results delivered to your inbox.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Backend:** [Convex](https://convex.dev) (database, auth, cron jobs, serverless functions)
- **AI:** [Subconscious](https://subconscious.dev) agent platform with streaming chat
- **Styling:** Tailwind CSS v4
- **Email:** Resend

## Getting Started

```bash
npm install
npx convex dev   # starts Convex backend
npm run dev       # starts Next.js frontend
```

Copy `.env.example` to `.env.local` and fill in your keys.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUBCONSCIOUS_API_KEY` | API key from [subconscious.dev/platform](https://subconscious.dev/platform) |
| `TOOL_ENDPOINT_SECRET` | Shared secret for agent tool endpoints (must match Convex dashboard) |
| `NEXT_PUBLIC_APP_URL` | Production URL for OG images |
| `CONVEX_DEPLOYMENT` | Set automatically by `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | Set automatically by `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP actions URL |
| `RESEND_API_KEY` | Email delivery via [Resend](https://resend.com) |
| `RESEND_FROM_EMAIL` | Sender email for notifications |

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Set all environment variables above in Vercel project settings
4. Deploy
