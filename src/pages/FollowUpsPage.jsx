import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { Avatar, EmptyState, PageIntro, StatusBadge } from '../components/UI';

export default function FollowUpsPage() {
  const { students, followUps, setFollowUps, persistRecords, notify } = useApp();
  const [filter, setFilter] = useState('all');
  const [owner, setOwner] = useState('all');
  const items = useMemo(() => followUps.filter(f => (filter === 'all' || f.status === filter) && (owner === 'all' || f.owner === owner)).sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1)), [followUps, filter, owner]);
  const updateStatus = (id, status) => { const current = followUps.find(f => f.id === id); if (!current) return; const updated = { ...current, status, updatedAt: new Date().toISOString(), ...(status === 'complete' ? { completedAt: new Date().toISOString() } : {}) }; setFollowUps(prev => prev.map(f => f.id === id ? updated : f)); void persistRecords('followUps', [updated]); notify(status === 'complete' ? '후속 조치를 완료 처리했습니다.' : '후속 조치 상태를 변경했습니다.'); };
  return <>
    <PageIntro eyebrow="후속 조치 관리" title="다음 행동을 놓치지 않도록" description="모든 학생의 후속 조치를 기한과 담당자별로 모아 확인하세요." action={<button className="button primary" onClick={() => notify('학생 상세 화면에서 새로운 후속 조치를 추가할 수 있어요.')}><Icon name="plus" size={18} />후속 조치 추가</button>} />
    <section className="task-filter-bar"><div className="segmented" aria-label="상태 필터">{[['all','전체'],['scheduled','예정'],['inProgress','진행 중'],['complete','완료'],['overdue','기한 초과']].map(([key,label]) => <button className={filter === key ? 'active' : ''} key={key} onClick={() => setFilter(key)}>{label}<span>{key === 'all' ? followUps.length : followUps.filter(f => f.status === key).length}</span></button>)}</div><select aria-label="행동 담당자" value={owner} onChange={e => setOwner(e.target.value)}><option value="all">전체 담당자</option><option value="학생">학생 담당</option><option value="교직원">교직원 담당</option></select></section>
    <section className="card task-table-card"><div className="list-toolbar"><div><h2>후속 조치 목록 <span>{items.length}</span></h2><p>기한 초과 항목이 먼저 표시됩니다.</p></div></div>{items.length ? <div className="task-list">{items.map(f => { const student = students.find(s => s.id === f.studentId); return <article className={`task-row ${f.status}`} key={f.id}><div className="task-student"><Avatar student={student} size="small" /><div><Link to={`/students/${student.id}`}>{student.name}</Link><span>{student.department}</span></div></div><div className="task-content"><StatusBadge status={f.status} context="followUp" /><strong>{f.content}</strong><small>관련 상담 {f.consultationDate}</small></div><div className="task-owner"><span>행동 담당자</span><strong>{f.owner}</strong></div><div className="task-due"><span>완료 기한</span><strong><Icon name="calendar" size={15} />{f.dueDate}</strong></div><div className="task-actions"><label><span className="sr-only">상태 변경</span><select value={f.status} onChange={e => updateStatus(f.id, e.target.value)}><option value="scheduled">예정</option><option value="inProgress">진행 중</option><option value="complete">완료</option><option value="overdue">기한 초과</option></select></label>{f.status !== 'complete' && <button className="button secondary small" onClick={() => updateStatus(f.id, 'complete')}>완료 처리</button>}</div></article>; })}</div> : <EmptyState title="등록된 후속 조치가 없습니다" description="학생 상세 화면에서 다음 행동을 새로 등록해 보세요." />}</section>
  </>;
}
