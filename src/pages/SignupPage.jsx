import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { validateCounselorRegistrationInput, validateStudentRegistrationInput } from '../utils/validation';

const initialForm = {
  role: 'student',
  displayName: '',
  email: '',
  password: '',
  passwordConfirm: '',
  studentNo: '',
  department: '',
  grade: '1학년',
  phone: '',
  interests: '',
  goal: '',
  concern: '',
  privacyConsent: false,
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { firebaseAuthEnabled, registerStudent, registerCounselor, user, role } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (role) return <Navigate to={role === 'student' ? '/student' : '/dashboard'} replace />;
  if (user) return <Navigate to="/account-status" replace />;

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    const validated = form.role === 'counselor' ? validateCounselorRegistrationInput(form) : validateStudentRegistrationInput(form);
    if (validated.error) { setError(validated.error); return; }
    setSaving(true);
    setError('');
    try {
      await (form.role === 'counselor' ? registerCounselor(validated.value) : registerStudent(validated.value));
      navigate('/account-status', { replace: true });
    } catch (caught) {
      if (caught?.code === 'auth/email-already-in-use') setError('이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.');
      else if (caught?.code === 'auth/too-many-requests') setError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      else setError('회원가입을 완료하지 못했습니다. 입력 정보를 확인하고 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (!firebaseAuthEnabled) return <main className="auth-standalone"><section className="auth-card"><Icon name="students" size={30} /><h1>회원가입 준비 중</h1><p>Firebase 인증을 활성화하면 학생 회원가입을 사용할 수 있습니다.</p><Link className="button secondary full" to="/login">로그인 화면으로</Link></section></main>;

  return <main className="auth-standalone">
    <section className="auth-card signup-card">
      <div className="auth-card-heading"><span className="brand-mark"><Icon name="target" size={24} /></span><div><span className="eyebrow">회원가입</span><h1>{form.role === 'counselor' ? '상담사 승인을 요청하세요' : '상담을 시작할 정보를 알려주세요'}</h1><p>{form.role === 'counselor' ? '이메일 인증 후 기존 상담사의 승인을 받으면 업무 화면을 사용할 수 있어요.' : '가입 후 이메일 인증과 상담사 배정을 완료하면 서비스를 이용할 수 있어요.'}</p></div></div>
      <form className="signup-form" onSubmit={submit}>
        <label>가입 역할<select value={form.role} onChange={event => update('role', event.target.value)}><option value="student">학생</option><option value="counselor">상담사</option></select></label>
        <div className="form-row"><label>이름<input autoComplete="name" value={form.displayName} onChange={event => update('displayName', event.target.value)} required /></label><label>학교 이메일<input type="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} required /></label></div>
        <div className="form-row"><label>비밀번호<input type="password" minLength="8" autoComplete="new-password" value={form.password} onChange={event => update('password', event.target.value)} required /><small>영문과 숫자를 포함해 8자 이상</small></label><label>비밀번호 확인<input type="password" minLength="8" autoComplete="new-password" value={form.passwordConfirm} onChange={event => update('passwordConfirm', event.target.value)} required /></label></div>
        {form.role === 'student' && <><div className="form-row"><label>학번<input value={form.studentNo} onChange={event => update('studentNo', event.target.value)} required /></label><label>학년<select value={form.grade} onChange={event => update('grade', event.target.value)}>{['1학년','2학년','3학년','4학년','졸업생'].map(grade => <option key={grade}>{grade}</option>)}</select></label></div>
        <label>학과<input value={form.department} onChange={event => update('department', event.target.value)} required /></label>
        <label>연락처 <small>선택</small><input autoComplete="tel" value={form.phone} onChange={event => update('phone', event.target.value)} placeholder="010-0000-0000" /></label>
        <label>관심 분야 <small>선택 · 쉼표로 구분</small><input value={form.interests} onChange={event => update('interests', event.target.value)} placeholder="서비스 기획, 데이터 분석" /></label>
        <label>진로 목표 <small>선택</small><input value={form.goal} onChange={event => update('goal', event.target.value)} placeholder="관심 직무나 진로 목표" /></label>
        <label>상담받고 싶은 내용 <small>선택</small><textarea rows="3" value={form.concern} onChange={event => update('concern', event.target.value)} /></label>
        <label className="consent-check"><input type="checkbox" checked={form.privacyConsent} onChange={event => update('privacyConsent', event.target.checked)} /><span>회원가입과 상담사 배정을 위한 개인정보 수집·이용에 동의합니다.</span></label></>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="button primary full" disabled={saving}>{saving ? '가입 처리 중...' : form.role === 'counselor' ? '상담사 승인 요청' : '학생 회원가입'}</button>
      </form>
      <p className="auth-switch">이미 계정이 있나요? <Link to="/login">로그인</Link></p>
    </section>
  </main>;
}
