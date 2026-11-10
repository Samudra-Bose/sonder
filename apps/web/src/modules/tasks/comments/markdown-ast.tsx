import React from "react";
import type { CommentMarkdownAst, CommentMarkdownNode } from "./types.js";

/**
 * Supported safe URL protocols.
 * javascript:, data:, vbscript:, file:, and protocol-relative (//) URLs are strictly forbidden.
 */
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * Validates that a URL uses a safe protocol and is not protocol-relative or script-injected.
 */
export function isSafeUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("\\\\")) return false;

  try {
    const parsed = new URL(trimmed, "https://safe.local");
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Strips or escapes raw HTML angle brackets to prevent any HTML injection.
 */
export function escapeRawHtml(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Canonical UUID pattern (RFC 4122 / RFC 9562): 8-4-4-4-12 hexadecimal characters
 */
export const CANONICAL_UUID_PATTERN =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

/**
 * Regex for mention token: @[Display Name](user:uuid)
 * Strictly requires a canonical 36-char hyphenated UUID to satisfy the canonical OpenAPI schema
 * and prevent arbitrary string or malicious protocol injection into mention nodes.
 */
const MENTION_REGEX =
  /^@\[([^\]]+)\]\(user:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/;

/**
 * Regex for task key token: #PREFIX-123
 */
const TASK_KEY_REGEX = /^#([A-Z0-9]+-[0-9]+)\b/;

/**
 * Regex for Markdown link: [label](url)
 */
const LINK_REGEX = /^\[([^\]]+)\]\(([^)]+)\)/;

/**
 * Regex for inline code: `code`
 */
const INLINE_CODE_REGEX = /^`([^`]+)`/;

/**
 * Regex for bold: **text** or __text__
 */
const BOLD_REGEX = /^(\*\*|__)(.*?)\1/;

/**
 * Regex for italic: *text* or _text_
 */
const ITALIC_REGEX = /^(\*|_)(.*?)\1/;

/**
 * Regex for strikethrough: ~~text~~
 */
const STRIKE_REGEX = /^~~(.*?)~~/;

/**
 * Parses inline string content into an array of CommentMarkdownNode.
 * Recursively parses formatting within inline containers.
 */
export function parseInlineNodes(input: string): CommentMarkdownNode[] {
  const nodes: CommentMarkdownNode[] = [];
  let remaining = input;

  while (remaining.length > 0) {
    // 1. Mentions: @[Label](user:<uuid>)
    const mentionMatch = remaining.match(MENTION_REGEX);
    if (mentionMatch && mentionMatch[1] && mentionMatch[2]) {
      nodes.push({
        type: "mention",
        displayName: mentionMatch[1],
        userId: mentionMatch[2],
      });
      remaining = remaining.slice(mentionMatch[0].length);
      continue;
    }

    // 2. Task Key: #KEY-123
    const taskKeyMatch = remaining.match(TASK_KEY_REGEX);
    if (taskKeyMatch && taskKeyMatch[1]) {
      nodes.push({
        type: "task_key",
        taskKey: taskKeyMatch[1],
      });
      remaining = remaining.slice(taskKeyMatch[0].length);
      continue;
    }

    // 3. Links: [Label](url)
    const linkMatch = remaining.match(LINK_REGEX);
    if (linkMatch && linkMatch[1] && linkMatch[2]) {
      const label = linkMatch[1];
      const rawHref = linkMatch[2].trim();
      if (isSafeUrl(rawHref)) {
        nodes.push({
          type: "link",
          href: rawHref,
          children: parseInlineNodes(label),
        });
      } else {
        // Degrade unsafe link scheme to plain text
        nodes.push({
          type: "text",
          text: `[${label}](${rawHref})`,
        });
      }
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 4. Inline Code: `code`
    const codeMatch = remaining.match(INLINE_CODE_REGEX);
    if (codeMatch && codeMatch[1]) {
      nodes.push({
        type: "code_inline",
        text: codeMatch[1],
      });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 5. Bold: **text**
    const boldMatch = remaining.match(BOLD_REGEX);
    if (boldMatch && boldMatch[2]) {
      nodes.push({
        type: "strong",
        children: parseInlineNodes(boldMatch[2]),
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 6. Italic: *text*
    const italicMatch = remaining.match(ITALIC_REGEX);
    if (italicMatch && italicMatch[2]) {
      nodes.push({
        type: "emphasis",
        children: parseInlineNodes(italicMatch[2]),
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 7. Strikethrough: ~~text~~
    const strikeMatch = remaining.match(STRIKE_REGEX);
    if (strikeMatch && strikeMatch[1]) {
      nodes.push({
        type: "strikethrough",
        children: parseInlineNodes(strikeMatch[1]),
      });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 8. Plain Text - Consume until next special token character (@, #, [, `, *, _, ~, <)
    const nextSpecialIndex = remaining.search(/[@#\[`*_~<]/);
    if (nextSpecialIndex === -1) {
      nodes.push({ type: "text", text: remaining });
      break;
    } else if (nextSpecialIndex > 0) {
      nodes.push({ type: "text", text: remaining.slice(0, nextSpecialIndex) });
      remaining = remaining.slice(nextSpecialIndex);
    } else {
      // Special character at index 0 didn't match any syntax rule -> consume as literal character
      const firstChar = remaining[0];
      if (firstChar) {
        nodes.push({ type: "text", text: firstChar });
        remaining = remaining.slice(1);
      } else {
        break;
      }
    }
  }

  // Merge consecutive text nodes
  const merged: CommentMarkdownNode[] = [];
  for (const node of nodes) {
    const lastNode = merged.length > 0 ? merged[merged.length - 1] : undefined;
    if (node.type === "text" && lastNode && lastNode.type === "text") {
      lastNode.text = (lastNode.text ?? "") + (node.text ?? "");
    } else {
      merged.push(node);
    }
  }

  return merged;
}

