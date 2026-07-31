import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  isCurrentPath,
  normalizeBasePath,
  sitePath,
} from "../../src/lib/urls";

const BASE = "/profile/";
const SITE = "https://bongo-seakhoa.github.io/profile/";

describe("base-aware portfolio URLs", () => {
  it("normalizes a GitHub Pages project base", () => {
    expect(normalizeBasePath("profile")).toBe(BASE);
    expect(normalizeBasePath("/profile")).toBe(BASE);
    expect(normalizeBasePath("/profile/")).toBe(BASE);
  });

  it("resolves root, route, asset and already-prefixed paths once", () => {
    expect(sitePath("", BASE)).toBe(BASE);
    expect(sitePath("/", BASE)).toBe(BASE);
    expect(sitePath("work/", BASE)).toBe("/profile/work/");
    expect(sitePath("/profile/work/", BASE)).toBe("/profile/work/");
    expect(sitePath("assets/site.css", BASE)).toBe("/profile/assets/site.css");
  });

  it("preserves query strings, fragments and external links", () => {
    expect(sitePath("?view=static", BASE)).toBe("/profile/?view=static");
    expect(sitePath("work/?tag=data#results", BASE)).toBe(
      "/profile/work/?tag=data#results",
    );
    expect(sitePath("#evidence", BASE)).toBe("#evidence");
    expect(sitePath("mailto:bongokosa@gmail.com", BASE)).toBe(
      "mailto:bongokosa@gmail.com",
    );
    expect(sitePath("https://example.com", BASE)).toBe("https://example.com");
  });

  it("creates canonical production URLs from base-relative paths", () => {
    expect(absoluteUrl("", SITE, BASE)).toBe(SITE);
    expect(absoluteUrl("work/", SITE, BASE)).toBe(`${SITE}work/`);
    expect(absoluteUrl("/profile/about/", SITE, BASE)).toBe(`${SITE}about/`);
  });

  it("marks both an index and its detail routes as current", () => {
    expect(isCurrentPath("/profile/work/", "work/", BASE)).toBe(true);
    expect(
      isCurrentPath(
        "/profile/work/metapos-app-data-management/",
        "work/",
        BASE,
      ),
    ).toBe(true);
    expect(isCurrentPath("/profile/about/", "work/", BASE)).toBe(false);
    expect(isCurrentPath("/profile/about/", "", BASE)).toBe(false);
  });
});
