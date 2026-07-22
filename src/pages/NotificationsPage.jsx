import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { buildOperationalNotifications } from '../utils/operations';

const readStoredIds = () => {
  try { return JSON.parse(localStorage.getItem('careerfit_read_notifications')) || []; } catch { return []; }
};

export default function NotificationsPage() {
  const { students, followUps, appointments } = useApp();
  const [readIds, setReadIds] = useState(readStoredIds);
  const [filter, setFilter] = useState('unread');
  const notices = useMemo(() => buildOperationalNotifications(students, followUps, appointments), [students, followUps, appointments]);
  const visible = notices.filter(item => filter === 'all' || !readIds.includes(item.id));
  const markRead = id => {
    const next = readIds.includes(id) ? readIds : [...readIds, id];
    setReadIds(next);
    localStorage.setItem('careerfit_read_notifications', JSON.stringify(next));
  };
  const markAllRead = () => {
    const next = notices.map(item => item.id);
    setReadIds(next);
    localStorage.setItem('careerfit_read_notifications', JSON.stringify(next));
  };
  return <><PageIntro eyebrow="알림 센터" title="놓치기 쉬운 일을 먼저 확인하세요" description="오늘 상담, 기한 임박, 기한 초과 후속 조치를 모아 보여줍니다." action={<button className="button secondary" onClick={markAllRead}>모두 읽음</button>} /><section className="task-filter-bar"><div className="segmented"><button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>읽지 않음 <span>{notices.filter(item => !readIds.includes(item.id)).length}</span></button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체 <span>{notices.length}</span></button></div></section><section className="card notification-list">{visible.length ? visible.map(item => <article key={item.id} className={`${item.type} ${readIds.includes(item.id) ? 'read' : ''}`}><span className="notification-icon"><Icon name={item.type === 'appointment' ? 'calendar' : 'alert'} /></span><div><small>{item.type === 'appointment' ? '상담 일정' : item.type === 'overdue' ? '기한 초과' : '마감 임박'}</small><h2>{item.title}</h2><p>{item.description}</p><time>{item.date}</time></div><div><Link className="button secondary small" to={item.to} onClick={() => markRead(item.id)}>확인하기</Link>{!readIds.includes(item.id) && <button className="text-button" onClick={() => markRead(item.id)}>읽음 처리</button>}</div></article>) : <EmptyState icon="check" title="확인할 알림이 없습니다" description="새 일정이나 마감 알림이 생기면 이곳에 표시됩니다." />}</section></>;
}
