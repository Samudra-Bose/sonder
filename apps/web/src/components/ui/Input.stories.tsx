import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Lock } from "lucide-react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    inputSize: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: "Task Title",
    placeholder: "Enter task title...",
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Workspace Prefix",
    placeholder: "ENG",
    helperText: "Unique community identifier prefix (1-10 uppercase alphanumeric chars)",
  },
};

export const WithError: Story = {
  args: {
    label: "Email Address",
    defaultValue: "invalid-email",
    error: "Please enter a valid email address.",
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: "User Email",
    placeholder: "alex.morgan@example.org",
    leftIcon: <Mail className="h-4 w-4" />,
  },
};

export const Password: Story = {
  args: {
    label: "Password",
    type: "password",
    placeholder: "••••••••",
    leftIcon: <Lock className="h-4 w-4" />,
  },
};

export const Disabled: Story = {
  args: {
    label: "Community Key",
    defaultValue: "COMM-001",
    disabled: true,
  },
};
