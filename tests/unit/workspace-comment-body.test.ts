import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceCommentBody } from "../../apps/web/src/workspace-comment-body.js";

describe("workspace comment rendering", () => {
  it("renders HTML-like content as escaped plain text while preserving multiline styling", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkspaceCommentBody, {
        body: "<script>alert('nope')</script>\nReview this line.",
      }),
    );

    expect(markup).toContain("&lt;script&gt;alert(&#x27;nope&#x27;)&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
    expect(markup).toContain("whitespace-pre-wrap");
  });
});
