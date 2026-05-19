const SUPABASE_ENV_HELP =
  "Create .env.local in the project root with values from Supabase Project Settings > API.";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}. ${SUPABASE_ENV_HELP}`);
  }

  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseAdminEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
