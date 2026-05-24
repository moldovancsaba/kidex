"use client";

import { Box, Loader } from "@mantine/core";

type LoadingStateProps = {
  label: string;
  minHeight?: number | string;
};

export function LoadingState({ label, minHeight = "50vh" }: LoadingStateProps) {
  return (
    <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight }} role="status">
      <Loader aria-label={label} />
    </Box>
  );
}
