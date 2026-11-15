import React, { useState, useRef, useEffect, useMemo, useId } from "react";
import { ExternalLink, Copy, Check, Globe, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils.js";

/**
 * Protocol validation per SEC-T09.
 * Accepts only safe HTTP/HTTPS schemes.
 * Strictly rejects javascript:, data:, file:, vbscript:, and protocol-relative (//) URLs.
 */
export function isSafeExternalUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("\\\\")) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export type SmartUrlProvider =
  | "github"
  | "figma"
  | "google-docs"
  | "google-sheets"
  | "google-slides"
  | "google-drive"
  | "generic";

export interface ParsedSmartUrl {
  url: string;
  protocol: string;
  host: string;
  provider: SmartUrlProvider;
  providerName: string;
  displayLabel: string;
}

/**
 * Parses and normalizes an external URL into structured metadata.
 * Returns null if the URL is invalid or uses an unsafe scheme per SEC-T09.
 */
export function parseSmartUrl(rawUrl?: string): ParsedSmartUrl | null {
  if (!isSafeExternalUrl(rawUrl)) return null;

  try {
    const parsed = new URL(rawUrl!.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname;

    let provider: SmartUrlProvider = "generic";
    let providerName = host;
    let displayLabel = "";

    // 1. GitHub
    if (host === "github.com" || host.endsWith(".github.com")) {
      provider = "github";
      providerName = "GitHub";

      // Match /owner/repo/pull/123
      const prMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
      // Match /owner/repo/issues/123
      const issueMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
      // Match /owner/repo/commit/abc
      const commitMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/commit\/([0-9a-fA-F]+)/i);
      // Match /owner/repo
      const repoMatch = pathname.match(/^\/([^/]+)\/([^/]+)/);

      if (prMatch && prMatch[1] && prMatch[2] && prMatch[3]) {
        displayLabel = `${prMatch[1]}/${prMatch[2]}#${prMatch[3]}`;
      } else if (issueMatch && issueMatch[1] && issueMatch[2] && issueMatch[3]) {
        displayLabel = `${issueMatch[1]}/${issueMatch[2]}#${issueMatch[3]}`;
      } else if (commitMatch && commitMatch[1] && commitMatch[2] && commitMatch[3]) {
        displayLabel = `${commitMatch[1]}/${commitMatch[2]}@${commitMatch[3].slice(0, 7)}`;
      } else if (repoMatch && repoMatch[1] && repoMatch[2]) {
        displayLabel = `${repoMatch[1]}/${repoMatch[2]}`;
      } else {
        displayLabel = pathname !== "/" ? pathname : host;
      }
    }
    // 2. Figma
    else if (host === "figma.com" || host.endsWith(".figma.com")) {
      provider = "figma";
      providerName = "Figma";

      const figmaMatch = pathname.match(/^\/(?:file|design|proto)\/[^/]+\/([^/?#]+)/i);
      if (figmaMatch && figmaMatch[1]) {
        try {
          displayLabel = decodeURIComponent(figmaMatch[1]).replace(/[-_]+/g, " ");
        } catch {
          displayLabel = figmaMatch[1].replace(/[-_]+/g, " ");
        }
      } else {
        displayLabel = pathname !== "/" ? pathname.replace(/^\//, "") : host;
      }
    }
    // 3. Google Docs / Sheets / Slides / Drive
    else if (host === "docs.google.com" || host === "drive.google.com") {
      if (pathname.includes("/spreadsheets")) {
        provider = "google-sheets";
        providerName = "Google Sheets";
        displayLabel = "Spreadsheet";
      } else if (pathname.includes("/presentation")) {
        provider = "google-slides";
        providerName = "Google Slides";
        displayLabel = "Presentation";
      } else if (host === "drive.google.com") {
        provider = "google-drive";
        providerName = "Google Drive";
        displayLabel = "Drive File";
      } else {
        provider = "google-docs";
        providerName = "Google Docs";
        displayLabel = "Document";
      }

      // Check if document id or edit path exists
      const docIdMatch = pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (docIdMatch && docIdMatch[1]) {
        const idSnippet = docIdMatch[1].slice(0, 8);
        displayLabel = `${displayLabel} (${idSnippet}…)`;
      }
    }
    // 4. Generic domains
    else {
      provider = "generic";
      providerName = host;
      if (pathname && pathname !== "/") {
        const cleanPath = pathname.length > 28 ? pathname.slice(0, 25) + "…" : pathname;
        displayLabel = `${host}${cleanPath}`;
      } else {
        displayLabel = host;
      }
    }

    return {
      url: parsed.href,
      protocol: parsed.protocol,
      host,
      provider,
      providerName,
      displayLabel,
    };
  } catch {
    return null;
  }
}

/**
 * Clean, lightweight, vector-crisp brand icons rendered locally.
 * Zero external network requests to third-party favicon APIs to guarantee user privacy.
 */
export function ProviderIcon({
  provider,
  className = "w-3.5 h-3.5",
}: {
  provider: SmartUrlProvider;
  className?: string;
}): React.JSX.Element {
  switch (provider) {
    case "github":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={cn("shrink-0", className)}
          aria-hidden="true"
          data-testid="provider-icon-github"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
      );

    case "figma":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={cn("shrink-0", className)}
          aria-hidden="true"
          data-testid="provider-icon-figma"
        >
          <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4z" fill="#0ACF83" />
          <path d="M4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4z" fill="#A259FF" />
          <path d="M4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4z" fill="#F24E1E" />
          <path d="M12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0z" fill="#FF7262" />
          <path d="M20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" fill="#1ABCFE" />
        </svg>
      );

    case "google-docs":
    case "google-sheets":
    case "google-slides":
    case "google-drive":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={cn("shrink-0", className)}
          aria-hidden="true"
          data-testid="provider-icon-google"
        >
          <path
            d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
            fill={provider === "google-sheets" ? "#0F9D58" : provider === "google-slides" ? "#F4B400" : "#4285F4"}
          />
        </svg>
      );

    case "generic":
    default:
      return (
        <Globe
          className={cn("shrink-0 text-[var(--text-muted)]", className)}
          aria-hidden="true"
          data-testid="provider-icon-generic"
        />
      );
  }
}

export interface SmartUrlChipProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The target URL to parse, validate, and display */
  url: string;
  /** Optional custom title/label override */
  title?: string;
  /** Optional provider override */
  provider?: string;
  /** Whether to render inline for prose/markdown flow or as a standalone chip */
  inline?: boolean;
  /** Whether to render the quick copy-to-clipboard button */
  showCopyButton?: boolean;
  /** Chip size density */
  size?: "sm" | "md";
  /** Optional children override */
  children?: React.ReactNode;
}

