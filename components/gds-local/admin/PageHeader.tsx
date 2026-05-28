"use client";

import type { ReactNode } from "react";
import {
  AdminPageHeader as GdsPageHeader,
  type AdminPageHeaderOverflowAction as PageHeaderOverflowAction,
  type AdminPageHeaderProps as GdsPageHeaderProps,
} from "@doneisbetter/gds/client";

export interface PageHeaderMenuAction extends PageHeaderOverflowAction {
  leftSection?: ReactNode;
}

export interface PageHeaderProps extends Omit<GdsPageHeaderProps, "description" | "overflowActions"> {
  description?: string | ReactNode;
  overflowActions?: PageHeaderMenuAction[];
  actions?: ReactNode;
}

export function PageHeader({
  description,
  primaryAction,
  secondaryActions,
  overflowActions,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <GdsPageHeader
      {...props}
      description={description}
      primaryAction={actions ?? primaryAction}
      secondaryActions={actions ? undefined : secondaryActions}
      overflowActions={actions ? undefined : overflowActions}
    />
  );
}
