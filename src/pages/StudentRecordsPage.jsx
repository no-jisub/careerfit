import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { useApp } from '../context/AppContext';
import { DEMO_STUDENT_ID } from '../utils/demoInteraction';

const provenanceLabel = summary => summary?.provenance?.type === 'ai-assisted'
  ? '상담사가 작성 근거를 확인한 상담 요약'
  : '상담사가 직접 작성하고 확인한 요약';

export default function StudentRecordsPage() {
  const { students, consultationSummaries } = useApp();
  const { user } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);
  const [expandedId, setExpandedId] = useState('');
  const records = useMemo(() => student ? consultationSummaries
    .filter(item => item.studentId === student.id && item.published !== false)
    .sort((left, right) => right.date.localeCompare(left.date)) : [], [consultationSummaries, student]);
  const latest = records[0];

  if (!student) return <div className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</div>;

  return <div className="student-page student-records-page">
    <PageIntro icon="note" title="상담 기록" description="상담에서 나눈 내용과 결정한 다음 계획을 시간 순서대로 확인하세요." action={<Link className="button secondary" to="/student/appointments">다음 상담 예약</Link>} />
    <section className="student-record-insight card">
      <span className="student-record-insight-icon"><Icon name="chart" size={22} /></span>
      <div><small>나의 상담 여정</small><strong>총 {records.length}번의 상담 기록이 쌓였어요</strong><p>{latest ? `최근 상담은 ${latest.date}에 진행됐습니다. 기록을 열어 다음 계획을 다시 확인해 보세요.` : '상담사가 공개한 기록이 생기면 이곳에서 나의 변화를 이어서 볼 수 있어요.'}</p></div>
      {latest && <button type="button" onClick={() => setExpandedId(latest.id)}>최근 기록 열기 <Icon name="arrow" size={16} /></button>}
    </section>
    <section className="card student-record-management student-record-page-panel">
      <div className="student-page-panel-heading"><div><h2>상담 기록 타임라인</h2><p>기록을 선택하면 공개된 상담 요약과 다음 행동을 확인할 수 있습니다.</p></div><span>총 {records.length}건</span></div>
      {records.length ? <div className="student-consultation-timeline">{records.map(item => {
        const expanded = expandedId === item.id;
        return <article key={item.id} className={expanded ? 'open' : ''}><span className="student-timeline-dot" aria-hidden="true" /><button type="button" className="student-record-toggle" aria-expanded={expanded} aria-controls={`student-record-${item.id}`} onClick={() => setExpandedId(expanded ? '' : item.id)}><div className="student-record-info"><time className="student-record-date" dateTime={item.date}>{item.date}</time><div><strong>{item.purpose}</strong><span>{item.type} · {item.counselor || student.counselor || '담당 상담사'}</span></div></div><Icon name="chevron" size={18} /></button>{expanded && <div className="student-timeline-body" id={`student-record-${item.id}`}><div className="published-summary-fields">{item.summary && <div><span>상담 요약</span><p>{item.summary}</p></div>}{item.strengths && <div><span>나의 강점</span><p>{item.strengths}</p></div>}{item.concern && <div><span>개선 또는 고민 사항</span><p>{item.concern}</p></div>}{item.programs?.length > 0 && <div><span>추천 프로그램</span><p>{item.programs.join(', ')}</p></div>}{item.studentActions && <div><span>상담 후 할 일</span><p>{item.studentActions}</p></div>}{item.nextCheckItems && <div><span>다음 상담 계획</span><p>{item.nextCheckItems}</p></div>}</div><div className="student-timeline-footer"><div className="summary-provenance"><Icon name="shield" size={15} /><span>{provenanceLabel(item)}</span></div><small>상담일 {item.date} · {item.counselor || student.counselor || '담당 상담사'} 상담사</small></div></div>}</article>;
      })}</div> : <EmptyState icon="note" title="공개된 상담 기록이 없습니다" description="담당 상담사가 기록을 공개하면 이곳에서 확인할 수 있어요." />}
    </section>
  </div>;
}
