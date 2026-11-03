import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

const meta: Meta = {
  title: "Components/Tabs",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="p-6 max-w-md mx-auto">
      <Tabs defaultValue="list">
        <TabsList className="w-full">
          <TabsTrigger value="list" className="flex-1">
            List
          </TabsTrigger>
          <TabsTrigger value="board" className="flex-1">
            Board
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1">
            Timeline
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4 p-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-sm">
          List Projection: Canonical task items displayed sequentially with metadata columns.
        </TabsContent>
        <TabsContent value="board" className="mt-4 p-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-sm">
          Board Projection: Status column cards reflecting synchronized task states.
        </TabsContent>
        <TabsContent value="calendar" className="mt-4 p-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-sm">
          Calendar Projection: Temporal view organized by due dates and schedules.
        </TabsContent>
        <TabsContent value="timeline" className="mt-4 p-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-sm">
          Timeline Projection: Dependency gantt view showing milestone alignments.
        </TabsContent>
      </Tabs>
    </div>
  ),
};
