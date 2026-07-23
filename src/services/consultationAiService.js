import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';

export function generateLocalConsultationDraft(input) {
  if (!input.rawMemo?.trim()) throw new Error('상담 메모를 입력해 주세요.');
  return {
    purpose: input.purpose || '학생의 진로 목표와 다음 행동 구체화',
    summary: input.rawMemo.trim(),
    strengths: input.strengths?.trim() || '상담 중 확인한 학생의 강점을 추가해 주세요.',
    concern: input.currentConcern?.trim() || '상담 중 확인한 학생의 고민을 추가해 주세요.',
    guidance: input.guidance?.trim() || '상담 중 안내한 내용을 추가해 주세요.',
    programs: input.programs || [],
    studentActions: input.studentActions?.trim() || '학생의 다음 행동을 구체적으로 작성해 주세요.',
    counselorActions: input.counselorActions?.trim() || '담당자의 후속 조치를 작성해 주세요.',
    nextCheckItems: input.nextCheckItems?.trim() || '다음 상담에서 확인할 내용을 작성해 주세요.',
  };
}

const errorMessages = {
  'functions/unauthenticated': '로그인 후 AI 초안을 이용해 주세요.',
  'functions/permission-denied': '승인된 상담 담당자만 AI 초안을 이용할 수 있습니다.',
  'functions/resource-exhausted': '오늘의 AI 초안 생성 한도를 모두 사용했습니다.',
  'functions/invalid-argument': '상담 메모를 확인한 뒤 다시 시도해 주세요.',
  'functions/deadline-exceeded': 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
  'functions/unavailable': 'AI 서비스에 일시적으로 연결할 수 없습니다.',
};

export async function generateConsultationDraft(input) {
  if (!input.rawMemo?.trim()) throw new Error('상담 메모를 입력해 주세요.');
  if (!auth?.currentUser) return generateLocalConsultationDraft(input);
  if (!functions) throw new Error('AI 서비스를 사용할 수 있도록 Firebase 설정을 확인해 주세요.');

  try {
    const callable = httpsCallable(functions, 'generateConsultationDraft', { timeout: 65000 });
    const result = await callable(input);
    if (!result.data?.draft) throw new Error('AI 초안 응답 형식이 올바르지 않습니다.');
    return result.data.draft;
  } catch (error) {
    throw new Error(errorMessages[error.code] || error.message || 'AI 초안을 만들지 못했습니다.');
  }
}
