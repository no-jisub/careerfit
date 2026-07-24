import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { PageIntro } from '../components/UI';
import { useAuth } from '../auth/AuthContext';
import { configureSensitiveAccessPin } from '../services/sensitiveAccessService';
import { normalizeSensitivePin } from '../utils/sensitiveData';

const accessRows = [
  { role: '학생', scope: '본인 정보', canRead: '선택 공개된 상담 요약, 본인 일정·할 일', blocked: '내부 메모, 작성 근거, 다른 학생 정보' },
  { role: '상담사', scope: '담당 학생', canRead: '담당 학생 상담 기록·내부 메모·근거·일정', blocked: '미배정 학생, 사용자 승인·학생 재배정' },
  { role: '관리자', scope: '기관 운영', canRead: '계정 승인·배정 및 보안 사고 대응에 필요한 자료', blocked: '일상 상담 목적으로 불필요한 열람 금지' },
];

const roleLabels = { student: '학생', counselor: '상담사', admin: '관리자' };

export default function SettingsPage() {
  const { notify } = useApp();
  const { user, role, demoModeEnabled } = useAuth();
  const demoMode = demoModeEnabled && !user;
  const canConfigurePin = ['counselor', 'admin'].includes(role);
  const [pinForm, setPinForm] = useState({ password: '', pin: '', confirm: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({ appointment: true, followUp: true });
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
  return <><PageIntro icon="settings" eyebrow="설정" title="업무 환경 설정" description="자주 사용하는 알림과 보안 설정을 관리하고, 내 역할의 정보 접근 범위를 확인하세요." />
    <div className="settings-workspace">
      <div className={`settings-action-grid ${canConfigurePin ? '' : 'single'}`}>
        {canConfigurePin && <section className="card sensitive-pin-settings">
          <div className="settings-section-heading sensitive-pin-settings-copy"><span className="settings-section-icon"><Icon name="lock" size={21} /></span><div><h2>연락처 열람 PIN</h2><p>연락처 전체값을 확인할 때 사용하는 별도 4자리 PIN입니다. 5회 실패하면 10분 동안 잠깁니다.</p></div></div>
          <form className="sensitive-pin-form" onSubmit={savePin}>
            <label>현재 계정 비밀번호 <em>필수</em><input type="password" autoComplete="current-password" value={pinForm.password} onChange={event => setPinForm(current => ({ ...current, password: event.target.value }))} required /></label>
            <label>새 4자리 PIN <em>필수</em><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" autoComplete="new-password" value={pinForm.pin} onChange={event => setPinForm(current => ({ ...current, pin: normalizeSensitivePin(event.target.value) }))} required /></label>
            <label>새 PIN 확인 <em>필수</em><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" autoComplete="new-password" value={pinForm.confirm} onChange={event => setPinForm(current => ({ ...current, confirm: normalizeSensitivePin(event.target.value) }))} required /></label>
            {pinError && <p className="sensitive-pin-error" role="alert"><Icon name="alert" size={15} />{pinError}</p>}
            <button className="button primary" disabled={pinSaving || pinForm.pin.length !== 4 || pinForm.confirm.length !== 4}>{pinSaving ? '보안 확인 중...' : 'PIN 설정·변경'}</button>
          </form>
        </section>}

        <section className="card settings-card settings-notification-card">
          <div className="settings-section-heading"><span className="settings-section-icon"><Icon name="bell" size={21} /></span><div><h2 id="notification-settings-title">알림 설정</h2><p>상담과 후속 업무를 놓치지 않도록 필요한 알림만 선택하세요.</p></div></div>
          <form className="settings-notification-form" aria-labelledby="notification-settings-title" onSubmit={event => { event.preventDefault(); notify('알림 설정을 저장했습니다.'); }}>
            <label className="notification-setting-row"><span><strong>상담 일정 알림</strong><small>상담 시작 30분 전에 알려드립니다.</small></span><span className="settings-switch"><input type="checkbox" role="switch" checked={notificationSettings.appointment} onChange={event => setNotificationSettings(current => ({ ...current, appointment: event.target.checked }))} /><i aria-hidden="true" /></span></label>
            <label className="notification-setting-row"><span><strong>할 일 기한 알림</strong><small>기한 전날과 당일에 알려드립니다.</small></span><span className="settings-switch"><input type="checkbox" role="switch" checked={notificationSettings.followUp} onChange={event => setNotificationSettings(current => ({ ...current, followUp: event.target.checked }))} /><i aria-hidden="true" /></span></label>
            <button className="button primary">알림 설정 저장</button>
          </form>
        </section>
      </div>

      <section className="card privacy-overview">
        <div className="privacy-overview-heading"><span className="privacy-shield"><Icon name="shield" size={24} /></span><div><h2>상담정보는 최소 권한으로 관리합니다</h2><p>현재 역할은 <strong>{roleLabels[role] || '확인 중'}</strong>이며, {role === 'counselor' ? '배정된 학생의 상담 자료만 조회할 수 있습니다.' : role === 'admin' ? '계정·배정 관리와 보안 대응 범위의 권한이 적용됩니다.' : '본인에게 공개된 정보만 조회할 수 있습니다.'}</p></div></div>
        <div className="privacy-principles">
          <article><Icon name="lock" size={18} /><div><strong>연락처 추가 인증</strong><p>연락처는 기본 마스킹하고 4자리 PIN 확인 후 5분 동안만 공개합니다. 학번은 업무 화면에 전체 공개됩니다.</p></div></article>
          <article><Icon name="students" size={18} /><div><strong>담당자 기반 접근</strong><p>상담사는 담당 학생 문서만 구독하며, 사용자 승인과 학생 재배정은 관리자만 수행합니다.</p></div></article>
          <article><Icon name="shield" size={18} /><div><strong>자동 정리 시 최소 정보 처리</strong><p>학생 이름·학번·연락처를 요청에 포함하지 않고 메모 속 직접 식별정보 형식은 서버에서 가립니다.</p></div></article>
          <article><Icon name="check" size={18} /><div><strong>근거 검토 후 저장</strong><p>자동 정리된 초안은 항목별 근거를 제시하며 상담사가 검토해야 최종 기록으로 저장됩니다.</p></div></article>
        </div>
      </section>

      <section className="card access-policy-card">
        <div className="section-header"><div><h2>역할별 정보 접근 범위</h2><p>현재 역할에서 허용되는 정보와 제한되는 작업을 명확히 구분합니다.</p></div></div>
        <div className="access-policy-table" role="table" aria-label="역할별 개인정보 접근 권한">
          <div className="access-policy-head" role="row"><span role="columnheader">역할·범위</span><span role="columnheader">허용</span><span role="columnheader">차단·제한</span></div>
          {accessRows.map(item => <article role="row" key={item.role} className={roleLabels[role] === item.role ? 'current' : ''}><div role="cell"><strong>{item.role}</strong><span>{item.scope}</span>{roleLabels[role] === item.role && <em>현재 역할</em>}</div><p role="cell"><Icon name="check" size={16} />{item.canRead}</p><p role="cell"><Icon name="lock" size={16} />{item.blocked}</p></article>)}
        </div>
        <div className="retention-note"><Icon name="clock" size={17} /><div><strong>데이터 보존</strong><p>임시 상담 기록에는 7일 보존 기한을 기록합니다. 운영 전 기관의 상담기록 보존·파기 기준을 확정해야 합니다.</p></div></div>
      </section>
    </div>
  </>;
}
