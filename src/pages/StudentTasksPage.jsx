import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { EmptyState, PageIntro, StatusBadge } from '../components/UI';
import { useApp } from '../context/AppContext';
import { DEMO_STUDENT_ID } from '../utils/demoInteraction';
import { getStudentAssignedFollowUps } from '../utils/followUps';
import { buildEventNotification } from '../utils/notifications';

const taskFilters = [
  { value: 'pending', label: '해야 할 일' },
  { value: 'overdue', label: '기한 초과' },
  { value: 'complete', label: '완료' },
  { value: 'all', label: '전체' },
];

export default function StudentTasksPage() {
  const { students, followUps, setFollowUps, setNotifications, persistDocumentGroup, notify } = useApp();
  const { user } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);
  const [filter, setFilter] = useState('pending');
  const studentTasks = useMemo(() => getStudentAssignedFollowUps(followUps, student, user?.uid), [followUps, student, user?.uid]);
  const counts = {
    pending: studentTasks.filter(task => task.status !== 'complete').length,
    overdue: studentTasks.filter(task => task.status === 'overdue').length,
    complete: studentTasks.filter(task => task.status === 'complete').length,
    all: studentTasks.length,
  };
  const visibleTasks = studentTasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'complete';
    return task.status === filter;
  });

  if (!student) return <div className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</div>;

  const completeTask = async id => {
    const current = followUps.find(item => item.id === id);
    if (!current || current.status === 'complete') return;
    const now = new Date().toISOString();
    const updated = { ...current, status: 'complete', completedAt: now, updatedAt: now };
    const notification = buildEventNotification({
      eventId: `${updated.id}-completed-${now}`,
      recipientUid: current.ownerUid || student.counselorUid,
      actorUid: student.uid || user?.uid || 'demo-student-s1',
      type: 'followup',
      title: '학생이 할 일을 완료했습니다',
      description: `${student.name} 학생 · ${updated.content}`,
      to: `/students/${student.id}`,
      createdAt: now,
    });
    try {
      await persistDocumentGroup([
        { name: 'followUps', record: updated },
        { name: 'notifications', record: notification },
      ]);
      setFollowUps(items => items.map(item => item.id === id ? updated : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      notify('할 일을 완료했습니다. 좋은 흐름이에요!');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };

  return <div className="student-page student-tasks-page">
    <PageIntro icon="check" title="나의 할 일" description="상담에서 정한 다음 행동을 기한순으로 확인하고 하나씩 완료해 보세요." />
    <section className="student-page-summary" aria-label="나의 할 일 요약">
      <article><span className="summary-icon pending"><Icon name="list" size={20} /></span><div><small>해야 할 일</small><strong>{counts.pending}</strong><p>지금 실행할 항목</p></div></article>
      <article className={counts.overdue ? 'urgent' : ''}><span className="summary-icon overdue"><Icon name="alert" size={20} /></span><div><small>기한 초과</small><strong>{counts.overdue}</strong><p>{counts.overdue ? '먼저 확인해 주세요' : '밀린 일이 없어요'}</p></div></article>
      <article><span className="summary-icon complete"><Icon name="check" size={20} /></span><div><small>완료</small><strong>{counts.complete}</strong><p>지금까지 마친 항목</p></div></article>
    </section>
    <section className="student-page-panel card">
      <div className="student-page-panel-heading"><div><h2>할 일 목록</h2><p>완료한 항목은 기록으로 남고 담당 상담사에게도 전달됩니다.</p></div><span>{visibleTasks.length}개</span></div>
      <div className="student-page-tabs" role="tablist" aria-label="할 일 상태">
        {taskFilters.map(item => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}<em>{counts[item.value]}</em></button>)}
      </div>
      {visibleTasks.length ? <div className="student-task-grid student-page-task-grid">{visibleTasks.map(task => <article className={`student-task-card ${task.status}`} key={task.id}>
        <button type="button" aria-label={`${task.content} 완료 처리`} onClick={() => completeTask(task.id)} disabled={task.status === 'complete'}><span>{task.status === 'complete' ? <Icon name="check" size={16} /> : null}</span></button>
        <div><div className="student-task-card-meta"><StatusBadge status={task.status} context="followUp" /><span><Icon name="target" size={14} />나에게 배정</span></div><h3>{task.content}</h3><p><Icon name="calendar" size={15} />{task.dueDate}까지 · 관련 상담 {task.consultationDate || '최근 상담'}</p></div>
      </article>)}</div> : <EmptyState icon="check" title={filter === 'complete' ? '아직 완료한 할 일이 없습니다' : '확인할 할 일이 없습니다'} description={filter === 'overdue' ? '기한이 지난 할 일이 없어요. 현재 흐름을 잘 유지하고 있습니다.' : '새 할 일이 등록되면 이곳에서 바로 확인할 수 있어요.'} />}
    </section>
  </div>;
}
