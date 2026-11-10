import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  parseMarkdownToAst,
  isSafeUrl,
  escapeRawHtml,
  CommentAstRenderer,
} from "./markdown-ast.js";

describe("Safe Markdown AST Parser & Renderer", () => {
  describe("URL Safety & Protocol Validation", () => {
    it("accepts safe http, https, and mailto schemes", () => {
      expect(isSafeUrl("https://example.com")).toBe(true);
      expect(isSafeUrl("http://localhost:3000/docs")).toBe(true);
      expect(isSafeUrl("mailto:team@sonder.platform")).toBe(true);
    });

    it("rejects dangerous or disallowed schemes (javascript, data, vbscript, file, protocol-relative)", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("JAVASCRIPT:alert(document.cookie)")).toBe(false);
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeUrl("file:///etc/passwd")).toBe(false);
      expect(isSafeUrl("//malicious.site/script.js")).toBe(false);
      expect(isSafeUrl("\\\\malicious.site\\share")).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
      expect(isSafeUrl("")).toBe(false);
    });
  });

  describe("HTML Escaping", () => {
    it("escapes raw angle brackets", () => {
      expect(escapeRawHtml("<script>alert(1)</script>")).toBe(
        "&lt;script&gt;alert(1)&lt;/script&gt;"
      );
      expect(escapeRawHtml("<img src=x onerror=alert(1)>")).toBe(
        "&lt;img src=x onerror=alert(1)&gt;"
      );
    });
  });

  describe("Markdown-to-AST Parsing", () => {
    it("parses headings, paragraphs, lists, and quotes", () => {
      const markdown = [
        "# Heading 1",
        "## Heading 2",
        "### Heading 3",
        "",
        "> Important note",
        "",
        "- Bullet 1",
        "- Bullet 2",
        "",
        "1. First step",
        "2. Second step",
        "",
        "Regular paragraph with **bold** and *italic* text.",
      ].join("\n");

      const ast = parseMarkdownToAst(markdown);

      expect(ast.schemaVersion).toBe(1);
      expect(ast.nodes.length).toBeGreaterThanOrEqual(6);

      const h1 = ast.nodes[0];
      expect(h1?.type).toBe("heading");
      expect(h1?.level).toBe(1);

      const h2 = ast.nodes[1];
      expect(h2?.type).toBe("heading");
      expect(h2?.level).toBe(2);

      const h3 = ast.nodes[2];
      expect(h3?.type).toBe("heading");
      expect(h3?.level).toBe(3);

      const blockquote = ast.nodes.find((n) => n.type === "blockquote");
      expect(blockquote).toBeDefined();

      const unordered = ast.nodes.find((n) => n.type === "unordered_list");
      expect(unordered).toBeDefined();
      expect(unordered?.children?.length).toBe(2);

      const ordered = ast.nodes.find((n) => n.type === "ordered_list");
      expect(ordered).toBeDefined();
      expect(ordered?.children?.length).toBe(2);
    });

    it("parses code blocks and inline code", () => {
      const markdown = "Here is `const x = 1;` inline.\n\n```typescript\nfunction test() {\n  return true;\n}\n```";
      const ast = parseMarkdownToAst(markdown);

      const paragraph = ast.nodes[0];
      expect(paragraph?.type).toBe("paragraph");
      const inlineCode = paragraph?.children?.find((c) => c.type === "code_inline");
      expect(inlineCode).toBeDefined();
      expect(inlineCode?.text).toBe("const x = 1;");

      const codeBlock = ast.nodes[1];
      expect(codeBlock?.type).toBe("code_block");
      expect(codeBlock?.text).toContain("function test()");
    });

    it("parses mentions and task keys", () => {
      const markdown = "Hello @[Jordan Lee](user:018f98a2-3f12-7890-c999-456789abcdef), please check #ENG-101 and #GALA-201.";
      const ast = parseMarkdownToAst(markdown);

      const p = ast.nodes[0];
      const mention = p?.children?.find((c) => c.type === "mention");
      expect(mention).toBeDefined();
      expect(mention?.displayName).toBe("Jordan Lee");
      expect(mention?.userId).toBe("018f98a2-3f12-7890-c999-456789abcdef");

      const taskKeys = p?.children?.filter((c) => c.type === "task_key");
      expect(taskKeys?.length).toBe(2);
      expect(taskKeys?.[0]?.taskKey).toBe("ENG-101");
      expect(taskKeys?.[1]?.taskKey).toBe("GALA-201");
    });

    it("degrades dangerous javascript: link schemes to plain text", () => {
      const markdown = "Check out [Malicious Link](javascript:alert(document.cookie))";
      const ast = parseMarkdownToAst(markdown);

      const p = ast.nodes[0];
      const link = p?.children?.find((c) => c.type === "link");
      expect(link).toBeUndefined(); // Should not become a link node!

      const text = p?.children?.find((c) => c.type === "text");
      expect(text?.text).toContain("[Malicious Link](javascript:alert(document.cookie))");
    });

    it("bounds input text to 20,000 characters", () => {
      const oversized = "a".repeat(25000);
      const ast = parseMarkdownToAst(oversized);
      expect(ast.nodes[0]?.children?.[0]?.text?.length).toBe(20000);
    });
  });

  describe("Safe React AST Rendering & XSS Immunity", () => {
    it("renders safe AST nodes without executing script tags", () => {
      const ast = parseMarkdownToAst(
        "Safe text with `<script>alert(1)</script>` and **bold text**."
      );

      const { container } = render(<CommentAstRenderer ast={ast} />);

      // Script tag must not exist in DOM as an executable script element
      expect(container.querySelector("script")).toBeNull();
      expect(screen.getByText(/alert\(1\)/)).toBeInTheDocument();
      expect(screen.getByText("bold text")).toBeInTheDocument();
    });

    it("renders mentions as styled badge pills", () => {
      const ast = parseMarkdownToAst("Ping @[Alex Morgan](user:018f98a2-user-1)");

      render(<CommentAstRenderer ast={ast} />);

      const mention = screen.getByText("@Alex Morgan");
      expect(mention).toBeInTheDocument();
      expect(mention).toHaveAttribute("data-user-id", "018f98a2-user-1");
    });

    it("renders task keys as interactive buttons calling onTaskKeyClick", async () => {
      const user = userEvent.setup();
      const onTaskKeyClick = vi.fn();
      const ast = parseMarkdownToAst("Related to #ENG-101 blocker.");

      render(<CommentAstRenderer ast={ast} onTaskKeyClick={onTaskKeyClick} />);

      const button = screen.getByRole("button", { name: "#ENG-101" });
      expect(button).toBeInTheDocument();

      await user.click(button);
      expect(onTaskKeyClick).toHaveBeenCalledWith("ENG-101");
    });

    it("renders safe external links with noopener and noreferrer", () => {
      const ast = parseMarkdownToAst("Visit [Official Docs](https://sonder.platform/docs).");

      render(<CommentAstRenderer ast={ast} />);

      const link = screen.getByRole("link", { name: "Official Docs" });
      expect(link).toHaveAttribute("href", "https://sonder.platform/docs");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});
