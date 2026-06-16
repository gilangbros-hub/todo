# Railway Deployment Guide

This guide explains how to deploy the incremental BRD analysis API to Railway while keeping the frontend on Vercel.

## Architecture

- **Vercel**: Frontend (React/Next.js pages, static assets)
- **Railway**: API routes (`/api/brd/*`) with 300s timeout support
- **Supabase**: Database and authentication (unchanged)

## Why Railway?

Vercel Hobby tier has a **10-second hard timeout** for serverless functions. BRD analysis operations (chunking, extraction, LLM calls) take 30-120+ seconds. Railway supports configurable timeouts up to 300s, making it ideal for long-running API operations.

## Prerequisites

1. Railway account at [railway.app](https://railway.app)
2. GitHub repository connected to Railway
3. Supabase project already set up with migrations applied

## Step 1: Apply Database Migration

Before deploying, apply the new migration to add the `extracted_text` column:

```bash
# Option A: Using Supabase CLI (if Docker is available)
npx supabase db push

# Option B: Via Supabase Dashboard
# 1. Go to your Supabase project → SQL Editor
# 2. Run the contents of supabase/migrations/016_add_extracted_text_column.sql
```

The migration adds:
```sql
alter table brd_documents 
add column extracted_text text default '';
```

## Step 2: Deploy to Railway

1. **Create a new project** on Railway
2. **Connect your GitHub repository** (`gilangbros-hub/todo`)
3. **Configure build settings**:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
   - Node Version: `18.x` or `20.x`

4. **Set environment variables** in Railway dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   DEEPSEEK_API_KEY=<your-deepseek-api-key>
   ```

5. **Deploy** - Railway will automatically build and deploy your application

## Step 3: Configure Vercel Proxy

1. **Get your Railway deployment URL** (e.g., `https://your-app.up.railway.app`)

2. **Add environment variable to Vercel**:
   ```
   RAILWAY_API_URL=https://your-app.up.railway.app
   ```

3. **Redeploy on Vercel** - The `next.config.mjs` rewrites will now proxy `/api/brd/*` requests to Railway

## Step 4: Verify Deployment

1. **Test API endpoints directly on Railway**:
   ```bash
   curl -X POST https://your-app.up.railway.app/api/brd/init \
     -H "Content-Type: application/json" \
     -d '{"text": "Test document", "title": "Test", "fileName": null}'
   ```

2. **Test through Vercel proxy**:
   ```bash
   curl -X POST https://your-vercel-app.vercel.app/api/brd/init \
     -H "Content-Type: application/json" \
     -d '{"text": "Test document", "title": "Test", "fileName": null}'
   ```

3. **Test full analysis flow** through the frontend

## API Endpoints

All endpoints are now incremental and complete in <30s:

| Endpoint | Purpose | Time |
|----------|---------|------|
| `POST /api/brd/init` | Create document, return ID | <1s |
| `POST /api/brd/extract` | Chunking/extraction phase | 5-10s |
| `POST /api/brd/core` | Core analysis (features + flow) | 10-30s |
| `POST /api/brd/advisory` | Advisory analysis | 10-30s |
| `POST /api/brd/enrich` | Enrichment (discovery/optimization/solutions) | 10-30s |
| `GET /api/brd/status?documentId=...` | Poll for progress | <1s |

## Fallback

The original streaming endpoint `/api/brd/stream` is preserved as a fallback. If Railway is unavailable, you can temporarily switch back to the streaming API by removing the `RAILWAY_API_URL` environment variable from Vercel.

## Troubleshooting

### API requests fail with 504 timeout
- Check Railway logs for errors
- Verify `DEEPSEEK_API_KEY` is valid
- Ensure Supabase connection is working

### Database errors
- Verify migration `016_add_extracted_text_column.sql` was applied
- Check Supabase RLS policies allow the operations

### CORS errors
- Railway automatically handles CORS for same-origin requests
- If using custom domains, ensure CORS headers are configured

## Monitoring

- **Railway Dashboard**: View logs, metrics, and deployment status
- **Vercel Dashboard**: Monitor frontend performance and errors
- **Supabase Dashboard**: Track database queries and authentication

## Cost Estimates

- **Railway**: Free tier includes $5/month credit (sufficient for moderate usage)
- **Vercel**: Free tier for Hobby plan
- **Supabase**: Free tier includes 500MB database, 50,000 monthly active users

## Next Steps

1. Monitor usage and upgrade Railway plan if needed
2. Consider adding caching for repeated analysis requests
3. Implement rate limiting to prevent abuse
4. Add error tracking (Sentry, etc.) for better debugging
