import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";

describe("Card component suite", () => {
  it("renders card with header, title, description, content, and footer", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>Key metrics and recent progress</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content area</p>
        </CardContent>
        <CardFooter>
          <button>View details</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole("heading", { name: "Project Overview" })).toBeInTheDocument();
    expect(screen.getByText("Key metrics and recent progress")).toBeInTheDocument();
    expect(screen.getByText("Main content area")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details" })).toBeInTheDocument();
  });
});
