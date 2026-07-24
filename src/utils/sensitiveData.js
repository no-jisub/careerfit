export const SENSITIVE_REVEAL_SECONDS = 5 * 60;
export const DEMO_SENSITIVE_PIN = '2407';

export function normalizeSensitivePin(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 4);
}

export function isValidSensitivePin(value) {
  return /^\d{4}$/.test(String(value));
}

export function maskPhone(value = '') {
  const text = String(value).trim();
  if (!text) return '등록되지 않음';
  if (text.includes('*')) return text;
  const digits = text.replace(/\D/g, '');
  if (digits.length < 8) return '•••-••••-••••';
  const prefix = digits.slice(0, 3);
  const middle = digits.slice(3, -4);
  const suffix = digits.slice(-4);
  return `${prefix}-${middle.slice(0, 2)}${'•'.repeat(Math.max(0, middle.length - 2))}-${suffix.slice(0, 2)}••`;
}

export function maskStudentNo(value = '') {
  const text = String(value).trim();
  if (!text) return '등록되지 않음';
  if (/[•*]/.test(text)) return text;
  if (text.length <= 4) return '•'.repeat(text.length);
  return `${text.slice(0, 4)}${'•'.repeat(Math.max(2, text.length - 6))}${text.slice(-2)}`;
}

export function formatRevealTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
