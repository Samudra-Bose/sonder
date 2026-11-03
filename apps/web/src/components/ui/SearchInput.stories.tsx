import type { Meta, StoryObj } from "@storybook/react";
import { SearchInput } from "./SearchInput";

const meta: Meta<typeof SearchInput> = {
  title: "Components/SearchInput",
  component: SearchInput,
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
  args: {
    placeholder: "Search tasks, workspaces, or views...",
    shortcut: "⌘K",
  },
};

export const WithValue: Story = {
  args: {
    value: "Authentication flow",
    placeholder: "Search tasks...",
    shortcut: "⌘K",
    onClear: () => {},
  },
};

export const Disabled: Story = {
  args: {
    value: "Disabled search",
    disabled: true,
  },
};
