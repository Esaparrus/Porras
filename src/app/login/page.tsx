import Link from "next/link";
import { loginAction } from "@/app/actions";
import { PublicHeader, Shell } from "@/components/layouts";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Shell>
      <PublicHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 items-center">
        <form action={loginAction} className="glass w-full rounded-3xl p-6">
          <h1 className="text-3xl font-black">Entrar</h1>
          <p className="mt-2 text-slate-300">
            Admin o jugador, mismo acceso. La app te llevará a tu sitio.
          </p>
          {params.error ? (
            <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">
              {params.error}
            </p>
          ) : null}
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Usuario</span>
              <input name="username" required className="field mt-2" autoComplete="username" />
            </label>
            <label className="block">
              <span className="label">Contraseña</span>
              <input
                name="password"
                type="password"
                required
                className="field mt-2"
              />
            </label>
            <button className="btn-primary w-full">Entrar</button>
          </div>
          <p className="mt-5 text-center text-sm text-slate-300">
            ¿No tienes cuenta?{" "}
            <Link className="font-bold text-[#ff2bd6]" href="/register">
              Únete con código
            </Link>
          </p>
        </form>
      </div>
    </Shell>
  );
}
