export interface ProjectFaviconRequest {
  readonly cacheKey: string | null;
  readonly faviconUrl: string | null;
}

const currentFaviconRequests = new Map<string, ProjectFaviconRequest>();
const loadedFaviconKeys = new Set<string>();

export function beginProjectFaviconRequest(cacheKey: string | null, faviconUrl: string | null) {
  const currentRequest = cacheKey ? currentFaviconRequests.get(cacheKey) : undefined;
  if (currentRequest?.faviconUrl === faviconUrl) return currentRequest;

  const request = { cacheKey, faviconUrl };
  if (cacheKey && faviconUrl) currentFaviconRequests.set(cacheKey, request);
  return request;
}

export function hasLoadedProjectFavicon(cacheKey: string | null) {
  return cacheKey !== null && loadedFaviconKeys.has(cacheKey);
}

export function markProjectFaviconLoaded(request: ProjectFaviconRequest) {
  if (request.cacheKey && currentFaviconRequests.get(request.cacheKey) !== request) return false;

  if (request.cacheKey) loadedFaviconKeys.add(request.cacheKey);
  return true;
}

export function markProjectFaviconFailed(request: ProjectFaviconRequest) {
  if (request.cacheKey && currentFaviconRequests.get(request.cacheKey) !== request) return false;

  if (request.cacheKey) loadedFaviconKeys.delete(request.cacheKey);
  return true;
}
