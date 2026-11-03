import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "accent"],
    },
    status: {
      control: "select",
      options: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"],
    },
    priority: {
      control: "select",
      options: ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"],
    },
    size: {
      control: "select",
      options: ["sm", "md"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Accent: Story = {
  args: {
    children: "Community Admin",
    variant: "accent",
  },
};

export const StatusVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge status="TODO" />
      <Badge status="IN_PROGRESS" />
      <Badge status="IN_REVIEW" />
      <Badge status="DONE" />
      <Badge status="CANCELLED" />
    </div>
  ),
};

export const PriorityVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge priority="URGENT" />
      <Badge priority="HIGH" />
      <Badge priority="MEDIUM" />
      <Badge priority="LOW" />
      <Badge priority="NONE" />
    </div>
  ),
};
