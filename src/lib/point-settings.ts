import type { PointSettings } from "@/lib/types";

export const POINT_SETTING_GROUPS = [
  [
    "Partidos de grupos",
    [
      "match_sign_points",
      "match_goal_difference_points",
      "match_exact_score_points",
    ],
  ],
  [
    "Grupos",
    [
      "group_exact_position_points",
      "group_winner_bonus_points",
      "group_qualified_team_points",
      "best_third_team_points",
    ],
  ],
  [
    "Cuadro inicial",
    [
      "knockout_round_32_reached_points",
      "knockout_round_16_reached_points",
      "knockout_quarter_reached_points",
      "knockout_semi_reached_points",
      "knockout_final_reached_points",
      "knockout_champion_points",
      "knockout_runner_up_points",
      "knockout_third_place_points",
    ],
  ],
  [
    "Partidos de eliminatoria",
    [
      "live_round_32_sign_points",
      "live_round_32_winner_points",
      "live_round_32_goal_difference_points",
      "live_round_32_exact_score_bonus",
      "live_round_16_sign_points",
      "live_round_16_winner_points",
      "live_round_16_goal_difference_points",
      "live_round_16_exact_score_bonus",
      "live_quarter_sign_points",
      "live_quarter_winner_points",
      "live_quarter_goal_difference_points",
      "live_quarter_exact_score_bonus",
      "live_semi_sign_points",
      "live_semi_winner_points",
      "live_semi_goal_difference_points",
      "live_semi_exact_score_bonus",
      "live_third_place_sign_points",
      "live_third_place_winner_points",
      "live_third_place_goal_difference_points",
      "live_third_place_exact_score_bonus",
      "live_final_sign_points",
      "live_final_winner_points",
      "live_final_goal_difference_points",
      "live_final_exact_score_bonus",
    ],
  ],
  ["Goleadores", ["scorer_goal_points", "scorer_max_points"]],
  [
    "Premios",
    [
      "award_top_scorer_points",
      "award_best_player_points",
      "award_best_goalkeeper_points",
      "award_best_young_player_points",
    ],
  ],
] as const satisfies ReadonlyArray<
  readonly [string, readonly (keyof Omit<PointSettings, "id" | "league_id">)[]]
>;

export const POINT_SETTING_LABELS: Record<
  keyof Omit<PointSettings, "id" | "league_id">,
  string
> = {
  match_sign_points: "Signo 1/X/2",
  match_goal_difference_points: "Diferencia de goles",
  match_exact_score_points: "Resultado exacto",
  group_exact_position_points: "Posición exacta",
  group_winner_bonus_points: "Ganador de grupo",
  group_qualified_team_points: "Clasificado directo",
  best_third_team_points: "Mejor tercero",
  knockout_round_32_reached_points: "Llega a dieciseisavos",
  knockout_round_16_reached_points: "Llega a octavos",
  knockout_quarter_reached_points: "Llega a cuartos",
  knockout_semi_reached_points: "Llega a semifinales",
  knockout_final_reached_points: "Llega a la final",
  knockout_champion_points: "Campeón del torneo",
  knockout_runner_up_points: "Subcampeón",
  knockout_third_place_points: "Tercer puesto",
  live_round_32_sign_points: "Dieciseisavos 1/X/2",
  live_round_32_winner_points: "Dieciseisavos clasificado",
  live_round_32_goal_difference_points: "Dieciseisavos diferencia",
  live_round_32_exact_score_bonus: "Dieciseisavos exacto",
  live_round_16_sign_points: "Octavos 1/X/2",
  live_round_16_winner_points: "Octavos clasificado",
  live_round_16_goal_difference_points: "Octavos diferencia",
  live_round_16_exact_score_bonus: "Octavos exacto",
  live_quarter_sign_points: "Cuartos 1/X/2",
  live_quarter_winner_points: "Cuartos clasificado",
  live_quarter_goal_difference_points: "Cuartos diferencia",
  live_quarter_exact_score_bonus: "Cuartos exacto",
  live_semi_sign_points: "Semis 1/X/2",
  live_semi_winner_points: "Semis clasificado",
  live_semi_goal_difference_points: "Semis diferencia",
  live_semi_exact_score_bonus: "Semis exacto",
  live_third_place_sign_points: "Tercer puesto 1/X/2",
  live_third_place_winner_points: "Tercer puesto ganador",
  live_third_place_goal_difference_points: "Tercer puesto diferencia",
  live_third_place_exact_score_bonus: "Tercer puesto exacto",
  live_final_sign_points: "Final 1/X/2",
  live_final_winner_points: "Final clasificado",
  live_final_goal_difference_points: "Final diferencia",
  live_final_exact_score_bonus: "Final exacto",
  scorer_goal_points: "Gol",
  scorer_max_points: "Máximo goleadores",
  award_top_scorer_points: "Pichichi",
  award_best_player_points: "Mejor jugador",
  award_best_goalkeeper_points: "Mejor portero",
  award_best_young_player_points: "Mejor joven",
};

