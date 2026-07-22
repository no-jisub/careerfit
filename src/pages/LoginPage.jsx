import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { demoModeEnabled, firebaseAuthEnabled, loginWithEmail, loginDemo, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const moveToRoleHome = role => navigate(role === 'student' ? '/student' : '/dashboard', { replace: true });
  const login = async role => moveToRoleHome(await loginDemo(role));
  const submitFirebaseLogin = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      moveToRoleHome(await loginWithEmail(email.trim(), password));
    } catch {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };
  const submitPasswordReset = async event => {
    event.preventDefault();
    setResetting(true);
    setResetMessage('');
    try {
      await requestPasswordReset(resetEmail);
      setResetMessage('입력한 이메일이 등록되어 있다면 비밀번호 재설정 메일이 발송됩니다. 스팸메일함도 확인해 주세요.');
    } catch (caught) {
      if (caught?.code === 'auth/too-many-requests') setResetMessage('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      else setResetMessage('재설정 메일을 보내지 못했습니다. 이메일 형식과 네트워크를 확인해 주세요.');
    } finally {
      setResetting(false);
    }
  };
  return <main className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand"><span className="brand-mark"><Icon name="target" size={26} /></span>커리어<span>핏</span></div>
      <div className="login-message"><span className="eyebrow light">학생의 다음 걸음을 함께</span><h1>상담의 맥락을 잇고,<br />다음 행동을 선명하게.</h1><p>흩어진 상담 기록과 후속 조치를 한곳에서 확인하고<br />학생에게 꼭 필요한 다음 걸음을 안내하세요.</p></div>
      <div className="login-visual" aria-hidden="true">
        <div className="workflow-preview-head"><span>상담 업무 흐름</span><strong>한 곳에서 자연스럽게 이어져요</strong></div>
        <div className="workflow-preview-steps">
          <div><span><Icon name="search" size={18} /></span><p><b>상담 전</b><small>이전 상담 맥락과 할 일을 확인해요</small></p></div>
          <div><span><Icon name="note" size={18} /></span><p><b>상담 중</b><small>핵심 메모를 빠르게 기록해요</small></p></div>
          <div><span><Icon name="check" size={18} /></span><p><b>상담 후</b><small>다음 행동과 후속 조치를 이어가요</small></p></div>
        </div>
      </div>
      <p className="copyright">© 2026 CareerFit · 대학 학생상담 통합 지원</p>
    </section>
    <section className="login-form-panel" aria-labelledby="login-heading">
      <div className="login-box"><span className="mobile-logo"><span className="brand-mark"><Icon name="target" size={22} /></span>커리어핏</span><span className="eyebrow">{firebaseAuthEnabled ? '통합 상담 서비스' : '데모 서비스'}</span><h2 id="login-heading">{firebaseAuthEnabled ? '커리어핏에 로그인하세요' : '어떤 화면으로 시작할까요?'}</h2><p>{firebaseAuthEnabled ? <>학교에서 등록한 계정으로 로그인하세요.<br />역할에 맞는 화면으로 안전하게 연결합니다.</> : <>역할을 선택하면 별도의 인증 없이<br />커리어핏 데모를 둘러볼 수 있어요.</>}</p>
        {firebaseAuthEnabled && <><form className="firebase-login-form" onSubmit={submitFirebaseLogin}><label>이메일<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>비밀번호<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{error && <span className="field-error" role="alert">{error}</span>}<button className="button primary full" disabled={submitting}>{submitting ? '로그인 중...' : '로그인'}</button><button type="button" className="login-reset-toggle" onClick={() => { setResetOpen(value => !value); setResetEmail(email); setResetMessage(''); }}>비밀번호를 잊으셨나요?</button></form>{resetOpen && <form className="password-reset-form" onSubmit={submitPasswordReset}><strong>비밀번호 재설정</strong><p>계정으로 등록한 이메일을 입력해 주세요.</p><label><span className="sr-only">비밀번호 재설정 이메일</span><input type="email" autoComplete="email" value={resetEmail} onChange={event => setResetEmail(event.target.value)} placeholder="name@example.com" required /></label><button className="button secondary full" disabled={resetting}>{resetting ? '발송 중...' : '재설정 메일 보내기'}</button>{resetMessage && <p className="reset-message" role="status">{resetMessage}</p>}</form>}{demoModeEnabled && <div className="login-divider"><span>또는 데모로 둘러보기</span></div>}</>}
        {demoModeEnabled && <><div className="role-options">
          <button type="button" className="role-card primary" onClick={() => login('counselor')}><span className="role-icon"><Icon name="briefcase" size={25} /></span><span><strong>상담 담당자로 시작하기</strong><small>상담 업무와 사용자 등록·학생 배정을 함께 관리해요</small></span><Icon name="arrow" /></button>
          <button type="button" className="role-card" onClick={() => login('student')}><span className="role-icon"><Icon name="students" size={25} /></span><span><strong>학생으로 시작하기</strong><small>상담 일정과 나의 다음 행동을 확인해요</small></span><Icon name="arrow" /></button>
        </div>
        <div className="demo-note"><Icon name="check" size={18} /><div><strong>팀 개발 모드</strong><p>가상 데이터만 사용하며 입력 내용은 현재 브라우저에만 저장됩니다. 사용자 역할을 바꾸려면 로그아웃한 뒤 다시 선택하세요.</p></div></div>
        </>}
      </div>
    </section>
  </main>;
}
