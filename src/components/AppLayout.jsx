import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { toDateKey } from '../utils/date';
import Icon from './Icon';
import { IconButton } from './UI';
import { useAuth } from '../auth/AuthContext';
import { buildOperationalNotifications } from '../utils/operations';
import { isAdministrator } from '../utils/roles';
import { maskStudentNo } from '../utils/sensitiveData';

const navGroups = [
  {
    label: '오늘',
    items: [
      { to: '/dashboard', label: '대시보드', shortLabel: '홈', icon: 'dashboard' },
    ],
  },
  {
    label: '상담 관리',
    items: [
      { to: '/appointments', label: '상담 일정', shortLabel: '일정', icon: 'calendar' },
      { to: '/students', label: '학생 관리', shortLabel: '학생', icon: 'students' },
      { to: '/follow-ups', label: '상담 후 할 일', shortLabel: '할 일', icon: 'check' },
    ],
  },
  {
    label: '성장 지원',
    items: [
      { to: '/programs', label: '비교과 프로그램', shortLabel: '프로그램', icon: 'spark' },
      { to: '/insights', label: '운영 통계', icon: 'chart' },
    ],
  },
];

const navItems = navGroups.flatMap(group => group.items);
const mobileNavItems = navItems.filter(item => item.shortLabel);
const pageMeta = {
  dashboard: { title: '대시보드', description: '오늘의 상담 운영 현황' },
  students: { title: '학생 관리', description: '학생별 상담 맥락과 진행 상태' },
  appointments: { title: '상담 일정', description: '예약과 상담 가능 시간 관리' },
  'follow-ups': { title: '상담 후 할 일', description: '학생과 상담사의 다음 행동' },
  programs: { title: '비교과 프로그램', description: '학생 맞춤 성장 기회' },
  insights: { title: '운영 통계', description: '상담 운영 데이터와 인사이트' },
  notifications: { title: '알림 센터', description: '확인이 필요한 최신 변화' },
  settings: { title: '설정', description: '서비스와 계정 환경' },
  admin: { title: '사용자 관리', description: '가입 승인과 학생 배정' },
};

