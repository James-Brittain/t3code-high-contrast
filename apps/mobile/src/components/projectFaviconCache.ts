const loadedFaviconUrls = new Map<string, string>();

export function hasLoadedProjectFavicon(cacheKey: string | null) {
  return cacheKey !== null && loadedFaviconUrls.has(cacheKey);
}

export function markProjectFaviconLoaded(cacheKey: string | null, faviconUrl: string | null) {
  if (cacheKey && faviconUrl) loadedFaviconUrls.set(cacheKey, faviconUrl);
}

export function markProjectFaviconFailed(cacheKey: string | null, faviconUrl: string | null) {
  if (!cacheKey) return true;

  const loadedUrl = loadedFaviconUrls.get(cacheKey);
  if (loadedUrl !== undefined && loadedUrl !== faviconUrl) return false;

  loadedFaviconUrls.delete(cacheKey);
  return true;
}
