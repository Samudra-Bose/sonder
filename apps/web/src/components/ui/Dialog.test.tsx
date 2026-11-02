import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./Dialog";

function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>Open Modal</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Fill in the task details below.</DialogDescription>
        </DialogHeader>
        <div>Modal Body</div>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog component", () => {
  it("opens dialog on trigger click and displays title and content", async () => {
    const user = userEvent.setup();
    render(<DialogDemo />);

    expect(screen.queryByText("Create Task")).not.toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "Open Modal" });
    await user.click(trigger);

    expect(await screen.findByText("Create Task")).toBeInTheDocument();
    expect(screen.getByText("Fill in the task details below.")).toBeInTheDocument();
    expect(screen.getByText("Modal Body")).toBeInTheDocument();
  });
});
