import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendPrograms } from '../src/utils/programRecommendations.js';

const programList = [
  { id: 'generic', tags: ['취업'], grades: ['4학년'], score: 99 },
  { id: 'ux', tags: ['UX', '서비스 기획'], grades: ['2학년'], score: 60 },
  { id: 'data', tags: ['데이터 분석'], grades: ['2학년'], score: 70 },
];

test('program recommendations prioritize student interests before static scores', () => {
  const recommendations = recommendPrograms(programList, {
    grade: '2학년',
    interests: ['UX 디자인', '서비스 기획'],
  });

  assert.deepEqual(recommendations.map(program => program.id), ['ux', 'data']);
  assert.deepEqual(programList.map(program => program.id), ['generic', 'ux', 'data']);
});

test('program recommendations use grade and score as transparent fallbacks', () => {
  const recommendations = recommendPrograms(programList, {
    grade: '4학년',
    interests: [],
  }, 1);

  assert.equal(recommendations[0].id, 'generic');
});
