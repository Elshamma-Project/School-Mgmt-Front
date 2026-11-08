/** Fonctions RH Staff — alignées sur `StaffFunction` (back). */

export const STAFF_FUNCTIONS = [
  "TEACHER",
  "HEAD_OF_SCHOOL",
  "CENSOR",
  "SECRETARY",
  "SUPERVISOR",
  "ACCOUNTANT",
  "OTHER",
] as const;

export type StaffFunctionCode = (typeof STAFF_FUNCTIONS)[number];

export function isStaffFunction(value: string): value is StaffFunctionCode {
  return (STAFF_FUNCTIONS as readonly string[]).includes(value);
}

/** Onglets de la page Personnel (vues filtrées, une seule collection). */
export type StaffListTab = "all" | "teachers" | "leadership" | "support" | "other";

export const STAFF_LIST_TABS: StaffListTab[] = [
  "all",
  "teachers",
  "leadership",
  "support",
  "other",
];

const LEADERSHIP: StaffFunctionCode[] = ["HEAD_OF_SCHOOL", "CENSOR"];
const SUPPORT: StaffFunctionCode[] = ["SECRETARY", "SUPERVISOR", "ACCOUNTANT"];

/** Param API `function` si l’onglet correspond à une seule valeur serveur. */
export function apiFunctionForTab(tab: StaffListTab): StaffFunctionCode | undefined {
  if (tab === "teachers") return "TEACHER";
  if (tab === "other") return "OTHER";
  return undefined;
}

export function matchesStaffTab(functions: string[], tab: StaffListTab): boolean {
  if (tab === "all") return true;
  if (tab === "teachers") return functions.includes("TEACHER");
  if (tab === "leadership") return functions.some((f) => LEADERSHIP.includes(f as StaffFunctionCode));
  if (tab === "support") return functions.some((f) => SUPPORT.includes(f as StaffFunctionCode));
  if (tab === "other") return functions.includes("OTHER");
  return true;
}

export function isLeadershipStaff(functions: string[]): boolean {
  return functions.some((f) => LEADERSHIP.includes(f as StaffFunctionCode));
}

/** Secrétaire / SG / comptable sans TEACHER ni OTHER — lecture seule pour ADMINISTRATION. */
export function isPeerAdminOnlyStaff(functions: string[]): boolean {
  if (isLeadershipStaff(functions)) return false;
  if (!functions.some((f) => SUPPORT.includes(f as StaffFunctionCode))) return false;
  return !functions.includes("TEACHER") && !functions.includes("OTHER");
}

/** Onglets visibles selon le rôle UI (docs/05). */
export function staffListTabsForRole(role: string | null | undefined): StaffListTab[] {
  if (role === "ADMINISTRATION") {
    return STAFF_LIST_TABS.filter((tab) => tab !== "leadership");
  }
  return STAFF_LIST_TABS;
}
