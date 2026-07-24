import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';
import { DEMO_STUDENT_ID, filterNotificationsForRecipient, getSessionActorUid } from '../utils/demoInteraction';
import { getStudentAssignedFollowUps } from '../utils/followUps';
import Icon from './Icon';
import { IconButton } from './UI';

const studentNavGroups = [
  {
    items: [
      { to: '/student', label: '나의 상담 홈', shortLabel: '홈', icon: 'dashboard', exact: true },
    ],
  },
  {
    label: '상담 여정',
    items: [
      { to: '/student/appointments', label: '상담 예약', shortLabel: '예약', icon: 'calendar', includeChildren: true },
      { to: '/student/tasks', label: '나의 할 일', shortLabel: '할 일', icon: 'check' },
      { to: '/student/records', label: '상담 기록', icon: 'note' },
    ],
  },
  {
    label: '성장 지원',
    items: [
      { to: '/student/programs', label: '비교과 프로그램', shortLabel: '프로그램', icon: 'layers', includeChildren: true },
    ],
  },
];

const mobileNavItems = studentNavGroups.flatMap(group => group.items).filter(item => item.shortLabel);

function getStudentPageMeta(location) {
  if (location.pathname === '/student') return { title: '나의 상담 홈', description: '오늘 필요한 상담 일정과 할 일' };
  if (location.pathname === '/student/appointments') return { title: '상담 예약', description: '가능한 시간을 확인하고 상담 신청' };
  if (location.pathname === '/student/tasks') return { title: '나의 할 일', description: '상담 후 실천할 다음 행동' };
  if (location.pathname === '/student/records') return { title: '상담 기록', description: '상담을 통해 쌓아 온 나의 변화' };
  if (location.pathname === '/student/programs') return { title: '비교과 프로그램', description: '현재 기회와 나에게 맞는 추천' };
  if (location.pathname === '/student/profile') return { title: '내 정보 수정', description: '상담에 필요한 관심 분야와 목표 관리' };
  if (location.pathname.includes('/appointments/request/')) return { parentTitle: '상담 예약', parentTo: '/student/appointments', title: '상담 신청' };
  if (location.pathname.includes('/appointments/change/')) return { parentTitle: '상담 예약', parentTo: '/student/appointments', title: '일정 변경' };
  if (/^\/student\/programs\/[^/]+$/.test(location.pathname)) return { parentTitle: '비교과 프로그램', parentTo: '/student/programs', title: '프로그램 상세' };
  if (location.pathname === '/student/notifications') return { title: '알림 센터', description: '상담과 할 일의 최신 변화' };
  if (location.pathname === '/student/withdrawal') return { title: '계정 관리', description: '회원 탈퇴 요청과 처리 상태' };
  return { title: '나의 상담 홈', description: '오늘 필요한 상담 일정과 할 일' };
}

