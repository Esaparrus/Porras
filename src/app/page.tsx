import Link from "next/link";
import {
  Crown,
  Flame,
  Goal,
  ShieldCheck,
  Smartphone,
  Trophy,
  Zap,
} from "lucide-react";
import { PublicHeader, Shell } from "@/components/layouts";

export default function Home() {
  return (
    <Shell>
      <PublicHeader />
      <section className="grid flex-1 items-center gap-7 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div className="relative">
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="badge border-black bg-[#f2e94e] text-black shadow-[5px_5px_0_#000]">
              Mundial 2026
            </span>
            <span className="badge border-black bg-white text-black shadow-[5px_5px_0_#000]">
              Porra privada
            </span>
          </div>
          <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.92] text-white [text-shadow:5px_5px_0_#000] sm:text-6xl lg:text-7xl">
            La porra del Mundial de 2026.
          </h1>
          <p className="mt-5 max-w-2xl border-4 border-black bg-white p-4 text-lg font-black leading-8 text-black shadow-[8px_8px_0_#000]">
            Apuestas, gritos, rankings y esa persona que jura que Canada llega
            a semis. Todo sobre cesped, sin Excel pocho y con pique del bueno.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/admin" className="btn-primary brutal-btn">
              <Zap className="h-5 w-5" />
              Entrar como admin
            </Link>
            <Link
              href="/register"
              className="btn-secondary brutal-btn !bg-[#ff4d2d] !text-white hover:!bg-[#ff6b50]"
            >
              <Flame className="h-5 w-5" />
              Unirme con codigo
            </Link>
          </div>
        </div>

        <div className="relative pt-8 lg:pt-0">
          <div className="absolute -right-1 top-0 rotate-3 border-4 border-black bg-[#3bd16f] px-4 py-2 text-base font-black uppercase text-black shadow-[7px_7px_0_#000] sm:-right-2 sm:-top-5 sm:text-xl">
            Modo barra libre de opiniones
          </div>
          <div className="border-4 border-black bg-[#111827] p-4 shadow-[12px_12px_0_#000]">
            <div className="border-4 border-white bg-black p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-[#f2e94e]">
                    Marcador social
                  </p>
                  <h2 className="text-4xl font-black uppercase">Harazuri FC</h2>
                </div>
                <div className="grid h-16 w-16 place-items-center border-4 border-black bg-[#f2e94e] text-black shadow-[5px_5px_0_#fff]">
                  <Trophy className="h-9 w-9" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <ScoreTile label="Pique" value="99" tone="bg-[#f2e94e]" />
                <ScoreTile label="Drama" value="VAR" tone="bg-[#ff4d2d]" />
              </div>

              <div className="mt-5 space-y-3">
                {["Nerea", "Unai", "Aitor", "Marta"].map((name, index) => (
                  <div
                    key={name}
                    className="flex items-center justify-between border-2 border-white bg-white px-4 py-3 text-black"
                  >
                    <span className="font-black uppercase">
                      <span className="mr-2 inline-block border-2 border-black bg-black px-2 py-1 text-white">
                        #{index + 1}
                      </span>
                      {name}
                    </span>
                    <span className="font-black">{92 - index * 7} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-4 border-black bg-white p-3 text-black">
              <div>
                <p className="text-xs font-black uppercase">Final inventada</p>
                <p className="font-black">Espana</p>
              </div>
              <div className="flex items-center gap-2 border-4 border-black bg-[#f2e94e] px-4 py-2 font-black">
                <Goal className="h-5 w-5" />
                3 - 2
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase">Caos probable</p>
                <p className="font-black">Brasil</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 pb-8 md:grid-cols-3">
        <Feature
          icon={<ShieldCheck />}
          title="Admin total"
          text="Ligas, usuarios, bloqueos, resultados, goles, premios y logs."
        />
        <Feature
          icon={<Smartphone />}
          title="Mobile-first"
          text="Botones grandes y vistas rapidas para actualizar en un minuto."
        />
        <Feature
          icon={<Crown />}
          title="Ranking vivo"
          text="Puntos configurables y recalculo automatico de la clasificacion."
        />
      </section>
    </Shell>
  );
}

function ScoreTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`${tone} border-4 border-black p-3 text-black`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
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
    <div className="border-4 border-black bg-white p-5 text-black shadow-[8px_8px_0_#000]">
      <div className="text-[#ff4d2d]">{icon}</div>
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-2 font-semibold text-neutral-800">{text}</p>
    </div>
  );
}
