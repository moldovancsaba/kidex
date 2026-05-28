"use client";

import type { ReactNode } from "react";
import {
  EditorScaffold as GdsEditorScaffold,
  type EditorScaffoldProps as GdsEditorScaffoldProps,
} from "@doneisbetter/gds/client";

export interface EditorScaffoldProps {
  header?: ReactNode;
  form: ReactNode;
  preview?: ReactNode;
  settings?: ReactNode;
  footer?: ReactNode;
  context?: ReactNode;
}

export function EditorScaffold({ header, form, preview, settings, footer, context }: EditorScaffoldProps) {
  const props: GdsEditorScaffoldProps = {
    header,
    form,
    preview,
    settings,
    footer,
    context,
  };

  return <GdsEditorScaffold {...props} />;
}
