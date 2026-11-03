import React, { useEffect } from "react";
import type { Preview } from "@storybook/react";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true,
          },
        ],
      },
    },
    backgrounds: {
      default: "canvas",
      values: [
        { name: "canvas", value: "var(--surface-canvas)" },
        { name: "card", value: "var(--surface-card)" },
        { name: "dark-canvas", value: "#090d16" },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: "Global theme for components",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "light";

      useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }, [theme]);

      return (
        <div
          className={`min-h-[160px] p-6 bg-[var(--surface-canvas)] text-[var(--text-primary)] transition-colors duration-150 ${
            theme === "dark" ? "dark" : ""
          }`}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
