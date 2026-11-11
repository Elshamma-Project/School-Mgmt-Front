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
  yearLabel?: string;
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
  yearLabel = "2026-2027",
}: BulletinTemplatePreviewProps) {
  const isTerm = template.periodType === "TERM";
  const fr = language === "FR";
  const cols = template.sequenceColumns;
  const phoneLine = phones.filter(Boolean).join(" / ") || "670 00 00 00";
  const bp = postalBox.trim() || "Yaoundé";

  const titleFr = isTerm ? "BULLETIN DE TRIMESTRE 1" : "BULLETIN ANNUEL DE NOTES";
  const titleEn = isTerm ? "TERM 1 REPORT CARD" : "ANNUAL REPORT CARD";
  const bannerTitle = `${titleFr}  ·  ${titleEn}`;

  const groups = demoGroups(isTerm, fr, cols);
  const legendRaw =
    (fr ? template.legend?.fr : template.legend?.en) ||
    "A ≥ 16 · B+ ≥ 14 · B ≥ 12 · C < 12";
  const verificationCode = "2027060100123";
  const verificationCodeDisplay = formatVerificationCode(verificationCode);
  const printedAt = fr ? "01/07/2027 à 10:15" : "01/07/2027 at 10:15";
  const verifyUrl = "exemple.cm/verif";

  const frLines = [
    header?.republic.fr || "RÉPUBLIQUE DU CAMEROUN",
    header?.motto.fr || "Paix – Travail – Patrie",
    header?.ministry.fr || "MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES",
    header?.regionalDelegation?.fr || "DÉLÉGATION RÉGIONALE DU CENTRE",
    header?.divisionalDelegation?.fr || "DÉLÉGATION DÉPARTEMENTALE DU MFOUNDI",
    schoolNameFr || "NOM DE L'ÉTABLISSEMENT",
    `B.P. : ${bp}  ·  Tél. : ${phoneLine}`,
  ];

  const enLines = [
    header?.republic.en || "REPUBLIC OF CAMEROON",
    header?.motto.en || "Peace – Work – Fatherland",
    header?.ministry.en || "MINISTRY OF SECONDARY EDUCATION",
    header?.regionalDelegation?.en || "REGIONAL DELEGATION OF THE CENTRE",
    header?.divisionalDelegation?.en || "DIVISIONAL DELEGATION OF MFOUNDI",
    schoolNameEn || "NAME OF THE SCHOOL",
    `P.O. Box : ${bp}  ·  Tel. : ${phoneLine}`,
  ];

  const identity = [
    {
      label: fr ? "NOMS ET PRÉNOMS" : "FULL NAMES",
      value: "NOM Prénoms",
    },
    { label: fr ? "CLASSE" : "CLASS", value: fr ? "6ème" : "Form 1" },
    { label: fr ? "MATRICULE" : "MATRICULE", value: "26A0001" },
    {
      label: fr ? "NÉ(E) LE / À" : "DATE / PLACE OF BIRTH",
      value: fr ? "01/01/2015 — Yaoundé" : "01/01/2015 — Yaoundé",
    },
    { label: fr ? "SEXE" : "SEX", value: fr ? "Féminin" : "Female" },
    { label: fr ? "REDOUBLANT(E)" : "REPEATER", value: fr ? "Non" : "No" },
    {
      label: fr ? "PROFESSEUR PRINCIPAL" : "CLASS MASTER",
      value: "Mme T1",
    },
    {
      label: fr ? "EFFECTIF DE LA CLASSE" : "N° ON ROLL",
      value: "21",
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
            {fr ? "Année scolaire" : "School year"} {yearLabel}
          </p>
        </div>

        {/* Z2 — Identité 3×3 */}
        <div
          className="grid grid-cols-3 overflow-hidden rounded-[5px] border"
          style={{ borderColor: C.line }}
        >
          {identity.map((cell, i) => (
            <div
              key={cell.label}
              className="px-2 py-1.5"
              style={{
                borderRight: i % 3 !== 2 ? `1px solid ${C.line}` : undefined,
                borderBottom: i < 6 ? `1px solid ${C.line}` : undefined,
              }}
            >
              <p
                className="uppercase tracking-[0.05em]"
                style={{ fontSize: "5.2pt", color: C.muted }}
              >
                {cell.label}
              </p>
              <p className="font-bold" style={{ fontSize: "7.5pt", color: C.ink }}>
                {cell.value}
              </p>
            </div>
          ))}
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
                {fr ? "DISCIPLINES / ENS." : "SUBJECTS / TCH."}
              </Th>
              {cols.map((n, i) => (
                <Th key={n}>{isTerm ? `E${i + 1}` : `D${n}`}</Th>
              ))}
              <Th>{fr ? "MOY" : "AV"}</Th>
              <Th>COEF</Th>
              <Th>{isTerm ? "×COEF" : "TOT"}</Th>
              {template.showSubjectRank ? <Th>POS</Th> : null}
              {template.showSubjectClassAverage ? (
                <Th>{fr ? "CL." : "CL."}</Th>
              ) : null}
              {template.showSubjectPassedCount ? <Th>≥10</Th> : null}
              <Th>{fr ? "APP." : "REM."}</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupBlock key={group.name} group={group} template={template} cols={cols} fr={fr} />
            ))}
          </tbody>
        </table>

        {/* Z5–Z7 — 3 cadres résultats (maquette KOBE) */}
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
            {/* Pastille mention : rectangle à coins légèrement arrondis (maquette, pas pill) */}
            <span
              className="mt-1.5 inline-block px-3.5 py-[4px] font-bold uppercase tracking-wide text-white"
              style={{
                backgroundColor: C.amber,
                fontSize: "7pt",
                borderRadius: "4px",
              }}
            >
              {fr ? "PASSABLE" : "FAIR"}
            </span>
          </Frame>

          {template.showTermRecap ? (
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
                    <th
                      className="border p-[3px]"
                      style={{ borderColor: C.line, backgroundColor: C.white }}
                    />
                    <th
                      className="border p-[3px] text-center font-bold"
                      style={{ borderColor: C.line, color: C.ink, backgroundColor: C.white }}
                    >
                      MOY.
                    </th>
                    <th
                      className="border p-[3px] text-center font-bold"
                      style={{ borderColor: C.line, color: C.ink, backgroundColor: C.white }}
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
                        style={{
                          borderColor: C.line,
                          color: C.ink,
                          backgroundColor: C.tint,
                        }}
                      >
                        {t}
                      </td>
                      <td
                        className="border p-[3px] text-center tabular-nums"
                        style={{ borderColor: C.line, color: C.ink, backgroundColor: C.white }}
                      >
                        {m}
                      </td>
                      <td
                        className="border p-[3px] text-center tabular-nums"
                        style={{ borderColor: C.line, color: C.ink, backgroundColor: C.white }}
                      >
                        {r}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Frame>
          ) : (
            <Frame title={fr ? "TOTAL POINTS" : "TOTAL POINTS"}>
              <p className="font-bold" style={{ fontSize: "12pt" }}>
                88,75 / 140
              </p>
              <p style={{ fontSize: "6.5pt", color: C.muted, marginTop: 4 }}>
                {fr ? "ADMIS EN 12/16" : "PASSED IN 12/16"}
              </p>
            </Frame>
          )}

          {template.showClassProfile ? (
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
          ) : (
            <Frame title={fr ? "PROFIL DE LA CLASSE" : "CLASS PROFILE"}>
              <p style={{ fontSize: "6pt", color: C.muted }}>—</p>
            </Frame>
          )}
        </div>

        {/* Z8–Z9 */}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <Frame title={fr ? "Travail de l'élève" : "Student's work"}>
            <DotRow label={fr ? "Tableau d'honneur" : "Honour roll"} value={fr ? "Non" : "No"} />
            <DotRow
              label={fr ? "T.H. + encouragements — félicitations" : "H.R. + encouragement — congratulations"}
              value="—"
            />
            <DotRow
              label={fr ? "Avertissement — blâme travail" : "Warning — blame (work)"}
              value="—"
            />
          </Frame>
          <Frame title={fr ? "Conduite de l'élève" : "Student's conduct"}>
            <DotRow label={fr ? "Absences (h)" : "Absences (h)"} value="4" />
            <DotRow label={fr ? "Retards" : "Lates"} value="2" />
            <DotRow
              label={fr ? "Avertissement — blâme conduite" : "Warning — blame (conduct)"}
              value="—"
            />
          </Frame>
        </div>

        {/* Z10 — Visas */}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          <VisaBox title={fr ? "VISA DU PARENT" : "PARENT VISA"} />
          <VisaBox title={fr ? "DÉCISION DU CONSEIL DE CLASSE" : "CLASS COUNCIL DECISION"} />
          <VisaBox
            title={fr ? "LE CHEF D'ÉTABLISSEMENT" : "THE PRINCIPAL"}
            footer={fr ? "Yaoundé, le … / … / 2027" : "Yaoundé, … / … / 2027"}
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
              {fr
                ? `Bulletin délivré sans rature ni surcharge · Imprimé le ${printedAt}`
                : `Report card issued without alteration · Printed on ${printedAt}`}
            </p>
          </div>
          <div className="text-center" style={{ fontSize: "5.4pt", color: C.ink }}>
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
              {fr ? "Vérification" : "Verification"} : {verifyUrl}
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