/**
 * Parses raw Markdown source into the canonical closed CommentMarkdownAst structure.
 * Rejects unsafe constructs, limits length to 20,000 characters, and avoids raw HTML execution.
 */
export function parseMarkdownToAst(source: string): CommentMarkdownAst {
  if (!source || typeof source !== "string") {
    return { schemaVersion: 1, nodes: [] };
  }

  // Enforce 20,000 char maximum boundary
  const boundedSource = source.slice(0, 20000).replace(/\r\n/g, "\n");
  const lines = boundedSource.split("\n");
  const nodes: CommentMarkdownNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // 1. Fenced Code Block: ```...```
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine === undefined || nextLine.trim().startsWith("```")) {
          break;
        }
        codeLines.push(nextLine);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      nodes.push({
        type: "code_block",
        text: codeLines.join("\n"),
      });
      continue;
    }

    // 2. Headings: #, ##, ### (levels 1-3 only)
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      nodes.push({
        type: "heading",
        level,
        children: parseInlineNodes(content),
      });
      i++;
      continue;
    }

    // 3. Blockquotes: > quote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const quoteLine = lines[i];
        if (quoteLine === undefined || !quoteLine.startsWith(">")) break;
        quoteLines.push(quoteLine.replace(/^>\s?/, ""));
        i++;
      }
      nodes.push({
        type: "blockquote",
        children: parseInlineNodes(quoteLines.join(" ")),
      });
      continue;
    }

    // 4. Unordered List: - or *
    if (line.match(/^[-*]\s+/)) {
      const items: CommentMarkdownNode[] = [];
      while (i < lines.length) {
        const listLine = lines[i];
        if (listLine === undefined || !listLine.match(/^[-*]\s+/)) break;
        const itemContent = listLine.replace(/^[-*]\s+/, "");
        items.push({
          type: "list_item",
          children: parseInlineNodes(itemContent),
        });
        i++;
      }
      nodes.push({
        type: "unordered_list",
        children: items,
      });
      continue;
    }

    // 5. Ordered List: 1. 2. 3.
    if (line.match(/^\d+\.\s+/)) {
      const items: CommentMarkdownNode[] = [];
      while (i < lines.length) {
        const orderedLine = lines[i];
        if (orderedLine === undefined || !orderedLine.match(/^\d+\.\s+/)) break;
        const itemContent = orderedLine.replace(/^\d+\.\s+/, "");
        items.push({
          type: "list_item",
          children: parseInlineNodes(itemContent),
        });
        i++;
      }
      nodes.push({
        type: "ordered_list",
        children: items,
      });
      continue;
    }

    // 6. Regular Paragraph (gather lines until blank line or special block)
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const pLine = lines[i];
      if (
        pLine === undefined ||
        !pLine.trim() ||
        pLine.trim().startsWith("```") ||
        pLine.match(/^#{1,3}\s+/) ||
        pLine.startsWith(">") ||
        pLine.match(/^[-*]\s+/) ||
        pLine.match(/^\d+\.\s+/)
      ) {
        break;
      }
      paragraphLines.push(pLine);
      i++;
    }
    nodes.push({
      type: "paragraph",
      children: parseInlineNodes(paragraphLines.join(" ")),
    });
  }

  return {
    schemaVersion: 1,
    nodes: nodes.slice(0, 2000), // Maximum 2,000 nodes
  };
}