// Aclaraciones que se muestran bajo cada regla en la pagina de Puntuaciones.
// Pensadas sobre todo para explicar las que valen 0 puntos o las que no son obvias.
export const POINT_SETTING_NOTES: Partial<
  Record<keyof Omit<PointSettings, "id" | "league_id">, string>
> = {
  match_goal_difference_points:
    "Se suma al signo si además aciertas la diferencia de goles. Vale menos que el resultado exacto.",
  match_exact_score_points:
    "Premio mayor por clavar el marcador. Se suma encima del signo y la diferencia.",
  group_winner_bonus_points:
    "0 a propósito: acertar el 1.º del grupo ya puntúa vía 'Posición exacta' + 'Clasificado directo'. Este extra está apagado para no pagar lo mismo dos veces.",
  group_qualified_team_points: "Por cada uno de los dos que clasifican directos del grupo.",
  best_third_team_points: "Por acertar un equipo entre los mejores terceros que pasan de ronda.",
  knockout_round_32_reached_points:
    "0 a propósito: llegar a dieciseisavos es clasificar de la fase de grupos, que ya se premia en 'Clasificado directo' y 'Mejor tercero'.",
  knockout_round_16_reached_points:
    "Por cada selección tuya que llega de verdad a esta ronda. Es el único premio al avance: sube en cada fase para que se pueda remontar hasta el final.",
  knockout_quarter_reached_points: "Por cada selección tuya que alcanza cuartos.",
  knockout_semi_reached_points: "Las rondas finales pesan mucho: aquí es donde se decide la liga.",
  knockout_final_reached_points: "Por cada finalista que acertaste. El avance que más puntúa.",
  knockout_champion_points:
    "El mayor premio individual. Acertar el campeón puede dar la vuelta a la clasificación.",
  live_round_32_goal_difference_points:
    "En eliminatorias el marcador solo cuenta si acertaste las DOS selecciones del cruce.",
  live_round_32_exact_score_bonus:
    "Solo cuenta si acertaste las dos selecciones del cruce. El avance se premia aparte en 'llega a ronda'.",
  live_round_32_winner_points:
    "0: acertar quién pasa de ronda se premia en 'llega a ronda', no por partido, para no duplicar.",
  live_third_place_winner_points:
    "0 a propósito: el acierto del 3.er puesto ya se premia en 'Tercer puesto'. Aquí solo cuenta el marcador (si acertaste el cruce).",
  live_final_winner_points:
    "0 a propósito: acertar al campeón se paga en 'Campeón del torneo'. En la final solo cuenta el marcador, pero reforzado.",
  live_final_exact_score_bonus:
    "La final es el partido que más puntúa: clavar su marcador da el bonus más alto (si acertaste a los dos finalistas).",
  scorer_max_points: "Tope de puntos que puedes sumar acertando goleadores, por muchos goles que metan.",
};

// Conteos del formato Mundial 2026 (48 selecciones), usados para calcular
// cuantos puntos hay en juego en cada fase y justificar el baremo.
const TOURNAMENT_SHAPE = {
  groupMatches: 72,
  groups: 12,
  positionsPerGroup: 4,
  qualifiedPerGroup: 2,
  bestThirdSlots: 8,
  koMatches: { round_32: 16, round_16: 8, quarter_final: 4, semi_final: 2, third_place: 1, final: 1 },
  koReached: { round_32: 32, round_16: 16, quarter_final: 8, semi_final: 4, final: 2 },
} as const;

