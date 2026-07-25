import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firestoreSyncEnabled } from '../lib/firebase';

const STORAGE_PREFIX = 'careerfit-email-notification-preference';

export function normalizeNotificationEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidNotificationEmail(value) {
  const email = normalizeNotificationEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function storageKey(uid) {
  return `${STORAGE_PREFIX}:${uid}`;
}

function fallbackPreference(uid, fallbackEmail = '') {
  return {
    uid,
    email: normalizeNotificationEmail(fallbackEmail),
    appointmentEmailEnabled: true,
  };
}

export async function loadEmailNotificationPreference({
  uid,
  fallbackEmail = '',
  demoMode = false,
}) {
  const fallback = fallbackPreference(uid, fallbackEmail);
  if (!uid) return fallback;

  if (!demoMode && firestoreSyncEnabled && db) {
    const snapshot = await getDoc(doc(db, 'notificationPreferences', uid));
    return snapshot.exists() ? { ...fallback, ...snapshot.data(), uid } : fallback;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(uid)) || 'null');
    return saved ? { ...fallback, ...saved, uid } : fallback;
  } catch {
    return fallback;
  }
}

export async function saveEmailNotificationPreference({
  uid,
  email,
  appointmentEmailEnabled,
  demoMode = false,
}) {
  const normalizedEmail = normalizeNotificationEmail(email);
  if (!uid) throw new Error('알림 설정을 저장할 계정을 찾을 수 없습니다.');
  if (appointmentEmailEnabled && !isValidNotificationEmail(normalizedEmail)) {
    throw new Error('이메일 알림을 받을 올바른 주소를 입력해 주세요.');
  }

  const preference = {
    uid,
    email: normalizedEmail,
    appointmentEmailEnabled: Boolean(appointmentEmailEnabled),
    updatedAt: new Date().toISOString(),
  };

  if (!demoMode && firestoreSyncEnabled && db) {
    await setDoc(doc(db, 'notificationPreferences', uid), preference, { merge: true });
  } else {
    localStorage.setItem(storageKey(uid), JSON.stringify(preference));
  }
  return preference;
}
