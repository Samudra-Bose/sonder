import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useKeyboardShortcut,
  formatShortcut,
  clearShortcutRegistry,
  getRegisteredShortcutsCount,
} from "./keyboard";

function KeyboardConsumer({
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
      <select data-testid="test-select">
        <option value="1">One</option>
      </select>
      <div data-testid="test-editable" contentEditable />
    </div>
  );
}

describe("Keyboard shortcuts - Conflict Resolution & Strict Modifiers", () => {
  beforeEach(() => {
    clearShortcutRegistry();
  });

  afterEach(() => {
    clearShortcutRegistry();
  });

  it("triggers callback when exact shortcut matches", () => {
    const handleTrigger = vi.fn();
    render(<KeyboardConsumer shortcut="k" onTrigger={handleTrigger} />);

    fireEvent.keyDown(window, { key: "k" });
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it("triggers callback with required modifiers (e.g. shift+k)", () => {
    const handleTrigger = vi.fn();
    render(<KeyboardConsumer shortcut="shift+k" onTrigger={handleTrigger} />);

    // Pressing 'k' without shift should NOT trigger
    fireEvent.keyDown(window, { key: "k", shiftKey: false });
    expect(handleTrigger).not.toHaveBeenCalled();

    // Pressing with shift should trigger
    fireEvent.keyDown(window, { key: "k", shiftKey: true });
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it("rejects activation when unrelated modifiers are pressed (strict modifier match)", () => {
    const handleTrigger = vi.fn();
    render(<KeyboardConsumer shortcut="k" onTrigger={handleTrigger} />);

    // Pressing Alt+K or Shift+K when shortcut is plain 'k' should NOT trigger
    fireEvent.keyDown(window, { key: "k", altKey: true });
    expect(handleTrigger).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "k", shiftKey: true });
    expect(handleTrigger).not.toHaveBeenCalled();

    // Plain 'k' triggers
    fireEvent.keyDown(window, { key: "k" });
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it("resolves duplicate registrations predictably: LIFO (latest mounted) wins by default", () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    const { unmount: unmountFirst } = render(
      <KeyboardConsumer shortcut="escape" onTrigger={firstHandler} />
    );
    render(<KeyboardConsumer shortcut="escape" onTrigger={secondHandler} />);

    // Pressing escape should invoke ONLY the latest mounted handler (secondHandler)
    fireEvent.keyDown(window, { key: "Escape" });
    expect(secondHandler).toHaveBeenCalledTimes(1);
    expect(firstHandler).not.toHaveBeenCalled();

    unmountFirst();
  });

  it("resolves duplicate registrations with explicit priority: higher priority wins", () => {
    const lowPriorityHandler = vi.fn();
    const highPriorityHandler = vi.fn();

    // Render higher priority first
    render(
      <KeyboardConsumer
        shortcut="mod+k"
        options={{ priority: 100 }}
        onTrigger={highPriorityHandler}
      />
    );

    // Render lower priority second
    render(
      <KeyboardConsumer
        shortcut="mod+k"
        options={{ priority: 0 }}
        onTrigger={lowPriorityHandler}
      />
    );

    // Mod+K press (Ctrl or Meta)
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(highPriorityHandler).toHaveBeenCalledTimes(1);
    expect(lowPriorityHandler).not.toHaveBeenCalled();
  });

  it("ignores shortcut when typing inside input, textarea, select, and contenteditable elements", () => {
    const handleTrigger = vi.fn();
    render(<KeyboardConsumer shortcut="k" onTrigger={handleTrigger} />);

    const input = screen.getByTestId("test-input");
    input.focus();
    fireEvent.keyDown(input, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();

    const textarea = screen.getByTestId("test-textarea");
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();

    const select = screen.getByTestId("test-select");
    select.focus();
    fireEvent.keyDown(select, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();

    const editable = screen.getByTestId("test-editable");
    editable.focus();
    fireEvent.keyDown(editable, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();
  });

  it("triggers inside input elements when ignoreInputs is false (or allowInInput is true)", () => {
    const handleTrigger = vi.fn();
    render(
      <KeyboardConsumer
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
      <KeyboardConsumer
        shortcut="k"
        options={{ enabled: false }}
        onTrigger={handleTrigger}
      />
    );

    fireEvent.keyDown(window, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();
  });

  it("cleans up registration on unmount", () => {
    expect(getRegisteredShortcutsCount()).toBe(0);

    const handleTrigger = vi.fn();
    const { unmount } = render(
      <KeyboardConsumer shortcut="k" onTrigger={handleTrigger} />
    );
    expect(getRegisteredShortcutsCount()).toBe(1);

    unmount();
    expect(getRegisteredShortcutsCount()).toBe(0);

    // Key event after unmount should do nothing
    fireEvent.keyDown(window, { key: "k" });
    expect(handleTrigger).not.toHaveBeenCalled();
  });

  it("formats shortcuts correctly for display", () => {
    const formatted = formatShortcut("mod+k");
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toMatch(/Ctrl\+K|⌘K/);
  });
});
