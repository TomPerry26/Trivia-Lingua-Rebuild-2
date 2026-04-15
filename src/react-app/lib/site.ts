const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const SITE_URL = trimTrailingSlash(import.meta.env.VITE_PUBLIC_SITE_URL || "https://www.trivialingua.com");
export const OG_IMAGE_URL = import.meta.env.VITE_OG_IMAGE_URL || `${SITE_URL}/Open-Graph-(Home-1200).jpg`;
