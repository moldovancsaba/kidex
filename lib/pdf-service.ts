import type { ChildProfile } from "@/repositories/child.repository";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DevelopmentPlan } from "@/lib/development-plans";
import { buildProgressComparisonSummary } from "@/lib/progress-comparison";
import type { RecommendationSummary } from "@/lib/recommendations";
import { buildSessionFocusPriorities } from "@/lib/session-focus";
import type { ChildSupportWorkspace } from "@/lib/support-workspace";
import type { AssessmentRecord } from "@/types/assessment";
import { formatScore } from "./utils";
import { rapidSections } from "./kidex-schema";
import { buildFamilyFriendlyReportSummary } from "./family-report";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

type TFunction = (key: string) => string;

/**
 * PDF service for KIDEX report exports.
 */
export const PdfService = {
  async ensureUnicodeFont(doc: jsPDF): Promise<void> {
    const fontName = "ArialUnicode";
    if (doc.getFontList()[fontName]) {
      doc.setFont(fontName, "normal");
      return;
    }
    const base64 = await fetch("/fonts/Arial.ttf")
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        return btoa(binary);
      })
      .catch(() => "");
    if (!base64) return;
    doc.addFileToVFS("Arial.ttf", base64);
    doc.addFont("Arial.ttf", fontName, "normal");
    doc.setFont(fontName, "normal");
  },
  /**
   * Generates the original technical assessment report.
   */
  async generateOriginalReport(record: AssessmentRecord, t: TFunction, tc: TFunction, ts: TFunction): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    await this.ensureUnicodeFont(doc);
    const reportDate = new Date(record.createdAt).toLocaleDateString();
    const reportTime = new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Logo
    const logoDataUrl = await this.getLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "JPEG", 14, 10, 20, 20);
    }

    // Header
    doc.setFontSize(16);
    doc.text(t("reportPrintTitle"), 38, 16);
    doc.setFontSize(11);
    doc.text(record.child.name, 38, 22);
    
    doc.setFontSize(10);
    doc.text(`${tc("date")}: ${reportDate}`, 140, 14);
    doc.text(`${t("tableTime")}: ${reportTime}`, 140, 19);
    doc.text(`${t("conductor")}: ${record.session.conductor || "—"}`, 140, 24);
    doc.text(`${t("observers")}: ${record.session.observers || "—"}`, 140, 29);

    // Summary Table
    autoTable(doc, {
      startY: 34,
      head: [[ts("movement"), ts("social"), ts("mental"), ts("ski")]],
      body: [[
        formatScore(record.computed.movementAverage),
        formatScore(record.computed.socialAverage),
        formatScore(record.computed.mentalAverage),
        formatScore(record.computed.ski)
      ]],
      theme: "grid",
      styles: { fontSize: 10, halign: "center" }
    });

    // Setup Table
    autoTable(doc, {
      startY: doc.lastAutoTable!.finalY + 4,
      head: [[{ content: t("setupTitle"), colSpan: 2 }]],
      body: [
        [t("childName"), record.child.name],
        [t("birthDate"), record.child.birthDate],
        [t("mode"), record.mode],
        [tc("date"), reportDate],
        [t("location"), record.session.location || "—"],
        [t("conductor"), record.session.conductor || "—"]
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 125 } }
    });

    // Detailed tables mirror the current rapid assessment export format.
    const sections = rapidSections;
    for (const section of sections) {
      autoTable(doc, {
        startY: doc.lastAutoTable!.finalY + 6,
        head: [[{ content: ts(section.key), colSpan: 3 }]],
        body: [],
        theme: "plain",
        styles: { fontSize: 11, fontStyle: "bold" }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable!.finalY + 1,
        head: [[t("tableObservation"), t("tableScore"), t("tableNote")]],
        body: section.items.map((item) => {
          const entry = record.scores[item.key];
          return [ts(`${item.key}.title`), `${entry?.score ?? "—"}`, entry?.note || "—"];
        }),
        theme: "grid",
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 24, halign: "center" }, 2: { cellWidth: 86 } }
      });
    }

    const safeName = (record.child.name || "report").replace(/[^\w-]+/g, "_");
    doc.save(`kidex_report_${safeName}_${reportDate}.pdf`);
  },

  async generateFamilyReport(
    record: AssessmentRecord,
    t: TFunction,
    tc: TFunction,
    ts: TFunction,
    tr: TFunction,
    recommendationSummary: RecommendationSummary,
    plan?: DevelopmentPlan | null,
    childProfile?: ChildProfile | null,
    supportWorkspace?: ChildSupportWorkspace | null,
    history: AssessmentRecord[] = [record],
    historyCount = 1,
  ): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    await this.ensureUnicodeFont(doc);
    const logoDataUrl = await this.getLogoDataUrl();
    const reportDate = new Date(record.createdAt).toLocaleDateString();
    const summary = buildFamilyFriendlyReportSummary({
      record,
      recommendationSummary,
      history,
      historyCount,
      plan,
      accessibilityProfile: childProfile?.accessibilityProfile,
      supportWorkspace,
    });

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "JPEG", 14, 10, 20, 20);
    }

    doc.setFontSize(16);
    doc.text(tr("familyReportTitle"), 38, 16);
    doc.setFontSize(11);
    doc.text(record.child.name, 38, 22);
    doc.setFontSize(10);
    doc.text(`${tc("date")}: ${reportDate}`, 140, 14);

    doc.setFontSize(18);
    doc.text(summary.headline, 20, 44);
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(summary.summary, 170), 20, 55);

    autoTable(doc, {
      startY: 72,
      head: [[tr("familyWhatWeSaw"), tr("familyWhatThisMeans")]],
      body: [
        [ts("movement"), formatScore(record.computed.movementAverage)],
        [ts("social"), formatScore(record.computed.socialAverage)],
        [ts("mental"), formatScore(record.computed.mentalAverage)],
        [ts("ski"), formatScore(record.computed.ski)],
      ],
      theme: "grid",
      styles: { fontSize: 10 },
    });

    let y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : 120;
    doc.setFontSize(14);
    doc.text("Current state right now", 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(summary.currentStateHeadline, 20, y);
    y += 8;
    doc.setFontSize(11);
    const currentStateLines = doc.splitTextToSize(summary.currentStateSummary, 170);
    doc.text(currentStateLines, 20, y);
    y += currentStateLines.length * 5 + 4;
    summary.currentStateDomains.forEach((domain) => {
      const lines = doc.splitTextToSize(`${domain.label}: ${domain.parentLabel}${typeof domain.average === "number" ? ` (${formatScore(domain.average)})` : ""}`, 165);
      doc.text(lines, 24, y);
      y += lines.length * 5 + 1;
    });
    const confidenceLines = doc.splitTextToSize(summary.currentStateConfidence, 165);
    doc.text(confidenceLines, 24, y + 2);
    y += confidenceLines.length * 5 + 8;
    doc.setFontSize(14);
    doc.text("Change over time", 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(summary.progressHeadline, 20, y);
    y += 8;
    doc.setFontSize(11);
    const progressLines = doc.splitTextToSize(summary.progressSummary, 170);
    doc.text(progressLines, 20, y);
    y += progressLines.length * 5 + 4;
    const planEffectivenessLines = doc.splitTextToSize(summary.planEffectivenessSummary, 165);
    doc.text(planEffectivenessLines, 24, y);
    y += planEffectivenessLines.length * 5 + 8;
    doc.setFontSize(14);
    doc.text(tr("familyRecommendationsTitle"), 20, y);
    y += 10;
    doc.setFontSize(11);
    summary.parentGuidance.forEach((guidance) => {
      const titleLines = doc.splitTextToSize(`• ${guidance.title}`, 165);
      doc.text(titleLines, 24, y);
      y += titleLines.length * 5;
      const whyLines = doc.splitTextToSize(`Why now: ${guidance.whyNow}`, 158);
      doc.text(whyLines, 28, y);
      y += whyLines.length * 5;
      guidance.thisWeek.forEach((step) => {
        const stepLines = doc.splitTextToSize(`This week: ${step}`, 154);
        doc.text(stepLines, 32, y);
        y += stepLines.length * 5;
      });
      if (guidance.boundaryNote) {
        const boundaryLines = doc.splitTextToSize(`Boundary: ${guidance.boundaryNote}`, 154);
        doc.text(boundaryLines, 32, y);
        y += boundaryLines.length * 5;
      }
      y += 4;
    });

    if (summary.recommendations.length > 0) {
      doc.setFontSize(14);
      doc.text("Why these suggestions were chosen", 20, y);
      y += 10;
      doc.setFontSize(11);
    }
    summary.recommendations.forEach((recommendation) => {
      const lines = doc.splitTextToSize(`• ${recommendation.title}: ${recommendation.message}`, 165);
      doc.text(lines, 24, y);
      y += lines.length * 5;
      recommendation.evidence.forEach((entry) => {
        const evidenceLines = doc.splitTextToSize(`   ${entry}`, 158);
        doc.text(evidenceLines, 28, y);
        y += evidenceLines.length * 5;
      });
      y += 4;
    });

    doc.setFontSize(14);
    doc.text(tr("familyNextStepsTitle"), 20, y);
    y += 10;
    doc.setFontSize(11);
    summary.nextSteps.forEach((step) => {
      const lines = doc.splitTextToSize(`• ${step}`, 165);
      doc.text(lines, 24, y);
      y += lines.length * 5 + 2;
    });

    if (summary.accessibilityNotes.length > 0) {
      y += 4;
      doc.setFontSize(14);
      doc.text("Helpful support notes", 20, y);
      y += 10;
      doc.setFontSize(11);
      summary.accessibilityNotes.forEach((note) => {
        const lines = doc.splitTextToSize(`• ${note}`, 165);
        doc.text(lines, 24, y);
        y += lines.length * 5 + 2;
      });
    }

    if (summary.referralNotes.length > 0) {
      y += 4;
      doc.setFontSize(14);
      doc.text("Support follow-up", 20, y);
      y += 10;
      doc.setFontSize(11);
      summary.referralNotes.forEach((note) => {
        const lines = doc.splitTextToSize(`• ${note}`, 165);
        doc.text(lines, 24, y);
        y += lines.length * 5 + 2;
      });
    }

    if (summary.evidenceMoments.length > 0) {
      y += 4;
      doc.setFontSize(14);
      doc.text("Recent evidence moments", 20, y);
      y += 10;
      doc.setFontSize(11);
      summary.evidenceMoments.forEach((note) => {
        const lines = doc.splitTextToSize(`• ${note}`, 165);
        doc.text(lines, 24, y);
        y += lines.length * 5 + 2;
      });
    }

    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(tr("familyReportFooter"), 170), 20, 270);

    const safeName = (record.child.name || "family_report").replace(/[^\w-]+/g, "_");
    doc.save(`kidex_family_report_${safeName}_${reportDate}.pdf`);
  },

  /**
   * Generates the professional map report.
   */
  async generateMapReport(
    record: AssessmentRecord, 
    t: TFunction, 
    tc: TFunction, 
    ts: TFunction, 
    tr: TFunction,
    history: AssessmentRecord[] = [],
    recommendationSummary?: RecommendationSummary
  ): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    await this.ensureUnicodeFont(doc);
    const logoDataUrl = await this.getLogoDataUrl();

    // --- PAGE 1: COVER ---
    if (logoDataUrl) doc.addImage(logoDataUrl, "JPEG", 70, 40, 70, 70);
    doc.setFont("ArialUnicode", "normal");
    doc.setFontSize(28);
    doc.text("KIDEX", 105, 130, { align: "center" });
    doc.setFontSize(22);
    doc.text(tr("assessmentReport").toUpperCase(), 105, 145, { align: "center" });
    
    doc.setFont("ArialUnicode", "normal");
    doc.setFontSize(18);
    doc.text(record.child.name, 105, 170, { align: "center" });
    doc.setFontSize(14);
    doc.text(`${record.session.date} · ${tr("latestAssessment")}`, 105, 180, { align: "center" });
    
    doc.setDrawColor(19, 165, 158); // Brand Teal
    doc.setLineWidth(1.5);
    doc.line(40, 200, 170, 200);

    // --- PAGE 2: GENERAL OBSERVATION ---
    doc.addPage();
    this.drawPageHeader(doc, tr("assessmentReport"), record.child.name, logoDataUrl);
    doc.setFontSize(12);
    doc.text(tr("professionalOpinion"), 20, 50);
    doc.setFont("ArialUnicode", "normal");
    doc.text(doc.splitTextToSize(record.notes.general || tr("noGeneralObservation"), 170), 20, 60);

    // --- PAGE 3: DEVELOPMENT TRENDS ---
    if (history.length > 1) {
      doc.addPage();
      this.drawPageHeader(doc, tr("assessmentReport"), record.child.name, logoDataUrl);
      doc.setFontSize(14);
      doc.text(tr("developmentTrends").toUpperCase(), 20, 34);
      doc.setFontSize(11);
      doc.setFont("ArialUnicode", "normal");
      doc.text(doc.splitTextToSize(tr("trendExplanation"), 170), 20, 50);

      const trendData = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Draw a simple line chart
      const chartX = 30;
      const chartY = 120;
      const chartWidth = 150;
      const chartHeight = 40;
      
      // Axes
      doc.setDrawColor(200);
      doc.line(chartX, chartY, chartX + chartWidth, chartY); // X axis
      doc.line(chartX, chartY, chartX, chartY - chartHeight); // Y axis
      
      // Plot SKI Trend
      doc.setDrawColor(19, 165, 158);
      doc.setLineWidth(0.8);
      
      if (trendData.length > 1) {
        const step = chartWidth / (trendData.length - 1);
        for (let i = 0; i < trendData.length - 1; i++) {
          const x1 = chartX + (i * step);
          const y1 = chartY - ((trendData[i].computed.ski || 0) / 6 * chartHeight);
          const x2 = chartX + ((i + 1) * step);
          const y2 = chartY - ((trendData[i+1].computed.ski || 0) / 6 * chartHeight);
          doc.line(x1, y1, x2, y2);
          doc.circle(x1, y1, 0.8, "F");
          if (i === trendData.length - 2) doc.circle(x2, y2, 0.8, "F");
        }
      }
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("SKI Index Evolution", chartX, chartY - chartHeight - 5);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 130,
        head: [[tc("date"), ts("movement"), ts("social"), ts("mental"), ts("ski")]],
        body: trendData.map(a => [
          a.session.date,
          formatScore(a.computed.movementAverage),
          formatScore(a.computed.socialAverage),
          formatScore(a.computed.mentalAverage),
          formatScore(a.computed.ski)
        ]),
        theme: "grid",
        headStyles: { fillColor: [19, 165, 158] }
      });
    }

    // --- PAGE 4: ANALYTICS SNAPSHOT (4 CHARTS) ---
    doc.addPage();
    this.drawPageHeader(doc, tr("assessmentReport"), record.child.name, logoDataUrl);
    doc.setFontSize(14);
    doc.text("ANALYTICS SNAPSHOT", 20, 34);
    const trendData = [...(history.length ? history : [record])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    this.drawDomainTrendLines(doc, trendData, ts);
    this.drawReadinessZoneTimeline(doc, trendData);
    this.drawDomainVarianceChart(doc, trendData, ts);
    this.drawItemDeltaBars(doc, trendData, ts);

    // --- PAGE 5: PROFILES (II-IV ON ONE PAGE) ---
    const domains: Array<{key: string, label: string, color: [number, number, number]}> = [
      { key: "rapid_movement", label: `II. ${ts("movement").toUpperCase()}`, color: [19, 165, 158] },
      { key: "rapid_social", label: `III. ${ts("social").toUpperCase()}`, color: [253, 203, 88] },
      { key: "rapid_mental", label: `IV. ${ts("mental").toUpperCase()}`, color: [61, 63, 77] }
    ];

    doc.addPage();
    this.drawPageHeader(doc, tr("assessmentReport"), record.child.name, logoDataUrl);
    doc.setFontSize(14);
    doc.text(tr("organizationalBalance").toUpperCase(), 20, 34);
    let profileY = 38;

    for (const domain of domains) {
      autoTable(doc, {
        startY: profileY,
        head: [[{ content: domain.label, colSpan: 3 }]],
        body: [],
        theme: "grid",
        styles: { fontSize: 10, fontStyle: "bold" },
        headStyles: { fillColor: domain.color, textColor: [255, 255, 255] }
      });

      const items = rapidSections.find(s => s.key === domain.key)?.items || [];
      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || profileY) + 1,
        head: [[t("tableObservation"), t("tableScore"), t("tableNote")]],
        body: items.map(item => [
          ts(`${item.key}.title`),
          record.scores[item.key]?.score || "—",
          record.scores[item.key]?.note || "—"
        ]),
        theme: "grid",
        headStyles: { fillColor: domain.color }
      });
      profileY = (doc.lastAutoTable?.finalY || profileY) + 4;
    }

    // --- PAGE 6: SKI ---
    doc.addPage();
    this.drawPageHeader(doc, tr("assessmentReport"), record.child.name, logoDataUrl);
    doc.setFontSize(14);
    doc.text(`V. ${ts("ski").toUpperCase()} INDEX`, 20, 34);
    
    const currentSki = record.computed.ski;
    const firstSki = history.length > 0 ? history[history.length - 1].computed.ski : null;

    doc.setFontSize(32);
    doc.setTextColor(19, 165, 158);
    doc.text(formatScore(currentSki), 105, 80, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`KIDEX ${ts("ski").toUpperCase()}`, 105, 95, { align: "center" });

    // Draw a Gauge
    const gaugeX = 105;
    const gaugeY = 125;
    const gaugeRadius = 25;
    
    // Background arc
    doc.setDrawColor(230);
    doc.setLineWidth(4);
    for (let a = 0; a <= 180; a += 5) {
      const rad1 = (180 + a) * Math.PI / 180;
      const rad2 = (180 + a + 5) * Math.PI / 180;
      doc.line(
        gaugeX + Math.cos(rad1) * gaugeRadius, gaugeY + Math.sin(rad1) * gaugeRadius,
        gaugeX + Math.cos(rad2) * gaugeRadius, gaugeY + Math.sin(rad2) * gaugeRadius
      );
    }
    
    // Active arc
    const val = (currentSki || 0) / 6;
    doc.setDrawColor(19, 165, 158);
    for (let a = 0; a <= 180 * val; a += 5) {
      const rad1 = (180 + a) * Math.PI / 180;
      const rad2 = (180 + a + 5) * Math.PI / 180;
      doc.line(
        gaugeX + Math.cos(rad1) * gaugeRadius, gaugeY + Math.sin(rad1) * gaugeRadius,
        gaugeX + Math.cos(rad2) * gaugeRadius, gaugeY + Math.sin(rad2) * gaugeRadius
      );
    }

    // Needle
    const needleRad = (180 + (180 * val)) * Math.PI / 180;
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.line(gaugeX, gaugeY, gaugeX + Math.cos(needleRad) * (gaugeRadius + 5), gaugeY + Math.sin(needleRad) * (gaugeRadius + 5));
    doc.circle(gaugeX, gaugeY, 2, "F");
    
    if (firstSki !== null && history.length > 1) {
      doc.setFontSize(11);
      doc.text(`${tr("latestAssessment")}: ${formatScore(currentSki)}`, 105, 140, { align: "center" });
      doc.text(`${tc("date")} (1.): ${formatScore(firstSki)}`, 105, 147, { align: "center" });
      
      const diff = (currentSki !== null && firstSki !== null) ? currentSki - firstSki : 0;
      if (diff > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text(`+${formatScore(diff)} Improvement`, 105, 155, { align: "center" });
      }
      doc.setTextColor(0, 0, 0);
    }

    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(tr("skiExplanation"), 150), 30, 170);

    // --- PAGE 7: RECOMMENDATIONS + PRIORITIES + FINAL EVALUATION ---
    doc.addPage();
    this.drawPageHeader(doc, tr("assessmentReport"), record.child.name, logoDataUrl);
    doc.setFontSize(12);
    doc.setFontSize(14);
    doc.text(tr("recommendationsTitle").toUpperCase(), 20, 34);
    doc.setFontSize(12);
    doc.text(tr("recommendationsIntro"), 20, 50);
    
    const recs = recommendationSummary?.recommendations || [];
    const progressSummary = recommendationSummary
      ? buildProgressComparisonSummary({
          record,
          history: history.length > 0 ? history : [record],
          recommendationSummary,
        })
      : null;
    const sessionFocus = recommendationSummary && progressSummary
      ? buildSessionFocusPriorities({
          recommendationSummary,
          progressSummary,
        })
      : [];
    
    let y = 65;
    if (recs.length > 0) {
      recs.forEach((rec) => {
        const focus = rec.focusItems.length > 0
          ? ` (${rec.focusItems.map((item) => item.label).join(", ")})`
          : "";
        const lines = doc.splitTextToSize(`• ${rec.title}: ${rec.rationale}${focus}`, 155);
        doc.text(lines, 30, y);
        y += lines.length * 6;
        if (rec.sourceEvidence.length > 0) {
          rec.sourceEvidence.slice(0, 2).forEach((evidence) => {
            const evidenceLines = doc.splitTextToSize(`   Source - ${evidence.label}: ${evidence.detail}`, 148);
            doc.text(evidenceLines, 34, y);
            y += evidenceLines.length * 5;
          });
        }
        y += 4;
      });
      y += 4;
    } else {
      doc.text("• —", 30, y);
      y += 16;
    }

    doc.setFontSize(14);
    doc.text(tr("developmentPrioritiesTitle").toUpperCase(), 20, y);
    doc.setDrawColor(61, 63, 77);
    doc.setLineWidth(0.4);
    doc.line(20, y + 3, 190, y + 3);
    doc.setFontSize(11);
    doc.setFont("ArialUnicode", "normal");
    const prioritiesSource = sessionFocus.length > 0
      ? sessionFocus.map((priority) => `${priority.title}: ${priority.whyNow}`).join(" ")
      : progressSummary
        ? `${progressSummary.headline}. ${progressSummary.conductorSummary}`
        : record.notes.adaptations || tr("noDevelopmentPriorities");
    const prioritiesLines = doc.splitTextToSize(prioritiesSource, 170);
    const prioritiesStartY = y + 13;
    doc.text(prioritiesLines, 20, prioritiesStartY);
    const prioritiesHeight = prioritiesLines.length * 5;
    let prioritiesBottomY = prioritiesStartY + prioritiesHeight;
    if (sessionFocus.length > 0) {
      let focusY = prioritiesBottomY + 8;
      sessionFocus.forEach((priority) => {
        const titleLines = doc.splitTextToSize(`• ${priority.title}`, 165);
        doc.text(titleLines, 24, focusY);
        focusY += titleLines.length * 5;
        const actionLines = doc.splitTextToSize(priority.sessionActions[0] || "", 158);
        doc.text(actionLines, 28, focusY);
        focusY += actionLines.length * 5 + 2;
      });
      prioritiesBottomY = focusY;
    }
    let signatureTitleY = prioritiesBottomY + 12;

    // If content gets too long, move final evaluation block to a clean new page.
    if (signatureTitleY > 175) {
      doc.addPage();
      this.drawPageHeader(doc, tr("assessmentReport"), record.child.name, logoDataUrl);
      signatureTitleY = 40;
    }

    doc.setFontSize(14);
    doc.text(tr("signaturesTitle").toUpperCase(), 20, signatureTitleY);
    doc.line(20, signatureTitleY + 3, 190, signatureTitleY + 3);
    
    const signatureLineY = signatureTitleY + 40;
    doc.line(20, signatureLineY, 80, signatureLineY);
    doc.text("Vígh Milán", 20, signatureLineY + 10);
    doc.setFontSize(9);
    doc.text(tr("president"), 20, signatureLineY + 15);

    doc.setFontSize(12);
    doc.line(130, signatureLineY, 190, signatureLineY);
    doc.text(record.session.conductor || "Kidex Fejlesztő", 130, signatureLineY + 10);
    doc.setFontSize(9);
    doc.text(tr("expert"), 130, signatureLineY + 15);

    const safeName = (record.child.name || "map").replace(/[^\w-]+/g, "_");
    doc.save(`${safeName}_Kidex_Bio-Pszicho-Szocialis_Terkep.pdf`);
  },

  // Helpers
  async getLogoDataUrl(): Promise<string> {
    return fetch("/logo.jpeg")
      .then((res) => res.blob())
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .catch(() => "");
  },

  drawPageHeader(doc: jsPDF, reportTitle: string, childName: string, logoUrl: string) {
    if (logoUrl) doc.addImage(logoUrl, "JPEG", 180, 10, 15, 15);
    doc.setFont("ArialUnicode", "normal");
    doc.setFontSize(12);
    doc.setTextColor(61, 63, 77);
    doc.text(`KIDEX - ${reportTitle.toUpperCase()}`, 20, 16);
    doc.setFontSize(10);
    doc.text(childName, 20, 22);
    doc.setDrawColor(61, 63, 77);
    doc.setLineWidth(0.5);
    doc.line(20, 26, 190, 26);
    doc.setTextColor(0, 0, 0);
  },
  drawDomainTrendLines(doc: jsPDF, data: AssessmentRecord[], ts: TFunction) {
    const x = 20; const y = 40; const w = 80; const h = 35;
    doc.setFontSize(10); doc.text("Domain Trend Lines", x, y - 4);
    doc.rect(x, y, w, h);
    doc.setDrawColor(220);
    doc.line(x, y + h / 2, x + w, y + h / 2);
    const domains = [
      { key: "movementAverage", color: [19, 165, 158] as [number, number, number] },
      { key: "socialAverage", color: [253, 203, 88] as [number, number, number] },
      { key: "mentalAverage", color: [61, 63, 77] as [number, number, number] }
    ];
    domains.forEach((d) => {
      doc.setDrawColor(...d.color);
      const step = w / Math.max(1, data.length - 1);
      if (data.length === 1) {
        const v = (data[0].computed[d.key as "movementAverage"] || 0) / 6;
        doc.circle(x + w / 2, y + h - v * h, 1, "F");
      } else {
        for (let i = 0; i < data.length - 1; i++) {
          const v1 = (data[i].computed[d.key as "movementAverage"] || 0) / 6;
          const v2 = (data[i + 1].computed[d.key as "movementAverage"] || 0) / 6;
          doc.line(x + i * step, y + h - v1 * h, x + (i + 1) * step, y + h - v2 * h);
          doc.circle(x + i * step, y + h - v1 * h, 0.6, "F");
          if (i === data.length - 2) doc.circle(x + (i + 1) * step, y + h - v2 * h, 0.6, "F");
        }
      }
    });
    const last = data[data.length - 1];
    doc.setFontSize(7);
    doc.text(`${ts("movement")}: ${formatScore(last?.computed.movementAverage ?? null)}`, x, y + h + 5);
    doc.text(`${ts("social")}: ${formatScore(last?.computed.socialAverage ?? null)}`, x, y + h + 9);
    doc.text(`${ts("mental")}: ${formatScore(last?.computed.mentalAverage ?? null)}`, x, y + h + 13);
  },
  drawReadinessZoneTimeline(doc: jsPDF, data: AssessmentRecord[]) {
    const x = 110; const y = 40; const w = 80; const h = 35;
    doc.setFontSize(10); doc.text("Readiness Zone Timeline", x, y - 4);
    doc.setFillColor(245, 245, 245); doc.rect(x, y, w, h, "F");
    doc.setFillColor(230, 250, 245); doc.rect(x, y, w, h * 0.42, "F");
    doc.rect(x, y, w, h);
    doc.setDrawColor(19, 165, 158);
    if (data.length === 1) {
      const v = (data[0].computed.ski || 0) / 6;
      doc.circle(x + w / 2, y + h - v * h, 1, "F");
    } else {
      for (let i = 0; i < data.length - 1; i++) {
        const step = w / Math.max(1, data.length - 1);
        const v1 = (data[i].computed.ski || 0) / 6;
        const v2 = (data[i + 1].computed.ski || 0) / 6;
        doc.line(x + i * step, y + h - v1 * h, x + (i + 1) * step, y + h - v2 * h);
      }
    }
    const last = data[data.length - 1]?.computed.ski ?? null;
    doc.setFontSize(7);
    doc.text(`Current SKI ${formatScore(last)} (${(last ?? 0) >= 3.5 ? "Ready" : "Developing"})`, x, y + h + 7);
  },
  drawDomainVarianceChart(doc: jsPDF, data: AssessmentRecord[], ts: TFunction) {
    const x = 20; const y = 95; const w = 80; const h = 40;
    doc.setFontSize(10); doc.text("Domain Variance", x, y - 4);
    doc.rect(x, y, w, h);
    doc.setDrawColor(220);
    doc.line(x, y + h - 4, x + w, y + h - 4);
    const vals = [
      { label: ts("movement"), key: "movementAverage", color: [19, 165, 158] as [number, number, number] },
      { label: ts("social"), key: "socialAverage", color: [253, 203, 88] as [number, number, number] },
      { label: ts("mental"), key: "mentalAverage", color: [61, 63, 77] as [number, number, number] }
    ];
    vals.forEach((d, idx) => {
      const series = data.map((r) => r.computed[d.key as "movementAverage"] || 0);
      const avg = series.reduce((a, b) => a + b, 0) / Math.max(1, series.length);
      const variance = series.reduce((a, v) => a + (v - avg) ** 2, 0) / Math.max(1, series.length);
      const std = Math.sqrt(variance);
      const barH = (std / 3) * (h - 8);
      const bx = x + 8 + idx * 22;
      doc.setFillColor(...d.color); doc.rect(bx, y + h - 4 - Math.max(1.5, barH), 12, Math.max(1.5, barH), "F");
      doc.setFontSize(7); doc.text(formatScore(std), bx, y + h - Math.max(1.5, barH) - 6);
      const label = d.label.split(" ")[0].slice(0, 8);
      doc.text(label, bx, y + h + 3);
    });
  },
  drawItemDeltaBars(doc: jsPDF, data: AssessmentRecord[], ts: TFunction) {
    const x = 110; const y = 95; const w = 80; const h = 40;
    doc.setFontSize(10); doc.text("Top Gains / Regressions", x, y - 4);
    doc.rect(x, y, w, h);
    const first = data[0]; const last = data[data.length - 1];
    const deltas = rapidSections.flatMap((s) => s.items.map((i) => {
      const a = first?.scores[i.key]?.score || 0;
      const b = last?.scores[i.key]?.score || 0;
      return { key: i.key, title: ts(`${i.key}.title`), delta: b - a };
    })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
    deltas.forEach((d, idx) => {
      const yy = y + 8 + idx * 10;
      const len = Math.min(26, Math.abs(d.delta) * 8);
      if (d.delta >= 0) { doc.setFillColor(19, 165, 158); doc.rect(x + 38, yy, len, 5, "F"); }
      else { doc.setFillColor(200, 80, 80); doc.rect(x + 38 - len, yy, len, 5, "F"); }
      doc.setFontSize(7); doc.text(`${d.title.slice(0, 12)} ${d.delta >= 0 ? "+" : ""}${formatScore(d.delta)}`, x + 2, yy + 4);
    });
  }
};
