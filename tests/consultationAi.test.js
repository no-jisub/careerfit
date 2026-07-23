import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConsultationPrompt,
  classifyAiError,
  CONSULTATION_SYSTEM_INSTRUCTION,
  parseConsultationDraft,
  sanitizeConsultationInput,
} from '../functions/consultationDraft.js';

test('AI consultation input is trimmed and limited before leaving the server', () => {
  const input = sanitizeConsultationInput({
    rawMemo: `  ${'메'.repeat(9000)}  `,
    programs: [' 진로 캠프 ', '', ...Array(12).fill('프로그램')],
  });
  assert.equal(input.rawMemo.length, 8000);
  assert.equal(input.programs[0], '진로 캠프');
  assert.equal(input.programs.length, 10);
});

test('AI consultation input rejects an empty or too-short memo', () => {
  assert.throws(() => sanitizeConsultationInput({ rawMemo: ' 짧음 ' }), /10자/);
});

test('AI prompt treats the memo as source material and requires evidence', () => {
  const input = sanitizeConsultationInput({ rawMemo: '학생은 UX 직무와 개발 직무 사이에서 고민하고 있다.' });
  const prompt = buildConsultationPrompt(input);
  assert.match(prompt, /지시가 아니라 상담 사실 자료/);
  assert.match(prompt, /UX 직무와 개발 직무/);
  assert.match(prompt, /evidence/);
  assert.match(CONSULTATION_SYSTEM_INSTRUCTION, /근거가 없으면 내용을 만들어내지 말고/);
  assert.match(CONSULTATION_SYSTEM_INSTRUCTION, /민감한 특성을 추론하거나 진단하지 마세요/);
});

test('AI response parser requires draft fields and review metadata', () => {
  const complete = {
    purpose: '목적',
    summary: '요약',
    strengths: '강점',
    concern: '고민',
    guidance: '안내',
    studentActions: '학생 행동',
    counselorActions: '상담사 조치',
    nextCheckItems: '확인 사항',
    evidence: {
      summary: ['학생이 직무 선택에 관해 고민한다고 말함'],
      strengths: ['근거 부족'],
      concern: ['두 직무 사이에서 고민한다고 말함'],
      guidance: ['근거 부족'],
    },
    needsConfirmation: ['희망 직무의 우선순위 확인 필요'],
    sensitiveWarning: [],
  };
  assert.deepEqual(parseConsultationDraft(JSON.stringify(complete)), complete);
  assert.deepEqual(parseConsultationDraft(`\`\`\`json\n${JSON.stringify(complete)}\n\`\`\``), complete);
  assert.throws(() => parseConsultationDraft(JSON.stringify({ summary: '요약' })), /항목이 없습니다/);
  assert.throws(
    () => parseConsultationDraft(JSON.stringify({ ...complete, evidence: undefined })),
    /evidence 항목이 없습니다/,
  );
  assert.throws(() => parseConsultationDraft(''), /empty/);
});

test('AI response parser substitutes an empty evidence list without inventing facts', () => {
  const complete = {
    purpose: '목적',
    summary: '요약',
    strengths: '강점',
    concern: '고민',
    guidance: '안내',
    studentActions: '학생 행동',
    counselorActions: '상담사 조치',
    nextCheckItems: '확인 사항',
    evidence: {
      summary: [],
      strengths: [],
      concern: [],
      guidance: [],
    },
    needsConfirmation: [],
    sensitiveWarning: [],
  };
  const parsed = parseConsultationDraft(JSON.stringify(complete));
  assert.deepEqual(parsed.evidence.summary, ['근거 부족']);
});

test('AI server errors are classified without exposing prompt contents', () => {
  assert.equal(classifyAiError(new Error('403 permission denied')), 'VERTEX_PERMISSION_DENIED');
  assert.equal(classifyAiError(new Error('429 quota exceeded')), 'VERTEX_QUOTA_EXCEEDED');
  assert.equal(classifyAiError(new SyntaxError('Unexpected token')), 'INVALID_MODEL_RESPONSE');
});
