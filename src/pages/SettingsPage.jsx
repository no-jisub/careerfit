import { useState } from 'react';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { PageIntro } from '../components/UI';
import { useAuth } from '../auth/AuthContext';
import { configureSensitiveAccessPin } from '../services/sensitiveAccessService';
import { DEMO_SENSITIVE_PIN, normalizeSensitivePin } from '../utils/sensitiveData';

const accessRows = [
  { role: '학생', scope: '본인 정보', canRead: '선택 공개된 상담 요약, 본인 일정·할 일', blocked: '내부 메모, AI 근거, 다른 학생 정보' },
  { role: '상담사', scope: '담당 학생', canRead: '담당 학생 상담 기록·내부 메모·근거·일정', blocked: '미배정 학생, 사용자 승인·학생 재배정' },
  { role: '관리자', scope: '기관 운영', canRead: '계정 승인·배정 및 보안 사고 대응에 필요한 자료', blocked: '일상 상담 목적으로 불필요한 열람 금지' },
];

const roleLabels = { student: '학생', counselor: '상담사', admin: '관리자' };

export default function SettingsPage() {
  const { notify, resetDemoData } = useApp();
  const { user, role, demoModeEnabled } = useAuth();
  const demoMode = demoModeEnabled && !user;
  const [pinForm, setPinForm] = useState({ password: '', pin: '', confirm: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState('');
  const reset = () => {
    if (window.confirm('학생, 상담, 일정, 상담 후 할 일과 프로그램 데모 데이터를 처음 상태로 되돌릴까요?')) resetDemoData();
  };
  const savePin = async event => {
    event.preventDefault();
    setPinError('');
    if (pinForm.pin !== pinForm.confirm) {
      setPinError('새 PIN과 확인 PIN이 일치하지 않습니다.');
      return;
    }
    setPinSaving(true);
    try {
      await configureSensitiveAccessPin({ currentPassword: pinForm.password, pin: pinForm.pin, demoMode });
      setPinForm({ password: '', pin: '', confirm: '' });
      notify('민감정보 열람 PIN을 안전하게 설정했습니다.');
    } catch (error) {
      setPinError(error.message);
    } finally {
      setPinSaving(false);
    }
  };
  return <><PageIntro eyebrow="설정" title="업무 환경 설정" description="알림과 개인정보 보호, 역할별 접근 범위를 확인합니다." />
    <section className="card privacy-overview">
      <div className="privacy-overview-heading"><span className="privacy-shield"><Icon name="shield" size={24} /></span><div><span className="eyebrow">개인정보 보호</span><h2>상담정보는 최소 권한으로 분리해 관리합니다</h2><p>현재 역할은 <strong>{roleLabels[role] || '확인 중'}</strong>이며, {role === 'counselor' ? '배정된 학생의 상담 자료만 조회할 수 있습니다.' : role === 'admin' ? '계정·배정 관리와 보안 대응 범위의 권한이 적용됩니다.' : '본인에게 공개된 정보만 조회할 수 있습니다.'}</p></div></div>
      <div className="privacy-principles">
        <article><Icon name="lock" size={18} /><div><strong>식별정보 추가 인증</strong><p>연락처·학번은 기본 마스킹하고 담당자가 별도 4자리 PIN을 확인한 뒤 5분 동안만 공개합니다.</p></div></article>
        <article><Icon name="students" size={18} /><div><strong>담당자 기반 접근</strong><p>상담사는 담당 학생 문서만 구독하며, 사용자 승인과 학생 재배정은 관리자만 수행합니다.</p></div></article>
        <article><Icon name="spark" size={18} /><div><strong>AI 최소 정보 처리</strong><p>학생 이름·학번·연락처를 AI 요청에 포함하지 않고 메모 속 직접 식별정보 형식을 서버에서 마스킹합니다.</p></div></article>
        <article><Icon name="check" size={18} /><div><strong>근거 검토 후 저장</strong><p>AI 요약은 근거를 항목별로 제시하며 상담사가 검토 완료해야 최종 기록으로 저장됩니다.</p></div></article>
      </div>
    </section>
    <section className="card access-policy-card">
      <div className="section-header"><div><span className="eyebrow">접근 권한 설계</span><h2>역할별로 볼 수 있는 정보</h2><p>색상만이 아니라 허용 범위와 차단 범위를 명시적으로 구분합니다.</p></div></div>
      <div className="access-policy-table" role="table" aria-label="역할별 개인정보 접근 권한">
        <div className="access-policy-head" role="row"><span role="columnheader">역할·범위</span><span role="columnheader">허용</span><span role="columnheader">차단·제한</span></div>
        {accessRows.map(item => <article role="row" key={item.role} className={roleLabels[role] === item.role ? 'current' : ''}><div role="cell"><strong>{item.role}</strong><span>{item.scope}</span>{roleLabels[role] === item.role && <em>현재 역할</em>}</div><p role="cell"><Icon name="check" size={16} />{item.canRead}</p><p role="cell"><Icon name="lock" size={16} />{item.blocked}</p></article>)}
      </div>
      <div className="retention-note"><Icon name="clock" size={17} /><div><strong>데이터 보존</strong><p>임시 상담 기록에는 7일 보존 기한을 기록합니다. 운영 배포 전 Firebase TTL 정책과 기관의 상담기록 보존·파기 기간을 반드시 확정해야 합니다.</p></div></div>
    </section>
    {['counselor', 'admin'].includes(role) && <section className="card sensitive-pin-settings">
      <div className="sensitive-pin-settings-copy"><span className="privacy-shield"><Icon name="lock" size={22} /></span><div><span className="eyebrow">추가 본인 확인</span><h2>민감정보 열람 PIN</h2><p>로그인 비밀번호와 분리된 4자리 PIN입니다. 연락처·학번 전체값을 볼 때마다 다시 확인하며, 5회 실패하면 10분간 잠깁니다.</p></div></div>
      {demoMode
        ? <div className="demo-pin-card"><span>발표용 데모 PIN</span><strong>{DEMO_SENSITIVE_PIN}</strong><small>실서비스에서는 상담사가 현재 계정 비밀번호로 재인증한 뒤 각자 설정합니다.</small></div>
        : <form className="sensitive-pin-form" onSubmit={savePin}>
          <label>현재 계정 비밀번호<input type="password" autoComplete="current-password" value={pinForm.password} onChange={event => setPinForm(current => ({ ...current, password: event.target.value }))} required /></label>
          <label>새 4자리 PIN<input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" autoComplete="new-password" value={pinForm.pin} onChange={event => setPinForm(current => ({ ...current, pin: normalizeSensitivePin(event.target.value) }))} required /></label>
          <label>새 PIN 확인<input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" autoComplete="new-password" value={pinForm.confirm} onChange={event => setPinForm(current => ({ ...current, confirm: normalizeSensitivePin(event.target.value) }))} required /></label>
          {pinError && <p className="sensitive-pin-error" role="alert"><Icon name="alert" size={15} />{pinError}</p>}
          <button className="button primary" disabled={pinSaving || pinForm.pin.length !== 4 || pinForm.confirm.length !== 4}>{pinSaving ? '보안 확인 중...' : 'PIN 설정·변경'}</button>
        </form>}
    </section>}
    <section className="card settings-card"><h2>알림 설정</h2><label><span><strong>상담 일정 알림</strong><small>상담 시작 30분 전에 알려드려요.</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>할 일 기한 알림</strong><small>기한 전날과 당일에 알려드려요.</small></span><input type="checkbox" defaultChecked /></label><button className="button primary" onClick={() => notify('설정을 저장했습니다.')}>설정 저장</button></section>{demoModeEnabled && !user && <section className="card settings-card demo-reset-card"><h2>발표용 데이터</h2><p>발표 중 변경된 학생 배정, 상담 기록, 예약과 할 일을 초기 상태로 되돌립니다.</p><button className="button secondary danger" onClick={reset}>전체 데모 데이터 초기화</button></section>}</>;
}
