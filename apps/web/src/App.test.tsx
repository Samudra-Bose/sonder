import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App.js";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("Sonder Application Shell (VS-00 & VS-01 Integration)", () => {
  it("renders brand heading and semantic landmarks upon session resolution", async () => {
    renderWithClient(<App initialEntries={["/"]} />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(screen.getByText("Sonder")).toBeInTheDocument();
    });
  });

  it("fetches and renders active mock user context via MSW", async () => {
    renderWithClient(<App initialEntries={["/"]} />);

    await waitFor(() => {
      expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    });

    expect(screen.getByText("(alex.morgan@example.org)")).toBeInTheDocument();
    expect(screen.getByText("Sonder Community")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
