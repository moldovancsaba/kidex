"use client";

import type { ReactNode } from "react";
import { Box } from "@mantine/core";
import {
  ProductCard as GdsProductCard,
  type ProductCardAction as GdsProductCardAction,
  type ProductCardMetaItem,
} from "@doneisbetter/gds/client";

export type { ProductCardMetaItem };

export interface ProductCardAction extends GdsProductCardAction {
  leftSection?: ReactNode;
}

export interface ProductCardProps {
  title: string;
  description?: ReactNode;
  media?: ReactNode;
  icon?: ReactNode;
  status?: ReactNode;
  metadata?: ProductCardMetaItem[];
  primaryAction?: ReactNode;
  secondaryActions?: ProductCardAction[];
  footer?: ReactNode;
  onClick?: () => void;
}

export function ProductCard({
  title,
  description,
  media,
  icon,
  status,
  metadata = [],
  primaryAction,
  secondaryActions = [],
  footer,
  onClick,
}: ProductCardProps) {
  const content = (
    <GdsProductCard
      title={title}
      description={description}
      media={media}
      icon={icon}
      status={status}
      metadata={metadata}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions.map((action) => {
        const normalized = { ...action };
        delete normalized.leftSection;
        return normalized;
      })}
      footer={footer}
    />
  );

  if (!onClick) {
    return content;
  }

  return (
    <Box onClick={onClick} style={{ cursor: "pointer" }}>
      {content}
    </Box>
  );
}
