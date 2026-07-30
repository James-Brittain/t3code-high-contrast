import { describe, expect, it } from "vite-plus/test";

import {
  beginProjectFaviconRequest,
  createProjectFaviconRequest,
  hasLoadedProjectFavicon,
  markProjectFaviconFailed,
  markProjectFaviconLoaded,
} from "./projectFaviconCache";

describe("project favicon cache", () => {
  it("ignores callbacks from a superseded URL", () => {
    const cacheKey = "environment-1:/workspace:v1-favicon.svg";
    const expiredUrl = "https://environment.example/api/assets/expired/v1-favicon.svg";
    const refreshedUrl = "https://environment.example/api/assets/refreshed/v1-favicon.svg";

    const expiredRequest = createProjectFaviconRequest(cacheKey, expiredUrl);
    beginProjectFaviconRequest(expiredRequest);
    markProjectFaviconLoaded(expiredRequest);
    const refreshedRequest = createProjectFaviconRequest(cacheKey, refreshedUrl);
    beginProjectFaviconRequest(refreshedRequest);

    expect(markProjectFaviconLoaded(expiredRequest)).toBe(false);
    expect(markProjectFaviconFailed(expiredRequest)).toBe(false);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(true);
    expect(markProjectFaviconFailed(refreshedRequest)).toBe(true);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(false);
  });

  it("evicts the URL that actually failed", () => {
    const cacheKey = "environment-1:/workspace:v2-favicon.svg";
    const faviconUrl = "https://environment.example/api/assets/current/v2-favicon.svg";
    const request = createProjectFaviconRequest(cacheKey, faviconUrl);
    beginProjectFaviconRequest(request);

    markProjectFaviconLoaded(request);

    expect(markProjectFaviconFailed(request)).toBe(true);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(false);
  });

  it("does not supersede a request until the next request begins", () => {
    const cacheKey = "environment-1:/workspace:v3-favicon.svg";
    const committedUrl = "https://environment.example/api/assets/current/v3-favicon.svg";
    const abandonedUrl = "https://environment.example/api/assets/abandoned/v3-favicon.svg";
    const committedRequest = createProjectFaviconRequest(cacheKey, committedUrl);
    beginProjectFaviconRequest(committedRequest);

    createProjectFaviconRequest(cacheKey, abandonedUrl);

    expect(markProjectFaviconLoaded(committedRequest)).toBe(true);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(true);
  });
});
