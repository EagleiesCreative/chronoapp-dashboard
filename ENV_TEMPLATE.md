# Environment Variables for Vercel Deployment

Copy these to your Vercel project settings under **Environment Variables**.

## Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key)

## Clerk
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SECRET` - Webhook signing secret

## Xendit
- `XENDIT_SECRET_KEY` - Xendit API secret key
- `XENDIT_CALLBACK_TOKEN` - Callback verification token

## Cloudflare R2
- `R2_ENDPOINT` - https://your-account-id.r2.cloudflarestorage.com
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - chronosnap

## Sentry
- `SENTRY_AUTH_TOKEN` - Auth token for source maps
- `NEXT_PUBLIC_SENTRY_DSN` - Your Sentry DSN
