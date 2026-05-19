import { clsx, type ClassValue } from "clsx";

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
