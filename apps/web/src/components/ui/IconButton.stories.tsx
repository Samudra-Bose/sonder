import type { Meta, StoryObj } from "@storybook/react";
import { Plus, Settings, Trash2, Menu, Bell } from "lucide-react";
import { IconButton } from "./IconButton";

const meta: Meta<typeof IconButton> = {
  title: "Components/IconButton",
  component: IconButton,
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
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Ghost: Story = {
  args: {
    icon: <Settings className="h-4 w-4" />,
    "aria-label": "Settings",
    variant: "ghost",
  },
};

export const Accent: Story = {
  args: {
    icon: <Plus className="h-4 w-4" />,
    "aria-label": "Add Item",
    variant: "accent",
  },
};

export const Outline: Story = {
  args: {
    icon: <Bell className="h-4 w-4" />,
    "aria-label": "Notifications",
    variant: "outline",
  },
};

export const Danger: Story = {
  args: {
    icon: <Trash2 className="h-4 w-4" />,
    "aria-label": "Delete",
    variant: "danger",
  },
};

export const Loading: Story = {
  args: {
    icon: <Menu className="h-4 w-4" />,
    "aria-label": "Menu",
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    icon: <Settings className="h-4 w-4" />,
    "aria-label": "Settings",
    disabled: true,
  },
};