/** Légende : lettres en gras (A, B+, B, C). */
function LegendLine({ text }: { text: string }) {
  const parts = text.split(/(A\+|A|B\+|B|C|D|E)/g).filter(Boolean);
  return (
    <p className="leading-snug">
      {parts.map((part, i) =>
        /^(A\+|A|B\+|B|C|D|E)$/.test(part) ? (
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
    return [
      {
        name: fr ? "SCIENCES" : "SCIENCES",
        avg: 12.25,
        coef: 4,
        total: 49,
        subjects: [
          {
            name: fr ? "Mathématiques" : "Mathematics",
            teacher: "Mme T1",
            competency: fr
              ? "Résoudre des problèmes du 1er degré"
              : "Solve first-degree problems",
            marks: padMarks([11, 13.5], cols.length),
            avg: 12.25,
            coef: 4,
            total: 49,
            app: "B",
            rank: 6,
            classAvg: 10.8,
            passed: 18,
          },
        ],
      },
      {
        name: fr ? "LANGUES" : "LANGUAGES",
        avg: 13.25,
        coef: 3,
        total: 39.75,
        subjects: [
          {
            name: "English",
            teacher: "Mr T3",
            competency: fr
              ? "Comprendre un texte narratif"
              : "Understand a narrative text",
            marks: padMarks([14, 12.5], cols.length),
            avg: 13.25,
            coef: 3,
            total: 39.75,
            app: "B+",
            rank: 3,
            classAvg: 11.2,
            passed: 22,
          },
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
