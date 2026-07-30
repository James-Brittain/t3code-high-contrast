export interface ProjectFaviconRequest {
  readonly cacheKey: string | null;
  readonly faviconUrl: string | null;
}

const currentFaviconUrls = new Map<string, string>();
const loadedFaviconKeys = new Set<string>();

export function createProjectFaviconRequest(cacheKey: string | null, faviconUrl: string | null) {
  return { cacheKey, faviconUrl };
}

export function beginProjectFaviconRequest(request: ProjectFaviconRequest) {
  if (request.cacheKey && request.faviconUrl) {
    currentFaviconUrls.set(request.cacheKey, request.faviconUrl);
  }
}

export function hasLoadedProjectFavicon(cacheKey: string | null) {
  return cacheKey !== null && loadedFaviconKeys.has(cacheKey);
}

export function markProjectFaviconLoaded(request: ProjectFaviconRequest) {
  if (
    request.cacheKey &&
    request.faviconUrl &&
    currentFaviconUrls.get(request.cacheKey) !== request.faviconUrl
  ) {
    return false;
  }

  if (request.cacheKey) loadedFaviconKeys.add(request.cacheKey);
  return true;
}

export function markProjectFaviconFailed(request: ProjectFaviconRequest) {
  if (
    request.cacheKey &&
    request.faviconUrl &&
    currentFaviconUrls.get(request.cacheKey) !== request.faviconUrl
  ) {
    return false;
  }

  if (request.cacheKey) loadedFaviconKeys.delete(request.cacheKey);
  return true;
}
