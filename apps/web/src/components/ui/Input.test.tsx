import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Input } from "./Input";

describe("Input component", () => {
  it("renders with label and connects htmlFor", () => {
    render(<Input label="Email address" placeholder="user@example.com" />);
    const label = screen.getByText("Email address");
    const input = screen.getByPlaceholderText("user@example.com");

    expect(label).toHaveAttribute("for", input.id);
  });

  it("handles user typing", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input placeholder="Type something" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Type something");

    await user.type(input, "Hello");
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue("Hello");
  });

  it("displays error with role alert and aria-invalid", () => {
    render(
      <Input
        label="Username"
        error="Username already exists"
        placeholder="Enter username"
      />
    );

    const input = screen.getByPlaceholderText("Enter username");
    const errorMsg = screen.getByRole("alert");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(errorMsg).toHaveTextContent("Username already exists");
  });

  it("renders helper text when no error exists", () => {
    render(
      <Input
        label="Password"
        helperText="Must be at least 8 characters"
        placeholder="Enter password"
      />
    );

    expect(screen.getByText("Must be at least 8 characters")).toBeInTheDocument();
  });
});
