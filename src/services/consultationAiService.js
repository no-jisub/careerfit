import { httpsCallable, httpsCallableFromURL } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import { recommendProgramNamesFromMemo } from '../utils/aiDraftRecommendations';

export function generateLocalConsultationDraft(input) {
  if (!input.rawMemo?.trim()) throw new Error('상담 메모를 입력해 주세요.');
  const recommendedPrograms = recommendProgramNamesFromMemo(input.rawMemo, input.programCatalog, 1);
  const followUpTasks = [
    { owner: '학생', content: '상담에서 정한 준비 항목을 1차 초안으로 정리하기', dueInDays: 7 },
    { owner: '상담사', content: '학생의 준비 결과 검토에 필요한 참고자료 전달하기', dueInDays: 3 },
  ];
  return {
    purpose: '학생의 진로 목표와 다음 행동 구체화',
    summary: input.rawMemo.trim(),
    concern: '내부 메모에 나타난 학생의 고민과 우선순위를 상담사가 확인해 주세요.',
    programs: recommendedPrograms,
    followUpTasks,
    studentActions: followUpTasks.filter(task => task.owner === '학생').map(task => task.content).join('\n'),
    counselorActions: followUpTasks.filter(task => task.owner === '상담사').map(task => task.content).join('\n'),
    nextCheckItems: '제안한 실행 항목의 진행 상황과 추가 지원 필요 여부',
    evidence: {
      summary: ['상담 담당자가 입력한 내부 메모를 바탕으로 정리했습니다.'],
      concern: ['내부 메모에서 상담이 필요한 고민과 우선순위를 확인했습니다.'],
      programs: recommendedPrograms.length
        ? ['내부 메모의 상담 맥락과 제공된 프로그램 후보를 비교했습니다.']
        : ['적합한 프로그램 후보가 제공되지 않았습니다.'],
      followUpTasks: ['내부 메모의 합의 사항을 학생과 상담사의 실행 항목으로 구분했습니다.'],
    },
    needsConfirmation: [],
    sensitiveWarning: [],
    reviewMeta: {
      model: 'local-demo',
      generatedAt: new Date().toISOString(),
      identifiersRedacted: false,
      mode: 'local-demo',
    },
  };
}

const errorMessages = {
  'functions/unauthenticated': '로그인 후 상담 기록 정리 도우미를 이용해 주세요.',
  'functions/permission-denied': '승인된 상담 담당자만 기록 정리 도우미를 이용할 수 있습니다.',
  'functions/resource-exhausted': '오늘의 자동 정리 사용 한도를 모두 사용했습니다.',
  'functions/invalid-argument': '상담 메모를 확인한 뒤 다시 시도해 주세요.',
  'functions/deadline-exceeded': '초안 정리 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
  'functions/unavailable': '기록 정리 서비스에 일시적으로 연결할 수 없습니다.',
  'functions/internal': '초안을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

function splitLegacyActions(value, owner, dueInDays) {
  return String(value || '')
    .split(/\n+/)
    .map(content => content.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(content => ({ owner, content, dueInDays }));
}

function normalizeDraftForPreview(draft, input) {
  const followUpTasks = Array.isArray(draft.followUpTasks) && draft.followUpTasks.length
    ? draft.followUpTasks
    : [
      ...splitLegacyActions(draft.studentActions, '학생', 7),
      ...splitLegacyActions(draft.counselorActions, '상담사', 3),
    ];
  const programs = Array.isArray(draft.programs)
    ? draft.programs
    : recommendProgramNamesFromMemo(input.rawMemo, input.programCatalog, 1);
  return {
    ...draft,
    programs,
    followUpTasks,
    evidence: {
      ...draft.evidence,
      programs: draft.evidence?.programs || ['상담 맥락과 제공된 프로그램 후보를 비교해 확인해야 합니다.'],
      followUpTasks: draft.evidence?.followUpTasks || ['정리된 학생 및 상담사의 다음 행동을 확인해야 합니다.'],
    },
  };
}

export async function generateConsultationDraft(input) {
  if (!input.rawMemo?.trim()) throw new Error('상담 메모를 입력해 주세요.');
  const currentUser = auth?.currentUser;
  if (!currentUser) return generateLocalConsultationDraft(input);
  if (!functions) throw new Error('기록 정리 서비스를 사용할 수 있도록 Firebase 설정을 확인해 주세요.');

  try {
    const demoSession = currentUser.isAnonymous;
    const functionName = demoSession ? 'generateDemoConsultationDraft' : 'generateConsultationDraft';
    const isFirebaseHosting = typeof window !== 'undefined'
      && (window.location.hostname.endsWith('.web.app')
        || window.location.hostname.endsWith('.firebaseapp.com'));
    const callable = isFirebaseHosting
      ? httpsCallableFromURL(
        functions,
        `${window.location.origin}/api/${functionName}`,
        { timeout: 65000 },
      )
      : httpsCallable(functions, functionName, { timeout: 65000 });
    const result = await callable(input);
    if (!result.data?.draft) throw new Error('초안 응답 형식이 올바르지 않습니다.');
    return {
      ...normalizeDraftForPreview(result.data.draft, input),
      reviewMeta: {
        model: result.data.model || 'unknown',
        generatedAt: result.data.generatedAt || new Date().toISOString(),
        identifiersRedacted: true,
        mode: demoSession ? 'vertex-demo' : 'authenticated',
      },
    };
  } catch (error) {
    const demoFallbackCodes = new Set([
      'functions/not-found',
      'functions/unimplemented',
      'functions/unavailable',
    ]);
    if (currentUser.isAnonymous && demoFallbackCodes.has(error?.code)) {
      return generateLocalConsultationDraft(input);
    }
    throw new Error(errorMessages[error.code] || error.message || '상담 기록 초안을 만들지 못했습니다.');
  }
}
