import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge component", () => {
  it("renders default badge text", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("renders status chips with correct semantic styles", () => {
    const { rerender } = render(<Badge status="TODO">To Do</Badge>);
    expect(screen.getByText("To Do")).toBeInTheDocument();

    rerender(<Badge status="IN_PROGRESS">In Progress</Badge>);
    expect(screen.getByText("In Progress")).toBeInTheDocument();

    rerender(<Badge status="DONE">Done</Badge>);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders priority badges correctly", () => {
    const { rerender } = render(<Badge priority="URGENT">Urgent</Badge>);
    expect(screen.getByText("Urgent")).toBeInTheDocument();

    rerender(<Badge priority="HIGH">High</Badge>);
    expect(screen.getByText("High")).toBeInTheDocument();

    rerender(<Badge priority="MEDIUM">Medium</Badge>);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders optional leading icon", () => {
    render(
      <Badge icon={<span data-testid="badge-icon">●</span>}>
        Active
      </Badge>
    );
    expect(screen.getByTestId("badge-icon")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
