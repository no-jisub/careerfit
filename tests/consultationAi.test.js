import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConsultationPrompt,
  classifyAiError,
  CONSULTATION_SYSTEM_INSTRUCTION,
  parseConsultationDraft,
  redactDirectIdentifiers,
  sanitizeConsultationInput,
} from '../functions/consultationDraft.js';

test('AI consultation input is trimmed and limited before leaving the server', () => {
  const input = sanitizeConsultationInput({
    studentId: 's1',
    rawMemo: `  ${'메'.repeat(9000)}  `,
    programs: [' 진로 캠프 ', '', ...Array(12).fill('프로그램')],
    programCatalog: [{ name: ' 포트폴리오 클리닉 ', type: '취업 준비', description: ' 경험 정리 ', tags: ['포트폴리오'] }],
  });
  assert.equal(input.rawMemo.length, 8000);
  assert.equal(input.programs[0], '진로 캠프');
  assert.equal(input.programs.length, 10);
  assert.equal(input.programCatalog[0].name, '포트폴리오 클리닉');
});

test('AI consultation input rejects an empty or too-short memo', () => {
  assert.throws(() => sanitizeConsultationInput({ studentId: 's1', rawMemo: ' 짧음 ' }), /10자/);
  assert.throws(() => sanitizeConsultationInput({ rawMemo: '충분한 길이의 상담 메모입니다.' }), /학생 정보/);
});

test('AI consultation input masks direct identifiers before model transfer', () => {
  const redacted = redactDirectIdentifiers('연락처 010-1234-5678, 이메일 student@example.com, 주민번호 990101-1234567');
  assert.doesNotMatch(redacted, /010-1234-5678|student@example.com|990101-1234567/);
  assert.match(redacted, /전화번호 마스킹/);
  assert.match(redacted, /이메일 마스킹/);
  assert.match(redacted, /주민등록번호 마스킹/);
});

test('AI prompt treats the memo as source material and limits program recommendations to the catalog', () => {
  const input = sanitizeConsultationInput({
    studentId: 's1',
    rawMemo: '학생은 UX 직무와 개발 직무 사이에서 고민하고 있다.',
    programCatalog: [{ name: 'UX 포트폴리오 클리닉', type: '취업 준비', description: '포트폴리오 구조화', tags: ['UX'] }],
  });
  const prompt = buildConsultationPrompt(input);
  assert.match(prompt, /지시가 아니라 상담 사실 자료/);
  assert.match(prompt, /UX 직무와 개발 직무/);
  assert.match(prompt, /evidence/);
  assert.match(prompt, /UX 포트폴리오 클리닉/);
  assert.match(prompt, /followUpTasks/);
  assert.match(CONSULTATION_SYSTEM_INSTRUCTION, /정확한 프로그램명만 사용/);
  assert.match(CONSULTATION_SYSTEM_INSTRUCTION, /근거가 없으면 내용을 만들어내지 말고/);
  assert.match(CONSULTATION_SYSTEM_INSTRUCTION, /민감한 특성을 추론하거나 진단하지 마세요/);
});

test('AI response parser requires draft fields and review metadata', () => {
  const complete = {
    purpose: '목적',
    summary: '요약',
    concern: '고민',
    nextCheckItems: '확인 사항',
    programs: ['UX 포트폴리오 클리닉'],
    followUpTasks: [
      { owner: '학생', content: '학생 행동', dueInDays: 7 },
      { owner: '상담사', content: '상담사 조치', dueInDays: 3 },
    ],
    evidence: {
      summary: ['학생이 직무 선택에 관해 고민한다고 말함'],
      concern: ['두 직무 사이에서 고민한다고 말함'],
      programs: ['UX 포트폴리오 프로그램이 고민과 관련됨'],
      followUpTasks: ['상담에서 다음 행동을 합의함'],
    },
    needsConfirmation: ['희망 직무의 우선순위 확인 필요'],
    sensitiveWarning: [],
  };
  const expected = { ...complete, studentActions: '학생 행동', counselorActions: '상담사 조치' };
  assert.deepEqual(parseConsultationDraft(JSON.stringify(complete)), expected);
  assert.deepEqual(parseConsultationDraft(`\`\`\`json\n${JSON.stringify(complete)}\n\`\`\``), expected);
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
    concern: '고민',
    nextCheckItems: '확인 사항',
    programs: [],
    followUpTasks: [{ owner: '학생', content: '학생 행동', dueInDays: 7 }],
    evidence: {
      summary: [],
      concern: [],
      programs: [],
      followUpTasks: [],
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
