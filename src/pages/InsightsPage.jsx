import { useMemo, useState } from 'react';
import { useApp } from '../App';
import { PageIntro } from '../components/UI';
import { addDays, toDateKey } from '../utils/date';
import { summarizeOperations } from '../utils/operations';

export default function InsightsPage() {
  const { students, consultations, followUps, appointments } = useApp();
  const [period, setPeriod] = useState('30');
  const fromDate = period === 'all' ? '' : addDays(toDateKey(), -Number(period));
  const summary = useMemo(() => summarizeOperations(students, consultations, followUps, appointments, fromDate), [students, consultations, followUps, appointments, fromDate]);
  const maxType = Math.max(1, ...summary.consultationTypes.map(([, count]) => count));
  const maxDepartment = Math.max(1, ...summary.departments.map(([, count]) => count));
  return <><PageIntro eyebrow="운영 통계" title="상담 운영 현황을 한눈에" description="상담 실적과 후속 조치 진행률을 기간별로 확인하세요." action={<label className="insight-period"><span>조회 기간</span><select value={period} onChange={event => setPeriod(event.target.value)}><option value="7">최근 7일</option><option value="30">최근 30일</option><option value="90">최근 90일</option><option value="all">전체 기간</option></select></label>} /><section className="insight-kpis"><article><small>상담 기록</small><strong>{summary.consultationCount}<span>건</span></strong><p>상담 학생 {summary.activeStudentCount}명</p></article><article><small>후속 조치 완료율</small><strong>{summary.taskCompletionRate}<span>%</span></strong><p>기한 초과율 {summary.overdueRate}%</p></article><article><small>상담 일정 완료율</small><strong>{summary.appointmentCompletionRate}<span>%</span></strong><p>취소율 {summary.cancellationRate}%</p></article></section><div className="insight-grid"><section className="card"><h2>상담 유형별 현황</h2><div className="metric-bars">{summary.consultationTypes.map(([label, count]) => <div key={label}><span>{label}</span><i><b style={{ width: `${count / maxType * 100}%` }} /></i><strong>{count}건</strong></div>)}{!summary.consultationTypes.length && <p>해당 기간의 상담 기록이 없습니다.</p>}</div></section><section className="card"><h2>학과별 담당 학생</h2><div className="metric-bars departments">{summary.departments.slice(0, 6).map(([label, count]) => <div key={label}><span>{label}</span><i><b style={{ width: `${count / maxDepartment * 100}%` }} /></i><strong>{count}명</strong></div>)}</div></section></div></>;
}
