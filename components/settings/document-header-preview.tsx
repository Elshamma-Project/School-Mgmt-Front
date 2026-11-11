"use client";

import { BrandMark } from "@/components/layout/brand-mark";
import type { OfficialHeaderDto } from "@/lib/api/school";
import { cn } from "@/lib/utils/cn";

type DocumentHeaderPreviewProps = {
  header: OfficialHeaderDto;
  schoolNameFr: string;
  schoolNameEn: string;
  postalBox: string;
  phones: string[];
  cycleLabels: string[];
  className?: string;
};

type HeaderLine = {
  text: string;
  tone?: "republic" | "motto" | "body" | "school" | "contact";
};

function Column({ lines }: { lines: HeaderLine[] }) {
  return (
    <div className="min-w-0 flex-1 space-y-[2px] text-center text-[8.5px] leading-[1.3] text-black sm:text-[10px] sm:leading-[1.35]">
      {lines
        .filter((l) => l.text.trim())
        .map((line, i) => (
          <p
            key={`${i}-${line.tone}-${line.text.slice(0, 16)}`}
            className={cn(
              "uppercase tracking-[0.01em]",
              line.tone === "republic" && "font-bold",
              line.tone === "motto" && "text-[8px] font-medium normal-case sm:text-[9px]",
              line.tone === "body" && "font-semibold",
              line.tone === "school" && "font-bold",
              line.tone === "contact" && "text-[8px] font-medium normal-case sm:text-[9px]",
            )}
          >
            {line.text}
          </p>
        ))}
    </div>
  );
}

/**
 * Aperçu en-tête bulletin : colonne FR | logo | colonne EN.
 */
export function DocumentHeaderPreview({
  header,
  schoolNameFr,
  schoolNameEn,
  postalBox,
  phones,
  cycleLabels,
  className,
}: DocumentHeaderPreviewProps) {
  const phoneLine = phones.filter(Boolean).join("/") || "—";
  const bp = postalBox.trim() || "—";

  const frLines: HeaderLine[] = [
    { text: header.republic.fr?.trim() || "—", tone: "republic" },
    { text: header.motto.fr?.trim() || "", tone: "motto" },
    { text: header.ministry.fr?.trim() || "", tone: "body" },
    { text: header.regionalDelegation?.fr?.trim() || "", tone: "body" },
    { text: header.divisionalDelegation?.fr?.trim() || "", tone: "body" },
    { text: schoolNameFr.trim() || "—", tone: "school" },
    { text: `B.P : ${bp} - Tel : ${phoneLine}`, tone: "contact" },
  ];

  const enLines: HeaderLine[] = [
    { text: header.republic.en?.trim() || "—", tone: "republic" },
    { text: header.motto.en?.trim() || "", tone: "motto" },
    { text: header.ministry.en?.trim() || "", tone: "body" },
    { text: header.regionalDelegation?.en?.trim() || "", tone: "body" },
    { text: header.divisionalDelegation?.en?.trim() || "", tone: "body" },
    { text: schoolNameEn.trim() || "—", tone: "school" },
    { text: `PO BOX : ${bp} - Phone. ${phoneLine}`, tone: "contact" },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border border-[var(--ios-separator)]/70 bg-white text-black shadow-[var(--ios-shadow)]",
        className,
      )}
    >
      {cycleLabels.length > 0 ? (
        <div className="border-b border-black/10 bg-[#f7f7f8] px-3 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-secondary-label)]">
            {cycleLabels.join(" · ")}
          </p>
        </div>
      ) : null}
      <div className="px-2 py-3 sm:px-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Column lines={frLines} />
          <div className="flex w-[72px] shrink-0 flex-col items-center justify-center sm:w-[88px]">
            <BrandMark
              size="lg"
              alt={schoolNameFr || schoolNameEn || "Logo"}
              className="!size-14 !rounded-full sm:!size-16"
            />
          </div>
          <Column lines={enLines} />
        </div>
      </div>
    </div>
  );
}
