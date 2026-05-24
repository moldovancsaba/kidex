import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/theme/brand-colors",
              message: "Use Mantine theme tokens in feature UI; brand-colors is theme-internal only.",
            },
            {
              name: "@/theme/tokens",
              message: "Use Mantine theme tokens; theme/tokens.ts was removed.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value='@/components/ui/legacy-form-primitives']",
          message: "Use native Mantine components directly; legacy form primitives are forbidden.",
        },
        {
          selector: "JSXAttribute[name.name='size'][value.type='Literal'][value.value='xs']",
          message: 'Use tokenized sizes sm/md/lg/xl; do not use size="xs".',
        },
        {
          selector: "JSXAttribute[name.name='radius'][value.type='Literal'][value.value='sm']",
          message: "Use the global radius token (md) for consistent corner geometry.",
        },
        {
          selector: "JSXAttribute[name.name='style'] JSXExpressionContainer > ObjectExpression > Property[key.name='borderRadius'] > Literal[value=8]",
          message: "Do not hardcode borderRadius 8; use theme radius tokens.",
        },
        {
          selector: "JSXAttribute[name.name='style'] JSXExpressionContainer > ObjectExpression > Property[key.name='borderRadius'] > Literal[value='8px']",
          message: "Do not hardcode borderRadius 8px; use theme radius tokens.",
        },
      ],
    },
  },
];
