import { describe, expect, it } from "vitest";

import { decodeEntities, formatHeadline, stripHtml } from "../lib/utils";

describe("feed text helpers", () => {
  it("decodes single-encoded entities", () => {
    expect(decodeEntities("L&amp;T Q2 profit up 33%")).toBe("L&T Q2 profit up 33%");
    expect(decodeEntities("R&amp;D spend")).toBe("R&D spend");
  });

  it("decodes double-encoded entities", () => {
    expect(decodeEntities("L&amp;amp;T")).toBe("L&T");
    expect(decodeEntities("&amp;lt;not a tag&amp;gt;")).toBe("<not a tag>");
  });

  it("leaves unknown entities untouched", () => {
    expect(decodeEntities("100&unknown; units")).toBe("100&unknown; units");
  });

  it("strips tags after decoding and collapses whitespace", () => {
    expect(stripHtml("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;")).toBe(
      "Hello & welcome"
    );
    expect(stripHtml("<p>Two   spaces</p>")).toBe("Two spaces");
  });

  it("treats nullish headlines as empty", () => {
    expect(formatHeadline(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
  });
});
