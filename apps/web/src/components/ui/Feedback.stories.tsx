import type { Meta, StoryObj } from "@storybook/react";
import { Feedback } from "./Feedback";

const meta: Meta<typeof Feedback> = {
  title: "Components/Feedback",
  component: Feedback,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "danger"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Feedback>;

export const Info: Story = {
  args: {
    variant: "info",
    title: "Session Information",
    children: "Your authenticated session is active. Cross-workspace triage is synchronized.",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    title: "Task Completed",
    children: "Task FE-101 has been moved to Done and closed.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Workspace Prefix Conflict",
    children: "This prefix is already in use by another workspace in this community.",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    title: "Authentication Failed",
    children: "Invalid username or password. Please check your credentials.",
  },
};

export const Dismissible: Story = {
  args: {
    variant: "info",
    title: "New Update Available",
    children: "Sonder v1.5.0 specification features have been deployed.",
    onDismiss: () => {},
  },
};
