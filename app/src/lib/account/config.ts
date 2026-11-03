/** Adresse des Backends aus der Build-Konfiguration (`VITE_BACKEND_URL`). Leer heißt: kein Konto möglich. */
export const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const backendAvailable = backendUrl !== '';
