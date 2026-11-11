"use client";

import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import type { ReportTemplateResponse } from "@/lib/api/reporting";
import type { OfficialHeaderDto } from "@/lib/api/school";
import { cn } from "@/lib/utils/cn";

type BulletinTemplatePreviewProps = {
  template: ReportTemplateResponse;
  language: "FR" | "EN";
  schoolNameFr: string;
  schoolNameEn: string;
  postalBox: string;
  phones: string[];
  header: OfficialHeaderDto | null;
  /** Libellé année scolaire courante (API academic-years). */
  yearLabel?: string;
  /** Numéro de trimestre courant (1–3) pour le gabarit TERM. */
  termNumber?: number;
};

/** Palette maquette KOBE — docs/maquette-bulletins-kobe.pdf */
const C = {
  ink: "#0F3D4C",
  header: "#1C6E7D",
  tint: "#E6F0F2",
  amber: "#C98A1B",
  fail: "#B3261E",
  muted: "#55707A",
  line: "#9DB4BB",
  white: "#FFFFFF",
} as const;

const PASS = 10;

type DemoSubject = {
  name: string;
  teacher: string;
  competency?: string | null;
  marks: (number | null)[];
  avg: number;
  coef: number;
  total: number;
  app: string;
  rank?: number | null;
  classAvg?: number | null;
  passed?: number | null;
};

type DemoGroup = {
  name: string;
  subjects: DemoSubject[];
  avg: number;
  coef: number;
  total: number;
};

