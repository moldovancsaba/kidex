"use client";

import type { ReactNode } from "react";
import {
  DataToolbar as GdsDataToolbar,
  type DataToolbarFilterChip as GdsDataToolbarFilterChip,
} from "@doneisbetter/gds-core/client";

export interface DataToolbarFilterChip extends GdsDataToolbarFilterChip {
  color?: string;
}

export interface DataToolbarProps {
  searchSlot?: ReactNode;
  filterSlot?: ReactNode;
  sortSlot?: ReactNode;
  resetAction?: ReactNode;
  createAction?: ReactNode;
  activeFilters?: DataToolbarFilterChip[];
  primary?: ReactNode;
  secondary?: ReactNode;
  filters?: ReactNode;
}

export function DataToolbar({
  searchSlot,
  filterSlot,
  sortSlot,
  resetAction,
  createAction,
  activeFilters = [],
  primary,
  secondary,
  filters,
}: DataToolbarProps) {
  return (
    <GdsDataToolbar
      searchSlot={searchSlot ?? primary}
      filterSlot={filterSlot ?? filters}
      sortSlot={sortSlot}
      resetAction={resetAction}
      createAction={createAction ?? secondary}
      activeFilters={activeFilters.map((filter) => {
        const normalized = { ...filter };
        delete normalized.color;
        return normalized;
      })}
    />
  );
}
