import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "../components/markdown/Markdown";

function render(content: string) {
  return renderToStaticMarkup(<Markdown content={content} />);
}

describe("assistant Markdown", () => {
  it("renders bold text instead of showing asterisks", () => {
    const html = render(
      "**Summary** – Oil price moderation is the main trigger."
    );
    expect(html).toContain(">Summary</strong>");
    expect(html).not.toContain("**Summary**");
  });

  it("renders ordered and unordered lists as real lists", () => {
    const ordered = render("1. Oil moderation\n2. Earnings growth");
    expect(ordered).toContain("<ol");
    expect(ordered).toContain(">Oil moderation</li>");
    expect(ordered).toContain(">Earnings growth</li>");

    const unordered = render("- Banks\n- IT services");
    expect(unordered).toContain("<ul");
    expect(unordered).toContain(">Banks</li>");
  });

  it("renders headings, inline code and links safely", () => {
    const html = render(
      "### Key Themes\n\nUse `NIFTY` data from [ET](https://example.com/story)."
    );
    expect(html).toContain("<h3");
    expect(html).toContain("Key Themes");
    expect(html).toContain("<code");
    expect(html).toContain("NIFTY");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("decodes literal HTML entities without showing raw encoding", () => {
    const html = render("Markets&#x20;rallied &amp; breadth improved.");
    expect(html).toContain("Markets rallied");
    expect(html).toContain("breadth improved");
    expect(html).not.toContain("&#x20;");
    expect(html).not.toContain("&amp;amp;");
  });

  it("never injects model-generated HTML", () => {
    const html = render(
      '<script>alert("x")</script><img src=x onerror="alert(1)">\n\nSafe text'
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onerror");
    expect(html).toContain("Safe text");
  });

  it("renders malformed or partial Markdown without crashing", () => {
    expect(() => render("**unclosed heading\n\n1. item without end")).not.toThrow();
    const html = render("**unclosed heading\n\n1. item without end");
    expect(html).toContain("unclosed heading");
    expect(html).toContain("item without end");
  });

  it("keeps single line breaks instead of collapsing them", () => {
    const html = render("First line\nSecond line");
    expect(html).toContain("<br");
    expect(html).toContain("Second line");
  });

  it("keeps plain text unformatted and empty content silent", () => {
    const html = render("Just a plain response with no markup.");
    expect(html).toContain("Just a plain response with no markup.");
    expect(html).not.toContain("<strong>");
    expect(render("")).toBe("");
  });
});
