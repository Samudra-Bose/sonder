import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SearchInput } from "./SearchInput";

describe("SearchInput component", () => {
  it("renders with search container role and placeholder", () => {
    render(<SearchInput placeholder="Search tasks..." />);
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
  });

  it("renders shortcut hint when provided and input is empty", () => {
    render(<SearchInput placeholder="Search..." shortcut="⌘K" />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("renders clear button when value is present and calls onClear", async () => {
    const handleClear = vi.fn();
    const user = userEvent.setup();

    render(
      <SearchInput
        placeholder="Search..."
        value="Frontend"
        onChange={() => {}}
        onClear={handleClear}
      />
    );

    const clearButton = screen.getByRole("button", { name: "Clear search query" });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
