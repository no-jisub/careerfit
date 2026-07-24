export const DEMO_AI_SESSION_DAILY_LIMIT = 15;
export const DEMO_AI_GLOBAL_DAILY_LIMIT = 100;

const PRODUCTION_ORIGINS = new Set([
  'https://careerfit-aiboost-a601a.web.app',
  'https://careerfit-aiboost-a601a.firebaseapp.com',
]);

export function isAnonymousFirebaseAuth(auth) {
  return auth?.token?.firebase?.sign_in_provider === 'anonymous';
}

export function isAllowedDemoOrigin(origin) {
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin || '');
}

export function getDemoQuotaDocumentIds(uid, dateKey) {
  const normalizedUid = typeof uid === 'string' ? uid.trim() : '';
  const normalizedDateKey = typeof dateKey === 'string' ? dateKey.trim() : '';
  if (!normalizedUid || !normalizedDateKey) throw new Error('데모 AI 사용량 키가 올바르지 않습니다.');
  return {
    session: `${normalizedUid}_${normalizedDateKey}`,
    global: `_global_${normalizedDateKey}`,
  };
}
