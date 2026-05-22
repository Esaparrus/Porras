import { createLeagueAction } from "@/app/actions";
import { AdminLayout } from "@/components/layouts";

export default function NewLeaguePage() {
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-xl">
        <form action={createLeagueAction} className="glass rounded-3xl p-6">
          <h1 className="text-3xl font-black">Crear nueva liga</h1>
          <p className="mt-2 text-slate-300">
            Si dejas el código vacío se genera uno tipo HARAZURI-2026.
          </p>
          <div className="mt-6 space-y-4">
            <label>
              <span className="label">Nombre de liga</span>
              <input name="name" required className="field mt-2" placeholder="Arazuri" />
            </label>
            <label>
              <span className="label">Código opcional</span>
              <input name="code" className="field mt-2 uppercase" placeholder="HARAZURI-2026" />
            </label>
            <button className="btn-primary w-full">Crear liga</button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
