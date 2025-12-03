import type { Meta, StoryObj } from "@storybook/react";
import { UiButton } from "@spheresconnect/ui";

const meta: Meta<typeof UiButton> = {
  title: "Foundations/UiButton",
  component: UiButton,
  args: {
    children: "Tap me"
  }
};

export default meta;

type Story = StoryObj<typeof UiButton>;

export const Primary: Story = {
  args: {
    variant: "primary"
  }
};

export const Ghost: Story = {
  args: {
    variant: "ghost"
  }
};
