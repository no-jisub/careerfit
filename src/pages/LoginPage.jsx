import Icon from '../components/Icon';

export default function LoginPage() {
  const login = role => { localStorage.setItem('careerfit_role', role); window.location.assign(role === 'counselor' ? '/dashboard' : '/student'); };
  return <main className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand"><span className="brand-mark"><Icon name="target" size={26} /></span>커리어<span>핏</span></div>
      <div className="login-message"><span className="eyebrow light">학생의 다음 걸음을 함께</span><h1>상담의 맥락을 잇고,<br />다음 행동을 선명하게.</h1><p>흩어진 상담 기록과 후속 조치를 한곳에서 확인하고<br />학생에게 꼭 필요한 다음 걸음을 안내하세요.</p></div>
      <div className="login-visual" aria-hidden="true"><div className="mini-profile"><span>하늘</span><div><b>김하늘 학생</b><small>다음 상담 · 오늘 10:00</small></div><i>준비 완료</i></div><div className="mini-progress"><span>오늘의 상담 준비</span><div><i style={{ width: '78%' }} /></div><b>78%</b></div></div>
      <p className="copyright">© 2026 CareerFit · 대학 학생상담 통합 지원</p>
    </section>
    <section className="login-form-panel" aria-labelledby="login-heading">
      <div className="login-box"><span className="mobile-logo"><span className="brand-mark"><Icon name="target" size={22} /></span>커리어핏</span><span className="eyebrow">데모 서비스</span><h2 id="login-heading">어떤 화면으로 시작할까요?</h2><p>역할을 선택하면 별도의 인증 없이<br />커리어핏 데모를 둘러볼 수 있어요.</p>
        <div className="role-options">
          <button className="role-card primary" onClick={() => login('counselor')}><span className="role-icon"><Icon name="briefcase" size={25} /></span><span><strong>상담 담당자로 시작하기</strong><small>상담 준비, 기록 작성과 후속 조치를 관리해요</small></span><Icon name="arrow" /></button>
          <button className="role-card" onClick={() => login('student')}><span className="role-icon"><Icon name="students" size={25} /></span><span><strong>학생으로 시작하기</strong><small>상담 일정과 나의 다음 행동을 확인해요</small></span><Icon name="arrow" /></button>
        </div>
        <div className="demo-note"><Icon name="check" size={18} /><div><strong>데모 계정 안내</strong><p>입력한 정보는 브라우저에만 저장되며, 실제 학교 정보와 연동되지 않습니다.</p></div></div>
      </div>
    </section>
  </main>;
}
