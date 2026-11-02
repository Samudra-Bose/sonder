import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Feedback } from "./Feedback";

describe("Feedback component", () => {
  it("renders with alert role, title, and children", () => {
    render(
      <Feedback variant="success" title="Success!">
        Your changes have been saved.
      </Feedback>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Your changes have been saved.")).toBeInTheDocument();
  });

  it("calls onDismiss when close button is clicked", async () => {
    const handleDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <Feedback variant="danger" title="Error" onDismiss={handleDismiss}>
        Something went wrong.
      </Feedback>
    );

    const dismissButton = screen.getByRole("button", { name: "Dismiss alert" });
    await user.click(dismissButton);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
