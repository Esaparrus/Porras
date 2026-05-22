import Link from "next/link";
import { registerAction } from "@/app/actions";
import { PublicHeader, Shell } from "@/components/layouts";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Shell>
      <PublicHeader />
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center">
        <form action={registerAction} className="glass w-full rounded-3xl p-6">
          <h1 className="text-3xl font-black">Unirme a una liga</h1>
          <p className="mt-2 text-slate-300">
            Necesitas el código que te pasa el admin por WhatsApp.
          </p>
          {params.error ? (
            <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">
              {params.error}
            </p>
          ) : null}
          <div className="mt-6 grid gap-4">
            <label>
              <span className="label">Usuario</span>
              <input
                name="username"
                required
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9._-]+"
                className="field mt-2"
                autoComplete="username"
              />
            </label>
            <label>
              <span className="label">Contraseña</span>
              <input
                name="password"
                type="password"
                minLength={4}
                required
                className="field mt-2"
              />
            </label>
            <label>
              <span className="label">Código de liga</span>
              <input
                name="league_code"
                required
                className="field mt-2 uppercase"
                placeholder="HARAZURI-2026"
              />
            </label>
            <button className="btn-primary w-full">Crear cuenta y entrar</button>
          </div>
          <p className="mt-5 text-center text-sm text-slate-300">
            ¿Ya tienes cuenta?{" "}
            <Link className="font-bold text-[#ff2bd6]" href="/login">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </Shell>
  );
}