/**
 * Smart URL Chip Component (FEAT-K01).
 * Safe, domain-aware external link chip adhering to SEC-T09 protocol validation.
 * Extracts clean domain badges (GitHub, Figma, Google Docs), provides path truncation,
 * copy-to-clipboard, accessibility announcements, and zero third-party privacy leakage.
 */
export function SmartUrlChip({
  url,
  title,
  provider: providerOverride,
  inline = false,
  showCopyButton = true,
  size = "md",
  children,
  className,
  ...rest
}: SmartUrlChipProps): React.JSX.Element {
  const describedById = useId();
  const parsed = useMemo(() => parseSmartUrl(url), [url]);

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Safe fallback: gracefully handle clipboard rejection
    }
  };

  // 1. SEC-T09 Fallback: Unsafe or malformed URL
  if (!parsed) {
    return (
      <span
        data-testid="smart-url-chip-invalid"
        role="status"
        title="Invalid or blocked URL"
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono",
          "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
          className
        )}
      >
        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[200px]">{url || "Invalid URL"}</span>
        <span className="sr-only">(blocked unsafe URL)</span>
      </span>
    );
  }

  const activeProvider = providerOverride || parsed.providerName;
  const displayText = children || title || parsed.displayLabel;

  // 2. Inline Presentation (Inside prose, comments, or descriptions)
  if (inline) {
    return (
      <span
        data-testid="smart-url-chip"
        className={cn(
          "inline-flex items-center align-middle gap-1 mx-0.5 max-w-full",
          className
        )}
      >
        <a
          href={parsed.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby={describedById}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
            "bg-[var(--surface-muted)] hover:bg-[var(--surface-card)] text-[var(--brand-accent-text)]",
            "border border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
            "max-w-full truncate"
          )}
        >
          <ProviderIcon provider={parsed.provider} className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[240px]">{displayText}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" aria-hidden="true" />
        </a>

        <span id={describedById} className="sr-only">
          (opens in new tab)
        </span>

        {showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied URL to clipboard" : `Copy link for ${parsed.host}`}
            data-testid="smart-url-copy-btn"
            title={copied ? "Copied!" : "Copy link"}
            className={cn(
              "p-0.5 rounded shrink-0 transition-colors cursor-pointer",
              "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              copied && "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3 h-3" aria-hidden="true" />
            )}
            <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </span>
    );
  }

  // 3. Standalone Chip Presentation (Task Peek Drawer, external links trays)
  return (
    <div
      data-testid="smart-url-chip"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-medium",
        "bg-[var(--surface-muted)] hover:bg-[var(--surface-card)]",
        "border border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
        "transition-all duration-150 shadow-xs group max-w-full select-none",
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        className
      )}
      {...rest}
    >
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={describedById}
        className="flex items-center gap-2 min-w-0 flex-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded"
      >
        <span className="flex items-center gap-1.5 shrink-0">
          <ProviderIcon
            provider={parsed.provider}
            className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"}
          />
          <span className="font-semibold text-[var(--text-secondary)]">
            {activeProvider}
          </span>
        </span>

        <span className="text-[var(--border-strong)] shrink-0" aria-hidden="true">
          •
        </span>

        <span
          className="truncate text-[var(--text-primary)] font-normal max-w-[280px]"
          title={parsed.url}
        >
          {displayText}
        </span>

        <ExternalLink
          className={cn(
            "shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors",
            size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"
          )}
          aria-hidden="true"
        />
      </a>

      <span id={describedById} className="sr-only">
        (opens in new tab)
      </span>

      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied URL to clipboard" : `Copy link for ${parsed.host}`}
          data-testid="smart-url-copy-btn"
          title={copied ? "Copied!" : "Copy link"}
          className={cn(
            "p-1 rounded shrink-0 transition-colors cursor-pointer",
            "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
            copied && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
        </button>
      )}
    </div>
  );
}
