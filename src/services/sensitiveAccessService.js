import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import {
  DEMO_SENSITIVE_PIN,
  isValidSensitivePin,
  SENSITIVE_REVEAL_SECONDS,
} from '../utils/sensitiveData';

const messages = {
  'functions/failed-precondition': '보안 PIN이 아직 설정되지 않았습니다. 설정에서 먼저 등록해 주세요.',
  'functions/permission-denied': '이 학생의 민감정보를 열람할 권한이 없습니다.',
  'functions/resource-exhausted': '인증 시도가 잠시 제한되었습니다. 안내된 시간 뒤 다시 시도해 주세요.',
  'functions/unauthenticated': '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
  'functions/invalid-argument': '4자리 숫자 PIN을 정확히 입력해 주세요.',
};

function toAccessError(error, fallback) {
  const nextError = new Error(messages[error?.code] || error?.message || fallback);
  nextError.code = error?.code || 'sensitive-access/error';
  nextError.retryAfterSeconds = error?.details?.retryAfterSeconds || 0;
  return nextError;
}

export async function revealStudentSensitiveData({ student, pin, demoMode }) {
  if (!student?.id || !isValidSensitivePin(pin)) {
    throw new Error('4자리 숫자 PIN을 정확히 입력해 주세요.');
  }

  if (demoMode) {
    await new Promise(resolve => window.setTimeout(resolve, 450));
    if (pin !== DEMO_SENSITIVE_PIN) {
      const error = new Error('PIN이 일치하지 않습니다. 다시 확인해 주세요.');
      error.code = 'sensitive-access/invalid-pin';
      throw error;
    }
    return {
      sensitive: {
        phone: student.phone || '',
        studentNo: student.studentNo || '',
      },
      expiresInSeconds: SENSITIVE_REVEAL_SECONDS,
    };
  }

  if (!functions || !auth?.currentUser) {
    throw new Error('보안 인증 서버에 연결할 수 없습니다.');
  }

  try {
    const reveal = httpsCallable(functions, 'revealStudentSensitiveData');
    const result = await reveal({ studentId: student.id, pin });
    return result.data;
  } catch (error) {
    throw toAccessError(error, '민감정보를 불러오지 못했습니다.');
  }
}

export async function configureSensitiveAccessPin({ currentPassword, pin, demoMode }) {
  if (!isValidSensitivePin(pin)) throw new Error('새 PIN은 4자리 숫자로 입력해 주세요.');
  if (demoMode) return { configured: true, demoPin: DEMO_SENSITIVE_PIN };
  if (!auth?.currentUser?.email || !functions) throw new Error('로그인 세션을 확인해 주세요.');

  try {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    const configure = httpsCallable(functions, 'configureSensitiveAccessPin');
    const result = await configure({ pin });
    return result.data;
  } catch (error) {
    const authMessages = {
      'auth/invalid-credential': '현재 계정 비밀번호가 일치하지 않습니다.',
      'auth/wrong-password': '현재 계정 비밀번호가 일치하지 않습니다.',
      'auth/too-many-requests': '로그인 확인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    };
    if (authMessages[error?.code]) throw new Error(authMessages[error.code]);
    throw toAccessError(error, '보안 PIN을 설정하지 못했습니다.');
  }
}

export async function updateOwnSensitivePhone(phone) {
  if (!functions || !auth?.currentUser) throw new Error('로그인 세션을 확인해 주세요.');
  try {
    const updatePhone = httpsCallable(functions, 'updateOwnSensitivePhone');
    const result = await updatePhone({ phone });
    return result.data;
  } catch (error) {
    throw toAccessError(error, '연락처를 변경하지 못했습니다.');
  }
}
