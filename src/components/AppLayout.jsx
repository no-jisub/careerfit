import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { toDateKey } from '../utils/date';
import Icon from './Icon';
import { IconButton } from './UI';
import { useAuth } from '../auth/AuthContext';
import { buildOperationalNotifications } from '../utils/operations';
import { isOperationsStaff } from '../utils/roles';

const navItems = [
  { to: '/dashboard', label: '대시보드', icon: 'dashboard' },
  { to: '/students', label: '학생 관리', icon: 'students' },
  { to: '/appointments', label: '상담 일정', icon: 'calendar' },
  { to: '/consultations', label: '상담 기록', icon: 'note' },
  { to: '/follow-ups', label: '후속 조치', icon: 'check' },
  { to: '/programs', label: '비교과 프로그램', icon: 'spark' },
  { to: '/insights', label: '운영 통계', icon: 'chart' },
];

const titles = { dashboard: '대시보드', students: '학생 관리', appointments: '상담 일정', consultations: '상담 기록', 'follow-ups': '후속 조치', programs: '비교과 프로그램', insights: '운영 통계', notifications: '알림 센터', settings: '설정', admin: '사용자 관리' };

export default function AppLayout({ logout }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const { students, consultations, followUps, appointments } = useApp();
  const { profile, user, role } = useAuth();
  const counselorName = profile?.displayName || user?.displayName || '상담 담당자';
  const shortCounselorName = counselorName.replace(/\s*상담사$/, '');
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split('/')[1] || 'dashboard';
  const today = toDateKey();
  const pendingCount = followUps.filter(item => item.status !== 'complete').length;
  const notifications = useMemo(() => buildOperationalNotifications(students, followUps, appointments, today), [students, followUps, appointments, today]);
  const noticeCount = notifications.length;
  const searchResults = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return [];
    const studentResults = students.filter(student => [student.name, student.studentNo, student.department, student.goal].some(value => value?.toLowerCase().includes(query))).slice(0, 4).map(student => ({ id: `student-${student.id}`, title: student.name, description: `${student.department} · ${student.studentNo}`, to: `/students/${student.id}`, type: '학생' }));
    const consultationResults = consultations.filter(item => [item.purpose, item.summary, item.type].some(value => value?.toLowerCase().includes(query))).slice(0, 3).map(item => { const student = students.find(candidate => candidate.id === item.studentId); return { id: `consultation-${item.id}`, title: item.purpose, description: `${student?.name || '학생'} · ${item.date}`, to: `/students/${item.studentId}`, type: '상담' }; });
    return [...studentResults, ...consultationResults];
  }, [deferredSearch, students, consultations]);
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => document.querySelector('#main-content')?.focus({ preventScroll: true }));
  }, [location.pathname]);
  useEffect(() => { setSearch(''); setPanel(''); }, [location.pathname]);
  useEffect(() => {
    const closeOverlays = event => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setPanel('');
    };
    window.addEventListener('keydown', closeOverlays);
    return () => window.removeEventListener('keydown', closeOverlays);
  }, []);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">본문으로 바로가기</a>
    {open && <button className="drawer-backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="주요 메뉴">
      <div className="sidebar-brand-row"><div className="brand"><span className="brand-mark"><Icon name="target" size={24} /></span><span>커리어<span>핏</span></span></div><IconButton className="sidebar-close" label="메뉴 닫기" icon="close" onClick={() => setOpen(false)} /></div>
      <p className="workspace-label">학생 상담 지원</p>
      <nav className="main-nav">
        {navItems.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={item.icon} /><span>{item.label}</span>{item.to === '/follow-ups' && pendingCount > 0 && <em>{pendingCount}</em>}</NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        {isOperationsStaff(role) && <NavLink to="/admin/users"><Icon name="students" /><span>사용자 관리</span></NavLink>}
        <NavLink to="/settings"><Icon name="settings" /><span>설정</span></NavLink>
        <button onClick={logout}><Icon name="logout" /><span>로그아웃</span></button>
        <div className="counselor-card"><div><strong>{counselorName}</strong><small>대학일자리플러스센터</small></div></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="topbar-title"><IconButton label="메뉴 열기" icon="menu" onClick={() => setOpen(true)} /><div><span>커리어핏</span><strong>{titles[segment] || '학생 상담'}</strong></div></div>
        <div className="header-actions">
          <div className="global-search-wrap"><label className="global-search"><Icon name="search" size={18} /><span className="sr-only">학생 또는 상담 검색</span><input value={search} placeholder="학생 또는 상담 검색" onFocus={() => setPanel('search')} onChange={e => { setSearch(e.target.value); setPanel('search'); }} onKeyDown={e => { if (e.key === 'Enter' && searchResults[0]) navigate(searchResults[0].to); }} /></label>{panel === 'search' && search.trim() && <div className="header-popover search-popover"><strong>통합 검색 결과 {searchResults.length}건</strong>{searchResults.length ? searchResults.map(result => <NavLink key={result.id} to={result.to}><span>{result.type}</span><div><b>{result.title}</b><small>{result.description}</small></div></NavLink>) : <p>일치하는 학생 또는 상담 기록이 없습니다.</p>}<button onClick={() => navigate(`/students?q=${encodeURIComponent(search.trim())}`)}>학생 목록에서 자세히 찾기</button></div>}</div>
          <div className="header-popover-wrap"><IconButton label={`알림 ${noticeCount}개`} icon="bell" aria-expanded={panel === 'notice'} aria-controls="notice-popover" onClick={() => setPanel(panel === 'notice' ? '' : 'notice')} />{noticeCount > 0 && <span className="notice-dot" aria-hidden="true">{noticeCount > 9 ? '9+' : noticeCount}</span>}{panel === 'notice' && <div className="header-popover notice-popover" id="notice-popover"><strong>확인할 알림 {noticeCount}개</strong>{notifications.slice(0, 5).map(item => <p key={item.id}><b>{item.title}</b>{item.description}</p>)}{noticeCount === 0 && <p>새로 확인할 일정이나 기한 초과 업무가 없습니다.</p>}<NavLink to="/notifications" onClick={() => setPanel('')}>알림 센터 열기</NavLink></div>}</div>
          <div className="header-popover-wrap"><button className="profile-button" aria-expanded={panel === 'profile'} onClick={() => setPanel(panel === 'profile' ? '' : 'profile')}><span>{shortCounselorName}</span><Icon name="chevron" size={16} /></button>{panel === 'profile' && <div className="header-popover profile-popover"><strong>{counselorName}</strong><small>대학일자리플러스센터</small><NavLink to="/settings" onClick={() => setPanel('')}>내 설정</NavLink><button onClick={logout}>로그아웃</button></div>}</div>
        </div>
      </header>
      <main className="content" id="main-content" tabIndex="-1"><Outlet /></main>
    </div>
  </div>;
}
