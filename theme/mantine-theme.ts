import type { MantineTheme } from "@mantine/core";
import { extendGdsTheme } from "@doneisbetter/gds/server";
import { KIDEX_BRAND_COLORS } from "@/theme/brand-colors";
import { KIDEX_FONT_FAMILY_LTR, KIDEX_FONT_FAMILY_RTL, KIDEX_FONT_SIZES, KIDEX_FONT_WEIGHTS } from "@/theme/typography";

type Direction = "ltr" | "rtl";

export function getKidexMantineTheme(direction: Direction = "ltr"): MantineTheme {
  return extendGdsTheme({
    primaryColor: "kidex",
    defaultRadius: "md",
    fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
    fontSizes: {
      xs: KIDEX_FONT_SIZES.xs,
      sm: KIDEX_FONT_SIZES.sm,
      md: KIDEX_FONT_SIZES.md,
      lg: KIDEX_FONT_SIZES.lg,
      xl: KIDEX_FONT_SIZES.xl,
    },
    headings: {
      fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
      sizes: {
        h1: { fontSize: KIDEX_FONT_SIZES.h1, lineHeight: "1.2", fontWeight: String(KIDEX_FONT_WEIGHTS.bold) },
        h2: { fontSize: KIDEX_FONT_SIZES.h2, lineHeight: "1.25", fontWeight: String(KIDEX_FONT_WEIGHTS.bold) },
        h3: { fontSize: KIDEX_FONT_SIZES.h3, lineHeight: "1.3", fontWeight: String(KIDEX_FONT_WEIGHTS.semibold) },
      },
    },
    colors: {
      kidex: [
        "#edf8f7",
        "#d2f0ee",
        "#a6e0dc",
        "#77d0ca",
        "#4ac0b8",
        KIDEX_BRAND_COLORS.brandTeal,
        "#0f8f89",
        "#0b6e6a",
        "#084f4c",
        "#043232",
      ],
      accent: [
        "#fff9eb",
        "#fef0c7",
        "#fde08a",
        "#fdcb58",
        KIDEX_BRAND_COLORS.brandGold,
        "#e6b84f",
        "#cc9f3f",
        "#b38632",
        "#996d26",
        "#80551b",
      ],
    },
    black: KIDEX_BRAND_COLORS.brandNavy,
    white: KIDEX_BRAND_COLORS.white,
    primaryShade: 5,
    components: {
      Input: {
        styles: {
          input: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
        },
      },
      Button: {
        styles: {
          root: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
        },
      },
      NavLink: {
        styles: {
          root: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
          label: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
        },
      },
      Menu: {
        styles: {
          item: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
        },
      },
      Table: {
        styles: {
          table: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
          th: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
          td: {
            fontFamily: direction === "rtl" ? KIDEX_FONT_FAMILY_RTL : KIDEX_FONT_FAMILY_LTR,
          },
        },
      },
    },
  });
}