export interface CommentAstRendererProps {
  ast?: CommentMarkdownAst | null;
  onTaskKeyClick?: (taskKey: string) => void;
  className?: string;
}

/**
 * Safely renders a CommentMarkdownAst structure strictly using standard React JSX elements.
 * Never uses dangerouslySetInnerHTML or accepts raw HTML.
 */
export function CommentAstRenderer({
  ast,
  onTaskKeyClick,
  className,
}: CommentAstRendererProps): React.JSX.Element {
  if (!ast || !ast.nodes || ast.nodes.length === 0) {
    return <span className="text-xs text-[var(--text-muted)] italic">No content</span>;
  }

  const renderNode = (node: CommentMarkdownNode, key: number | string): React.ReactNode => {
    switch (node.type) {
      case "text":
        return <React.Fragment key={key}>{node.text}</React.Fragment>;

      case "paragraph":
        return (
          <p key={key} className="my-1.5 leading-relaxed text-xs sm:text-sm text-[var(--text-primary)]">
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </p>
        );

      case "heading": {
        const children = node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`));
        if (node.level === 1) {
          return (
            <h3 key={key} className="text-base font-bold text-[var(--text-primary)] mt-3 mb-1">
              {children}
            </h3>
          );
        }
        if (node.level === 2) {
          return (
            <h4 key={key} className="text-sm font-semibold text-[var(--text-primary)] mt-2.5 mb-1">
              {children}
            </h4>
          );
        }
        return (
          <h5 key={key} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mt-2 mb-1">
            {children}
          </h5>
        );
      }

      case "blockquote":
        return (
          <blockquote
            key={key}
            className="border-l-2 border-[var(--border-strong)] pl-3 my-2 text-xs italic text-[var(--text-secondary)] bg-[var(--surface-muted)]/20 py-1 rounded-r"
          >
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </blockquote>
        );

      case "unordered_list":
        return (
          <ul key={key} className="list-disc pl-5 my-1.5 space-y-1 text-xs sm:text-sm text-[var(--text-primary)]">
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </ul>
        );

      case "ordered_list":
        return (
          <ol key={key} className="list-decimal pl-5 my-1.5 space-y-1 text-xs sm:text-sm text-[var(--text-primary)]">
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </ol>
        );

      case "list_item":
        return (
          <li key={key}>
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </li>
        );

      case "strong":
        return (
          <strong key={key} className="font-semibold text-[var(--text-primary)]">
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </strong>
        );

      case "emphasis":
        return (
          <em key={key} className="italic text-[var(--text-primary)]">
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </em>
        );

      case "strikethrough":
        return (
          <del key={key} className="line-through opacity-70">
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </del>
        );

      case "code_inline":
        return (
          <code
            key={key}
            className="font-mono text-[11px] px-1 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--brand-accent-text)] border border-[var(--border-subtle)]"
          >
            {node.text}
          </code>
        );

      case "code_block":
        return (
          <pre
            key={key}
            className="font-mono text-xs p-3 rounded-lg bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)] overflow-x-auto my-2"
          >
            <code>{node.text}</code>
          </pre>
        );

      case "link": {
        const safe = isSafeUrl(node.href);
        if (!safe || !node.href) {
          return (
            <span key={key} className="underline text-[var(--text-muted)]">
              {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
            </span>
          );
        }
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-accent-text)] hover:underline font-medium inline-flex items-center gap-0.5"
          >
            {node.children?.map((child, idx) => renderNode(child, `${key}-${idx}`))}
          </a>
        );
      }

      case "mention":
        return (
          <span
            key={key}
            data-user-id={node.userId}
            className="inline-flex items-center px-1.5 py-0.2 rounded-md text-xs font-semibold bg-[var(--brand-accent-subtle)] text-[var(--brand-accent-text)] border border-[var(--brand-accent-border)] select-none mx-0.5"
          >
            @{node.displayName || "user"}
          </span>
        );

      case "task_key":
        return (
          <button
            key={key}
            type="button"
            data-testid={`task-key-link-${node.taskKey}`}
            onClick={(e) => {
              e.stopPropagation();
              if (node.taskKey && onTaskKeyClick) {
                onTaskKeyClick(node.taskKey);
              }
            }}
            className="inline-flex items-center font-mono text-xs font-bold text-[var(--brand-accent-text)] hover:underline hover:bg-[var(--brand-accent-subtle)] px-1 py-0.2 rounded cursor-pointer transition-colors"
          >
            #{node.taskKey}
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className} data-testid="comment-ast-content">
      {ast.nodes.map((node, idx) => renderNode(node, idx))}
    </div>
  );
}
