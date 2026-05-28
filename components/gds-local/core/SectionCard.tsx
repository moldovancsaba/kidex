"use client";

import type { CSSProperties, ReactNode } from "react";
import { SectionPanel } from "@doneisbetter/gds/client";

export interface SectionCardProps {
  title?: string;
  subheader?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  sx?: Record<string, unknown>;
  contentSx?: Record<string, unknown>;
}

export function SectionCard({ title, subheader, action, children, className, sx, contentSx }: SectionCardProps) {
  return (
    <div className={className} style={sx as CSSProperties | undefined}>
      <SectionPanel title={title} description={subheader} action={action} divided={false}>
        <div style={contentSx as CSSProperties | undefined}>{children}</div>
      </SectionPanel>
    </div>
  );
}
