import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
const email = process.env.ADMIN_EMAIL || "admin@porra.local";
const password = process.env.ADMIN_PASSWORD || "1234";

if (!url || !serviceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Crea .env.local en la raiz del proyecto con los valores de Supabase.",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: "Admin" },
});

if (error && !error.message.includes("already registered")) {
  throw error;
}

let user = data.user;
if (!user) {
  const { data: users } = await supabase.auth.admin.listUsers();
  user = users.users.find((item) => item.email === email);
}

if (!user) {
  throw new Error(`No se encontró el usuario admin ${email}`);
}

await supabase.from("profiles").upsert({
  id: user.id,
  email,
  username,
  display_name: "Admin",
  role: "admin",
});

console.log(`Admin listo: ${username}`);
