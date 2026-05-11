import { NextResponse } from "next/server";
import { getGlobalSettings, updateGlobalSettings } from "@/repositories/settings.repository";
import { getAuthenticatedActor, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/api";
import { normalizeInstitutionDirectory } from "@/lib/institutions";
import { normalizeStandardsConfiguration } from "@/lib/standards-config";
import { parseSettingsPayload } from "@/lib/validations";
import { DEFAULT_KIDEX_SETTINGS } from "@/services/settings-service";

export async function GET(request: Request) {
  const { error } = await requirePermission(request, "settings.read");
  if (error) return error;

  try {
    const settings = await getGlobalSettings();
    if (!settings) {
      return NextResponse.json(DEFAULT_KIDEX_SETTINGS);
    }
    return NextResponse.json({
      ...DEFAULT_KIDEX_SETTINGS,
      ...settings,
      company: {
        ...DEFAULT_KIDEX_SETTINGS.company,
        ...(settings.company ?? {})
      }
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, "settings.write");
  if (error) return error;

  try {
    const body = parseSettingsPayload(await readJson(request));
    const actor = await getAuthenticatedActor(request);
    const institutions = normalizeInstitutionDirectory(body.institutions);
    const standards = normalizeStandardsConfiguration(
      body.standards,
      DEFAULT_KIDEX_SETTINGS.standards,
      actor?.email,
    );
    const settings = await updateGlobalSettings({
      ...DEFAULT_KIDEX_SETTINGS,
      ...body,
      institutions,
      standards
    });
    await recordAuditEvent({
      action: "settings.update",
      status: "success",
      actor,
      request,
      targetType: "settings",
      targetId: "global_settings",
      targetLabel: "Global settings",
      summary: "Global settings updated",
      metadata: {
        locations: settings.locations.length,
        institutions: settings.institutions.length,
        activeStandardsVersion: settings.standards.activeVersion,
        standardsVersions: Object.keys(settings.standards.versions).length,
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
