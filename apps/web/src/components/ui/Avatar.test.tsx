import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar component", () => {
  it("renders user initials when name is provided without image", () => {
    render(<Avatar name="Samudra Bose" />);
    expect(screen.getByText("SB")).toBeInTheDocument();
  });

  it("handles single-word name initials correctly", () => {
    render(<Avatar name="Alex" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders fallback placeholder question mark when no name is provided", () => {
    render(<Avatar />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
