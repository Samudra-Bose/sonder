import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

function TabsDemo() {
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account Settings Panel</TabsContent>
      <TabsContent value="password">Password Settings Panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs component", () => {
  it("renders tabs and switches active tab on click", async () => {
    const user = userEvent.setup();
    render(<TabsDemo />);

    expect(screen.getByText("Account Settings Panel")).toBeInTheDocument();
    expect(screen.queryByText("Password Settings Panel")).not.toBeInTheDocument();

    const passwordTab = screen.getByRole("tab", { name: "Password" });
    await user.click(passwordTab);

    expect(await screen.findByText("Password Settings Panel")).toBeInTheDocument();
  });
});
