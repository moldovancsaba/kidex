import { Button, Container, Title, Text, Stack, Group, Box, ThemeIcon, Alert } from "@mantine/core";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("Landing");
  const { error } = await searchParams;

  return (
    <Box bg="black" c="white" style={{ minHeight: "100vh" }}>
      <Container size="lg" py={100}>
        <Stack gap={60} align="center" style={{ textAlign: "center" }}>
          {error === "access_denied" && (
            <Alert color="red" title="Access Denied" radius="md" style={{ maxWidth: 500 }}>
              {t("accessDenied")}
            </Alert>
          )}
          <Box bg="white" style={{ borderRadius: "var(--mantine-radius-lg)", padding: 24, boxShadow: "var(--mantine-shadow-xl)" }}>
            <Image src="/logo.jpeg" alt="KIDEX" width={180} height={180} priority />
          </Box>

          <Stack gap="xl">
            <Title order={1} size={64} fw={900} style={{ letterSpacing: "-2px", lineHeight: 1.1 }}>
              {t("title")}
            </Title>
            <Text size="xl" c="gray.4" maw={700} mx="auto" style={{ lineHeight: 1.6 }}>
              {t("subtitle")}
            </Text>
          </Stack>

          <Group gap="xl" justify="center">
            {[t("feature1"), t("feature2"), t("feature3")].map((feature, i) => (
              <Group key={i} gap="sm" wrap="nowrap">
                <ThemeIcon color="kidex" size={24} radius="xl">
                  <Box bg="white" style={{ width: 10, height: 10, borderRadius: "50%" }} />
                </ThemeIcon>
                <Text fw={500}>{feature}</Text>
              </Group>
            ))}
          </Group>

          <Stack gap="md" align="center">
            <Button component="a" href="/api/auth/login" size="xl" radius="md" color="kidex" px={40} h={60} fz="1.2rem" fw={700}>
              {t("login")}
            </Button>
            <Text size="sm" c="gray.4">
              Secure SSO via DoneIsBetter
            </Text>
          </Stack>
        </Stack>
      </Container>

      <Box
        component="footer"
        py="xl"
        style={{
          borderTop: "1px solid var(--mantine-color-dark-4)",
          textAlign: "center",
        }}
      >
        <Container size="lg">
          <Group justify="center" gap="xl">
            <Text component="a" href="/en/legal/gtc" size="sm" c="gray.4" td="none">
              Terms of Service
            </Text>
            <Text component="a" href="/en/legal/privacy" size="sm" c="gray.4" td="none">
              Privacy Policy
            </Text>
          </Group>
        </Container>
      </Box>

      <Box
        style={{
          height: 10,
          background: "linear-gradient(90deg, var(--mantine-color-kidex-5), var(--mantine-color-black))",
        }}
      />
    </Box>
  );
}
