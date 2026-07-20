export function generateConsultationDraft(input) {
  if (!input.rawMemo?.trim()) throw new Error('상담 메모를 입력해 주세요.');
  return {
    purpose: input.purpose || '학생의 진로 목표와 다음 행동 구체화',
    summary: input.rawMemo.trim(),
    concern: input.currentConcern?.trim() || '상담 중 확인한 학생의 고민을 추가해 주세요.',
    guidance: input.guidance?.trim() || '상담 중 안내한 내용을 추가해 주세요.',
    programs: input.programs || [],
    studentActions: input.studentActions?.trim() || '학생의 다음 행동을 구체적으로 작성해 주세요.',
    counselorActions: input.counselorActions?.trim() || '담당자의 후속 조치를 작성해 주세요.',
    nextCheckItems: input.nextCheckItems?.trim() || '다음 상담에서 확인할 내용을 작성해 주세요.',
  };
}
