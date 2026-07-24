import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { toDateKey } from '../utils/date';
import Icon from './Icon';
import { IconButton } from './UI';
import { useAuth } from '../auth/AuthContext';
import { buildOperationalNotifications } from '../utils/operations';
import { isAdministrator } from '../utils/roles';
import { maskStudentNo } from '../utils/sensitiveData';
import { filterNotificationsForRecipient, getSessionActorUid } from '../utils/demoInteraction';
import { mergeNotifications } from '../utils/notifications';

const navGroups = [
  {
    items: [
      { to: '/dashboard', label: '메인 대시보드', shortLabel: '홈', icon: 'dashboard' },
      {
        to: '/students',
        label: '학생 관리',
        shortLabel: '학생',
        icon: 'students',
        activeWhen: pathname => /^\/students\/[^/]+$/.test(pathname),
      },
    ],
  },
  {
    label: '상담 관리',
    items: [
      { to: '/appointments', label: '상담 일정', shortLabel: '일정', icon: 'calendar' },
      {
        to: '/consultation-prep',
        label: '상담 전 준비',
        icon: 'list',
        activeWhen: pathname => pathname === '/consultation-prep' || /^\/students\/[^/]+\/preparation$/.test(pathname),
      },
      {
        to: '/consultation-write',
        label: '상담 기록 작성',
        icon: 'note',
        activeWhen: pathname => pathname === '/consultation-write' || /^\/students\/[^/]+\/consultation\/new$/.test(pathname),
      },
      { to: '/follow-ups', label: '상담 후 할 일', shortLabel: '할 일', icon: 'check' },
    ],
  },
  {
    label: '성장 지원',
    items: [
      { to: '/programs', label: '비교과 프로그램', shortLabel: '프로그램', icon: 'layers' },
      { to: '/insights', label: '운영 통계', icon: 'chart' },
    ],
  },
];