export default function AppLayout({ logout }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState('');
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);
  const deferredSearch = useDeferredValue(search);
  const { students, consultations, followUps, appointments, notifications: eventNotifications } = useApp();
  const { profile, user, role } = useAuth();
  const counselorName = profile?.displayName || user?.displayName || '상담 담당자';
  const shortCounselorName = counselorName.replace(/\s*상담사$/, '');
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split('/')[1] || 'dashboard';
  const currentPage = pageMeta[segment] || { title: '학생 상담', description: '커리어핏 상담 운영' };
  const today = toDateKey();
  const pendingCount = followUps.filter(item => item.status !== 'complete').length;
  const notifications = useMemo(() => buildOperationalNotifications(students, followUps, appointments, today), [students, followUps, appointments, today]);
  const noticeCount = notifications.length + eventNotifications.filter(item => !item.readAt).length;
  const searchResults = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return [];
    const studentResults = students.filter(student => [student.name, student.studentNo, student.department, student.goal].some(value => value?.toLowerCase().includes(query))).slice(0, 4).map(student => ({ id: `student-${student.id}`, title: student.name, description: `${student.department} · ${maskStudentNo(student.studentNo)}`, to: `/students/${student.id}`, type: '학생' }));
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
  useEffect(() => {
    const openSearch = event => {
      const target = event.target;
      const editing = target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((event.key === '/' && !editing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setPanel('search');
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', openSearch);
    return () => window.removeEventListener('keydown', openSearch);
  }, []);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">본문으로 바로가기</a>
    {open && <button className="drawer-backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="주요 메뉴">
      <div className="sidebar-brand-row"><div className="brand"><span className="brand-mark"><Icon name="target" size={24} /></span><span>커리어<span>핏</span></span></div><IconButton className="sidebar-close" label="메뉴 닫기" icon="close" onClick={() => setOpen(false)} /></div>
      <div className="workspace-card"><span className="workspace-icon"><Icon name="briefcase" size={17} /></span><div><strong>학생 상담 지원</strong><small>대학일자리플러스센터</small></div></div>
      <nav className="main-nav">
        {navGroups.map(group => <div className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{group.items.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={item.icon} /><span>{item.label}</span>{item.to === '/follow-ups' && pendingCount > 0 && <em>{pendingCount}</em>}</NavLink>)}</div>)}
      </nav>
      <div className="sidebar-bottom">
        {isAdministrator(role) && <NavLink to="/admin/users"><Icon name="students" /><span>사용자 관리</span></NavLink>}
        <NavLink to="/settings"><Icon name="settings" /><span>설정</span></NavLink>
        <button onClick={logout}><Icon name="logout" /><span>로그아웃</span></button>
        <div className="counselor-card"><span className="counselor-avatar" aria-hidden="true">{shortCounselorName.slice(0, 1)}</span><div><strong>{counselorName}</strong><small>대학일자리플러스센터</small></div></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="topbar-title"><IconButton label="메뉴 열기" icon="menu" onClick={() => setOpen(true)} /><div><strong>{currentPage.title}</strong><span>{currentPage.description}</span></div></div>
        <div className="header-actions">
          <div className="global-search-wrap"><label className="global-search"><Icon name="search" size={18} /><span className="sr-only">학생 또는 상담 검색</span><input ref={searchInputRef} value={search} placeholder="학생 또는 상담 검색" onFocus={() => setPanel('search')} onChange={e => { setSearch(e.target.value); setPanel('search'); }} onKeyDown={e => { if (e.key === 'Enter' && searchResults[0]) navigate(searchResults[0].to); }} /><kbd>⌘ K</kbd></label>{panel === 'search' && search.trim() && <div className="header-popover search-popover"><strong>통합 검색 결과 {searchResults.length}건</strong>{searchResults.length ? searchResults.map(result => <NavLink key={result.id} to={result.to}><span>{result.type}</span><div><b>{result.title}</b><small>{result.description}</small></div></NavLink>) : <p>일치하는 학생 또는 상담 기록이 없습니다.</p>}<button onClick={() => navigate(`/students?q=${encodeURIComponent(search.trim())}`)}>학생 목록에서 자세히 찾기</button></div>}</div>
          <div className="header-popover-wrap"><IconButton label={`알림 ${noticeCount}개`} icon="bell" aria-expanded={panel === 'notice'} aria-controls="notice-popover" onClick={() => setPanel(panel === 'notice' ? '' : 'notice')} />{noticeCount > 0 && <span className="notice-dot" aria-hidden="true">{noticeCount > 9 ? '9+' : noticeCount}</span>}{panel === 'notice' && <div className="header-popover notice-popover" id="notice-popover"><strong>확인할 알림 {noticeCount}개</strong>{notifications.slice(0, 5).map(item => <p key={item.id}><b>{item.title}</b>{item.description}</p>)}{noticeCount === 0 && <p>새로 확인할 일정이나 기한 초과 업무가 없습니다.</p>}<NavLink to="/notifications" onClick={() => setPanel('')}>알림 센터 열기</NavLink></div>}</div>
          <div className="header-popover-wrap"><button className="profile-button" aria-expanded={panel === 'profile'} onClick={() => setPanel(panel === 'profile' ? '' : 'profile')}><span className="profile-avatar" aria-hidden="true">{shortCounselorName.slice(0, 1)}</span><span>{shortCounselorName}</span><Icon name="chevron" size={16} /></button>{panel === 'profile' && <div className="header-popover profile-popover"><strong>{counselorName}</strong><small>대학일자리플러스센터</small><NavLink to="/settings" onClick={() => setPanel('')}>내 설정</NavLink><button onClick={logout}>로그아웃</button></div>}</div>
        </div>
      </header>
      <main className="content" id="main-content" tabIndex="-1"><Outlet /></main>
      <nav className="mobile-main-nav" aria-label="모바일 주요 메뉴">
        {mobileNavItems.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}><span className="mobile-nav-icon"><Icon name={item.icon} size={20} />{item.to === '/follow-ups' && pendingCount > 0 && <em>{pendingCount > 9 ? '9+' : pendingCount}</em>}</span><span>{item.shortLabel}</span></NavLink>)}
      </nav>
    </div>
  </div>;
}
