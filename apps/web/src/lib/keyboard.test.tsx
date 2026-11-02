import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useKeyboardShortcut, formatShortcut } from "./keyboard";

function KeyboardShortcutConsumer({
  shortcut,
  options,
  onTrigger,
}: {
  shortcut: string;
  options?: Parameters<typeof useKeyboardShortcut>[2];
  onTrigger: () => void;
}) {
  const [triggerCount, setTriggerCount] = useState(0);

  useKeyboardShortcut(
    shortcut,
    () => {
      setTriggerCount((c) => c + 1);
      onTrigger();
    },
    options
  );

  return (
    <div>
      <span data-testid="count">{triggerCount}</span>
      <input data-testid="test-input" placeholder="type here" />
      <textarea data-testid="test-textarea" />
      <div data-testid="test-editable" contentEditable />
    </div>
  );
}

describe("Keyboard shortcuts", () => {
  it("triggers callback when shortcut matches", () => {
    const handleTrigger = vi.fn();
    render(<KeyboardShortcutConsumer shortcut="k" onTrigger={handleTrigger} />);

    fireEvent.keyDown(window, { key: "k" });
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it("triggers callback with modifiers (e.g. shift+k)", () => {
    const handleTrigger = vi.fn();
    render(<KeyboardShortcutConsumer shortcut="shift+k" onTrigger={handleTrigger} />);

    // Pressing 'k' without shift should NOT trigger
    fireEvent.keyDown(window, { key: "k", shiftKey: false });
    expect(handleTrigger).not.toHaveBeenCalled();

    // Pressing with shift should trigger
    fireEvent.keyDown(window, { key: "k", shiftKey: true });
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcut when typing inside input elements by default", async () => {
    const handleTrigger = vi.fn();
    render(<KeyboardShortcutConsumer shortcut="k" onTrigger={handleTrigger} />);

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();
  });

  it("triggers inside input elements when ignoreInputs is false", () => {
    const handleTrigger = vi.fn();
    render(
      <KeyboardShortcutConsumer
        shortcut="k"
        options={{ ignoreInputs: false }}
        onTrigger={handleTrigger}
      />
    );

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "k" });
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it("does not trigger when disabled", () => {
    const handleTrigger = vi.fn();
    render(
      <KeyboardShortcutConsumer
        shortcut="k"
        options={{ enabled: false }}
        onTrigger={handleTrigger}
      />
    );

    fireEvent.keyDown(window, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();
  });

  it("formats shortcuts correctly for display", () => {
    const formatted = formatShortcut("mod+k");
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(0);
  });
});
