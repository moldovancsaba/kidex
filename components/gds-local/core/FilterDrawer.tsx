"use client";

import type { ReactNode } from "react";
import { FilterDrawer as GdsFilterDrawer } from "@doneisbetter/gds/client";

export interface FilterDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  position?: "left" | "right" | "top" | "bottom";
  size?: string | number;
}

export function FilterDrawer({
  opened,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  position = "right",
}: FilterDrawerProps) {
  return (
    <GdsFilterDrawer
      opened={opened}
      onClose={onClose}
      title={title}
      mode={position === "bottom" ? "bottom-sheet" : "side"}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    >
      {children}
    </GdsFilterDrawer>
  );
}