/** Aperçu HTML A4 (Z1–Z10) — fidèle maquette KOBE, données démo anonymisées. */
export function BulletinTemplatePreview({
  template,
  language,
  schoolNameFr,
  schoolNameEn,
  postalBox,
  phones,
  header,
  yearLabel,
  termNumber = 1,
}: BulletinTemplatePreviewProps) {
  const isTerm = template.periodType === "TERM";
  const fr = language === "FR";
  const cols = template.sequenceColumns;
  const phoneLine = phones.filter(Boolean).join(" / ");
  const bp = postalBox.trim();
  const year = yearLabel?.trim() || "—";
  const termN = Math.min(3, Math.max(1, termNumber));

  const bannerTitle = isTerm
    ? fr
      ? "BULLETIN DE TRIMESTRE · REPORT CARD"
      : "REPORT CARD · BULLETIN DE TRIMESTRE"
    : fr
      ? "BULLETIN ANNUEL DE NOTES · ANNUAL REPORT CARD"
      : "ANNUAL REPORT CARD · BULLETIN ANNUEL DE NOTES";
  const termLabelFr =
    termN === 1 ? "1er TRIMESTRE" : termN === 2 ? "2e TRIMESTRE" : "3e TRIMESTRE";
  const termLabelEn =
    termN === 1 ? "FIRST TERM" : termN === 2 ? "SECOND TERM" : "THIRD TERM";
  const bannerRight = isTerm
    ? fr
      ? `${termLabelFr} · ${year}`
      : `${termLabelEn} · ${year}`
    : fr
      ? `Année scolaire ${year}`
      : `School year ${year}`;

  const groups = demoGroups(isTerm, fr, cols);
  const legendRaw =
    (fr ? template.legend?.fr : template.legend?.en) ||
    (isTerm
      ? fr
        ? "A+ parfaitement acquis · A acquis ≥ 14 · ECA en cours 10–14 · NA non acquis < 10"
        : "A+ perfectly acquired · A acquired ≥ 14 · ECA in progress 10–14 · NA not acquired < 10"
      : "A ≥ 16 · B+ ≥ 14 · B ≥ 12 · C < 12");
  const verificationCode = "2027060100123";
  const verificationCodeDisplay = formatVerificationCode(verificationCode);
  const printedAt = isTerm
    ? fr
      ? "17/12/2026 à 09:40"
      : "17/12/2026 at 09:40"
    : fr
      ? "01/07/2027 à 10:15"
      : "01/07/2027 at 10:15";
  const verifyUrl = fr ? "exemple.cm/verif" : "example.cm/verify";
  const verifyLabel = fr ? "Vérification" : "Check";
  const disclaimerLine = fr
    ? `Bulletin délivré sans rature ni surcharge · Imprimé le ${printedAt}`
    : isTerm
      ? `Issued without erasure or alteration · Printed on ${printedAt}`
      : `Report card issued without alteration · Printed on ${printedAt}`;

  /** En-tête : uniquement données école (API / Paramètres), sans inventer CENTRE/MFOUNDI. */
  const contactFr = [bp && `B.P. : ${bp}`, phoneLine && `Tél. : ${phoneLine}`]
    .filter(Boolean)
    .join("  ·  ");
  const contactEn = [bp && `P.O. Box : ${bp}`, phoneLine && `Tel. : ${phoneLine}`]
    .filter(Boolean)
    .join("  ·  ");

  const frLines = [
    header?.republic.fr?.trim(),
    header?.motto.fr?.trim(),
    header?.ministry.fr?.trim(),
    header?.regionalDelegation?.fr?.trim(),
    header?.divisionalDelegation?.fr?.trim(),
    schoolNameFr.trim() || undefined,
    contactFr || undefined,
  ].filter((line): line is string => Boolean(line));

  const enLines = [
    header?.republic.en?.trim(),
    header?.motto.en?.trim(),
    header?.ministry.en?.trim(),
    header?.regionalDelegation?.en?.trim(),
    header?.divisionalDelegation?.en?.trim(),
    schoolNameEn.trim() || undefined,
    contactEn || undefined,
  ].filter((line): line is string => Boolean(line));

  const identity = [
    {
      label: fr ? "NOMS ET PRÉNOMS" : "FULL NAMES",
      value: fr ? "NOM Prénoms" : "Surname First names",
    },
    {
      label: fr ? "CLASSE" : "CLASS",
      value: isTerm ? (fr ? "6ème" : "Form 1") : fr ? "6ème" : "Form 1",
    },
    {
      label: fr ? "MATRICULE" : "REGISTRATION NUMBER",
      value: "26A0001",
    },
    {
      label: fr ? "NÉ(E) LE / À" : "DATE AND PLACE OF BIRTH",
      value: "01/01/2015 — Yaoundé",
    },
    { label: fr ? "SEXE" : "SEX", value: fr ? "Féminin" : "Female" },
    { label: fr ? "REDOUBLANT(E)" : "REPEATER", value: fr ? "Non" : "No" },
    {
      label: fr ? "PROFESSEUR PRINCIPAL" : "CLASS MASTER / MISTRESS",
      value: "Mme T1",
    },
    {
      label: fr ? "EFFECTIF DE LA CLASSE" : "N° ON ROLL",
      value: isTerm ? "14" : "21",
    },
    {
      label: fr ? "LANGUE DU BULLETIN" : "REPORT LANGUAGE",
      value: fr ? "Français" : "English",
    },
  ];

  return (
    <div
      className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-[6px] border bg-white shadow-[var(--ios-shadow)]"
      style={{ borderColor: C.line, color: C.ink, fontFamily: "Inter, Liberation Sans, Arial, sans-serif" }}
    >
      <div
        className="space-y-[5px] overflow-hidden p-[6mm] sm:p-[8mm]"
        style={{ fontSize: "7pt", lineHeight: 1.12 }}
      >
        {/* Z1 — En-tête bilingue */}
        <div className="grid grid-cols-[1fr_72px_1fr] items-start gap-2">
          <HeaderColumn lines={frLines} />
          <div className="flex items-center justify-center pt-1">
            <BrandMark
              size="lg"
              className="!size-[64px] !rounded-full !bg-white !shadow-none ring-1"
              alt=""
            />
          </div>
          <HeaderColumn lines={enLines} />
        </div>

        {/* Bandeau titre */}
        <div
          className="flex items-center justify-between gap-2 rounded-[4px] px-2.5 py-1.5 text-white"
          style={{ backgroundColor: C.ink }}
        >
          <p className="font-bold uppercase tracking-[0.04em]" style={{ fontSize: "11pt" }}>
            {bannerTitle}
          </p>
          <p className="shrink-0 whitespace-nowrap" style={{ fontSize: "7pt", color: "#D7E6EA" }}>
            {bannerRight}
          </p>
        </div>

        {/* Z2 — Identité 3×3 + photo scolaire (≠ avatar compte) */}
        <div
          className="grid grid-cols-[1fr_68px] overflow-hidden rounded-[5px] border"
          style={{ borderColor: C.line }}
        >
          <div className="grid grid-cols-3">
            {identity.map((cell, i) => (
              <div
                key={cell.label}
                className="px-1.5 py-[2px]"
                style={{
                  borderRight: i % 3 !== 2 ? `1px solid ${C.line}` : undefined,
                  borderBottom: i < 6 ? `1px solid ${C.line}` : undefined,
                }}
              >
                <p
                  className="uppercase leading-none tracking-[0.04em]"
                  style={{ fontSize: "4.8pt", color: C.muted }}
                >
                  {cell.label}
                </p>
                <p
                  className="font-bold leading-tight"
                  style={{ fontSize: "7pt", color: C.ink, marginTop: "1px" }}
                >
                  {cell.value}
                </p>
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-center p-1"
            style={{
              borderLeft: `1px solid ${C.line}`,
              backgroundColor: C.tint,
            }}
            title={fr ? "Photo scolaire" : "School photo"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mock/sample-student-school-photo.png"
              alt=""
              className="h-[62px] w-[52px] object-cover object-top"
              style={{ border: `1px solid ${C.line}` }}
            />
          </div>
        </div>

        {/* Z3 + Z4 — Tableau (largeur A4 fixe, jamais de scroll horizontal) */}
        <table
          className="w-full border-collapse"
          style={{ fontSize: "6.4pt", tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: subjectColWidth(cols.length, template) }} />
            {cols.map((n) => (
              <col key={n} style={{ width: markColWidth(cols.length, template) }} />
            ))}
            <col style={{ width: "6.5%" }} />
            <col style={{ width: "4.5%" }} />
            <col style={{ width: "6.5%" }} />
            {template.showSubjectRank ? <col style={{ width: "4%" }} /> : null}
            {template.showSubjectClassAverage ? <col style={{ width: "5.5%" }} /> : null}
            {template.showSubjectPassedCount ? <col style={{ width: "5%" }} /> : null}
            <col style={{ width: "5.5%" }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: C.header, color: C.white }}>
              <Th left>
                {isTerm
                  ? fr
                    ? "DISCIPLINES / ENS. / COMPÉTENCE"
                    : "SUBJECTS / TEACHER / COMPETENCY"
                  : fr
                    ? "DISCIPLINES / ENS."
                    : "SUBJECTS / TCH."}
              </Th>
              {cols.map((n, i) => (
                <Th key={n}>{isTerm ? `EVAL ${i + 1}` : `D${n}`}</Th>
              ))}
              <Th>{fr ? "MOY/20" : "AV/20"}</Th>
              <Th>COEF</Th>
              <Th>{isTerm ? (fr ? "MOY×COEF" : "AV×COEF") : "TOT"}</Th>
              {template.showSubjectRank ? <Th>POS.</Th> : null}
              {template.showSubjectClassAverage ? (
                <Th>{fr ? "MOY. CL." : "CLASS AV."}</Th>
              ) : null}
              {template.showSubjectPassedCount ? (
                <Th>{fr ? "MOY ≥ 10" : "AV ≥ 10"}</Th>
              ) : null}
              <Th>{isTerm ? (fr ? "APPRÉC." : "REMARK") : fr ? "APP." : "REM."}</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupBlock key={group.name} group={group} template={template} cols={cols} fr={fr} />
            ))}
          </tbody>
        </table>

        {/* Z5–Z7 — 3 cadres (annuel ≠ trimestre, maquette KOBE) */}
        {isTerm ? (
          <div className="grid grid-cols-3 gap-[5px]">
            <Frame title={fr ? "RÉSULTAT DU TRIMESTRE" : "TERM RESULT"}>
              <DottedStat label={fr ? "Total points" : "Total points"} value="317,50 / 560" />
              <div
                className="flex items-baseline justify-between gap-1 border-b border-dotted py-[3px]"
                style={{ borderColor: C.line }}
              >
                <span style={{ fontSize: "6.2pt", color: C.ink }}>
                  {fr ? "Moyenne du trimestre" : "Term average"}
                </span>
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: "14pt", color: C.ink, lineHeight: 1 }}
                >
                  11,34
                  <span style={{ fontSize: "8pt", fontWeight: 700 }}> /20</span>
                </span>
              </div>
              <DottedStat label={fr ? "Rang" : "Position"} value="6 / 14" />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-block px-3.5 py-[4px] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: C.amber, fontSize: "7pt", borderRadius: "4px" }}
                >
                  {fr ? "PASSABLE" : "FAIR"}
                </span>
                <span style={{ fontSize: "5.5pt", color: C.ink }}>
                  {fr ? "Admis en 10 / 11 matières" : "Passed in 10 / 11 subjects"}
                </span>
              </div>
            </Frame>

            <Frame title={fr ? "PROFIL DE LA CLASSE" : "CLASS PROFILE"}>
              <DottedStat
                label={
                  fr
                    ? `Moyenne ≥ ${template.classProfileThreshold ?? 10}`
                    : `Average ≥ ${template.classProfileThreshold ?? 10}`
                }
                value="10"
              />
              <DottedStat label={fr ? "Moyenne de la classe" : "Class average"} value="11,92" />
              <DottedStat label={fr ? "% de réussite" : "Success rate"} value="71,43 %" />
              <DottedStat label={fr ? "Max · min" : "Max · min"} value="15,10 · 7,21" />
            </Frame>

            <Frame title={fr ? "À RENFORCER" : "MAKE EFFORT IN"}>
              {template.showEffortSubjects ? (
                <>
                  <p
                    className="font-bold uppercase"
                    style={{ fontSize: "11pt", color: C.ink, lineHeight: 1.15 }}
                  >
                    {fr ? "FRANÇAIS" : "FRENCH"}
                  </p>
                  <p style={{ fontSize: "5pt", color: C.muted, marginTop: 4, lineHeight: 1.3 }}>
                    {fr
                      ? "(matières avec moyenne < 10 · seuil = paramètre, Q-28)"
                      : "(subjects with average below 10 · threshold = parameter, Q-28)"}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: "6pt", color: C.muted }}>—</p>
              )}
            </Frame>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[5px]">
            <Frame title={fr ? "RÉSULTAT ANNUEL" : "ANNUAL RESULT"}>
              <div
                className="flex items-baseline justify-between gap-1 border-b border-dotted pb-1"
                style={{ borderColor: C.line }}
              >
                <span style={{ fontSize: "6.2pt", color: C.ink }}>
                  {fr ? "Moyenne de l'élève" : "Student average"}
                </span>
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: "14pt", color: C.ink, lineHeight: 1 }}
                >
                  10,80
                  <span style={{ fontSize: "8pt", fontWeight: 700 }}> /20</span>
                </span>
              </div>
              <div
                className="mt-1 flex items-baseline justify-between gap-1 border-b border-dotted pb-1"
                style={{ borderColor: C.line }}
              >
                <span style={{ fontSize: "6.5pt", color: C.ink }}>{fr ? "Rang" : "Rank"}</span>
                <span className="font-bold tabular-nums" style={{ fontSize: "8.5pt", color: C.ink }}>
                  4 / 21
                </span>
              </div>
              <span
                className="mt-1.5 inline-block px-3.5 py-[4px] font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: C.amber, fontSize: "7pt", borderRadius: "4px" }}
              >
                {fr ? "PASSABLE" : "FAIR"}
              </span>
            </Frame>

            <Frame title={fr ? "RAPPELS DES MOYENNES" : "TERM AVERAGES"}>
              <table
                className="w-full border-collapse"
                style={{ fontSize: "6.2pt", tableLayout: "fixed" }}
              >
                <colgroup>
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "31%" }} />
                  <col style={{ width: "31%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="border p-[3px]" style={{ borderColor: C.line }} />
                    <th
                      className="border p-[3px] text-center font-bold"
                      style={{ borderColor: C.line, color: C.ink }}
                    >
                      MOY.
                    </th>
                    <th
                      className="border p-[3px] text-center font-bold"
                      style={{ borderColor: C.line, color: C.ink }}
                    >
                      {fr ? "RANG" : "RANK"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(fr
                    ? [
                        ["TRIM 1", "10,64", "5"],
                        ["TRIM 2", "10,78", "4"],
                        ["TRIM 3", "10,99", "4"],
                      ]
                    : [
                        ["TERM 1", "10,64", "5"],
                        ["TERM 2", "10,78", "4"],
                        ["TERM 3", "10,99", "4"],
                      ]
                  ).map(([t, m, r]) => (
                    <tr key={t}>
                      <td
                        className="border p-[3px] text-center font-bold"
                        style={{ borderColor: C.line, color: C.ink, backgroundColor: C.tint }}
                      >
                        {t}
                      </td>
                      <td
                        className="border p-[3px] text-center tabular-nums"
                        style={{ borderColor: C.line, color: C.ink }}
                      >
                        {m}
                      </td>
                      <td
                        className="border p-[3px] text-center tabular-nums"
                        style={{ borderColor: C.line, color: C.ink }}
                      >
                        {r}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Frame>

            <Frame title={fr ? "PROFIL DE LA CLASSE" : "CLASS PROFILE"}>
              <DottedStat
                label={
                  fr
                    ? `Élèves avec moyenne ≥ ${template.classProfileThreshold ?? 12}`
                    : `Pupils with average ≥ ${template.classProfileThreshold ?? 12}`
                }
                value="6"
              />
              <DottedStat label={fr ? "Moyenne de la classe" : "Class average"} value="10,84" />
              <DottedStat label={fr ? "% de réussite" : "Pass rate"} value="28,57 %" />
              <DottedStat label={fr ? "Moyenne max - min" : "Max - min average"} value="14,62 - 6,38" />
            </Frame>
          </div>
        )}

        {/* Z8–Z9 */}
        <div className="grid grid-cols-2 gap-[5px]">
          <Frame title={fr ? "TRAVAIL DE L'ÉLÈVE" : "WORK"}>
            <DotRow label={fr ? "Tableau d'honneur" : "Honour roll"} value={fr ? "Non" : "No"} />
            <DotRow
              label={
                fr
                  ? "T.H. + encouragements — félicitations"
                  : "H.R. + encouragement — congratulation"
              }
              value="—"
            />
            <DotRow
              label={fr ? "Avertissement — blâme travail" : "Academic warning"}
              value="—"
            />
          </Frame>
          <Frame title={fr ? "CONDUITE DE L'ÉLÈVE" : "CONDUCT"}>
            <DotRow
              label={fr ? "Absences (h) — non justifiées" : "Absences (h) — unjustified"}
              value={fr ? "4 · 1" : "4 · 1"}
            />
            <DotRow label={fr ? "Retards / Absentéisme" : "Absenteeism"} value={fr ? "2" : "2"} />
            <DotRow
              label={fr ? "Avertissement — blâme conduite" : "Warning — blame"}
              value="—"
            />
          </Frame>
        </div>

        {/* Z10 — Visas */}
        <div className="grid grid-cols-3 gap-[5px]">
          <VisaBox title={fr ? "VISA DU PARENT" : "PARENT'S SIGNATURE"} />
          <VisaBox title={fr ? "DÉCISION DU CONSEIL DE CLASSE" : "CLASS COUNCIL DECISION"} />
          <VisaBox
            title={fr ? "LE CHEF D'ÉTABLISSEMENT" : "THE PRINCIPAL"}
            footer={
              isTerm
                ? fr
                  ? "Yaoundé, le … / … / 2026"
                  : "Yaoundé, … / … / 2026"
                : fr
                  ? "Yaoundé, le … / … / 2027"
                  : "Yaoundé, … / … / 2027"
            }
          />
        </div>

        {/* Pied — maquette KOBE */}
        <div
          className="grid grid-cols-[1.35fr_1.1fr_1fr] items-end gap-2 border-t pt-1.5"
          style={{ borderColor: C.ink }}
        >
          <div className="min-w-0">
            <p style={{ fontSize: "5.5pt", color: C.ink, lineHeight: 1.35 }}>
              {fr ? "Développé par " : "Developed by "}
              <span className="font-bold" style={{ color: C.amber }}>
                KOBE Corporation
              </span>
            </p>
            <p style={{ fontSize: "5pt", color: C.muted, lineHeight: 1.35, marginTop: 2 }}>
              {disclaimerLine}
            </p>
          </div>
          <div className="text-center" style={{ fontSize: "5.2pt", color: C.ink }}>
            <LegendLine text={legendRaw} />
          </div>
          <div className="justify-self-end text-right">
            <BarcodeFake code={verificationCode} />
            <p
              className="mt-0.5 font-mono"
              style={{ fontSize: "5.2pt", color: C.muted, letterSpacing: "0.04em" }}
            >
              {verificationCodeDisplay}
            </p>
            <p style={{ fontSize: "4.8pt", color: C.muted }}>
              {verifyLabel} : {verifyUrl}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderColumn({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-[1px] text-center uppercase" style={{ color: C.ink }}>
      {lines.map((line, i) => (
        <p
          key={`${i}-${line}`}
          className={cn(i === 0 || i === 5 ? "font-bold" : "font-semibold")}
          style={{
            fontSize: i === 0 || i === 5 ? "6.2pt" : i === 6 ? "5pt" : "5.4pt",
            color: i === 6 ? C.muted : C.ink,
            letterSpacing: i <= 1 ? "0.02em" : undefined,
          }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function subjectColWidth(seqCount: number, template: ReportTemplateResponse): string {
  const extras =
    (template.showSubjectRank ? 1 : 0) +
    (template.showSubjectClassAverage ? 1 : 0) +
    (template.showSubjectPassedCount ? 1 : 0);
  // Matière + seq + moy + coef + tot + extras + app
  const reserved = 6.5 + 4.5 + 6.5 + extras * 5 + 5.5 + seqCount * (seqCount >= 6 ? 5.2 : 6.5);
  return `${Math.max(18, 100 - reserved)}%`;
}

function markColWidth(seqCount: number, template: ReportTemplateResponse): string {
  const extras =
    (template.showSubjectRank ? 1 : 0) +
    (template.showSubjectClassAverage ? 1 : 0) +
    (template.showSubjectPassedCount ? 1 : 0);
  const reserved = 22 + 6.5 + 4.5 + 6.5 + extras * 5 + 5.5;
  const each = (100 - reserved) / Math.max(seqCount, 1);
  return `${Math.max(4.5, each)}%`;
}

function Th({
  children,
  left,
}: {
  children: ReactNode;
  left?: boolean;
}) {
  return (
    <th
      className={cn(
        "border px-[1px] py-0.5 font-bold uppercase leading-none",
        left ? "text-left" : "text-center",
      )}
      style={{
        borderColor: C.header,
        fontSize: "5.2pt",
        letterSpacing: "0.01em",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function GroupBlock({
  group,
  template,
  cols,
  fr,
}: {
  group: DemoGroup;
  template: ReportTemplateResponse;
  cols: number[];
  fr: boolean;
}) {
  const extra =
    (template.showSubjectRank ? 1 : 0) +
    (template.showSubjectClassAverage ? 1 : 0) +
    (template.showSubjectPassedCount ? 1 : 0);

  return (
    <>
      {group.subjects.map((s) => (
        <tr key={s.name}>
          <td className="border px-[2px] py-[1px] align-top" style={{ borderColor: C.line }}>
            <span
              className="block font-bold uppercase leading-tight"
              style={{ fontSize: "6.2pt", color: C.ink }}
            >
              {s.name}
            </span>
            <span className="block leading-tight" style={{ fontSize: "5pt", color: C.muted }}>
              {s.teacher}
            </span>
            {template.showCompetency && s.competency ? (
              <span className="block italic leading-tight" style={{ fontSize: "4.8pt", color: C.muted }}>
                {s.competency}
              </span>
            ) : null}
          </td>
          {cols.map((_, i) => (
            <MarkCell key={i} value={s.marks[i] ?? null} />
          ))}
          <MarkCell value={s.avg} />
          <NumCell>{fmt(s.coef, 0)}</NumCell>
          <NumCell strong>{fmt(s.total)}</NumCell>
          {template.showSubjectRank ? <NumCell>{s.rank ?? "—"}</NumCell> : null}
          {template.showSubjectClassAverage ? (
            <NumCell>{s.classAvg != null ? fmt(s.classAvg) : "—"}</NumCell>
          ) : null}
          {template.showSubjectPassedCount ? <NumCell>{s.passed ?? "—"}</NumCell> : null}
          <NumCell strong>{s.app}</NumCell>
        </tr>
      ))}
      {template.showGroupTotals ? (
        <tr style={{ backgroundColor: C.tint }}>
          <td
            className="border px-[2px] py-0.5 font-bold uppercase leading-tight"
            colSpan={1 + cols.length}
            style={{ borderColor: C.ink, color: C.ink, fontSize: "5.8pt" }}
          >
            TOTAL {group.name}
          </td>
          <NumCell strong group>
            {fmt(group.avg)}
          </NumCell>
          <NumCell strong group>
            {fmt(group.coef, 0)}
          </NumCell>
          <NumCell strong group>
            {fmt(group.total)}
          </NumCell>
          <td
            className="border px-[1px] py-0.5"
            colSpan={1 + extra}
            style={{ borderColor: C.ink, backgroundColor: C.tint }}
          />
        </tr>
      ) : null}
    </>
  );
}

function MarkCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <td
        className="border px-0 py-[1px] text-center leading-none"
        style={{ borderColor: C.line, color: C.line, fontSize: "5.5pt" }}
      >
        —
      </td>
    );
  }
  const fail = value < PASS;
  return (
    <td
      className="border px-0 py-[1px] text-center tabular-nums leading-none"
      style={{
        borderColor: C.line,
        color: fail ? C.fail : C.ink,
        fontWeight: fail ? 700 : 500,
        fontSize: "5.8pt",
      }}
    >
      {fmtCompact(value)}
    </td>
  );
}

function NumCell({
  children,
  strong,
  group,
}: {
  children: ReactNode;
  strong?: boolean;
  group?: boolean;
}) {
  return (
    <td
      className={cn(
        "border px-0 py-[1px] text-center tabular-nums leading-none",
        strong && "font-bold",
      )}
      style={{
        borderColor: group ? C.ink : C.line,
        backgroundColor: group ? C.tint : undefined,
        color: C.ink,
        fontSize: "5.8pt",
      }}
    >
      {children}
    </td>
  );
}

function Frame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="min-w-0 overflow-hidden rounded-[6px] border"
      style={{ borderColor: C.line }}
    >
      <div
        className="px-2 py-[3px] font-bold uppercase tracking-[0.05em]"
        style={{
          backgroundColor: C.tint,
          color: C.ink,
          fontSize: "5.8pt",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {title}
      </div>
      <div className="px-2 py-1.5">{children}</div>
    </div>
  );
}

/** Ligne label …… valeur (profil de classe, maquette). */
function DottedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1 py-[2px]" style={{ fontSize: "5.8pt" }}>
      <span className="shrink-0" style={{ color: C.muted }}>
        {label}
      </span>
      <span
        className="min-w-[8px] flex-1 border-b border-dotted"
        style={{ borderColor: C.line, transform: "translateY(-3px)" }}
        aria-hidden
      />
      <span className="shrink-0 font-bold tabular-nums" style={{ color: C.ink }}>
        {value}
      </span>
    </div>
  );
}

function DotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1 py-[3px]" style={{ fontSize: "6pt" }}>
      <span className="shrink-0" style={{ color: C.muted }}>
        {label}
      </span>
      <span
        className="min-w-[8px] flex-1 border-b border-dotted"
        style={{ borderColor: C.line, transform: "translateY(-3px)" }}
        aria-hidden
      />
      <span className="shrink-0 font-semibold" style={{ color: C.ink }}>
        {value}
      </span>
    </div>
  );
}

function VisaBox({ title, footer }: { title: string; footer?: string }) {
  return (
    <div
      className="flex min-h-[64px] flex-col rounded-[5px] border px-2 py-1.5"
      style={{ borderColor: C.line }}
    >
      <p className="font-bold uppercase" style={{ fontSize: "6pt", color: C.ink }}>
        {title}
      </p>
      <div className="flex-1" />
      {footer ? (
        <p style={{ fontSize: "5.5pt", color: C.muted }}>{footer}</p>
      ) : null}
    </div>
  );
}

/** Légende : codes en gras (A+, A, ECA, NA, B+, …). */
function LegendLine({ text }: { text: string }) {
  const parts = text.split(/(A\+|ECA|NA|B\+|A|B|C|D|E)(?=\s|$|·)/g).filter(Boolean);
  return (
    <p className="leading-snug">
      {parts.map((part, i) =>
        /^(A\+|ECA|NA|B\+|A|B|C|D|E)$/.test(part) ? (
          <span key={`${part}-${i}`} className="font-bold">
            {part}
          </span>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        ),
      )}
    </p>
  );
}

function formatVerificationCode(code: string): string {
  const digits = code.replace(/\D/g, "").padStart(13, "0").slice(0, 13);
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12)}`;
}

function BarcodeFake({ code }: { code: string }) {
  const bars = Array.from(code).flatMap((ch, i) => {
    const n = Number(ch) || 1;
    return [n % 2 === 0 ? 2 : 1, 1, ((n + i) % 3) + 1, 1];
  });
  return (
    <div className="ml-auto flex h-7 w-[118px] items-end justify-end gap-px" aria-hidden>
      {bars.map((w, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            width: w,
            height: i % 5 === 0 ? "100%" : `${70 + (i % 4) * 8}%`,
            backgroundColor: C.ink,
          }}
        />
      ))}
    </div>
  );
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Notes serrées : 12 ou 12,5 (pas 12,00) pour tenir en largeur A4. */
function fmtCompact(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function demoGroups(isTerm: boolean, fr: boolean, cols: number[]): DemoGroup[] {
  if (isTerm) {
    const t = (
      name: string,
      teacher: string,
      competency: string,
      marks: number[],
      coef: number,
      app: string,
      rank: number,
      classAvg: number,
      passed: number,
    ): DemoSubject => {
      const avg = Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 100) / 100;
      return {
        name,
        teacher,
        competency,
        marks: padMarks(marks, cols.length),
        avg,
        coef,
        total: Math.round(avg * coef * 100) / 100,
        app,
        rank,
        classAvg,
        passed,
      };
    };
    return [
      {
        name: fr ? "LANGUES ET LITTÉRATURES" : "LANGUAGE AND LITERATURE",
        avg: 10.85,
        coef: 10,
        total: 108.5,
        subjects: [
          t(
            fr ? "Français" : "French",
            "Mme T2",
            fr ? "Rédiger un texte argumentatif" : "Write an argumentative text",
            [7.5, 9.75],
            4,
            "NA",
            11,
            10.2,
            8,
          ),
          t(
            "English",
            "Mr T3",
            fr ? "Comprendre un texte narratif" : "Understand a narrative text",
            [14, 12.5],
            3,
            "A",
            3,
            11.2,
            12,
          ),
          t(
            fr ? "Langues nationales" : "National languages",
            "M. T4",
            fr ? "Communiquer en contexte" : "Communicate in context",
            [11, 12],
            3,
            "ECA",
            7,
            10.5,
            9,
          ),
        ],
      },
      {
        name: fr ? "SCIENCES HUMAINES ET SOCIALES" : "HUMAN AND SOCIAL SCIENCES",
        avg: 11.4,
        coef: 8,
        total: 91.2,
        subjects: [
          t(
            fr ? "Histoire" : "History",
            "Mme T8",
            fr ? "Situer un fait dans le temps" : "Place an event in time",
            [10, 11.5],
            3,
            "ECA",
            5,
            10.8,
            10,
          ),
          t(
            fr ? "Géographie" : "Geography",
            "Mme T8",
            fr ? "Lire une carte" : "Read a map",
            [12, 13],
            3,
            "A",
            4,
            11.5,
            11,
          ),
          t(
            fr ? "Citoyenneté" : "Citizenship",
            "M. T5",
            fr ? "Respecter les règles de vie" : "Respect living rules",
            [14, 13.5],
            2,
            "A+",
            2,
            12.1,
            13,
          ),
        ],
      },
      {
        name: fr ? "SCIENCES ET TECHNOLOGIE" : "SCIENCE AND TECHNOLOGY",
        avg: 11.8,
        coef: 10,
        total: 118,
        subjects: [
          t(
            fr ? "Mathématiques" : "Mathematics",
            "Mme T1",
            fr ? "Résoudre des problèmes du 1er degré" : "Solve first-degree problems",
            [11, 13.5],
            4,
            "A",
            6,
            10.8,
            10,
          ),
          t(
            "SVTEEHB",
            "M. T6",
            fr ? "Observer un phénomène" : "Observe a phenomenon",
            [12, 11],
            3,
            "ECA",
            8,
            11,
            9,
          ),
          t(
            fr ? "Informatique" : "ICT",
            "M. T7",
            fr ? "Utiliser un outil numérique" : "Use a digital tool",
            [13, 14],
            3,
            "A",
            3,
            12.4,
            12,
          ),
        ],
      },
    ];
  }

  return [
    {
      name: fr ? "LANGUES ET LITTÉRATURES" : "LANGUAGE AND LITERATURE",
      avg: 11.44,
      coef: 13,
      total: 148.72,
      subjects: [
        sub(fr ? "Anglais" : "English", "Mme T1", [12, 11.5, 13, 10.5, 12.5, 11], 3, "B"),
        sub(
          fr ? "Expression écrite" : "Written expression",
          "Mme T2",
          [14, 13.5, 12, 15, 13, 14.5],
          2,
          "B+",
        ),
        sub(
          fr ? "Expression orale" : "Oral expression",
          "Mme T2",
          [13, 12, 11.5, 13.5, 12.5, 13],
          2,
          "B",
        ),
        sub(fr ? "Étude de texte" : "Text study", "Mme T2", [11, 10, 9.5, 12, 11, 10.5], 2, "C"),
        sub(
          fr ? "Langues nationales" : "National languages",
          "M. T4",
          [8.5, 9, 10, 8, 9.5, 10],
          2,
          "C",
        ),
        sub(fr ? "Citoyenneté" : "Citizenship", "M. T5", [15, 14, 13.5, 14.5, 15, 14], 2, "A"),
      ].map((s) => ({ ...s, marks: padMarks(s.marks as number[], cols.length) })),
    },
    {
      name: fr ? "SCIENCES ET TECHNOLOGIE" : "SCIENCE AND TECHNOLOGY",
      avg: 10.12,
      coef: 16,
      total: 161.92,
      subjects: [
        sub(fr ? "Mathématiques" : "Mathematics", "Mme T1", [9, 8.5, 10, 11, 9.5, 10.5], 4, "C"),
        sub("SVTEEHB", "M. T6", [11, 12, 10.5, 11.5, 12, 11], 3, "B"),
        sub(fr ? "Informatique" : "ICT", "M. T7", [13, 12.5, 14, 13, 12, 13.5], 2, "B+"),
        sub(fr ? "Géographie" : "Geography", "Mme T8", [10, 9.5, 11, 10.5, 9, 10], 3, "C"),
        sub(fr ? "Histoire" : "History", "Mme T8", [7, 8.5, 9, 8, 7.5, 8.5], 2, "D"),
        sub("EPS", "M. T9", [14, 15, 13.5, 14.5, 15, 14], 2, "A"),
      ].map((s) => ({ ...s, marks: padMarks(s.marks as number[], cols.length) })),
    },
  ];
}

function sub(
  name: string,
  teacher: string,
  marks: number[],
  coef: number,
  app: string,
): DemoSubject {
  const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
  return {
    name,
    teacher,
    marks,
    avg: Math.round(avg * 100) / 100,
    coef,
    total: Math.round(avg * coef * 100) / 100,
    app,
  };
}

function padMarks(marks: number[], len: number): (number | null)[] {
  return Array.from({ length: len }, (_, i) => marks[i] ?? null);
}
