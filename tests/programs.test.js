import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProgramRecommendationStore,
  createProgramStore,
  isProgramEligibleForStudent,
  normalizeProgram,
  resolveProgramStatus,
  restoreProgramRecommendationStore,
  restoreProgramStore,
  validateProgram,
} from '../src/utils/programs.js';

const baseProgram = {
  id: 'program-test',
  name: '테스트 프로그램',
  type: '직무 역량',
  description: '프로그램 설명',
  reason: '추천 이유',
  tags: ['UX', 'UX', '기획'],
  grades: ['2학년', '3학년'],
  targetDepartments: ['컴퓨터공학과'],
  target: '컴퓨터공학과 2~3학년',
  recruitmentStartDate: '2026-07-20',
  recruitmentEndDate: '2026-07-31',
  programStartDate: '2026-08-05',
  programEndDate: '2026-08-20',
  mode: '혼합',
  department: '대학일자리플러스센터',
  applicationUrl: 'https://example.com/apply',
  status: 'recruiting',
};

test('program status follows recruitment and operation dates', () => {
  assert.equal(resolveProgramStatus(baseProgram, '2026-07-19'), 'scheduled');
  assert.equal(resolveProgramStatus(baseProgram, '2026-07-22'), 'recruiting');
  assert.equal(resolveProgramStatus(baseProgram, '2026-08-01'), 'closed');
  assert.equal(resolveProgramStatus(baseProgram, '2026-08-21'), 'completed');
  assert.equal(resolveProgramStatus({ ...baseProgram, archived: true }, '2026-07-22'), 'archived');
});

test('program validation blocks invalid dates, URLs, and missing audiences', () => {
  const errors = validateProgram({
    ...baseProgram,
    grades: [],
    recruitmentStartDate: '2026-08-01',
    recruitmentEndDate: '2026-07-01',
    applicationUrl: 'javascript:alert(1)',
  });
  assert.equal(Boolean(errors.grades), true);
  assert.equal(Boolean(errors.recruitmentDates), true);
  assert.equal(Boolean(errors.applicationUrl), true);
});

test('draft programs can be saved before recruitment dates are confirmed', () => {
  const errors = validateProgram({
    ...baseProgram,
    status: 'draft',
    recruitmentStartDate: '',
    recruitmentEndDate: '',
    programStartDate: '',
    programEndDate: '',
  });
  assert.equal(errors.recruitmentDates, undefined);
  assert.equal(errors.programDates, undefined);
});

test('program eligibility checks grade and department together', () => {
  const normalized = normalizeProgram(baseProgram);
  assert.equal(isProgramEligibleForStudent(normalized, { grade: '2학년', department: '컴퓨터공학과' }), true);
  assert.equal(isProgramEligibleForStudent(normalized, { grade: '4학년', department: '컴퓨터공학과' }), false);
  assert.equal(isProgramEligibleForStudent(normalized, { grade: '2학년', department: '경영학과' }), false);
});

test('program stores restore valid records and recover corrupt versions', () => {
  const normalized = normalizeProgram(baseProgram);
  const store = createProgramStore([normalized]);
  assert.equal(restoreProgramStore(store, []).length, 1);
  assert.deepEqual(restoreProgramStore({ version: 999, programs: [] }, [normalized]).map(item => item.id), ['program-test']);

  const recommendations = [{ id: 'r1', studentId: 's1', programId: 'program-test' }];
  const recommendationStore = createProgramRecommendationStore(recommendations);
  assert.equal(restoreProgramRecommendationStore(recommendationStore, []).length, 1);
  assert.deepEqual(restoreProgramRecommendationStore({ version: 999 }, recommendations), recommendations);
});

test('normalization removes duplicate tags and preserves safe derived labels', () => {
  const normalized = normalizeProgram(baseProgram);
  assert.deepEqual(normalized.tags, ['UX', '기획']);
  assert.equal(normalized.recruit, '07.20–07.31');
  assert.equal(normalized.period, '08.05–08.20');
});
