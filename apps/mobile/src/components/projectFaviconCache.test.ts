import { describe, expect, it } from "vite-plus/test";

import {
  beginProjectFaviconRequest,
  hasLoadedProjectFavicon,
  markProjectFaviconFailed,
  markProjectFaviconLoaded,
} from "./projectFaviconCache";

describe("project favicon cache", () => {
  it("ignores callbacks from a superseded URL", () => {
    const cacheKey = "environment-1:/workspace:v1-favicon.svg";
    const expiredUrl = "https://environment.example/api/assets/expired/v1-favicon.svg";
    const refreshedUrl = "https://environment.example/api/assets/refreshed/v1-favicon.svg";

    const expiredRequest = beginProjectFaviconRequest(cacheKey, expiredUrl);
    markProjectFaviconLoaded(expiredRequest);
    const refreshedRequest = beginProjectFaviconRequest(cacheKey, refreshedUrl);

    expect(markProjectFaviconLoaded(expiredRequest)).toBe(false);
    expect(markProjectFaviconFailed(expiredRequest)).toBe(false);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(true);
    expect(markProjectFaviconFailed(refreshedRequest)).toBe(true);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(false);
  });

  it("evicts the URL that actually failed", () => {
    const cacheKey = "environment-1:/workspace:v2-favicon.svg";
    const faviconUrl = "https://environment.example/api/assets/current/v2-favicon.svg";
    const request = beginProjectFaviconRequest(cacheKey, faviconUrl);

    markProjectFaviconLoaded(request);

    expect(markProjectFaviconFailed(request)).toBe(true);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(false);
  });
});
