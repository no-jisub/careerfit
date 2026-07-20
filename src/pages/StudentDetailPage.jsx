import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { Avatar, EmptyState, StatusBadge } from '../components/UI';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const { students, consultations, followUps, setFollowUps, notify } = useApp();
  const student = students.find(s => s.id === studentId) || students[0];
  const history = consultations.filter(c => c.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date));
  const tasks = followUps.filter(f => f.studentId === student.id && f.status !== 'complete');
  const [expanded, setExpanded] = useState(history[0]?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [taskOwner, setTaskOwner] = useState('학생');
  const [dueDate, setDueDate] = useState('2026-07-30');
  const addTask = e => { e.preventDefault(); if (!taskText.trim() || !dueDate) return; setFollowUps(x => [...x, { id: `f${Date.now()}`, studentId: student.id, content: taskText.trim(), owner: taskOwner, dueDate, status: 'scheduled', consultationDate: new Date().toISOString().slice(0, 10) }]); setTaskText(''); setTaskOwner('학생'); setShowAdd(false); notify('후속 조치를 추가했습니다.'); };
  return <>
    <nav className="breadcrumb" aria-label="현재 위치"><Link to="/students">학생 관리</Link><Icon name="chevron" size={14} /><span>{student.name}</span></nav>
    <section className="profile-hero">
      <div className="profile-main"><Avatar student={student} size="large" /><div><div className="profile-name"><h1>{student.name}</h1><StatusBadge status={student.status} /></div><p>{student.studentNo} · {student.department} · {student.grade}</p><div className="tag-row">{student.interests.map(x => <span className="tag" key={x}>{x}</span>)}</div></div></div>
      <div className="profile-actions"><button className="button secondary" onClick={() => notify('학생 정보 수정 기능을 열었습니다.')}>학생 정보 수정</button><button className="button secondary" onClick={() => setShowAdd(true)}><Icon name="plus" size={18} />후속 조치 추가</button><Link to={`/programs?student=${student.id}`} className="button secondary"><Icon name="spark" size={17} />프로그램 추천</Link><Link to={`/students/${student.id}/consultation/new`} className="button primary"><Icon name="note" size={18} />상담 시작</Link></div>
    </section>
    <div className="detail-grid">
      <div className="detail-main">
        <section className="card prep-card"><div className="section-header"><div><span className="eyebrow">상담 준비 요약</span><h2>상담 전, 이것만 확인하세요</h2></div><span className="updated-label"><Icon name="clock" size={14} />최근 상담 {student.lastConsultation}</span></div>
          <div className="prep-grid"><article><span className="prep-icon blue"><Icon name="note" /></span><div><strong>최근 상담 핵심 내용</strong><p>{history[0]?.summary || '아직 작성된 상담 기록이 없습니다.'}</p></div></article><article><span className="prep-icon orange"><Icon name="alert" /></span><div><strong>학생이 말한 주요 고민</strong><p>{student.concern}</p></div></article><article><span className="prep-icon green"><Icon name="check" /></span><div><strong>이전 상담에서 안내한 사항</strong><p>{history[0]?.guidance || '안내한 사항이 없습니다.'}</p></div></article><article><span className="prep-icon purple"><Icon name="target" /></span><div><strong>다음 상담에서 확인할 내용</strong><p>{history[0]?.nextCheckItems || '확인할 내용을 등록해 주세요.'}</p></div></article></div>
        </section>
        <section className="card"><div className="section-header"><div><span className="eyebrow">상담 히스토리</span><h2>상담 기록 타임라인</h2></div><Link className="text-link" to={`/students/${student.id}/consultation/new`}>기록 작성 <Icon name="plus" size={15} /></Link></div>
          {history.length ? <div className="timeline">{history.map((c, i) => <article key={c.id} className={`timeline-item ${expanded === c.id ? 'open' : ''}`}><span className="timeline-dot" /><button aria-expanded={expanded === c.id} onClick={() => setExpanded(expanded === c.id ? '' : c.id)}><div><time>{c.date}</time><span className="tag">{c.type}</span><h3>{c.purpose}</h3></div><Icon name="chevron" /></button>{expanded === c.id && <div className="timeline-body"><dl><div><dt>핵심 내용</dt><dd>{c.summary}</dd></div><div><dt>안내한 내용</dt><dd>{c.guidance}</dd></div><div><dt>학생의 다음 행동</dt><dd>{c.studentActions}</dd></div><div><dt>담당자의 다음 행동</dt><dd>{c.counselorActions}</dd></div><div><dt>다음 상담 확인 사항</dt><dd>{c.nextCheckItems}</dd></div></dl>{c.programs?.length > 0 && <div className="program-inline"><Icon name="spark" size={17} /><span>추천 프로그램</span><strong>{c.programs.join(', ')}</strong></div>}<p className="counselor-line">상담 담당자 · {c.counselor}</p></div>}</article>)}</div> : <EmptyState title="아직 작성된 상담 기록이 없습니다" description="첫 상담을 시작하고 학생의 목표와 다음 행동을 기록해 보세요." />}
        </section>
      </div>
      <aside className="detail-aside">
        <section className="card info-card"><span className="eyebrow">학생 기본 정보</span><h2>프로필</h2><dl><div><dt>연락처</dt><dd>{student.phone}</dd></div><div><dt>진로 목표</dt><dd>{student.goal}</dd></div><div><dt>담당 상담자</dt><dd>{student.counselor}</dd></div><div><dt>최근 상담일</dt><dd>{student.lastConsultation}</dd></div></dl></section>
        <section className="card"><div className="section-header compact"><div><span className="eyebrow">해야 할 일</span><h2>미완료 후속 조치 <em>{tasks.length}</em></h2></div><button className="icon-button" aria-label="후속 조치 추가" onClick={() => setShowAdd(true)}><Icon name="plus" /></button></div>
          <div className="aside-tasks">{tasks.map(t => <article className={t.status === 'overdue' ? 'overdue' : ''} key={t.id}><div><StatusBadge status={t.status} /><span>{t.owner} 담당</span></div><strong>{t.content}</strong><small><Icon name="calendar" size={14} />{t.dueDate}까지</small></article>)}{!tasks.length && <EmptyState title="등록된 후속 조치가 없습니다" />}</div>
        </section>
      </aside>
    </div>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setShowAdd(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">새로운 다음 행동</span><h2 id="task-modal-title">후속 조치 추가</h2><form onSubmit={addTask}><label>후속 조치 내용<input autoFocus value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="학생이 해야 할 다음 행동" required /></label><div className="form-row"><label>행동 담당자<select value={taskOwner} onChange={e => setTaskOwner(e.target.value)}><option>학생</option><option>교직원</option></select></label><label>완료 기한<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required /></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowAdd(false)}>취소</button><button className="button primary">후속 조치 추가</button></div></form></section></div>}
  </>;
}
