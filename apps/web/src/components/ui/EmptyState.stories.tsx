import type { Meta, StoryObj } from "@storybook/react";
import { Inbox, CheckCircle2, Plus } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Components/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoTasks: Story = {
  args: {
    icon: <CheckCircle2 className="h-6 w-6" />,
    title: "All caught up",
    description: "You have no outstanding tasks assigned to you across your active workspaces.",
    action: <Button variant="accent" leftIcon={<Plus className="h-4 w-4" />}>Create Task</Button>,
  },
};

export const InboxZero: Story = {
  args: {
    icon: <Inbox className="h-6 w-6" />,
    title: "Zero Notifications",
    description: "Your inbox is clear. New task assignments and workspace mentions will appear here.",
  },
};