export type PointsBreakdown = ReturnType<typeof computePointsBreakdown>;

// Calcula los puntos MAXIMOS disponibles en cada fase a partir de la config.
// Sirve para mostrar el reparto (y por que la porra sigue viva hasta el final).
export function computePointsBreakdown(s: PointSettings) {
  const groupMatch = s.match_sign_points + s.match_goal_difference_points + s.match_exact_score_points;

  const groupPlay = TOURNAMENT_SHAPE.groupMatches * groupMatch;
  const groupClass =
    TOURNAMENT_SHAPE.groups *
    (TOURNAMENT_SHAPE.positionsPerGroup * s.group_exact_position_points +
      s.group_winner_bonus_points +
      TOURNAMENT_SHAPE.qualifiedPerGroup * s.group_qualified_team_points);
  const bestThirds = TOURNAMENT_SHAPE.bestThirdSlots * s.best_third_team_points;
  const group = groupPlay + groupClass + bestThirds;

  const reached =
    TOURNAMENT_SHAPE.koReached.round_32 * s.knockout_round_32_reached_points +
    TOURNAMENT_SHAPE.koReached.round_16 * s.knockout_round_16_reached_points +
    TOURNAMENT_SHAPE.koReached.quarter_final * s.knockout_quarter_reached_points +
    TOURNAMENT_SHAPE.koReached.semi_final * s.knockout_semi_reached_points +
    TOURNAMENT_SHAPE.koReached.final * s.knockout_final_reached_points +
    s.knockout_champion_points +
    s.knockout_runner_up_points +
    s.knockout_third_place_points;

  const liveRound = (sign: number, gd: number, exact: number, winner: number) => sign + gd + exact + winner;
  const live =
    TOURNAMENT_SHAPE.koMatches.round_32 *
      liveRound(s.live_round_32_sign_points, s.live_round_32_goal_difference_points, s.live_round_32_exact_score_bonus, s.live_round_32_winner_points) +
    TOURNAMENT_SHAPE.koMatches.round_16 *
      liveRound(s.live_round_16_sign_points, s.live_round_16_goal_difference_points, s.live_round_16_exact_score_bonus, s.live_round_16_winner_points) +
    TOURNAMENT_SHAPE.koMatches.quarter_final *
      liveRound(s.live_quarter_sign_points, s.live_quarter_goal_difference_points, s.live_quarter_exact_score_bonus, s.live_quarter_winner_points) +
    TOURNAMENT_SHAPE.koMatches.semi_final *
      liveRound(s.live_semi_sign_points, s.live_semi_goal_difference_points, s.live_semi_exact_score_bonus, s.live_semi_winner_points) +
    TOURNAMENT_SHAPE.koMatches.third_place *
      liveRound(s.live_third_place_sign_points, s.live_third_place_goal_difference_points, s.live_third_place_exact_score_bonus, s.live_third_place_winner_points) +
    TOURNAMENT_SHAPE.koMatches.final *
      liveRound(s.live_final_sign_points, s.live_final_goal_difference_points, s.live_final_exact_score_bonus, s.live_final_winner_points);

  const knockout = reached + live;

  const awards =
    s.award_top_scorer_points +
    s.award_best_player_points +
    s.award_best_goalkeeper_points +
    s.award_best_young_player_points +
    s.scorer_max_points;

  const total = group + knockout + awards;
  const pct = (v: number) => Math.round((v / total) * 100);

  return {
    group,
    knockout,
    awards,
    total,
    groupPct: pct(group),
    knockoutPct: pct(knockout),
    awardsPct: pct(awards),
    // Ejemplos concretos para el texto explicativo
    groupMatchPerfect: groupMatch, // un partido de grupo clavado al 100%
    finalistRun:
      s.knockout_round_32_reached_points +
      s.knockout_round_16_reached_points +
      s.knockout_quarter_reached_points +
      s.knockout_semi_reached_points +
      s.knockout_final_reached_points, // avance de un equipo de R32 a la final
    championInGroupMatches: Math.round(s.knockout_champion_points / groupMatch),
  };
}
