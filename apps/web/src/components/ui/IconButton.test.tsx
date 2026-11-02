import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Plus } from "lucide-react";
import { IconButton } from "./IconButton";

describe("IconButton component", () => {
  it("renders with accessible aria-label", () => {
    render(<IconButton aria-label="Add item" icon={<Plus data-testid="plus-icon" />} />);
    const button = screen.getByRole("button", { name: "Add item" });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <IconButton
        aria-label="Add item"
        icon={<Plus />}
        onClick={handleClick}
      />
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables button", () => {
    render(
      <IconButton
        aria-label="Saving"
        icon={<Plus />}
        isLoading
      />
    );
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders danger variant with semantic background and inverted text tokens", () => {
    render(
      <IconButton
        aria-label="Delete item"
        icon={<Plus />}
        variant="danger"
      />
    );
    const button = screen.getByRole("button", { name: "Delete item" });
    expect(button).toHaveClass("bg-[var(--feedback-danger-text)]");
    expect(button).toHaveClass("text-[var(--text-inverted)]");
  });
});
