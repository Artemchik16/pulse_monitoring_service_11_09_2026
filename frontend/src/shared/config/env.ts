/** Backend origin; empty in dev, where Vite proxies /api to Django. */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
