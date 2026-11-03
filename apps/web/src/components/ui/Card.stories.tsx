import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./Card";

const meta: Meta = {
  title: "Components/Card",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="p-4 max-w-sm mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Frontend Engineering</CardTitle>
          <CardDescription>Workspace Prefix: FE</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            Community workspace for web and mobile client applications.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm">Settings</Button>
          <Button variant="accent" size="sm">Open</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};
