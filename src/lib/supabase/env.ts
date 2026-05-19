const SUPABASE_ENV_HELP =
  "Create .env.local in the project root with values from Supabase Project Settings > API.";

function requireEnv(name: string, fallbackNames: string[] = []) {
  const keys = [name, ...fallbackNames];
  const value = keys.map((key) => process.env[key]).find(Boolean);

  if (!value) {
    throw new Error(`Missing ${keys.join(" or ")}. ${SUPABASE_ENV_HELP}`);
  }

  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", [
      "SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
    ]),
  };
}

export function getSupabaseAdminEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
