"use client";

import type { ReactNode } from "react";
import { StateBlock } from "@/components/gds-local/core";

type EmptyStateProps = {
  title?: string;
  message: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return <StateBlock variant="empty" title={title ?? "No results"} description={message} action={action} compact />;
}
