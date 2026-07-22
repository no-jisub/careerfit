import { useMemo } from 'react';
import { summarizeOutcomeMetrics } from '../utils/goals';

export default function OutcomeSummary({ goals = [], followUps = [], feedback = [] }) {
  const metrics = useMemo(() => summarizeOutcomeMetrics(goals, followUps, feedback), [goals, followUps, feedback]);
  return <section className="outcome-summary" aria-label="상담 성과 지표">
    <article><span>목표 달성률</span><strong>{metrics.goalAchievementRate}<small>%</small></strong></article>
    <article><span>후속 조치 완료율</span><strong>{metrics.followUpCompletionRate}<small>%</small></strong></article>
    <article><span>평균 만족도</span><strong>{metrics.satisfactionAverage}<small>/5</small></strong></article>
    <article><span>피드백 응답률</span><strong>{metrics.feedbackResponseRate}<small>%</small></strong></article>
    <article><span>추가 상담 필요</span><strong>{metrics.additionalConsultationRate}<small>%</small></strong></article>
  </section>;
}
