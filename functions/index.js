import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  buildConsultationPrompt,
  consultationDraftSchema,
  parseConsultationDraft,
  sanitizeConsultationInput,
} from './consultationDraft.js';

initializeApp();

const REGION = 'asia-northeast3';
const MODEL = 'gemini-2.5-flash';
const DAILY_LIMIT = 50;

async function assertApprovedCounselor(uid) {
  const snapshot = await getFirestore().doc(`users/${uid}`).get();
  const profile = snapshot.data();
  const approved = profile
    && ['admin', 'counselor'].includes(profile.role)
    && profile.active !== false
    && profile.approvalStatus !== 'pending'
    && profile.approvalStatus !== 'rejected';
  if (!approved) {
    throw new HttpsError('permission-denied', '승인된 상담 담당자만 AI 초안을 만들 수 있습니다.');
  }
}

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

export const generateConsultationDraft = onCall({
  region: REGION,
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 3,
  cors: true,
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인 후 이용해 주세요.');
  }

  await assertApprovedCounselor(request.auth.uid);

  let input;
  try {
    input = sanitizeConsultationInput(request.data);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }

  await consumeDailyQuota(request.auth.uid);

  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GCLOUD_PROJECT,
      location: 'global',
    });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildConsultationPrompt(input),
      config: {
        systemInstruction: '당신은 대한민국 대학 진로상담 담당자의 기록 작성을 돕는 보조 도구입니다. 최종 판단을 대신하지 말고 제공된 사실만 구조화하세요.',
        temperature: 0.2,
        maxOutputTokens: 1800,
        responseMimeType: 'application/json',
        responseJsonSchema: consultationDraftSchema,
      },
    });
    return {
      draft: parseConsultationDraft(response.text),
      model: MODEL,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Consultation draft generation failed', {
      code: error?.code || 'unknown',
      name: error?.name || 'Error',
    });
    throw new HttpsError('internal', 'AI 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
});
