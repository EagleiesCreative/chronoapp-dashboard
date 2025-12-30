import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. Rate Limiting Logic (In-Memory Token Bucket)
// Note: In serverless (Vercel), this state is not shared between lambdas.
// For strict global rate limiting, use Redis (Upstash).
// This is a "good enough" free tier solution for single-instance or low-concurrency spikes.

interface RateLimitData {
  tokens: number;
  lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitData>();

const RATE_LIMIT_CONFIG = {
  maxTokens: 20,       // Max requests burst
  refillRate: 1,       // Tokens added per second
  windowMs: 1000,      // Refill interval (1 second)
};

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, {
      tokens: RATE_LIMIT_CONFIG.maxTokens,
      lastRefill: now
    });
  }

  const data = rateLimitMap.get(ip)!;

  // Refill tokens based on time elapsed
  const timeElapsed = now - data.lastRefill;
  const tokensToAdd = Math.floor(timeElapsed / RATE_LIMIT_CONFIG.windowMs) * RATE_LIMIT_CONFIG.refillRate;

  if (tokensToAdd > 0) {
    data.tokens = Math.min(RATE_LIMIT_CONFIG.maxTokens, data.tokens + tokensToAdd);
    data.lastRefill = now;
  }

  // Consume token
  if (data.tokens > 0) {
    data.tokens -= 1;
    return false; // Not limited
  }

  return true; // Limited!
}

// 2. Protected Routes Matcher
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/payments(.*)',
  '/api/booths(.*)',
  '/api/analytics(.*)',
  '/api/reports(.*)'
]);

// 3. Proxy (formerly Middleware)
export default clerkMiddleware(async (auth, req) => {
  // Apply Rate Limiting to API routes only
  if (req.nextUrl.pathname.startsWith('/api')) {
    // Use IP or 'anonymous' as key
    const ip = req.headers.get("x-forwarded-for") || "anonymous";

    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests", retryAfter: "1s" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Protect routes requiring authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

