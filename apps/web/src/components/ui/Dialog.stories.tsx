import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./Dialog";

const meta: Meta = {
  title: "Components/Dialog",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="p-8 flex justify-center">
      <Dialog>
        <DialogTrigger render={<Button variant="primary">Open Dialog</Button>} />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to your personal workspace. This task will automatically receive a
              community-unique prefix.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-[var(--text-secondary)]">
            Task details and priority settings can be configured here.
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="accent">Save Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
};
