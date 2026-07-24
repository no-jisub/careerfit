import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendProgramNamesFromMemo } from '../src/utils/aiDraftRecommendations.js';

test('AI draft program fallback favors specific memo evidence over generic employment matches', () => {
  const recommendations = recommendProgramNamesFromMemo(
    '포트폴리오에서 프로젝트 경험과 성과를 정리하고 인턴 지원서를 작성하기로 함',
    [
      { name: 'NCS 면접 특강', type: '취업 준비', description: '공공기관 지원서 작성과 면접 준비', tags: ['NCS'] },
      { name: '포트폴리오 클리닉', type: '취업 준비', description: '프로젝트 경험과 성과를 포트폴리오 및 지원서로 정리', tags: ['포트폴리오'] },
    ],
    2,
  );
  assert.deepEqual(recommendations, ['포트폴리오 클리닉']);
});

test('AI draft program fallback returns no recommendation when evidence is weak', () => {
  assert.deepEqual(recommendProgramNamesFromMemo(
    '현재 상황을 함께 이야기함',
    [{ name: 'NCS 면접 특강', type: '취업 준비', description: '공공기관 면접', tags: ['NCS'] }],
  ), []);
});
