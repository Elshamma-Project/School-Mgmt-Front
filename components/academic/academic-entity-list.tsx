"use client";

import type { MouseEvent, ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  academicDetailPath,
  type AcademicTab,
} from "@/lib/academic/tabs";
import { localizedLabel } from "@/lib/api/academic";
import type {
  LevelResponse,
  RoomResponse,
  SchoolClassResponse,
  SubjectGroupResponse,
  SubjectResponse,
} from "@/lib/api/academic";
import { useRouter } from "@/i18n/navigation";

type Props = {
  tab: AcademicTab;
  workspaceHome: `/${string}`;
  canManage?: boolean;
  levels: LevelResponse[];
  classes: SchoolClassResponse[];
  subjects: SubjectResponse[];
  groups: SubjectGroupResponse[];
  rooms: RoomResponse[];
  onDeactivate: (tab: AcademicTab, id: string, label: string) => void;
};

function StatusPill({ active }: { active: boolean }) {
  const t = useTranslations("academic");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        active
          ? "bg-[var(--ios-success-soft)] text-[var(--ios-success)]"
          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {active ? t("statusActive") : t("inactive")}
    </span>
  );
}

function stop(e: MouseEvent) {
  e.stopPropagation();
}

function RowActions({
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
}) {
  const t = useTranslations("academic");
  return (
    <div className="flex items-center justify-end gap-1" onClick={stop} onKeyDown={stop}>
      <button
        type="button"
        title={t("actionEdit")}
        aria-label={t("actionEdit")}
        className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)]"
        onClick={onEdit}
      >
        <Pencil className="size-3.5 stroke-[1.75]" aria-hidden />
      </button>
      <button
        type="button"
        title={t("actionDeactivate")}
        aria-label={t("actionDeactivate")}
        disabled={deleteDisabled}
        className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-danger-soft)] hover:text-[var(--ios-danger)] focus-visible:shadow-[var(--focus-ring)] disabled:opacity-40"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5 stroke-[1.75]" aria-hidden />
      </button>
    </div>
  );
}

function TableShell({
  count,
  children,
  minWidth = "min-w-[760px]",
}: {
  count: number;
  children: ReactNode;
  minWidth?: string;
}) {
  const t = useTranslations("academic");
  return (
    <div className="hidden overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)] md:block">
      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse text-left", minWidth)}>{children}</table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--ios-separator)]/60 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-5 py-2.5">
        <p className="text-[11px] text-[var(--ios-secondary-label)]">
          {t("tableCount", { count })}
        </p>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)] first:pl-5 last:pr-5",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Tr({
  index,
  active,
  onClick,
  children,
}: {
  index: number;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer border-b border-[var(--ios-separator)]/55 transition-colors last:border-b-0 hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--ios-blue)_8%,transparent)] focus-visible:outline-none",
        index % 2 === 1 && "bg-[color-mix(in_srgb,var(--ios-fill)_18%,transparent)]",
        !active && "opacity-70",
      )}
    >
      {children}
    </tr>
  );
}