export default function StudentLayout() {
  const [open, setOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [panel, setPanel] = useState('');
  const sidebarCloseTimerRef = useRef(null);
  const sidebarPointerInsideRef = useRef(false);
  const location = useLocation();
  const { students, followUps, notifications } = useApp();
  const { user, profile, role, logout } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);
  const studentName = student?.name || profile?.displayName || user?.displayName || '학생';
  const studentInitial = studentName.slice(0, 1);
  const studentDescription = [student?.department, student?.grade].filter(Boolean).join(' · ') || '커리어핏 학생';
  const recipientUid = getSessionActorUid({ userUid: user?.uid, profileId: profile?.id, role });
  const studentTasks = useMemo(() => getStudentAssignedFollowUps(followUps, student, user?.uid), [followUps, student, user?.uid]);
  const pendingTaskCount = studentTasks.filter(item => item.status !== 'complete').length;
  const noticeCount = useMemo(
    () => filterNotificationsForRecipient(notifications, recipientUid).filter(item => !item.readAt).length,
    [notifications, recipientUid],
  );
  const currentPage = getStudentPageMeta(location);
  const sidebarCollapsed = !sidebarExpanded;

  const isItemActive = item => {
    if (item.includeChildren) return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    if (item.exact) return location.pathname === item.to;
    return location.pathname === item.to;
  };
  const expandSidebar = () => {
    window.clearTimeout(sidebarCloseTimerRef.current);
    setSidebarExpanded(true);
  };
  const collapseSidebar = () => {
    window.clearTimeout(sidebarCloseTimerRef.current);
    sidebarCloseTimerRef.current = window.setTimeout(() => setSidebarExpanded(false), 120);
  };
  const handleSidebarBlur = event => {
    if (!event.currentTarget.contains(event.relatedTarget) && !sidebarPointerInsideRef.current) collapseSidebar();
  };
  const handleSidebarMouseEnter = () => {
    sidebarPointerInsideRef.current = true;
    expandSidebar();
  };
  const handleSidebarMouseLeave = event => {
    sidebarPointerInsideRef.current = false;
    if (!event.currentTarget.contains(document.activeElement)) collapseSidebar();
  };

  useEffect(() => {
    setOpen(false);
    setPanel('');
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => document.querySelector('#student-main-content')?.focus({ preventScroll: true }));
  }, [location.pathname, location.search]);
  useEffect(() => () => window.clearTimeout(sidebarCloseTimerRef.current), []);
  useEffect(() => {
    const closeOverlays = event => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setPanel('');
    };
    window.addEventListener('keydown', closeOverlays);
    return () => window.removeEventListener('keydown', closeOverlays);
  }, []);

  return <div className={`app-shell student-app-shell student-portal sidebar-auto ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-auto-expanded'}`}>
    <a className="skip-link" href="#student-main-content">본문으로 바로가기</a>
    {open && <button className="drawer-backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
    <aside
      className={`sidebar ${open ? 'is-open' : ''}`}
      aria-label="학생 주요 메뉴"
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
      onFocusCapture={expandSidebar}
      onBlurCapture={handleSidebarBlur}
    >
      <div className="sidebar-brand-row">
        <Link className="brand" to="/student" aria-label="커리어핏 학생 홈">
          <span className="brand-mark"><Icon name="target" size={24} /></span>
          <span className="brand-name">커리어<span>핏</span></span>
        </Link>
        <IconButton className="sidebar-close" label="메뉴 닫기" icon="close" onClick={() => setOpen(false)} />
      </div>
      <nav className="main-nav">
        {studentNavGroups.map(group => <div className="nav-group" key={group.label || group.items[0].to}>
          {group.label && <span className="nav-group-label">{group.label}</span>}
          {group.items.map(item => {
            const active = isItemActive(item);
            return <Link
            key={item.to}
            to={item.to}
            title={sidebarCollapsed ? item.label : undefined}
            aria-label={sidebarCollapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={active ? 'active' : ''}
          >
            <span className="sidebar-nav-icon"><Icon name={item.icon} /></span>
            <span className="sidebar-nav-label">{item.label}</span>
            {item.to === '/student/tasks' && pendingTaskCount > 0 && <em>{pendingTaskCount > 9 ? '9+' : pendingTaskCount}</em>}
          </Link>})}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <Link to="/student/profile" aria-current={location.pathname === '/student/profile' ? 'page' : undefined} className={location.pathname === '/student/profile' ? 'active' : ''} title={sidebarCollapsed ? '내 정보 수정' : undefined} aria-label={sidebarCollapsed ? '내 정보 수정' : undefined}>
          <span className="sidebar-nav-icon"><Icon name="user" /></span><span className="sidebar-nav-label">내 정보 수정</span>
        </Link>
        <Link to="/student/withdrawal" aria-current={location.pathname === '/student/withdrawal' ? 'page' : undefined} className={location.pathname === '/student/withdrawal' ? 'active' : ''} title={sidebarCollapsed ? '계정 관리' : undefined} aria-label={sidebarCollapsed ? '계정 관리' : undefined}>
          <span className="sidebar-nav-icon"><Icon name="settings" /></span><span className="sidebar-nav-label">계정 관리</span>
        </Link>
        <button onClick={logout} title={sidebarCollapsed ? '로그아웃' : undefined} aria-label={sidebarCollapsed ? '로그아웃' : undefined}>
          <span className="sidebar-nav-icon"><Icon name="logout" /></span><span className="sidebar-nav-label">로그아웃</span>
        </button>
        <div className="counselor-card student-sidebar-card">
          <span className="counselor-avatar" aria-hidden="true">{studentInitial}</span>
          <div><strong>{studentName}</strong><small>{studentDescription}</small></div>
        </div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar student-topbar">
        <div className={`topbar-title ${currentPage.parentTitle ? 'has-breadcrumb' : ''}`}>
          <IconButton label="메뉴 열기" icon="menu" onClick={() => setOpen(true)} />
          <div>
            {currentPage.parentTitle
              ? <nav className="topbar-breadcrumb" aria-label="현재 위치"><Link to={currentPage.parentTo}>{currentPage.parentTitle}</Link><Icon name="chevron" size={14} /><strong aria-current="page">{currentPage.title}</strong></nav>
              : <strong>{currentPage.title}</strong>}
            {!currentPage.parentTitle && <span>{currentPage.description}</span>}
          </div>
        </div>
        <div className="header-actions student-header-actions">
          <Link className="icon-button student-notification-button" aria-label={`알림 ${noticeCount}개`} to="/student/notifications">
            <Icon name="bell" />
            {noticeCount > 0 && <span className="notice-dot" aria-hidden="true">{noticeCount > 9 ? '9+' : noticeCount}</span>}
          </Link>
          <div className="header-popover-wrap">
            <button className="profile-button" aria-expanded={panel === 'profile'} onClick={() => setPanel(panel === 'profile' ? '' : 'profile')}>
              <span className="profile-avatar" aria-hidden="true">{studentInitial}</span><span>{studentName}</span><Icon name="chevron" size={16} />
            </button>
            {panel === 'profile' && <div className="header-popover profile-popover">
              <strong>{studentName}</strong><small>{studentDescription}</small>
              <Link to="/student/profile" onClick={() => setPanel('')}>내 정보 수정</Link>
              <Link to="/student/withdrawal" onClick={() => setPanel('')}>계정 관리</Link>
              <button onClick={logout}>로그아웃</button>
            </div>}
          </div>
        </div>
      </header>
      <main className="content student-app-content" id="student-main-content" tabIndex="-1"><Outlet /></main>
      <nav className="mobile-main-nav" aria-label="모바일 학생 주요 메뉴">
        {mobileNavItems.map(item => {
          const active = isItemActive(item);
          return <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''}>
            <span className="mobile-nav-icon"><Icon name={item.icon} size={20} />{item.to === '/student/tasks' && pendingTaskCount > 0 && <em>{pendingTaskCount > 9 ? '9+' : pendingTaskCount}</em>}</span>
            <span>{item.shortLabel}</span>
          </Link>})}
      </nav>
    </div>
  </div>;
}
