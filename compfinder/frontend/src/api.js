const rawApiBase = process.env.REACT_APP_API_URL || "";

export const API_BASE = rawApiBase.replace(/\/$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}
