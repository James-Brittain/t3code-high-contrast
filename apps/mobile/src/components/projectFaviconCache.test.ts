import { describe, expect, it } from "vite-plus/test";

import {
  hasLoadedProjectFavicon,
  markProjectFaviconFailed,
  markProjectFaviconLoaded,
} from "./projectFaviconCache";

describe("project favicon cache", () => {
  it("ignores an old URL error after a refreshed URL loads", () => {
    const cacheKey = "environment-1:/workspace:v1-favicon.svg";
    const expiredUrl = "https://environment.example/api/assets/expired/v1-favicon.svg";
    const refreshedUrl = "https://environment.example/api/assets/refreshed/v1-favicon.svg";

    markProjectFaviconLoaded(cacheKey, expiredUrl);
    markProjectFaviconLoaded(cacheKey, refreshedUrl);

    expect(markProjectFaviconFailed(cacheKey, expiredUrl)).toBe(false);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(true);
  });

  it("evicts the URL that actually failed", () => {
    const cacheKey = "environment-1:/workspace:v2-favicon.svg";
    const faviconUrl = "https://environment.example/api/assets/current/v2-favicon.svg";

    markProjectFaviconLoaded(cacheKey, faviconUrl);

    expect(markProjectFaviconFailed(cacheKey, faviconUrl)).toBe(true);
    expect(hasLoadedProjectFavicon(cacheKey)).toBe(false);
  });
});