function MobileCard({
  title,
  subtitle,
  active,
  onOpen,
  onEdit,
  onDelete,
  badges,
  canManage = false,
}: {
  title: string;
  subtitle?: string;
  active: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  badges?: ReactNode;
  canManage?: boolean;
}) {
  return (
    <li>
      <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]">
        <button
          type="button"
          onClick={onOpen}
          className="pressable w-full text-left focus-visible:shadow-[var(--focus-ring)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">{title}</p>
              {subtitle ? (
                <p className="mt-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                  {subtitle}
                </p>
              ) : null}
              {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
            </div>
            <StatusPill active={active} />
          </div>
        </button>
        {canManage ? (
          <div className="mt-3 flex justify-end border-t border-[var(--ios-separator)]/50 pt-2.5">
            <RowActions onEdit={onEdit} onDelete={onDelete} deleteDisabled={!active} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function AcademicEntityList({
  tab,
  workspaceHome,
  canManage = false,
  levels,
  classes,
  subjects,
  groups,
  rooms,
  onDeactivate,
}: Props) {
  const t = useTranslations("academic");
  const locale = useLocale();
  const router = useRouter();

  function open(tabKey: AcademicTab, label: string, id: string) {
    router.push(academicDetailPath(workspaceHome, tabKey, label, id));
  }

  const count =
    tab === "levels"
      ? levels.length
      : tab === "classes"
        ? classes.length
        : tab === "subjects"
          ? subjects.length
          : tab === "groups"
            ? groups.length
            : rooms.length;

  return (
    <>
      <ul className="space-y-2.5 md:hidden">
        {tab === "levels"
          ? levels.map((item) => {
              const label = localizedLabel(item.name, locale);
              return (
                <MobileCard
                  key={item.id}
                  title={label}
                  subtitle={item.code}
                  active={item.active}
                  canManage={canManage}
                  onOpen={() => open("levels", label, item.id)}
                  onEdit={() => open("levels", label, item.id)}
                  onDelete={() => onDeactivate("levels", item.id, label)}
                  badges={
                    <>
                      <Badge tone="neutral">{item.section}</Badge>
                      <Badge tone="blue">{item.cycle}</Badge>
                    </>
                  }
                />
              );
            })
          : null}
        {tab === "classes"
          ? classes.map((item) => (
              <MobileCard
                key={item.id}
                title={item.name}
                subtitle={`${item.levelCode}${item.trackCode ? ` · ${item.trackCode}` : ""}`}
                active={item.active}
                canManage={canManage}
                onOpen={() => open("classes", item.name, item.id)}
                onEdit={() => open("classes", item.name, item.id)}
                onDelete={() => onDeactivate("classes", item.id, item.name)}
              />
            ))
          : null}
        {tab === "subjects"
          ? subjects.map((item) => {
              const label = localizedLabel(item.name, locale);
              return (
                <MobileCard
                  key={item.id}
                  title={label}
                  subtitle={item.code}
                  active={item.active}
                  canManage={canManage}
                  onOpen={() => open("subjects", label, item.id)}
                  onEdit={() => open("subjects", label, item.id)}
                  onDelete={() => onDeactivate("subjects", item.id, label)}
                />
              );
            })
          : null}
        {tab === "groups"
          ? groups.map((item) => {
              const label = localizedLabel(item.name, locale);
              return (
                <MobileCard
                  key={item.id}
                  title={label}
                  subtitle={item.code}
                  active={item.active}
                  canManage={canManage}
                  onOpen={() => open("groups", label, item.id)}
                  onEdit={() => open("groups", label, item.id)}
                  onDelete={() => onDeactivate("groups", item.id, label)}
                />
              );
            })
          : null}
        {tab === "rooms"
          ? rooms.map((item) => (
              <MobileCard
                key={item.id}
                title={item.name}
                subtitle={`${item.type}${item.capacity != null ? ` · ${item.capacity}` : ""}`}
                active={item.active}
                canManage={canManage}
                onOpen={() => open("rooms", item.name, item.id)}
                onEdit={() => open("rooms", item.name, item.id)}
                onDelete={() => onDeactivate("rooms", item.id, item.name)}
              />
            ))
          : null}
      </ul>

      {tab === "levels" ? (
        <TableShell count={count}>
          <thead>
            <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <Th>{t("columns.name")}</Th>
              <Th>{t("columns.code")}</Th>
              <Th>{t("columns.section")}</Th>
              <Th>{t("columns.cycle")}</Th>
              <Th>{t("columns.status")}</Th>
              <Th className="text-right">{t("columns.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {levels.map((item, index) => {
              const label = localizedLabel(item.name, locale);
              return (
                <Tr
                  key={item.id}
                  index={index}
                  active={item.active}
                  onClick={() => open("levels", label, item.id)}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                    {label}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge tone="neutral">{item.section}</Badge>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">{item.cycle}</td>
                  <td className="px-3 py-3.5">
                    <StatusPill active={item.active} />
                  </td>
                  <td className="px-5 py-3.5">
                    {canManage ? (
                      <RowActions
                        onEdit={() => open("levels", label, item.id)}
                        onDelete={() => onDeactivate("levels", item.id, label)}
                        deleteDisabled={!item.active}
                      />
                    ) : null}
                  </td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "classes" ? (
        <TableShell count={count}>
          <thead>
            <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <Th>{t("columns.class")}</Th>
              <Th>{t("columns.level")}</Th>
              <Th>{t("columns.language")}</Th>
              <Th>{t("columns.capacity")}</Th>
              <Th>{t("columns.status")}</Th>
              <Th className="text-right">{t("columns.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {classes.map((item, index) => (
              <Tr
                key={item.id}
                index={index}
                active={item.active}
                onClick={() => open("classes", item.name, item.id)}
              >
                <td className="px-5 py-3.5">
                  <p className="text-[13px] font-semibold text-[var(--ios-label)]">{item.name}</p>
                  {item.trackCode ? (
                    <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                      {item.trackCode}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                    {item.levelCode}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <Badge tone="blue">{item.defaultLanguage}</Badge>
                </td>
                <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                  {item.capacity ?? "—"}
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill active={item.active} />
                </td>
                <td className="px-5 py-3.5">
                  {canManage ? (
                    <RowActions
                      onEdit={() => open("classes", item.name, item.id)}
                      onDelete={() => onDeactivate("classes", item.id, item.name)}
                      deleteDisabled={!item.active}
                    />
                  ) : null}
                </td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "subjects" ? (
        <TableShell count={count}>
          <thead>
            <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <Th>{t("columns.name")}</Th>
              <Th>{t("columns.code")}</Th>
              <Th>{t("columns.kind")}</Th>
              <Th>{t("columns.status")}</Th>
              <Th className="text-right">{t("columns.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((item, index) => {
              const label = localizedLabel(item.name, locale);
              return (
                <Tr
                  key={item.id}
                  index={index}
                  active={item.active}
                  onClick={() => open("subjects", label, item.id)}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                    {label}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge tone={item.kind === "ACADEMIC" ? "blue" : "neutral"}>
                      {t.has(`subjectKind.${item.kind}`)
                        ? t(`subjectKind.${item.kind}`)
                        : item.kind}
                    </Badge>
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusPill active={item.active} />
                  </td>
                  <td className="px-5 py-3.5">
                    {canManage ? (
                      <RowActions
                        onEdit={() => open("subjects", label, item.id)}
                        onDelete={() => onDeactivate("subjects", item.id, label)}
                        deleteDisabled={!item.active}
                      />
                    ) : null}
                  </td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "groups" ? (
        <TableShell count={count} minWidth="min-w-[700px]">
          <thead>
            <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <Th>{t("columns.name")}</Th>
              <Th>{t("columns.code")}</Th>
              <Th>{t("columns.order")}</Th>
              <Th>{t("columns.status")}</Th>
              <Th className="text-right">{t("columns.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((item, index) => {
              const label = localizedLabel(item.name, locale);
              return (
                <Tr
                  key={item.id}
                  index={index}
                  active={item.active}
                  onClick={() => open("groups", label, item.id)}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                    {label}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex rounded-[var(--radius-sm)] border border-[var(--ios-separator)]/70 px-2 py-1 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                    {item.displayOrder}
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusPill active={item.active} />
                  </td>
                  <td className="px-5 py-3.5">
                    {canManage ? (
                      <RowActions
                        onEdit={() => open("groups", label, item.id)}
                        onDelete={() => onDeactivate("groups", item.id, label)}
                        deleteDisabled={!item.active}
                      />
                    ) : null}
                  </td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      ) : null}

      {tab === "rooms" ? (
        <TableShell count={count} minWidth="min-w-[700px]">
          <thead>
            <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <Th>{t("columns.name")}</Th>
              <Th>{t("columns.type")}</Th>
              <Th>{t("columns.capacity")}</Th>
              <Th>{t("columns.status")}</Th>
              <Th className="text-right">{t("columns.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((item, index) => (
              <Tr
                key={item.id}
                index={index}
                active={item.active}
                onClick={() => open("rooms", item.name, item.id)}
              >
                <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                  {item.name}
                </td>
                <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">
                  {t.has(`roomTypes.${item.type}`) ? t(`roomTypes.${item.type}`) : item.type}
                </td>
                <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                  {item.capacity ?? "—"}
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill active={item.active} />
                </td>
                <td className="px-5 py-3.5">
                  {canManage ? (
                    <RowActions
                      onEdit={() => open("rooms", item.name, item.id)}
                      onDelete={() => onDeactivate("rooms", item.id, item.name)}
                      deleteDisabled={!item.active}
                    />
                  ) : null}
                </td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      ) : null}
    </>
  );
}
