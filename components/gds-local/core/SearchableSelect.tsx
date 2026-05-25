"use client";

import { useMemo } from "react";
import type { ComboboxItem } from "@mantine/core";
import { Select } from "@mantine/core";

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowAdd?: boolean;
}

export function SearchableSelect({ label, value, options, onChange, placeholder, allowAdd }: SearchableSelectProps) {
  const data = useMemo<ComboboxItem[]>(() => options.map((option) => ({ value: option.name, label: option.name })), [options]);

  const selectValue = useMemo(() => {
    const hit = options.find((option) => option.name === value);
    if (hit) return hit.name;
    if (allowAdd && value.trim()) return value.trim();
    return null;
  }, [allowAdd, options, value]);

  return (
    <Select
      searchable
      clearable
      data={data}
      value={selectValue}
      label={label}
      placeholder={placeholder || undefined}
      onSearchChange={(query) => {
        if (allowAdd) onChange(query);
      }}
      searchValue={allowAdd ? value : undefined}
      onChange={(newValue) => onChange(newValue ? newValue.trim() : "")}
      nothingFoundMessage={placeholder || ""}
    />
  );
}
