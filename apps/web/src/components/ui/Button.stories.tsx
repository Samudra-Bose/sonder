import type { Meta, StoryObj } from "@storybook/react";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "accent", "secondary", "outline", "ghost", "danger"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: "Primary Action",
    variant: "primary",
  },
};

export const Accent: Story = {
  args: {
    children: "Accent Action",
    variant: "accent",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Action",
    variant: "secondary",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline Button",
    variant: "outline",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
  },
};

export const Danger: Story = {
  args: {
    children: "Delete Task",
    variant: "danger",
    leftIcon: <Trash2 className="h-4 w-4" />,
  },
};

export const Loading: Story = {
  args: {
    children: "Saving Changes",
    variant: "primary",
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Action",
    variant: "primary",
    disabled: true,
  },
};

export const WithIcons: Story = {
  args: {
    children: "Create Task",
    variant: "accent",
    leftIcon: <Plus className="h-4 w-4" />,
    rightIcon: <ArrowRight className="h-4 w-4" />,
  },
};

export const LongText: Story = {
  args: {
    children: "Create New Subtask In This Specific Personal Workspace With Extended Name",
    variant: "outline",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};
