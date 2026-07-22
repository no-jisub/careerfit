import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';

const statusCopy = {
  emailVerificationRequired: {
    icon: 'mail',
    title: '이메일 인증이 필요해요',
    description: '가입한 이메일로 보낸 인증 링크를 누른 뒤 아래 버튼으로 인증 상태를 확인해 주세요.',
  },
  assignmentPending: {
    icon: 'clock',
    title: '상담사 배정을 기다리고 있어요',
    description: '이메일 인증이 완료되었습니다. 상담사가 가입 정보를 확인하고 담당 학생으로 배정하면 바로 이용할 수 있어요.',
  },
  counselorApprovalPending: {
    icon: 'clock',
    title: '상담사 승인을 기다리고 있어요',
    description: '이메일 인증이 완료되었습니다. 기존 상담사가 계정을 승인하면 업무 화면을 사용할 수 있어요.',
  },
  rejected: {
    icon: 'alert',
    title: '가입 승인을 확인해 주세요',
    description: '등록 정보 확인이 필요합니다. 학교 상담 담당자에게 문의해 주세요.',
  },
  profileMissing: {
    icon: 'alert',
    title: '계정 정보를 확인할 수 없어요',
    description: '로그아웃한 뒤 다시 로그인해 주세요. 문제가 계속되면 상담 담당자에게 문의해 주세요.',
  },
};

export default function AccountStatusPage() {
  const { user, role, profile, accountStatus, refreshAccount, resendVerificationEmail, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  if (role) return <Navigate to={role === 'student' ? '/student' : '/dashboard'} replace />;
  if (!user) return <Navigate to="/login" replace />;
  const copy = statusCopy[accountStatus] || statusCopy.profileMissing;

  const refresh = async () => {
    setWorking(true);
    setMessage('');
    try {
      const result = await refreshAccount();
      if (result.status !== 'approved') setMessage(result.status === 'assignmentPending' ? '아직 상담사 배정 전입니다.' : result.status === 'counselorApprovalPending' ? '아직 기존 상담사의 승인 전입니다.' : '현재 상태를 다시 확인했습니다.');
    } catch {
      setMessage('상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally { setWorking(false); }
  };
  const resend = async () => {
    setWorking(true);
    try {
      await resendVerificationEmail();
      setMessage('인증 메일을 다시 보냈습니다. 스팸메일함도 확인해 주세요.');
    } catch { setMessage('인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setWorking(false); }
  };

  return <main className="auth-standalone"><section className="auth-card status-card">
    <span className="status-card-icon"><Icon name={copy.icon} size={30} /></span>
    <span className="eyebrow">가입 진행 상태</span><h1>{copy.title}</h1><p>{copy.description}</p>
    <dl><div><dt>이름</dt><dd>{profile?.displayName || user.displayName || '-'}</dd></div><div><dt>이메일</dt><dd>{user.email}</dd></div></dl>
    {message && <p className="status-message" role="status">{message}</p>}
    <div className="status-actions">
      <button className="button primary full" onClick={refresh} disabled={working}>{working ? '확인 중...' : accountStatus === 'emailVerificationRequired' ? '인증 완료 확인' : '승인 상태 새로고침'}</button>
      {accountStatus === 'emailVerificationRequired' && <button className="button secondary full" onClick={resend} disabled={working}>인증 메일 다시 보내기</button>}
      <button className="text-button" onClick={logout}>다른 계정으로 로그인</button>
    </div>
  </section></main>;
}
