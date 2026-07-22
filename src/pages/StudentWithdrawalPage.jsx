import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';

export default function StudentWithdrawalPage() {
  const { students, setStudents, notify } = useApp();
  const { user, requestAccountWithdrawal, logout } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students[0];
  const [confirmed, setConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [demoDeletionDate, setDemoDeletionDate] = useState('');

  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;
  const deletionDate = demoDeletionDate || student.deletionScheduledAt?.slice(0, 10) || '';
  const withdrawalPending = Boolean(deletionDate || student.accountStatus === 'withdrawalPending');

  const submit = async event => {
    event.preventDefault();
    if (!confirmed || working || withdrawalPending) return;
    setWorking(true);
    setError('');
    try {
      if (user) {
        await requestAccountWithdrawal();
      } else {
        const now = new Date();
        const scheduled = new Date(now);
        scheduled.setDate(scheduled.getDate() + 30);
        const updated = {
          ...student,
          accountStatus: 'withdrawalPending',
          withdrawalRequestedAt: now.toISOString(),
          deletionScheduledAt: scheduled.toISOString(),
          updatedAt: now.toISOString(),
        };
        setStudents(items => items.map(item => item.id === student.id ? updated : item));
        setDemoDeletionDate(scheduled.toISOString().slice(0, 10));
        notify('데모 탈퇴 요청을 저장했습니다.');
      }
    } catch {
      setError('탈퇴 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setWorking(false);
    }
  };

  return <div className="student-portal student-withdrawal-page">
    <header><Link className="brand" to="/student"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></Link><div><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header>
    <main>
      <Link className="withdrawal-back-link" to="/student"><Icon name="arrow" size={16} />학생 홈으로 돌아가기</Link>
      <section className="withdrawal-card">
        <span className="withdrawal-icon"><Icon name={withdrawalPending ? 'clock' : 'alert'} size={28} /></span>
        <span className="eyebrow">계정 관리</span>
        <h1>{withdrawalPending ? '탈퇴 요청이 접수되었습니다' : '회원 탈퇴 전에 확인해 주세요'}</h1>
        {withdrawalPending ? <div className="withdrawal-complete">
          <p>계정 이용이 중지될 예정이며, 아래 삭제 예정일까지 담당 상담사를 통해 복구를 요청할 수 있습니다.</p>
          <dl><div><dt>계정</dt><dd>{student.name}</dd></div><div><dt>삭제 예정일</dt><dd>{deletionDate || '요청일로부터 30일 후'}</dd></div></dl>
          <Link className="button secondary full" to="/student">학생 홈으로 돌아가기</Link>
        </div> : <form onSubmit={submit}>
          <p className="withdrawal-description">탈퇴 요청 즉시 서비스 이용이 중지되며, 30일 동안 복구할 수 있도록 계정이 삭제 예정 상태로 보관됩니다.</p>
          <ul className="withdrawal-notice-list">
            <li><Icon name="check" size={17} /><span><strong>서비스 이용 중지</strong>상담 일정, 상담 기록과 추천 프로그램을 더 이상 확인할 수 없습니다.</span></li>
            <li><Icon name="check" size={17} /><span><strong>30일 복구 기간</strong>삭제 예정일 전에는 담당 상담사에게 계정 복구를 요청할 수 있습니다.</span></li>
            <li><Icon name="check" size={17} /><span><strong>상담 기록 처리</strong>별도의 상담 기록 삭제 요청은 담당 상담사의 검토 절차를 따릅니다.</span></li>
          </ul>
          <label className="withdrawal-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>위 안내 내용을 모두 확인했으며 회원 탈퇴를 요청합니다.</span></label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="withdrawal-actions"><Link className="button secondary" to="/student">취소</Link><button className="button withdrawal-submit" disabled={!confirmed || working}>{working ? '처리 중...' : '회원 탈퇴 요청'}</button></div>
        </form>}
      </section>
    </main>
  </div>;
}
