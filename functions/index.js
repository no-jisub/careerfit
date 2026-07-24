import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import {
  buildConsultationPrompt,
  classifyAiError,
  consultationDraftSchema,
  CONSULTATION_SYSTEM_INSTRUCTION,
  parseConsultationDraft,
  sanitizeConsultationInput,
} from './consultationDraft.js';
import {
  createPinCredential,
  getAttemptDecision,
  maskPhoneForStorage,
  REVEAL_SECONDS,
  validateSensitivePin,
  verifyPinCredential,
} from './sensitiveAccess.js';
import {
  DEMO_AI_GLOBAL_DAILY_LIMIT,
  DEMO_AI_SESSION_DAILY_LIMIT,
  getDemoQuotaDocumentIds,
  isAllowedDemoOrigin,
  isAnonymousFirebaseAuth,
} from './demoAiAccess.js';

initializeApp();

const REGION = 'asia-northeast3';
const MODEL = 'gemini-2.5-flash';
const DAILY_LIMIT = 50;
const SENSITIVE_PIN_PEPPER = defineSecret('SENSITIVE_PIN_PEPPER');
const RECENT_AUTH_SECONDS = 5 * 60;

async function assertApprovedCounselor(uid) {
  const snapshot = await getFirestore().doc(`users/${uid}`).get();
  const profile = snapshot.data();
  const approved = profile
    && ['admin', 'counselor'].includes(profile.role)
    && profile.active !== false
    && profile.approvalStatus !== 'pending'
    && profile.approvalStatus !== 'rejected';
  if (!approved) {
    throw new HttpsError('permission-denied', '승인된 상담 담당자만 이 기능을 이용할 수 있습니다.');
  }
  return profile;
}

async function assertCounselorStudentAccess(uid, profile, studentId) {
  if (profile.role === 'admin') return;
  const snapshot = await getFirestore().doc(`students/${studentId}`).get();
  if (!snapshot.exists || snapshot.data()?.counselorUid !== uid) {
    throw new HttpsError('permission-denied', '담당 학생의 상담 기록만 AI 초안으로 만들 수 있습니다.');
  }
}

function assertRecentAuthentication(auth) {
  const authTime = Number(auth?.token?.auth_time || 0);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!authTime || nowSeconds - authTime > RECENT_AUTH_SECONDS) {
    throw new HttpsError('unauthenticated', 'PIN 설정 전 현재 계정 비밀번호를 다시 확인해 주세요.');
  }
}

function sanitizeStudentId(value) {
  const studentId = typeof value === 'string' ? value.trim() : '';
  if (!studentId || studentId.length > 128 || !/^[\w-]+$/.test(studentId)) {
    throw new HttpsError('invalid-argument', '학생 정보가 올바르지 않습니다.');
  }
  return studentId;
}

async function consumeSensitiveAccessAttempt(uid, pin, pepper) {
  const database = getFirestore();
  const credentialRef = database.doc(`sensitiveAccessCredentials/${uid}`);
  const attemptRef = database.doc(`sensitiveAccessAttempts/${uid}`);
  const nowMillis = Date.now();

  return database.runTransaction(async transaction => {
    const [credentialSnapshot, attemptSnapshot] = await Promise.all([
      transaction.get(credentialRef),
      transaction.get(attemptRef),
    ]);
    if (!credentialSnapshot.exists) return { configured: false };

    const verified = verifyPinCredential(pin, credentialSnapshot.data(), pepper);
    const decision = getAttemptDecision(attemptSnapshot.data(), verified, nowMillis);
    transaction.set(attemptRef, {
      uid,
      failureCount: decision.failureCount,
      lockUntilMillis: decision.lockUntilMillis,
      lastAttemptAt: FieldValue.serverTimestamp(),
      ...(decision.allowed ? { lastSuccessAt: FieldValue.serverTimestamp() } : {}),
    }, { merge: true });
    return { configured: true, ...decision };
  });
}

