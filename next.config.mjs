/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose Supabase credentials to client bundles at build time.
  // Reads from the plain SUPABASE_* vars (available during every Vercel build)
  // so the client bundle never ends up with undefined baked in.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
  },
};

export default nextConfig;
