import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KeyboardShortcut } from "./KeyboardShortcut";

describe("KeyboardShortcut component", () => {
  it("renders with children", () => {
    render(<KeyboardShortcut>Esc</KeyboardShortcut>);
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });

  it("splits shortcut string into distinct keys", () => {
    render(<KeyboardShortcut shortcut="⌘+K" />);
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("renders an array of keys", () => {
    render(<KeyboardShortcut keys={["Shift", "D"]} />);
    expect(screen.getByText("Shift")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });
});
