import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a resized (webp) variant URL for locally-served /objects images,
 * leaving other URLs (avatars, static /images, external) untouched.
 * The server resizes on the fly via sharp and caches the result.
 */
export function responsiveImage(url: string | null | undefined, width: number): string {
  if (!url) return "/images/placeholder-bouquet.png";
  if (!url.startsWith("/objects/")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}w=${Math.min(Math.max(Math.round(width), 16), 1600)}`;
}
