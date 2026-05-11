import type { StandardsConfiguration } from "@/lib/standards-config";
import type { InstitutionDefinition } from "@/lib/institutions";

export interface KidexSettings {
  conductors: string[];
  observers: string[];
  locations: string[];
  institutions: InstitutionDefinition[];
  company: {
    name: string;
    ico: string;
    registered: string;
    legalForm: string;
    address: string;
    shareCapital: string;
    vatNo: string;
    website: string;
  };
  emailTemplates: {
    en: { subject: string; body: string };
    hu: { subject: string; body: string };
    ar: { subject: string; body: string };
  };
  standards: StandardsConfiguration;
}

const STORAGE_KEY = "kidex-settings-local";
export const DEFAULT_KIDEX_SETTINGS: KidexSettings = {
  conductors: [],
  observers: [],
  locations: [],
  institutions: [
    {
      id: "default",
      name: "Default Institution",
      status: "active",
      notes: "Bootstrap fallback institution."
    }
  ],
  company: {
    name: "KIDEX s.r.o.",
    ico: "57474869",
    registered: "19.02.2026",
    legalForm: "Limited Liability Company",
    address: "Želiarsky svah 29, Štúrovo, Slovakia 943 01",
    shareCapital: "EUR 5 000",
    vatNo: "SK2122770606",
    website: "https://kidex.eu"
  },
  emailTemplates: {
    en: {
      subject: "Welcome to KIDEX - You have been invited",
      body: "<h1>Welcome to KIDEX</h1><p>You have been invited to join the KIDEX Bio-Psycho-Social Sport Ecosystem.</p><p>You can now log in using your email address at:</p><a href=\"{{link}}\" style=\"padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 6px; display: inline-block;\">Login to Dashboard</a><p>If the button doesn't work, copy and paste this link: {{link}}</p>"
    },
    hu: {
      subject: "Üdvözöljük a KIDEX-ben - Meghívót kapott",
      body: "<h1>Üdvözöljük a KIDEX-ben</h1><p>Meghívást kapott a KIDEX Bio-pszicho-szociális sport ökoszisztémába.</p><p>Mostantól bejelentkezhet az e-mail címével az alábbi linken:</p><a href=\"{{link}}\" style=\"padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 6px; display: inline-block;\">Belépés a Vezérlőpultra</a><p>Ha a gomb nem működik, másolja be ezt a linket a böngészőjébe: {{link}}</p>"
    },
    ar: {
      subject: "مرحباً بك في كيديكس - لقد تم دعوتك",
      body: "<div dir=\"rtl\"><h1>مرحباً بك في كيديكس</h1><p>لقد تم دعوتك للانضمام إلى نظام كيديكس الرياضي الحيوي-النفسي-الاجتماعي.</p><p>يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني عبر الرابط التالي:</p><a href=\"{{link}}\" style=\"padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 6px; display: inline-block;\">تسجيل الدخول إلى لوحة التحكم</a><p>إذا لم يعمل الزر، قم بنسخ ولصق هذا الرابط: {{link}}</p></div>"
    }
  },
  standards: {
    activeVersion: "v1",
    versions: {
      v1: {
        meta: { createdAt: new Date().toISOString(), status: "published", notes: "Initial baseline standards." },
        formula: {
          domainWeights: {
            movement: 0.5,
            social: 0.3,
            mental: 0.2,
          },
          readinessMetric: "ski",
          readinessThreshold: "min",
          aspirationThreshold: "target",
        },
        "4-6": {
          movement: { target: 4.5, min: 3.0 },
          social: { target: 4.0, min: 2.5 },
          mental: { target: 3.5, min: 2.0 },
          ski: { target: 4.0, min: 2.5 }
        },
        "7-9": {
          movement: { target: 5.0, min: 3.5 },
          social: { target: 4.5, min: 3.0 },
          mental: { target: 4.0, min: 2.5 },
          ski: { target: 4.5, min: 3.0 }
        },
        "10-12": {
          movement: { target: 5.5, min: 4.0 },
          social: { target: 5.0, min: 3.5 },
          mental: { target: 4.5, min: 3.0 },
          ski: { target: 5.0, min: 3.5 }
        }
      }
    }
  }
};

function normalizeSettings(raw: Partial<KidexSettings> | null | undefined): KidexSettings {
  const next = raw ?? {};
  return {
    ...DEFAULT_KIDEX_SETTINGS,
    conductors: next.conductors ?? DEFAULT_KIDEX_SETTINGS.conductors,
    observers: next.observers ?? DEFAULT_KIDEX_SETTINGS.observers,
    locations: next.locations ?? DEFAULT_KIDEX_SETTINGS.locations,
    institutions: next.institutions ?? DEFAULT_KIDEX_SETTINGS.institutions,
    company: {
      ...DEFAULT_KIDEX_SETTINGS.company,
      ...(next.company ?? {})
    },
    emailTemplates: {
      ...DEFAULT_KIDEX_SETTINGS.emailTemplates,
      ...(next.emailTemplates ?? {})
    },
    standards: {
      ...DEFAULT_KIDEX_SETTINGS.standards,
      ...(next.standards ?? {})
    }
  };
}

export async function getSettings(): Promise<KidexSettings> {
  const response = await fetch("/api/settings").catch(() => null);
  if (response?.ok) {
    return normalizeSettings((await response.json()) as Partial<KidexSettings>);
  }
  
  // Fallback to local storage or empty settings
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) return normalizeSettings(JSON.parse(local) as Partial<KidexSettings>);
  
  return DEFAULT_KIDEX_SETTINGS;
}

export async function saveSettings(settings: KidexSettings): Promise<boolean> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  }).catch(() => null);
  
  return !!response?.ok;
}