export const configureSensitiveAccessPin = onCall({
  region: REGION,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 5,
  cors: true,
  secrets: [SENSITIVE_PIN_PEPPER],
}, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인 후 이용해 주세요.');
  await assertApprovedCounselor(request.auth.uid);
  assertRecentAuthentication(request.auth);
  let pin;
  try {
    pin = validateSensitivePin(request.data?.pin);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }
  let credential;
  try {
    credential = createPinCredential(pin, SENSITIVE_PIN_PEPPER.value());
  } catch {
    throw new HttpsError('failed-precondition', '민감정보 PIN 보안 설정을 확인해 주세요.');
  }
  const database = getFirestore();
  await database.doc(`sensitiveAccessCredentials/${request.auth.uid}`).set({
    uid: request.auth.uid,
    ...credential,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await database.doc(`sensitiveAccessAttempts/${request.auth.uid}`).set({
    uid: request.auth.uid,
    failureCount: 0,
    lockUntilMillis: 0,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  logger.info('Sensitive access PIN configured', { uid: request.auth.uid });
  return { configured: true };
});

export const revealStudentSensitiveData = onCall({
  region: REGION,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 10,
  cors: true,
  secrets: [SENSITIVE_PIN_PEPPER],
}, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인 후 이용해 주세요.');
  const profile = await assertApprovedCounselor(request.auth.uid);
  const studentId = sanitizeStudentId(request.data?.studentId);
  let pin;
  try {
    pin = validateSensitivePin(request.data?.pin);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }
  await assertCounselorStudentAccess(request.auth.uid, profile, studentId);

  const attempt = await consumeSensitiveAccessAttempt(request.auth.uid, pin, SENSITIVE_PIN_PEPPER.value());
  if (!attempt.configured) {
    throw new HttpsError('failed-precondition', '설정에서 민감정보 열람 PIN을 먼저 등록해 주세요.');
  }
  if (!attempt.allowed) {
    await getFirestore().collection('sensitiveAccessAudit').add({
      actorUid: request.auth.uid,
      actorRole: profile.role,
      studentId,
      fields: ['phone', 'studentNo'],
      outcome: attempt.locked ? 'locked' : 'denied',
      accessedAt: FieldValue.serverTimestamp(),
    });
    const message = attempt.locked ? 'PIN 인증 시도가 잠시 제한되었습니다.' : 'PIN이 일치하지 않습니다.';
    throw new HttpsError(attempt.locked ? 'resource-exhausted' : 'permission-denied', message, {
      retryAfterSeconds: attempt.retryAfterSeconds,
    });
  }

  const database = getFirestore();
  const [sensitiveSnapshot, studentSnapshot] = await Promise.all([
    database.doc(`studentSensitiveProfiles/${studentId}`).get(),
    database.doc(`students/${studentId}`).get(),
  ]);
  if (!studentSnapshot.exists) throw new HttpsError('not-found', '학생 정보를 찾을 수 없습니다.');
  const sensitive = sensitiveSnapshot.exists ? sensitiveSnapshot.data() : studentSnapshot.data();
  const values = {
    phone: typeof sensitive?.phone === 'string' ? sensitive.phone : '',
    studentNo: typeof sensitive?.studentNo === 'string' ? sensitive.studentNo : '',
  };

  await database.collection('sensitiveAccessAudit').add({
    actorUid: request.auth.uid,
    actorRole: profile.role,
    studentId,
    fields: ['phone', 'studentNo'],
    outcome: 'granted',
    accessedAt: FieldValue.serverTimestamp(),
  });
  logger.info('Sensitive student data revealed', {
    actorUid: request.auth.uid,
    studentId,
    fields: ['phone', 'studentNo'],
  });
  return { sensitive: values, expiresInSeconds: REVEAL_SECONDS };
});

export const updateOwnSensitivePhone = onCall({
  region: REGION,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 10,
  cors: true,
}, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인 후 이용해 주세요.');
  const phone = typeof request.data?.phone === 'string' ? request.data.phone.trim() : '';
  let maskedPhone;
  try {
    maskedPhone = maskPhoneForStorage(phone);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }
  const database = getFirestore();
  const studentQuery = await database.collection('students').where('uid', '==', request.auth.uid).limit(1).get();
  if (studentQuery.empty) throw new HttpsError('not-found', '연결된 학생 정보를 찾을 수 없습니다.');
  const studentSnapshot = studentQuery.docs[0];
  const sensitiveRef = database.doc(`studentSensitiveProfiles/${studentSnapshot.id}`);
  const sensitiveSnapshot = await sensitiveRef.get();
  const now = FieldValue.serverTimestamp();
  const batch = database.batch();
  batch.set(sensitiveRef, {
    ...(!sensitiveSnapshot.exists ? {
      studentId: studentSnapshot.id,
      studentUid: request.auth.uid,
      studentNo: studentSnapshot.data().studentNo,
    } : {}),
    phone,
    updatedAt: now,
  }, { merge: true });
  batch.set(studentSnapshot.ref, { phone: maskedPhone, updatedAt: now }, { merge: true });
  await batch.commit();
  return { phone: maskedPhone };
});

async function consumeDailyQuota(uid) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const ref = getFirestore().doc(`aiUsage/${uid}_${dateKey}`);
  await getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.data()?.count || 0;
    if (count >= DAILY_LIMIT) {
      throw new HttpsError('resource-exhausted', `오늘의 AI 초안 생성 한도(${DAILY_LIMIT}회)를 모두 사용했습니다.`);
    }
    transaction.set(ref, {
      uid,
      dateKey,
      count: count + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function consumeDemoDailyQuota(uid) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const ids = getDemoQuotaDocumentIds(uid, dateKey);
  const database = getFirestore();
  const sessionRef = database.doc(`demoAiUsage/${ids.session}`);
  const globalRef = database.doc(`demoAiUsage/${ids.global}`);
  await database.runTransaction(async transaction => {
    const [sessionSnapshot, globalSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(globalRef),
    ]);
    const sessionCount = sessionSnapshot.data()?.count || 0;
    const globalCount = globalSnapshot.data()?.count || 0;
    if (sessionCount >= DEMO_AI_SESSION_DAILY_LIMIT) {
      throw new HttpsError(
        'resource-exhausted',
        `데모 AI는 하루 ${DEMO_AI_SESSION_DAILY_LIMIT}회까지 사용할 수 있습니다.`,
      );
    }
    if (globalCount >= DEMO_AI_GLOBAL_DAILY_LIMIT) {
      throw new HttpsError(
        'resource-exhausted',
        '오늘 준비된 전체 데모 AI 사용량을 모두 사용했습니다.',
      );
    }
    const usage = {
      dateKey,
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.set(sessionRef, {
      ...usage,
      uid,
      count: sessionCount + 1,
    }, { merge: true });
    transaction.set(globalRef, {
      ...usage,
      count: globalCount + 1,
    }, { merge: true });
  });
}

async function createVertexConsultationDraft(input) {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCLOUD_PROJECT,
    location: 'global',
  });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildConsultationPrompt(input),
    config: {
      systemInstruction: CONSULTATION_SYSTEM_INSTRUCTION,
      temperature: 0.2,
      maxOutputTokens: 4096,
      thinkingConfig: {
        thinkingBudget: 0,
      },
      responseMimeType: 'application/json',
      responseJsonSchema: consultationDraftSchema,
    },
  });
  const responseText = response.text;
  if (typeof responseText !== 'string' || !responseText.trim()) {
    logger.warn('Consultation draft response was empty', {
      finishReason: response.candidates?.[0]?.finishReason || 'unknown',
      modelVersion: response.modelVersion || MODEL,
    });
  }
  return parseConsultationDraft(responseText);
}

