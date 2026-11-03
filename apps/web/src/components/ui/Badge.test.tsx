import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge, type TaskStatus, type TaskPriority } from "./Badge";

describe("Badge component - Dual Indicator Standard", () => {
  it("renders default badge text without icon", () => {
    render(<Badge>Default Badge</Badge>);
    expect(screen.getByText("Default Badge")).toBeInTheDocument();
  });

  const statuses: Array<{ status: TaskStatus; label: string; iconTestId: string }> = [
    { status: "TODO", label: "To Do", iconTestId: "status-icon-TODO" },
    { status: "IN_PROGRESS", label: "In Progress", iconTestId: "status-icon-IN_PROGRESS" },
    { status: "IN_REVIEW", label: "In Review", iconTestId: "status-icon-IN_REVIEW" },
    { status: "DONE", label: "Done", iconTestId: "status-icon-DONE" },
    { status: "CANCELED", label: "Canceled", iconTestId: "status-icon-CANCELED" },
  ];

  statuses.forEach(({ status, label, iconTestId }) => {
    it(`renders status badge "${status}" with both label and dual-indicator icon`, () => {
      render(<Badge status={status}>{label}</Badge>);
      expect(screen.getByText(label)).toBeInTheDocument();
      const icon = screen.getByTestId(iconTestId);
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it(`renders status badge via variant="status-${status}" with icon`, () => {
      render(<Badge variant={`status-${status}`}>{label}</Badge>);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
    });
  });

  it("normalizes legacy CANCELLED variant at boundary to CANCELED icon and styling", () => {
    render(<Badge variant={"status-CANCELLED" as any}>Cancelled</Badge>);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByTestId("status-icon-CANCELED")).toBeInTheDocument();
  });

  const priorities: Array<{ priority: TaskPriority; label: string; iconTestId: string }> = [
    { priority: "URGENT", label: "Urgent", iconTestId: "priority-icon-URGENT" },
    { priority: "HIGH", label: "High", iconTestId: "priority-icon-HIGH" },
    { priority: "MEDIUM", label: "Medium", iconTestId: "priority-icon-MEDIUM" },
    { priority: "LOW", label: "Low", iconTestId: "priority-icon-LOW" },
    { priority: "NONE", label: "None", iconTestId: "priority-icon-NONE" },
  ];

  priorities.forEach(({ priority, label, iconTestId }) => {
    it(`renders priority badge "${priority}" with both label and dual-indicator icon`, () => {
      render(<Badge priority={priority}>{label}</Badge>);
      expect(screen.getByText(label)).toBeInTheDocument();
      const icon = screen.getByTestId(iconTestId);
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it(`renders priority badge via variant="priority-${priority}" with icon`, () => {
      render(<Badge variant={`priority-${priority}`}>{label}</Badge>);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
    });
  });

  it("supports deliberate icon override while preserving text label", () => {
    render(
      <Badge status="TODO" icon={<span data-testid="custom-icon">★</span>}>
        Overridden
      </Badge>
    );

    expect(screen.getByText("Overridden")).toBeInTheDocument();
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("status-icon-TODO")).not.toBeInTheDocument();
  });
});
