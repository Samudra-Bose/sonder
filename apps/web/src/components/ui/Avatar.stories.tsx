import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "Components/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithInitials: Story = {
  args: {
    name: "Alex Morgan",
    size: "md",
  },
};

export const WithImage: Story = {
  args: {
    name: "Samudra Bose",
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    size: "lg",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar name="Alex Morgan" size="xs" />
      <Avatar name="Alex Morgan" size="sm" />
      <Avatar name="Alex Morgan" size="md" />
      <Avatar name="Alex Morgan" size="lg" />
      <Avatar name="Alex Morgan" size="xl" />
    </div>
  ),
};
