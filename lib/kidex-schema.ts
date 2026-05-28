import type { AssessmentDomain, AssessmentMode, ScoreItemDefinition } from "@/types/assessment";

export interface ScoreSection {
  key: string;
  domain: AssessmentDomain;
  weight: number;
  items: ScoreItemDefinition[];
}

const item = (key: string, domain: AssessmentDomain): ScoreItemDefinition => ({
  key,
  domain,
  title: "", 
  prompt: ""
});

export const fullSections: ScoreSection[] = [
  {
    key: "movement",
    domain: "movement",
    weight: 0.5,
    items: [
      item("futotechnika", "movement"),
      item("iranyvaltas", "movement"),
      item("dinamikus_egyensuly", "movement"),
      item("statikus_egyensuly", "movement"),
      item("ugraskeszseg", "movement"),
      item("erkezestechnika", "movement"),
      item("esesbiztonsag", "movement"),
      item("testsema", "movement"),
      item("lateralitas", "movement"),
      item("keresztezo_mozgas", "movement"),
      item("szem_kez", "movement"),
      item("szem_lab", "movement"),
      item("eroadagolas", "movement"),
      item("reakcioido", "movement"),
      item("ritmuserzek", "movement"),
      item("mozgassor", "movement"),
      item("praxis", "movement"),
      item("terbeli_tajekozodas", "movement"),
      item("utkozeskezeles", "movement"),
      item("gyorsasag", "movement"),
      item("allokepesseg", "movement"),
      item("izomtonus", "movement"),
      item("finommotorika", "movement"),
      item("propriocepcio", "movement"),
      item("mozgasadaptacio", "movement")
    ]
  },
  {
    key: "social",
    domain: "social",
    weight: 0.3,
    items: [
      item("kooperacio", "social"),
      item("szabalykovetes", "social"),
      item("varakozasi_tolerancia", "social"),
      item("kudarctures", "social"),
      item("gyozelem_kezelese", "social"),
      item("erzelemszabalyozas", "social"),
      item("empatia", "social"),
      item("kapcsolatkezdemenyezes", "social"),
      item("instrukcio_elfogadas", "social"),
      item("szerepvallalas", "social"),
      item("fair_play", "social"),
      item("konfliktuskezeles", "social"),
      item("motivacio", "social"),
      item("kitartas", "social"),
      item("onbizalom", "social")
    ]
  },
  {
    key: "mental",
    domain: "mental",
    weight: 0.2,
    items: [
      item("figyelmi_fokusz", "mental"),
      item("megosztott_figyelem", "mental"),
      item("munkamemoria", "mental"),
      item("kognitiv_rugalmassag", "mental"),
      item("impulzuskontroll", "mental"),
      item("tervezes", "mental"),
      item("onjavitas", "mental"),
      item("terhelhetoseg", "mental"),
      item("teljesitmenyszorongas", "mental"),
      item("celorientacio", "mental")
    ]
  }
];

export const rapidSections: ScoreSection[] = [
  {
    key: "rapid_movement",
    domain: "movement",
    weight: 1 / 3,
    items: [
      item("labboltozat", "movement"),
      item("egyensuly_rapid", "movement"),
      item("szokdeles", "movement"),
      item("testtartas", "movement")
    ]
  },
  {
    key: "rapid_mental",
    domain: "mental",
    weight: 1 / 3,
    items: [
      item("figyelem_rapid", "mental"),
      item("feladatmegertes", "mental"),
      item("kitartas_rapid", "mental"),
      item("frusztracio", "mental")
    ]
  },
  {
    key: "rapid_social",
    domain: "social",
    weight: 1 / 3,
    items: [
      item("egyuttmukodes_rapid", "social"),
      item("szabalykovetes_rapid", "social"),
      item("kommunikacio_rapid", "social"),
      item("versenyreakcio", "social")
    ]
  }
];

export function sectionsForMode(mode: AssessmentMode): ScoreSection[] {
  return mode === "full" ? fullSections : rapidSections;
}
