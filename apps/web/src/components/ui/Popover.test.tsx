import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverTitle,
  PopoverDescription,
} from "./Popover";

function PopoverDemo({
  size,
  defaultOpen = false,
}: {
  size?: "default" | "compact";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button type="button" data-testid="outside-button">
        Outside Button
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger data-testid="popover-trigger">Open Popover</PopoverTrigger>
        <PopoverContent size={size} data-testid="popover-content">
          <PopoverTitle>Popover Title</PopoverTitle>
          <PopoverDescription>Popover Description</PopoverDescription>
          <div>Popover Body</div>
          <button type="button" data-testid="inside-button-1">
            Inside Action 1
          </button>
          <button type="button" data-testid="inside-button-2">
            Inside Action 2
          </button>
          <PopoverClose data-testid="popover-close">Close</PopoverClose>
        </PopoverContent>
      </Popover>
      <button type="button" data-testid="next-adjacent-button">
        Next Adjacent Button
      </button>
    </div>
  );
}

describe("Popover component - Stage 5.1 Primitives", () => {
  it("renders default size popover geometry with w-72 and p-4", async () => {
    const user = userEvent.setup();
    render(<PopoverDemo />);

    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();

    const trigger = screen.getByTestId("popover-trigger");
    await user.click(trigger);

    const content = await screen.findByTestId("popover-content");
    expect(content).toBeInTheDocument();
    expect(content.className).toContain("w-72");
    expect(content.className).toContain("p-4");
    expect(content.className).toContain("rounded-lg");
  });

  it("renders compact size popover geometry with w-auto, min-w-[140px], p-1.5, and rounded-md", async () => {
    const user = userEvent.setup();
    render(<PopoverDemo size="compact" />);

    const trigger = screen.getByTestId("popover-trigger");
    await user.click(trigger);

    const content = await screen.findByTestId("popover-content");
    expect(content).toBeInTheDocument();
    expect(content.className).toContain("w-auto");
    expect(content.className).toContain("min-w-[140px]");
    expect(content.className).toContain("p-1.5");
    expect(content.className).toContain("rounded-md");
  });

  it("verifies non-modal behavior: popover does not trap focus and does not have aria-modal='true'", async () => {
    render(<PopoverDemo defaultOpen={true} />);

    const content = await screen.findByTestId("popover-content");
    expect(content).toBeInTheDocument();

    // Base UI Popover popup is non-modal by specification
    expect(content).not.toHaveAttribute("aria-modal", "true");

    // The outside button remains clickable and accessible in DOM
    const outsideBtn = screen.getByTestId("outside-button");
    expect(outsideBtn).not.toHaveAttribute("aria-hidden");
  });

  it("dismisses popover on Escape key and restores focus to trigger button", async () => {
    const user = userEvent.setup();
    render(<PopoverDemo />);

    const trigger = screen.getByTestId("popover-trigger");
    await user.click(trigger);

    const content = await screen.findByTestId("popover-content");
    expect(content).toBeInTheDocument();

    // Focus inside popover
    const insideBtn = screen.getByTestId("inside-button-1");
    insideBtn.focus();
    expect(document.activeElement).toBe(insideBtn);

    // Press Escape
    await user.keyboard("{Escape}");

    // Content unmounts/hides
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();

    // Focus restores to trigger
    expect(document.activeElement).toBe(trigger);
  });

  it("dismisses popover when clicking outside", async () => {
    const user = userEvent.setup();
    render(<PopoverDemo />);

    const trigger = screen.getByTestId("popover-trigger");
    await user.click(trigger);

    expect(await screen.findByTestId("popover-content")).toBeInTheDocument();

    const outsideBtn = screen.getByTestId("outside-button");
    await user.click(outsideBtn);

    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();
  });
});
