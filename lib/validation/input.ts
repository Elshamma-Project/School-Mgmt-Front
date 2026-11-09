/**
 * Validation / normalisation des saisies UI.
 * Alignée sur les contraintes API (noms ≤ 120, MDP 8–128, e-mail login).
 * La source de vérité reste le serveur ; ceci limite erreurs et abus côté client.
 */

export const INPUT_LIMITS = {
  personName: 120,
  email: 254,
  phone: 32,
  staffNumber: 64,
  passwordMin: 8,
  passwordMax: 128,
  shortCode: 32,
  label: 120,
  longLabel: 200,
  freeText: 500,
} as const;

export type ValidationIssue =
  | "required"
  | "tooLong"
  | "tooShort"
  | "invalidEmail"
  | "invalidPhone"
  | "invalidName"
  | "invalidCode"
  | "passwordWeak"
  | "passwordMismatch"
  | "unsafeContent";

export type FieldValidation = {
  ok: true;
  value: string;
} | {
  ok: false;
  issue: ValidationIssue;
  max?: number;
  min?: number;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const UNSAFE_MARKUP = /[<>`]/;
/** Lettres (unicode), espaces, apostrophes / tirets courants. */
const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s'.’-]*$/u;
const EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const PHONE_ALLOWED = /^[+\d().\s-]+$/;
const CODE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

/** Normalise une saisie texte : trim, espaces internes, sans caractères de contrôle. */
export function sanitizeText(raw: string): string {
  return raw
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(raw: string): string {
  return sanitizeText(raw).toLowerCase();
}

function hasUnsafeMarkup(value: string): boolean {
  return UNSAFE_MARKUP.test(value);
}

export function validateRequiredText(
  raw: string,
  max = INPUT_LIMITS.label,
): FieldValidation {
  const value = sanitizeText(raw);
  if (!value) return { ok: false, issue: "required" };
  if (hasUnsafeMarkup(value)) return { ok: false, issue: "unsafeContent" };
  if (value.length > max) return { ok: false, issue: "tooLong", max };
  return { ok: true, value };
}

export function validateOptionalText(
  raw: string,
  max = INPUT_LIMITS.label,
): FieldValidation {
  const value = sanitizeText(raw);
  if (!value) return { ok: true, value: "" };
  if (hasUnsafeMarkup(value)) return { ok: false, issue: "unsafeContent" };
  if (value.length > max) return { ok: false, issue: "tooLong", max };
  return { ok: true, value };
}

export function validatePersonName(
  raw: string,
  options: { required?: boolean; max?: number } = {},
): FieldValidation {
  const required = options.required ?? true;
  const max = options.max ?? INPUT_LIMITS.personName;
  const value = sanitizeText(raw);
  if (!value) {
    return required ? { ok: false, issue: "required" } : { ok: true, value: "" };
  }
  if (hasUnsafeMarkup(value)) return { ok: false, issue: "unsafeContent" };
  if (value.length > max) return { ok: false, issue: "tooLong", max };
  if (!PERSON_NAME.test(value)) return { ok: false, issue: "invalidName" };
  return { ok: true, value };
}

export function validateEmail(
  raw: string,
  options: { required?: boolean } = {},
): FieldValidation {
  const required = options.required ?? true;
  const value = normalizeEmail(raw);
  if (!value) {
    return required ? { ok: false, issue: "required" } : { ok: true, value: "" };
  }
  if (value.length > INPUT_LIMITS.email) {
    return { ok: false, issue: "tooLong", max: INPUT_LIMITS.email };
  }
  if (!EMAIL.test(value)) return { ok: false, issue: "invalidEmail" };
  return { ok: true, value };
}

export function validatePhone(
  raw: string,
  options: { required?: boolean } = {},
): FieldValidation {
  const required = options.required ?? false;
  const value = sanitizeText(raw);
  if (!value) {
    return required ? { ok: false, issue: "required" } : { ok: true, value: "" };
  }
  if (value.length > INPUT_LIMITS.phone) {
    return { ok: false, issue: "tooLong", max: INPUT_LIMITS.phone };
  }
  if (!PHONE_ALLOWED.test(value)) return { ok: false, issue: "invalidPhone" };
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, issue: "invalidPhone" };
  }
  return { ok: true, value };
}

export function validateStaffNumber(raw: string): FieldValidation {
  const value = sanitizeText(raw).toUpperCase();
  if (!value) return { ok: true, value: "" };
  if (hasUnsafeMarkup(value)) return { ok: false, issue: "unsafeContent" };
  if (value.length > INPUT_LIMITS.staffNumber) {
    return { ok: false, issue: "tooLong", max: INPUT_LIMITS.staffNumber };
  }
  if (!CODE.test(value) && !/^[A-Za-z0-9][A-Za-z0-9._\s-]{0,63}$/.test(value)) {
    return { ok: false, issue: "invalidCode" };
  }
  return { ok: true, value };
}

export function validateCode(
  raw: string,
  options: { required?: boolean; uppercase?: boolean } = {},
): FieldValidation {
  const required = options.required ?? true;
  let value = sanitizeText(raw);
  if (options.uppercase !== false) value = value.toUpperCase();
  if (!value) {
    return required ? { ok: false, issue: "required" } : { ok: true, value: "" };
  }
  if (value.length > INPUT_LIMITS.shortCode) {
    return { ok: false, issue: "tooLong", max: INPUT_LIMITS.shortCode };
  }
  if (!CODE.test(value)) return { ok: false, issue: "invalidCode" };
  return { ok: true, value };
}

export function validatePassword(raw: string): FieldValidation {
  if (!raw) return { ok: false, issue: "required" };
  if (raw.length < INPUT_LIMITS.passwordMin) {
    return { ok: false, issue: "tooShort", min: INPUT_LIMITS.passwordMin };
  }
  if (raw.length > INPUT_LIMITS.passwordMax) {
    return { ok: false, issue: "tooLong", max: INPUT_LIMITS.passwordMax };
  }
  if (CONTROL_CHARS.test(raw)) return { ok: false, issue: "unsafeContent" };
  const hasLetter = /\p{L}/u.test(raw);
  const hasDigit = /\d/.test(raw);
  if (!hasLetter || !hasDigit) return { ok: false, issue: "passwordWeak" };
  return { ok: true, value: raw };
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): FieldValidation {
  if (!confirm) return { ok: false, issue: "required" };
  if (confirm !== password) return { ok: false, issue: "passwordMismatch" };
  return { ok: true, value: confirm };
}

export function validatePositiveInt(
  raw: string,
  options: { required?: boolean; max?: number } = {},
): FieldValidation {
  const required = options.required ?? false;
  const value = sanitizeText(raw);
  if (!value) {
    return required ? { ok: false, issue: "required" } : { ok: true, value: "" };
  }
  if (!/^\d+$/.test(value)) return { ok: false, issue: "invalidCode" };
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return { ok: false, issue: "invalidCode" };
  if (options.max != null && n > options.max) {
    return { ok: false, issue: "tooLong", max: options.max };
  }
  return { ok: true, value: String(n) };
}

type MessageFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/** Traduit un `FieldValidation` en message via `common.validation.*`. */
export function validationMessage(
  t: MessageFn,
  result: Extract<FieldValidation, { ok: false }>,
): string {
  switch (result.issue) {
    case "required":
      return t("validation.required");
    case "tooLong":
      return t("validation.tooLong", { max: result.max ?? 0 });
    case "tooShort":
      return t("validation.tooShort", { min: result.min ?? 0 });
    case "invalidEmail":
      return t("validation.invalidEmail");
    case "invalidPhone":
      return t("validation.invalidPhone");
    case "invalidName":
      return t("validation.invalidName");
    case "invalidCode":
      return t("validation.invalidCode");
    case "passwordWeak":
      return t("validation.passwordWeak");
    case "passwordMismatch":
      return t("validation.passwordMismatch");
    case "unsafeContent":
      return t("validation.unsafeContent");
    default:
      return t("validation.required");
  }
}
