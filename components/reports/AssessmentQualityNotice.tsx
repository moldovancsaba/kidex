"use client";

import { Badge, Group, List, Stack, Text } from "@mantine/core";
import { SectionPanel } from "@doneisbetter/gds/client";
import { qualityBadgeColor, qualityStateLabel } from "@/lib/assessment-quality";
import type { AssessmentQualitySummary } from "@/types/assessment";

interface AssessmentQualityNoticeProps {
  quality?: AssessmentQualitySummary;
}

export function AssessmentQualityNotice({ quality }: AssessmentQualityNoticeProps) {
  if (!quality) return null;

  return (
    <SectionPanel title="Assessment quality" description="Readiness signal for conductor review and parent-facing sharing.">
      <Stack gap="sm">
        <Group gap="sm" wrap="wrap">
          <Badge color={qualityBadgeColor(quality.state)} variant="light">
            {qualityStateLabel(quality.state)}
          </Badge>
          <Text fw={700}>{quality.score}/100</Text>
        </Group>
        {quality.reasons.length > 0 ? (
          <List spacing={4} size="sm">
            {quality.reasons.map((reason) => (
              <List.Item key={reason.code}>
                <Text component="span" size="sm">
                  {reason.message}
                </Text>
              </List.Item>
            ))}
          </List>
        ) : (
          <Text size="sm" c="dimmed">
            No quality warnings were detected for this assessment.
          </Text>
        )}
      </Stack>
    </SectionPanel>
  );
}
