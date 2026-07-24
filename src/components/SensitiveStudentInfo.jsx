import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { revealStudentSensitiveData } from '../services/sensitiveAccessService';
import {
  formatRevealTime,
  maskPhone,
  maskStudentNo,
  normalizeSensitivePin,
} from '../utils/sensitiveData';
import Icon from './Icon';

export default function SensitiveStudentInfo({ student }) {
  const { demoModeEnabled, user } = useAuth();
  const demoMode = demoModeEnabled && !user;
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const pinRef = useRef(null);

  const lock = () => {
    setRevealed(null);
    setRemaining(0);
    setPin('');
  };

  const close = () => {
    if (loading) return;
    setOpen(false);
    setPin('');
    setError('');
  };

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => pinRef.current?.focus());
    const onKeyDown = event => event.key === 'Escape' && close();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, loading]);

  useEffect(() => {
    if (!revealed || remaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemaining(current => {
        if (current <= 1) {
          setRevealed(null);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [revealed]);

  useEffect(() => lock(), [student.id]);

  const verify = async event => {
    event.preventDefault();
    if (pin.length !== 4 || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await revealStudentSensitiveData({ student, pin, demoMode });
      setRevealed(result.sensitive);
      setRemaining(result.expiresInSeconds || 300);
      setOpen(false);
      setPin('');
    } catch (caught) {
      const retry = caught.retryAfterSeconds ? ` ${Math.ceil(caught.retryAfterSeconds / 60)}분 뒤 다시 시도해 주세요.` : '';
      setError(`${caught.message}${retry}`);
      window.requestAnimationFrame(() => pinRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  return <>
    <section className={`sensitive-profile ${revealed ? 'is-revealed' : ''}`} aria-label="보호된 학생 식별정보">
      <div className="sensitive-profile-heading">
        <div><span><Icon name={revealed ? 'check' : 'lock'} size={14} />{revealed ? '인증됨' : '민감정보 보호 중'}</span><small>{revealed ? `${formatRevealTime(remaining)} 후 자동 잠금` : '담당자만 일시적으로 확인 가능'}</small></div>
        {revealed
          ? <button type="button" className="sensitive-lock-button" onClick={lock}><Icon name="lock" size={14} />다시 잠그기</button>
          : <button type="button" className="sensitive-reveal-button" onClick={() => setOpen(true)}><Icon name="eye" size={15} />전체 보기</button>}
      </div>
      <dl>
        <div><dt>연락처</dt><dd className="sensitive-value">{revealed?.phone || maskPhone(student.phone)}</dd></div>
        <div><dt>학번</dt><dd className="sensitive-value">{revealed?.studentNo || maskStudentNo(student.studentNo)}</dd></div>
      </dl>
      <p><Icon name="shield" size={13} />열람 성공·실패 이력은 보안 기록에 남으며 전체값은 5분 후 자동으로 가려집니다.</p>
    </section>

    {open && createPortal(<div className="modal-backdrop sensitive-pin-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && close()}>
      <section className="modal sensitive-pin-modal" role="dialog" aria-modal="true" aria-labelledby="sensitive-pin-title" aria-describedby="sensitive-pin-description">
        <button className="modal-close" type="button" aria-label="인증 창 닫기" disabled={loading} onClick={close}><Icon name="close" size={19} /></button>
        <span className="sensitive-modal-icon"><Icon name="lock" size={24} /></span>
        <span className="eyebrow">추가 본인 확인</span>
        <h2 id="sensitive-pin-title">민감정보 전체 보기</h2>
        <p id="sensitive-pin-description">담당자 전용 4자리 보안 PIN을 입력하면 {student.name} 학생의 연락처와 학번을 5분간 확인할 수 있습니다.</p>
        <form onSubmit={verify}>
          <label htmlFor="sensitive-pin">4자리 보안 PIN</label>
          <input
            ref={pinRef}
            id="sensitive-pin"
            className={error ? 'has-error' : ''}
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength="4"
            autoComplete="off"
            value={pin}
            onChange={event => {
              setPin(normalizeSensitivePin(event.target.value));
              if (error) setError('');
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'sensitive-pin-error' : undefined}
            placeholder="••••"
          />
          {error && <p className="sensitive-pin-error" id="sensitive-pin-error" role="alert"><Icon name="alert" size={15} />{error}</p>}
          <div className="sensitive-security-note"><Icon name="shield" size={16} /><span>로그인 비밀번호와 분리된 열람 전용 PIN입니다. 5회 실패하면 10분간 잠깁니다.</span></div>
          <div className="modal-actions">
            <button className="button secondary" type="button" disabled={loading} onClick={close}>취소</button>
            <button className="button primary" disabled={pin.length !== 4 || loading}>{loading ? '확인 중...' : '인증하고 보기'}</button>
          </div>
        </form>
      </section>
    </div>, document.body)}
  </>;
}
