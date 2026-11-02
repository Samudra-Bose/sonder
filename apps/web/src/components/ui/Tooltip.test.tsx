import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip component", () => {
  it("renders trigger element", () => {
    render(
      <Tooltip content="Helpful tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
  });

  it("renders child directly when disabled", () => {
    render(
      <Tooltip content="Hidden tip" disabled>
        <button>Disabled tip button</button>
      </Tooltip>
    );

    expect(screen.getByRole("button", { name: "Disabled tip button" })).toBeInTheDocument();
  });
});
