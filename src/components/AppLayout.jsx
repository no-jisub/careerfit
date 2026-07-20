import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { IconButton } from './UI';

const navItems = [
  { to: '/dashboard', label: '대시보드', icon: 'dashboard' },
  { to: '/students', label: '학생 관리', icon: 'students' },
  { to: '/consultations', label: '상담 기록', icon: 'note' },
  { to: '/follow-ups', label: '후속 조치', icon: 'check', count: 2 },
  { to: '/programs', label: '비교과 프로그램', icon: 'spark' },
];

const titles = { dashboard: '대시보드', students: '학생 관리', consultations: '상담 기록', 'follow-ups': '후속 조치', programs: '비교과 프로그램', settings: '설정' };

export default function AppLayout({ logout }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split('/')[1] || 'dashboard';
  useEffect(() => setOpen(false), [location.pathname]);

  return <div className="app-shell">
    {open && <button className="drawer-backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="주요 메뉴">
      <div className="brand"><span className="brand-mark"><Icon name="target" size={24} /></span><span>커리어<span>핏</span></span></div>
      <p className="workspace-label">학생 상담 지원</p>
      <nav className="main-nav">
        {navItems.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={item.icon} /><span>{item.label}</span>{item.count && <em>{item.count}</em>}</NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings"><Icon name="settings" /><span>설정</span></NavLink>
        <button onClick={logout}><Icon name="logout" /><span>로그아웃</span></button>
        <div className="counselor-card"><span className="avatar mini">박</span><div><strong>박지현 상담사</strong><small>대학일자리플러스센터</small></div></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="topbar-title"><IconButton label="메뉴 열기" icon="menu" onClick={() => setOpen(true)} /><div><span>커리어핏</span><strong>{titles[segment] || '학생 상담'}</strong></div></div>
        <div className="header-actions">
          <label className="global-search"><Icon name="search" size={18} /><span className="sr-only">학생 또는 상담 검색</span><input placeholder="학생 또는 상담 검색" onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) navigate(`/students?q=${encodeURIComponent(e.currentTarget.value.trim())}`); }} /></label>
          <div className="header-popover-wrap"><IconButton label="알림 2개" icon="bell" onClick={() => setPanel(panel === 'notice' ? '' : 'notice')} />{panel === 'notice' && <div className="header-popover notice-popover"><strong>새로운 알림 2개</strong><p><b>기한 초과</b> IT 직무 소개 자료 확인</p><p><b>오늘 10:00</b> 김하늘 학생 상담 예정</p><NavLink to="/follow-ups" onClick={() => setPanel('')}>후속 조치 확인하기</NavLink></div>}</div>
          <div className="header-popover-wrap"><button className="profile-button" aria-expanded={panel === 'profile'} onClick={() => setPanel(panel === 'profile' ? '' : 'profile')}><span className="avatar tiny">박</span><span>박지현</span><Icon name="chevron" size={16} /></button>{panel === 'profile' && <div className="header-popover profile-popover"><strong>박지현 상담사</strong><small>대학일자리플러스센터</small><NavLink to="/settings" onClick={() => setPanel('')}>내 설정</NavLink><button onClick={logout}>로그아웃</button></div>}</div>
        </div>
      </header>
      <main className="content"><Outlet /></main>
    </div>
  </div>;
}
