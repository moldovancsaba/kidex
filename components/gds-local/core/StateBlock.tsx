"use client";

import type { ReactNode } from "react";
import { Box } from "@mantine/core";
import { StateBlock as GdsStateBlock, type StateBlockVariant } from "@doneisbetter/gds-core/client";

export type StateBlockProps = {
  variant: StateBlockVariant;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  minHeight?: number | string;
};

export function StateBlock({
  variant,
  title,
  description,
  action,
  icon,
  compact = false,
  minHeight,
}: StateBlockProps) {
  const content = <GdsStateBlock variant={variant} title={title} description={description} action={action} icon={icon} compact={compact} />;

  return minHeight ? <Box style={{ minHeight, display: "flex", alignItems: "center", justifyContent: "center" }}>{content}</Box> : content;
}
