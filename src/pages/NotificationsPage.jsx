import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { buildOperationalNotifications } from '../utils/operations';
import { mergeNotifications } from '../utils/notifications';
import { useAuth } from '../auth/AuthContext';
import { filterNotificationsForRecipient, getSessionActorUid } from '../utils/demoInteraction';

const readStoredIds = recipientUid => {
  try { return JSON.parse(localStorage.getItem(`careerfit_read_notifications_${recipientUid}`)) || []; } catch { return []; }
};

export default function NotificationsPage() {
  const { students, followUps, appointments, notifications, setNotifications, persistDocument } = useApp();
  const { user, profile, role } = useAuth();
  const recipientUid = getSessionActorUid({ userUid: user?.uid, profileId: profile?.id, role });
  const [readIds, setReadIds] = useState(() => readStoredIds(recipientUid));
  const [filter, setFilter] = useState('unread');
  useEffect(() => { setReadIds(readStoredIds(recipientUid)); }, [recipientUid]);
  const derived = useMemo(() => {
    if (role !== 'student') return buildOperationalNotifications(students, followUps, appointments);
    const student = students.find(item => item.uid === recipientUid);
    if (!student) return [];
    return buildOperationalNotifications(
      [student],
      followUps.filter(item => item.studentId === student.id && item.owner === '학생'),
      appointments.filter(item => item.studentId === student.id),
    ).map(item => ({ ...item, to: item.type === 'appointment' ? '/student/appointments' : '/student' }));
  }, [students, followUps, appointments, role, recipientUid]);
  const recipientNotifications = useMemo(
    () => filterNotificationsForRecipient(notifications, recipientUid),
    [notifications, recipientUid],
  );
  const notices = useMemo(() => mergeNotifications(recipientNotifications, derived), [recipientNotifications, derived]);
  const isRead = item => Boolean(item.readAt) || readIds.includes(item.id);
  const visible = notices.filter(item => filter === 'all' || !isRead(item));
  const markRead = async id => {
    const persisted = recipientNotifications.find(item => item.id === id);
    if (persisted && !persisted.readAt) {
      const updated = { ...persisted, readAt: new Date().toISOString() };
      await persistDocument('notifications', updated);
      setNotifications(items => items.map(item => item.id === id ? updated : item));
      return;
    }
    const next = readIds.includes(id) ? readIds : [...readIds, id];
    setReadIds(next);
    localStorage.setItem(`careerfit_read_notifications_${recipientUid}`, JSON.stringify(next));
  };
  const markAllRead = async () => {
    await Promise.all(recipientNotifications.filter(item => !item.readAt).map(item => markRead(item.id)));
    const next = notices.map(item => item.id);
    setReadIds(next);
    localStorage.setItem(`careerfit_read_notifications_${recipientUid}`, JSON.stringify(next));
  };
  const content = <><PageIntro eyebrow="알림 센터" title="놓치기 쉬운 일을 먼저 확인하세요" description="상담 일정, 변경, 공개 요약과 상담 후 할 일을 모아 보여줍니다." action={<button className="button secondary" onClick={markAllRead}>모두 읽음</button>} /><section className="task-filter-bar"><div className="segmented"><button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>읽지 않음 <span>{notices.filter(item => !isRead(item)).length}</span></button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체 <span>{notices.length}</span></button></div></section><section className="card notification-list">{visible.length ? visible.map(item => <article key={item.id} className={`${item.type} ${isRead(item) ? 'read' : ''}`}><span className="notification-icon"><Icon name={item.type === 'appointment' ? 'calendar' : 'alert'} /></span><div><small>{item.type === 'appointment' ? '상담 일정' : item.type === 'overdue' ? '기한 초과' : '알림'}</small><h2>{item.title}</h2><p>{item.description}</p><time>{item.date}</time></div><div><Link className="button secondary small" to={item.to} onClick={() => markRead(item.id)}>확인하기</Link>{!isRead(item) && <button className="text-button" onClick={() => markRead(item.id)}>읽음 처리</button>}</div></article>) : <EmptyState icon="check" title="확인할 알림이 없습니다" description="새 일정이나 마감 알림이 생기면 이곳에 표시됩니다." />}</section></>;
  return role === 'student' ? <div className="student-portal student-booking-page"><main><Link className="withdrawal-back-link" to="/student"><Icon name="arrow" size={16} />학생 홈으로 돌아가기</Link>{content}</main></div> : content;
}
