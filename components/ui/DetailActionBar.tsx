"use client";

import { ActionIcon, Group, Menu } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconDotsVertical } from "@tabler/icons-react";
import type { ReactNode } from "react";

type DetailActionBarProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  menuItems?: ReactNode;
  menuLabel?: string;
};

export function DetailActionBar({ primary, secondary, menuItems, menuLabel = "More actions" }: DetailActionBarProps) {
  const compact = useMediaQuery("(max-width: 62em)");

  if (compact && menuItems) {
    return (
      <Group gap="sm" wrap="nowrap" justify="flex-end">
        {primary}
        <Menu shadow="md" width={240} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="default" size="lg" aria-label={menuLabel}>
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>{menuItems}</Menu.Dropdown>
        </Menu>
      </Group>
    );
  }

  return (
    <Group gap="sm" wrap="wrap" justify="flex-end">
      {primary}
      {secondary}
    </Group>
  );
}