function validateConsultationDraftRequest(data) {
  try {
    return sanitizeConsultationInput(data);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }
}

function buildConsultationDraftResult(draft, extra = {}) {
  return {
    draft,
    model: MODEL,
    generatedAt: new Date().toISOString(),
    ...extra,
  };
}

function throwConsultationAiError(error, stage, flow) {
  if (error instanceof HttpsError) throw error;
  const reason = classifyAiError(error);
  logger.error('Consultation draft generation failed', {
    code: error?.code || 'unknown',
    name: error?.name || 'Error',
    reason,
    stage,
    flow,
  });
  if (reason === 'VERTEX_PERMISSION_DENIED') {
    throw new HttpsError('permission-denied', 'AI 서버 권한 설정을 확인해 주세요.', { reason });
  }
  if (reason === 'VERTEX_QUOTA_EXCEEDED') {
    throw new HttpsError('resource-exhausted', 'AI 사용량이 일시적으로 초과되었습니다.', { reason });
  }
  if (['VERTEX_TIMEOUT', 'VERTEX_MODEL_NOT_FOUND'].includes(reason)) {
    throw new HttpsError('unavailable', 'AI 모델에 일시적으로 연결할 수 없습니다.', { reason });
  }
  throw new HttpsError('internal', 'AI 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.', { reason });
}

export const generateDemoConsultationDraft = onCall({
  region: REGION,
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 2,
  cors: true,
}, async request => {
  let stage = 'authentication';
  try {
    if (!request.auth?.uid || !isAnonymousFirebaseAuth(request.auth)) {
      throw new HttpsError('unauthenticated', '데모 세션을 다시 시작해 주세요.');
    }
    stage = 'origin-validation';
    const origin = request.rawRequest?.get?.('origin') || '';
    if (!isAllowedDemoOrigin(origin)) {
      throw new HttpsError('permission-denied', '허용된 커리어핏 데모에서만 이용할 수 있습니다.');
    }
    stage = 'input-validation';
    const input = validateConsultationDraftRequest(request.data);
    stage = 'quota';
    await consumeDemoDailyQuota(request.auth.uid);
    stage = 'vertex-ai';
    const draft = await createVertexConsultationDraft(input);
    return buildConsultationDraftResult(draft, { demo: true });
  } catch (error) {
    throwConsultationAiError(error, stage, 'demo');
  }
});

export const generateConsultationDraft = onCall({
  region: REGION,
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 3,
  cors: true,
}, async (request) => {
  let stage = 'authentication';
  try {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', '로그인 후 이용해 주세요.');
    }

    stage = 'authorization';
    const profile = await assertApprovedCounselor(request.auth.uid);

    stage = 'input-validation';
    const input = validateConsultationDraftRequest(request.data);

    stage = 'student-authorization';
    await assertCounselorStudentAccess(request.auth.uid, profile, input.studentId);

    stage = 'quota';
    await consumeDailyQuota(request.auth.uid);

    stage = 'vertex-ai';
    const draft = await createVertexConsultationDraft(input);
    return buildConsultationDraftResult(draft);
  } catch (error) {
    throwConsultationAiError(error, stage, 'authenticated');
  }
});
