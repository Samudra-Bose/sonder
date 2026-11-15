import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  SmartUrlChip,
  isSafeExternalUrl,
  parseSmartUrl,
} from "./SmartUrlChip.js";

describe("SmartUrlChip (FEAT-K01 & SEC-T09)", () => {
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.useFakeTimers();
    mockWriteText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("1. Safe URL Protocol Validation (SEC-T09)", () => {
    it("accepts valid https and http URLs", () => {
      expect(isSafeExternalUrl("https://github.com")).toBe(true);
      expect(isSafeExternalUrl("http://localhost:3000")).toBe(true);
      expect(isSafeExternalUrl("https://figma.com/file/123/design")).toBe(true);
    });

    it("strictly rejects dangerous schemes: javascript, data, file, vbscript", () => {
      expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeExternalUrl("javascript:void(0)")).toBe(false);
      expect(isSafeExternalUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
      expect(isSafeExternalUrl("vbscript:msgbox(1)")).toBe(false);
    });

    it("strictly rejects protocol-relative URLs (// and \\\\)", () => {
      expect(isSafeExternalUrl("//evil.com")).toBe(false);
      expect(isSafeExternalUrl("//malicious.site/phish")).toBe(false);
      expect(isSafeExternalUrl("\\\\evil.com\\share")).toBe(false);
    });

    it("rejects malformed or empty URLs", () => {
      expect(isSafeExternalUrl("")).toBe(false);
      expect(isSafeExternalUrl("not-a-url")).toBe(false);
      expect(isSafeExternalUrl(undefined)).toBe(false);
    });
  });

  describe("2. Domain & Provider Recognition (GitHub, Figma, Google Docs, Generic)", () => {
    it("recognizes and formats GitHub Pull Request URLs", () => {
      const url = "https://github.com/sonder-app/platform/pull/42";
      const parsed = parseSmartUrl(url);

      expect(parsed).toEqual(
        expect.objectContaining({
          host: "github.com",
          provider: "github",
          providerName: "GitHub",
          displayLabel: "sonder-app/platform#42",
        })
      );

      render(<SmartUrlChip url={url} />);

      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByText("sonder-app/platform#42")).toBeInTheDocument();
      expect(screen.getByTestId("provider-icon-github")).toBeInTheDocument();

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("recognizes and formats GitHub Issue URLs", () => {
      const url = "https://github.com/sonder-app/platform/issues/105";
      render(<SmartUrlChip url={url} />);

      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByText("sonder-app/platform#105")).toBeInTheDocument();
    });

    it("recognizes and formats GitHub Commit URLs", () => {
      const url = "https://github.com/sonder-app/platform/commit/d2a3f81e6a4b123";
      render(<SmartUrlChip url={url} />);

      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByText("sonder-app/platform@d2a3f81")).toBeInTheDocument();
    });

    it("recognizes and formats Figma file/design URLs", () => {
      const url = "https://figma.com/design/abc12345/Design-System-2026";
      const parsed = parseSmartUrl(url);

      expect(parsed).toEqual(
        expect.objectContaining({
          host: "figma.com",
          provider: "figma",
          providerName: "Figma",
          displayLabel: "Design System 2026",
        })
      );

      render(<SmartUrlChip url={url} />);

      expect(screen.getByText("Figma")).toBeInTheDocument();
      expect(screen.getByText("Design System 2026")).toBeInTheDocument();
      expect(screen.getByTestId("provider-icon-figma")).toBeInTheDocument();
    });

    it("recognizes and formats Google Docs, Sheets, Slides, and Drive URLs", () => {
      const docUrl = "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit";
      const sheetUrl = "https://docs.google.com/spreadsheets/d/1234567890abcdef/edit";
      const slideUrl = "https://docs.google.com/presentation/d/9876543210fedcba/edit";
      const driveUrl = "https://drive.google.com/file/d/555666777888/view";

      const { rerender } = render(<SmartUrlChip url={docUrl} />);
      expect(screen.getByText("Google Docs")).toBeInTheDocument();
      expect(screen.getByText(/Document/)).toBeInTheDocument();
      expect(screen.getByTestId("provider-icon-google")).toBeInTheDocument();

      rerender(<SmartUrlChip url={sheetUrl} />);
      expect(screen.getByText("Google Sheets")).toBeInTheDocument();
      expect(screen.getByText(/Spreadsheet/)).toBeInTheDocument();

      rerender(<SmartUrlChip url={slideUrl} />);
      expect(screen.getByText("Google Slides")).toBeInTheDocument();
      expect(screen.getByText(/Presentation/)).toBeInTheDocument();

      rerender(<SmartUrlChip url={driveUrl} />);
      expect(screen.getByText("Google Drive")).toBeInTheDocument();
      expect(screen.getByText(/Drive File/)).toBeInTheDocument();
    });

    it("recognizes and formats generic web URLs with hostname badge and Globe icon", () => {
      const url = "https://linear.app/sonder/issue/ENG-42";
      render(<SmartUrlChip url={url} />);

      expect(screen.getByText("linear.app")).toBeInTheDocument();
      expect(screen.getByTestId("provider-icon-generic")).toBeInTheDocument();
    });
  });

  describe("3. Security Enforcement & Unsafe URL Graceful Degradation", () => {
    it("renders non-link safe fallback when encountering javascript: URL (zero executable DOM handlers)", () => {
      const unsafeUrl = "javascript:alert(document.cookie)";
      render(<SmartUrlChip url={unsafeUrl} />);

      // Must not render an <a> tag
      expect(screen.queryByRole("link")).not.toBeInTheDocument();

      // Must render status warning
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("data-testid", "smart-url-chip-invalid");
      expect(screen.getByText("(blocked unsafe URL)")).toBeInTheDocument();
      expect(screen.getByText(unsafeUrl)).toBeInTheDocument();
    });

    it("renders non-link safe fallback for protocol-relative URL", () => {
      const url = "//evil.com/exploit";
      render(<SmartUrlChip url={url} />);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders non-link safe fallback for malformed string without crashing", () => {
      render(<SmartUrlChip url="not-a-valid-url-at-all" />);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("4. External Link Attributes & Accessibility (WCAG 2.1/2.2 AA)", () => {
    it("renders external link with target=_blank, rel=noopener noreferrer, and accessible description", () => {
      const url = "https://github.com/facebook/react";
      render(<SmartUrlChip url={url} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(screen.getByText("(opens in new tab)")).toBeInTheDocument();
    });

    it("is keyboard navigable with visible focus support", () => {
      const url = "https://github.com/facebook/react";
      render(<SmartUrlChip url={url} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("focus-visible:ring-2");

      const copyBtn = screen.getByTestId("smart-url-copy-btn");
      expect(copyBtn).toHaveClass("focus-visible:ring-2");
    });
  });

  describe("5. Copy-to-Clipboard Action & Feedback", () => {
    it("copies exact URL to clipboard and provides visual & screen reader feedback", async () => {
      const url = "https://github.com/sonder-app/platform/pull/42";

      render(<SmartUrlChip url={url} />);

      const copyBtn = screen.getByTestId("smart-url-copy-btn");
      expect(copyBtn).toHaveAttribute("aria-label", "Copy link for github.com");

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(mockWriteText).toHaveBeenCalledWith(url);
      expect(copyBtn).toHaveAttribute("title", "Copied!");
      expect(copyBtn).toHaveAttribute("aria-label", "Copied URL to clipboard");
      expect(screen.getByText("Copied")).toBeInTheDocument();

      // Fast-forward 2 seconds to verify auto-reset
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(copyBtn).toHaveAttribute("title", "Copy link");
      expect(copyBtn).toHaveAttribute("aria-label", "Copy link for github.com");
    });

    it("handles clipboard write failure gracefully without unhandled exceptions", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Permission denied"));

      const url = "https://github.com/sonder-app/platform/pull/42";
      render(<SmartUrlChip url={url} />);

      const copyBtn = screen.getByTestId("smart-url-copy-btn");
      // Clicking must not throw
      await expect(
        act(async () => {
          fireEvent.click(copyBtn);
        })
      ).resolves.not.toThrow();
    });
  });

  describe("6. Privacy Guarantees", () => {
    it("does not fetch or render third-party favicons (zero <img> tags)", () => {
      const url = "https://github.com/facebook/react";
      const { container } = render(<SmartUrlChip url={url} />);

      const imgTags = container.querySelectorAll("img");
      expect(imgTags.length).toBe(0);
    });
  });

  describe("7. Custom Overrides, Density Variants & Inline Mode", () => {
    it("renders custom title override when provided", () => {
      const url = "https://github.com/sonder-app/platform/pull/42";
      render(<SmartUrlChip url={url} title="Auth Migration PR" />);

      expect(screen.getByText("Auth Migration PR")).toBeInTheDocument();
      expect(screen.queryByText("sonder-app/platform#42")).not.toBeInTheDocument();
    });

    it("renders custom provider override when provided", () => {
      const url = "https://custom-git.internal.corp/repo/pull/1";
      render(<SmartUrlChip url={url} provider="Enterprise Git" />);

      expect(screen.getByText("Enterprise Git")).toBeInTheDocument();
    });

    it("supports inline mode for prose/markdown embedding", () => {
      const url = "https://github.com/sonder-app/platform";
      const { container } = render(
        <p>
          See repository: <SmartUrlChip url={url} inline />
        </p>
      );

      const link = container.querySelector("a");
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveClass("px-2 py-0.5");
    });

    it("supports size variants (sm and md)", () => {
      const url = "https://github.com/sonder-app/platform";
      const { container, rerender } = render(<SmartUrlChip url={url} size="sm" />);

      expect(container.firstChild).toHaveClass("text-[11px]");

      rerender(<SmartUrlChip url={url} size="md" />);
      expect(container.firstChild).toHaveClass("text-xs");
    });
  });
});
