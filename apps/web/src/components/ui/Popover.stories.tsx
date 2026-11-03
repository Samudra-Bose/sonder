import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { Popover, PopoverTrigger, PopoverContent } from "./Popover";

const meta: Meta = {
  title: "Components/Popover",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="p-8 flex justify-center">
      <Popover>
        <PopoverTrigger render={<Button variant="outline">View Workspace Details</Button>} />
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Personal Workspace</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              This workspace is scoped to your personal user account. Community administrators do
              not have access to private tasks here.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ),
};
