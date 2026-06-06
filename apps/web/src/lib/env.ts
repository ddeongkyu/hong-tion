"use client";

const publicEnv = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_PHOENIX_SOCKET_URL: process.env.NEXT_PUBLIC_PHOENIX_SOCKET_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
} as const;

type PublicEnvName = keyof typeof publicEnv;

export function requiredPublicEnv(name: PublicEnvName, developmentFallback?: string) {
  const value = publicEnv[name];

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== "production" && developmentFallback) {
    return developmentFallback;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}
