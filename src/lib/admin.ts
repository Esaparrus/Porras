import type { LeaguePaymentStatus, Score } from "@/lib/types";

export function formatAdminDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function getMemberScore(score?: Score | null) {
  return {
    total: score?.total_points ?? 0,
    matches: score?.match_points ?? 0,
    scorers: score?.scorer_points ?? 0,
    exact: score?.exact_scores_count ?? 0,
  };
}

export function countPayments(statuses: LeaguePaymentStatus[]) {
  return statuses.reduce(
    (acc, status) => {
      if (status === "paid") acc.paid += 1;
      else acc.pending += 1;
      return acc;
    },
    { paid: 0, pending: 0 },
  );
}