const navItems = navGroups.flatMap(group => group.items);
const mobileNavItems = navItems.filter(item => item.shortLabel);
const pageMeta = {
  dashboard: { title: '메인 대시보드', description: '오늘의 상담 운영 현황' },
  students: { title: '학생 관리', description: '학생별 상담 맥락과 진행 상태' },
  'consultation-prep': { title: '상담 전 준비', description: '이전 기록과 확인할 맥락 정리' },
  'consultation-write': { title: '상담 기록 작성', description: '상담 내용을 빠르고 정확하게 기록' },
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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [panel, setPanel] = useState('');
  const [search, setSearch] = useState('');
  const [quickConsultationOpen, setQuickConsultationOpen] = useState(false);
  const [quickStudentSearch, setQuickStudentSearch] = useState('');
  const searchInputRef = useRef(null);
  const quickSearchInputRef = useRef(null);
  const quickReturnFocusRef = useRef(null);
  const quickDialogRef = useRef(null);
  const sidebarCloseTimerRef = useRef(null);
  const sidebarPointerInsideRef = useRef(false);
  const sidebarCollapsed = !sidebarExpanded;
  const deferredSearch = useDeferredValue(search);
  const deferredQuickStudentSearch = useDeferredValue(quickStudentSearch);
  const { students, consultations, followUps, appointments, notifications: eventNotifications } = useApp();
  const { profile, user, role } = useAuth();
  const recipientUid = getSessionActorUid({ userUid: user?.uid, profileId: profile?.id, role });
  const counselorName = profile?.displayName || user?.displayName || '상담 담당자';
  const shortCounselorName = counselorName.replace(/\s*상담사$/, '');
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split('/')[1] || 'dashboard';
  const studentDetailRouteMatch = location.pathname.match(/^\/students\/([^/]+)$/);
  const detailStudent = studentDetailRouteMatch
    ? students.find(student => student.id === studentDetailRouteMatch[1])
    : null;
  const preparationRouteMatch = location.pathname.match(/^\/students\/([^/]+)\/preparation$/);
  const preparationStudent = preparationRouteMatch
    ? students.find(student => student.id === preparationRouteMatch[1])
    : null;
  const currentPage = preparationRouteMatch
    ? {
      ...pageMeta['consultation-prep'],
      parentTitle: pageMeta['consultation-prep'].title,
      parentTo: '/consultation-prep',
      title: preparationStudent?.name || '학생',
    }
    : studentDetailRouteMatch
      ? {
        ...pageMeta.students,
        parentTitle: pageMeta.students.title,
        parentTo: '/students',
        title: detailStudent?.name || '학생',
      }
      : /^\/students\/[^/]+\/consultation\/new$/.test(location.pathname)
        ? pageMeta['consultation-write']
        : pageMeta[segment] || { title: '학생 상담', description: '커리어핏 상담 운영' };
  const today = toDateKey();
  const pendingCount = followUps.filter(item => item.status !== 'complete').length;
  const notifications = useMemo(() => buildOperationalNotifications(students, followUps, appointments, today), [students, followUps, appointments, today]);
  const visibleEventNotifications = useMemo(
    () => filterNotificationsForRecipient(eventNotifications, recipientUid),
    [eventNotifications, recipientUid],
  );
  const headerNotifications = useMemo(
    () => mergeNotifications(visibleEventNotifications.filter(item => !item.readAt), notifications),
    [visibleEventNotifications, notifications],
  );
  const noticeCount = headerNotifications.length;
  const searchResults = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return [];
    const studentResults = students.filter(student => [student.name, student.studentNo, student.department, student.goal].some(value => value?.toLowerCase().includes(query))).slice(0, 4).map(student => ({ id: `student-${student.id}`, title: student.name, description: `${student.department} · ${maskStudentNo(student.studentNo)}`, to: `/students/${student.id}`, type: '학생' }));
    const consultationResults = consultations.filter(item => [item.purpose, item.summary, item.type].some(value => value?.toLowerCase().includes(query))).slice(0, 3).map(item => { const student = students.find(candidate => candidate.id === item.studentId); return { id: `consultation-${item.id}`, title: item.purpose, description: `${student?.name || '학생'} · ${item.date}`, to: `/students/${item.studentId}`, type: '상담' }; });
    return [...studentResults, ...consultationResults];
  }, [deferredSearch, students, consultations]);
  const quickStudents = useMemo(() => {
    const query = deferredQuickStudentSearch.trim().toLowerCase();
    const matches = query
      ? students.filter(student => [
        student.name,
        student.studentNo,
        student.department,
        student.goal,
        ...(student.interests || []),
      ].some(value => value?.toLowerCase().includes(query)))
      : [...students].sort((a, b) => (b.lastConsultation || '').localeCompare(a.lastConsultation || ''));
    return matches.slice(0, 6);
  }, [deferredQuickStudentSearch, students]);
  const openQuickConsultation = () => {
    quickReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPanel('');
    setOpen(false);
    setQuickStudentSearch('');
    setQuickConsultationOpen(true);
    window.requestAnimationFrame(() => quickSearchInputRef.current?.focus());
  };
  const closeQuickConsultation = () => {
    setQuickConsultationOpen(false);
    setQuickStudentSearch('');
    window.requestAnimationFrame(() => quickReturnFocusRef.current?.focus());
  };
  const startConsultation = studentId => {
    setQuickConsultationOpen(false);
    setQuickStudentSearch('');
    navigate(`/students/${studentId}/consultation/new`);
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
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => document.querySelector('#main-content')?.focus({ preventScroll: true }));
  }, [location.pathname]);
  useEffect(() => () => window.clearTimeout(sidebarCloseTimerRef.current), []);
  useEffect(() => { setSearch(''); setPanel(''); }, [location.pathname]);
  useEffect(() => {
    const closeOverlays = event => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setPanel('');
      if (quickConsultationOpen) closeQuickConsultation();
    };
    window.addEventListener('keydown', closeOverlays);
    return () => window.removeEventListener('keydown', closeOverlays);
  }, [quickConsultationOpen]);
  useEffect(() => {
    const openSearch = event => {
      const target = event.target;
      const editing = target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((event.key === '/' && !editing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setPanel('search');
        searchInputRef.current?.focus();
      }
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        openQuickConsultation();
      }
    };
    window.addEventListener('keydown', openSearch);
    return () => window.removeEventListener('keydown', openSearch);
  }, [students]);

  const trapQuickDialogFocus = event => {
    if (event.key !== 'Tab') return;
    const focusable = quickDialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className={`app-shell sidebar-auto ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-auto-expanded'}`}>
    <a className="skip-link" href="#main-content">본문으로 바로가기</a>
    {open && <button className="drawer-backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
    <aside
      className={`sidebar ${open ? 'is-open' : ''}`}
      aria-label="주요 메뉴"
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
      onFocusCapture={expandSidebar}
      onBlurCapture={handleSidebarBlur}
    >
      <div className="sidebar-brand-row">
        <div className="brand"><span className="brand-mark"><Icon name="target" size={24} /></span><span className="brand-name">커리어<span>핏</span></span></div>
        <IconButton className="sidebar-close" label="메뉴 닫기" icon="close" onClick={() => setOpen(false)} />
      </div>
      <nav className="main-nav">
        {navGroups.map(group => <div className="nav-group" key={group.label || group.items[0].to}>{group.label && <span className="nav-group-label">{group.label}</span>}{group.items.map(item => <NavLink end key={item.to} to={item.to} title={sidebarCollapsed ? item.label : undefined} aria-label={sidebarCollapsed ? item.label : undefined} className={({ isActive }) => isActive || item.activeWhen?.(location.pathname) ? 'active' : ''}><span className="sidebar-nav-icon"><Icon name={item.icon} /></span><span className="sidebar-nav-label">{item.label}</span>{item.to === '/follow-ups' && pendingCount > 0 && <em>{pendingCount}</em>}</NavLink>)}</div>)}
      </nav>
      <div className="sidebar-bottom">
        {isAdministrator(role) && <NavLink to="/admin/users" title={sidebarCollapsed ? '사용자 관리' : undefined} aria-label={sidebarCollapsed ? '사용자 관리' : undefined}><span className="sidebar-nav-icon"><Icon name="students" /></span><span className="sidebar-nav-label">사용자 관리</span></NavLink>}
        <NavLink to="/settings" title={sidebarCollapsed ? '설정' : undefined} aria-label={sidebarCollapsed ? '설정' : undefined}><span className="sidebar-nav-icon"><Icon name="settings" /></span><span className="sidebar-nav-label">설정</span></NavLink>
        <button onClick={logout} title={sidebarCollapsed ? '로그아웃' : undefined} aria-label={sidebarCollapsed ? '로그아웃' : undefined}><span className="sidebar-nav-icon"><Icon name="logout" /></span><span className="sidebar-nav-label">로그아웃</span></button>
        <div className="counselor-card"><span className="counselor-avatar" aria-hidden="true">{shortCounselorName.slice(0, 1)}</span><div><strong>{counselorName}</strong><small>대학일자리플러스센터</small></div></div>
      </div>
      </aside>
    <div className="app-main">
      <header className="topbar">
        <div className={`topbar-title ${currentPage.parentTitle ? 'has-breadcrumb' : ''}`}>
          <IconButton label="메뉴 열기" icon="menu" onClick={() => setOpen(true)} />
          <div>
            {currentPage.parentTitle
              ? <nav className="topbar-breadcrumb" aria-label="현재 위치"><NavLink to={currentPage.parentTo}>{currentPage.parentTitle}</NavLink><Icon name="chevron" size={14} /><strong aria-current="page">{currentPage.title}</strong></nav>
              : <strong>{currentPage.title}</strong>}
            <span>{currentPage.description}</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="global-search-wrap"><label className="global-search"><Icon name="search" size={18} /><span className="sr-only">학생 또는 상담 검색</span><input ref={searchInputRef} value={search} placeholder="학생 또는 상담 검색" onFocus={() => setPanel('search')} onChange={e => { setSearch(e.target.value); setPanel('search'); }} onKeyDown={e => { if (e.key === 'Enter' && searchResults[0]) navigate(searchResults[0].to); }} /><kbd>⌘ K</kbd></label>{panel === 'search' && search.trim() && <div className="header-popover search-popover"><strong>통합 검색 결과 {searchResults.length}건</strong>{searchResults.length ? searchResults.map(result => <NavLink key={result.id} to={result.to}><span>{result.type}</span><div><b>{result.title}</b><small>{result.description}</small></div></NavLink>) : <p>일치하는 학생 또는 상담 기록이 없습니다.</p>}<button onClick={() => navigate(`/students?q=${encodeURIComponent(search.trim())}`)}>학생 목록에서 자세히 찾기</button></div>}</div>
          <div className="header-popover-wrap"><IconButton label={`알림 ${noticeCount}개`} icon="bell" aria-expanded={panel === 'notice'} aria-controls="notice-popover" onClick={() => setPanel(panel === 'notice' ? '' : 'notice')} />{noticeCount > 0 && <span className="notice-dot" aria-hidden="true">{noticeCount > 9 ? '9+' : noticeCount}</span>}{panel === 'notice' && <div className="header-popover notice-popover" id="notice-popover"><strong>확인할 알림 {noticeCount}개</strong>{headerNotifications.slice(0, 5).map(item => <p key={item.id}><b>{item.title}</b>{item.description}</p>)}{noticeCount === 0 && <p>새로 확인할 일정이나 기한 초과 업무가 없습니다.</p>}<NavLink to="/notifications" onClick={() => setPanel('')}>알림 센터 열기</NavLink></div>}</div>
          <div className="header-popover-wrap"><button className="profile-button" aria-expanded={panel === 'profile'} onClick={() => setPanel(panel === 'profile' ? '' : 'profile')}><span className="profile-avatar" aria-hidden="true">{shortCounselorName.slice(0, 1)}</span><span>{shortCounselorName}</span><Icon name="chevron" size={16} /></button>{panel === 'profile' && <div className="header-popover profile-popover"><strong>{counselorName}</strong><small>대학일자리플러스센터</small><NavLink to="/settings" onClick={() => setPanel('')}>내 설정</NavLink><button onClick={logout}>로그아웃</button></div>}</div>
        </div>
      </header>
      <main className="content" id="main-content" tabIndex="-1"><Outlet /></main>
      <nav className="mobile-main-nav" aria-label="모바일 주요 메뉴">
        {mobileNavItems.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}><span className="mobile-nav-icon"><Icon name={item.icon} size={20} />{item.to === '/follow-ups' && pendingCount > 0 && <em>{pendingCount > 9 ? '9+' : pendingCount}</em>}</span><span>{item.shortLabel}</span></NavLink>)}
      </nav>
    </div>
    {quickConsultationOpen && <div className="modal-backdrop quick-consultation-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && closeQuickConsultation()}>
      <section ref={quickDialogRef} className="modal quick-consultation-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-consultation-title" aria-describedby="quick-consultation-description" onKeyDown={trapQuickDialogFocus}>
        <button className="modal-close" type="button" aria-label="빠른 상담 기록 닫기" onClick={closeQuickConsultation}><Icon name="close" size={19} /></button>
        <span className="quick-dialog-icon"><Icon name="note" size={22} /></span>
        <span className="eyebrow">빠른 실행</span>
        <h2 id="quick-consultation-title">상담할 학생을 선택하세요</h2>
        <p id="quick-consultation-description">학생을 선택하면 기본 정보가 연결된 상담 기록 작성 화면으로 바로 이동합니다.</p>
        <label className="quick-student-search">
          <span>학생 검색</span>
          <span className="search-field"><Icon name="search" size={18} /><input ref={quickSearchInputRef} value={quickStudentSearch} onChange={event => setQuickStudentSearch(event.target.value)} placeholder="이름, 학과, 관심 분야로 검색" autoComplete="off" /></span>
        </label>
        <div className="quick-student-heading"><strong>{quickStudentSearch.trim() ? '검색 결과' : '최근 상담 학생'}</strong><span>{quickStudents.length}명</span></div>
        <div className="quick-student-list">
          {quickStudents.map(student => <button type="button" key={student.id} onClick={() => startConsultation(student.id)}>
            <span className="avatar small" aria-hidden="true">{student.name.slice(0, 1)}</span>
            <span><strong>{student.name}</strong><small>{student.department} · {maskStudentNo(student.studentNo)}</small></span>
            <span className="quick-student-action">기록 작성<Icon name="arrow" size={15} /></span>
          </button>)}
          {!quickStudents.length && <div className="quick-student-empty"><Icon name="search" size={22} /><strong>일치하는 학생이 없습니다</strong><p>검색어를 줄이거나 학생 관리에서 먼저 학생을 확인해 주세요.</p></div>}
        </div>
        <div className="quick-dialog-footer"><button type="button" className="button secondary" onClick={() => { setQuickConsultationOpen(false); navigate('/students?select=consultation'); }}>학생 전체 보기</button><small><kbd>Alt</kbd> + <kbd>N</kbd>으로 언제든 열 수 있어요</small></div>
      </section>
    </div>}
  </div>;
}
