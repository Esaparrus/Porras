import Link from "next/link";
import { Crown, ShieldCheck, Smartphone, Trophy } from "lucide-react";
import { PublicHeader, Shell } from "@/components/layouts";

export default function Home() {
  return (
    <Shell>
      <PublicHeader />
      <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="badge">Mundial 2026 · Porra privada</span>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-tight text-white sm:text-7xl">
            Gestiona la porra con pique, ranking y cero hojas cutres.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Crea una liga, comparte el código, recoge apuestas y actualiza
            resultados manualmente desde un panel rápido pensado para móvil.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/admin" className="btn-primary">
              Entrar como admin
            </Link>
            <Link href="/register" className="btn-secondary">
              Unirme con código
            </Link>
          </div>
        </div>
        <div className="glass rounded-[2rem] p-5">
          <div className="rounded-[1.5rem] bg-[linear-gradient(145deg,#0b1f36,#133d29)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Liga</p>
                <h2 className="text-3xl font-black">Harazuri</h2>
              </div>
              <Trophy className="h-10 w-10 text-[#d6b25e]" />
            </div>
            <div className="mt-6 space-y-3">
              {["Nerea", "Unai", "Aitor", "Marta"].map((name, index) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"
                >
                  <span className="font-bold">
                    <span className="text-[#d6b25e]">#{index + 1}</span> {name}
                  </span>
                  <span className="font-black">{92 - index * 7} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 pb-8 md:grid-cols-3">
        <Feature icon={<ShieldCheck />} title="Admin total" text="Ligas, usuarios, bloqueos, resultados, goles, premios y logs." />
        <Feature icon={<Smartphone />} title="Mobile-first" text="Botones grandes y vistas rápidas para actualizar en un minuto." />
        <Feature icon={<Crown />} title="Ranking vivo" text="Puntos configurables y recálculo automático de la clasificación." />
      </section>
    </Shell>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-[#d6b25e]">{icon}</div>
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-2 text-slate-300">{text}</p>
    </div>
  );
}
