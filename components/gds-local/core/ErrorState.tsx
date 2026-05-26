"use client";

import type { ReactNode } from "react";
import { StateBlock } from "./StateBlock";

type ErrorStateProps = {
  title?: string;
  message: ReactNode;
  action?: ReactNode;
};

export function ErrorState({ title, message, action }: ErrorStateProps) {
  return <StateBlock variant="error" title={title ?? "Error"} description={message} action={action} compact />;
}
