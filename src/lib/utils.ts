import { clsx, type ClassValue } from "clsx";

const SPECIAL_FLAG_IMAGE_URLS: Record<string, string> = {
  "gb-eng":
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40'><rect width='60' height='40' fill='%23fff'/><rect x='24' width='12' height='40' fill='%23c8102e'/><rect y='14' width='60' height='12' fill='%23c8102e'/></svg>",
  "gb-sct":
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40'><rect width='60' height='40' fill='%23005eb8'/><path d='M0 0 24 0 60 24 60 40 36 40 0 16Z' fill='%23fff'/><path d='M60 0 36 0 0 24 0 40 24 40 60 16Z' fill='%23fff'/></svg>",
};

const FALLBACK_FLAG_CODES_BY_SHORT_NAME: Record<string, string> = {
  ENG: "gb-eng",
  SCO: "gb-sct",
};

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

export function generateLeagueCode(name: string) {
  const base = slugCode(name).slice(0, 18) || "PORRA";
  return `${base}-2026`;
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return /^[a-z0-9._-]{3,24}$/.test(value);
}

export function authEmailForUsername(username: string) {
  return `${username}@users.porra.local`;
}

export function footballSign(home: number | null, away: number | null) {
  if (home === null || away === null) return null;
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}

export function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = formData.get(key);
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function nullableNumberFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getTeamFlagImageUrl(
  team?: { flag_code?: string | null; short_name?: string | null } | null,
) {
  const fallbackCode = team?.short_name
    ? FALLBACK_FLAG_CODES_BY_SHORT_NAME[team.short_name.toUpperCase()]
    : null;
  const resolvedCode = team?.flag_code ?? fallbackCode;

  if (!resolvedCode) return null;
  const code = resolvedCode.toLowerCase();
  if (SPECIAL_FLAG_IMAGE_URLS[code]) return SPECIAL_FLAG_IMAGE_URLS[code];

  return `https://flagcdn.com/w40/${code}.png`;
}

export function getDisplayPlayerName(player?: { name?: string | null } | null) {
  const rawName = player?.name?.trim() ?? "";
  return rawName.replace(/^[A-Z]{2,3}\s+(?=[A-ZÁÉÍÓÚÜÑ])/u, "");
}

