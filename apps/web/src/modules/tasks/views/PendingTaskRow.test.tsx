import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PendingTaskRow } from "./PendingTaskRow.js";
import type { PendingTaskItem } from "../InlineCreationRow.js";

describe("PendingTaskRow — Transient Pending Task Row Primitive", () => {
  const mockPendingTask: PendingTaskItem = {
    clientSubmissionId: "pending-12345",
    title: "Drafting Launch Plan",
    statusCategory: "IN_PROGRESS",
    parentTaskId: "parent-001",
    createdAt: new Date().toISOString(),
  };

  function renderInTable(ui: React.ReactElement) {
    return render(
      <table>
        <tbody>{ui}</tbody>
      </table>
    );
  }

  it("renders with distinct pending row testid, accessible label, and dimmed styling", () => {
    renderInTable(<PendingTaskRow pendingTask={mockPendingTask} />);

    const row = screen.getByTestId("task-list-pending-row");
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute("aria-label", "Creating task: Drafting Launch Plan");
    expect(row).toHaveClass("opacity-60");
    expect(row).toHaveClass("cursor-default");
  });

  it("displays pending title, pending badge, and subtle loading spinner", () => {
    renderInTable(<PendingTaskRow pendingTask={mockPendingTask} />);

    expect(screen.getByTestId("pending-task-title")).toHaveTextContent("Drafting Launch Plan");
    expect(screen.getByTestId("pending-task-badge")).toHaveTextContent("Pending");

    // Loading spinner in checkbox cell
    const spinner = screen.getByTestId("task-list-pending-row").querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders pending status badge when category is specified", () => {
    renderInTable(<PendingTaskRow pendingTask={mockPendingTask} />);

    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders child subtask indicator when parentTaskId is present", () => {
    renderInTable(<PendingTaskRow pendingTask={mockPendingTask} />);

    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("renders placeholder dashes when status or parentTaskId are omitted", () => {
    const minimalPending: PendingTaskItem = {
      clientSubmissionId: "pending-min",
      title: "Minimal Task",
      createdAt: new Date().toISOString(),
    };

    renderInTable(<PendingTaskRow pendingTask={minimalPending} />);

    expect(screen.getByTestId("pending-task-title")).toHaveTextContent("Minimal Task");
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    // Non-interactive placeholders
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("is non-interactive and does not render clickable edit buttons or triggers", () => {
    renderInTable(<PendingTaskRow pendingTask={mockPendingTask} />);

    const row = screen.getByTestId("task-list-pending-row");
    // Does not have tabIndex or clickable role
    expect(row).not.toHaveAttribute("tabindex");
    expect(row.querySelectorAll("button").length).toBe(0);
    expect(row.querySelectorAll("input").length).toBe(0);
  });
});
