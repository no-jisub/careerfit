import { useMemo, useState } from 'react';
import { useApp } from '../App';
import { createManagedUser, sendManagedPasswordReset } from '../services/adminUserService';
import { PageIntro } from '../components/UI';
import { useAuth } from '../auth/AuthContext';
import { validateAccountInput } from '../utils/validation';

const emptyAccount = { role: 'counselor', displayName: '', email: '', password: '' };
const emptyStudent = { studentNo: '', department: '', grade: '1학년', phone: '', goal: '', concern: '', interests: '', counselorUid: '' };

export default function AdminUsersPage() {
  const { users, setUsers, studentRegistrations, setStudentRegistrations, students, setStudents, consultations, followUps, setFollowUps, appointments, setAppointments, persistDocument, persistDocumentGroup, notify } = useApp();
  const { firebaseAuthEnabled, user, profile } = useAuth();
  const counselors = useMemo(() => users.filter(item => item.role === 'counselor' && item.active !== false), [users]);
  const [account, setAccount] = useState(emptyAccount);
  const [student, setStudent] = useState(emptyStudent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState([]);
  const pendingRegistrations = useMemo(() => studentRegistrations.filter(item => item.status === 'pending' && !students.some(studentItem => studentItem.uid === item.uid)), [studentRegistrations, students]);
  const pendingCounselors = useMemo(() => users.filter(item => item.role === 'counselor' && item.approvalStatus === 'pending'), [users]);
  const withdrawalUsers = useMemo(() => users.filter(item => item.role === 'student' && item.withdrawalStatus === 'pending'), [users]);
  const currentCounselorUid = user?.uid || profile?.id || '';
  const useRemoteAdmin = firebaseAuthEnabled && Boolean(user);

  const updateAccount = (key, value) => setAccount(current => ({ ...current, [key]: value }));
  const updateStudent = (key, value) => setStudent(current => ({ ...current, [key]: value }));

  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    const validatedAccount = validateAccountInput(account, student, users);
    if (validatedAccount.error) { setError(validatedAccount.error); setSaving(false); return; }
    const counselor = counselors.find(item => item.id === student.counselorUid);
    const normalizedStudentNo = student.studentNo.trim().replace(/[^0-9A-Za-z_-]/g, '-');
    const studentId = account.role === 'student' ? `student-${normalizedStudentNo}` : null;
    try {
      const managedPayload = {
        account: {
          ...validatedAccount.value,
        },
        student: account.role === 'student' ? {
          id: studentId,
          name: account.displayName.trim(),
          studentNo: student.studentNo.trim(),
          department: student.department.trim(),
          grade: student.grade,
          phone: student.phone.trim(),
          interests: student.interests.split(',').map(value => value.trim()).filter(Boolean),
          goal: student.goal.trim(),
          concern: student.concern.trim(),
          counselorUid: counselor.id,
          counselor: counselor.displayName.replace(/\s*상담사$/, ''),
        } : null,
      };
      if (useRemoteAdmin) {
        await createManagedUser(managedPayload);
      } else {
        const userId = account.role === 'student' ? `demo-${studentId}` : `demo-${account.role}-${Date.now()}`;
        const nextUser = { id: userId, displayName: managedPayload.account.displayName, email: managedPayload.account.email, role: account.role, active: true, createdAt: new Date().toISOString() };
        setUsers(items => [...items, nextUser]);
        if (managedPayload.student) {
          const nextStudent = { ...managedPayload.student, uid: userId, status: 'scheduled', lastConsultation: '-', appointmentDate: '', appointment: '', initials: managedPayload.student.name.slice(-2), createdAt: new Date().toISOString() };
          setStudents(items => [...items, nextStudent]);
        }
      }
      setAccount(emptyAccount);
      setStudent(emptyStudent);
      notify(`${account.displayName.trim()} 계정을 등록했습니다.`);
    } catch (caught) {
      const code = caught?.code || '';
      if (code.includes('email-already-in-use')) setError('이미 등록된 이메일입니다.');
      else if (code.includes('weak-password')) setError('임시 비밀번호는 6자 이상이어야 합니다.');
      else if (caught?.partialAccountCreated) setError('인증 계정은 생성됐지만 프로필 저장에 실패했습니다. Firebase Console에서 계정을 확인해 주세요.');
      else setError(caught?.message || '계정을 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const assignCounselor = async (studentRecord, counselorUid) => {
    const counselor = counselors.find(item => item.id === counselorUid);
    if (!counselor) return;
    if (studentRecord.counselorUid === counselorUid) return;
    const now = new Date().toISOString();
    const updated = {
      ...studentRecord,
      counselorUid,
      counselor: counselor.displayName.replace(/\s*상담사$/, ''),
      assignmentHistory: [
        ...(studentRecord.assignmentHistory || []),
        { fromCounselorUid: studentRecord.counselorUid || '', toCounselorUid: counselorUid, transferredAt: now, transferredBy: currentCounselorUid },
      ].slice(-20),
      updatedAt: now,
    };
    const transferredAppointments = appointments
      .filter(item => item.studentId === studentRecord.id && ['pending', 'confirmed', 'scheduled'].includes(item.status))
      .map(item => ({ ...item, counselorUid, transferredAt: now, updatedAt: now }));
    const transferredFollowUps = followUps
      .filter(item => item.studentId === studentRecord.id && item.owner === '교직원' && item.status !== 'complete')
      .map(item => ({ ...item, ownerUid: counselorUid, assigneeUid: counselorUid, transferredAt: now, updatedAt: now }));
    const registration = studentRegistrations.find(item => item.uid === studentRecord.uid);
    const updatedRegistration = registration ? { ...registration, counselorUid, updatedAt: now } : null;
    try {
      await persistDocumentGroup([
        { name: 'students', record: updated },
        ...transferredAppointments.map(record => ({ name: 'appointments', record })),
        ...transferredFollowUps.map(record => ({ name: 'followUps', record })),
        ...(updatedRegistration ? [{ name: 'studentRegistrations', record: updatedRegistration }] : []),
      ]);
      setStudents(items => items.map(item => item.id === updated.id ? updated : item));
      setAppointments(items => items.map(item => transferredAppointments.find(record => record.id === item.id) || item));
      setFollowUps(items => items.map(item => transferredFollowUps.find(record => record.id === item.id) || item));
      if (updatedRegistration) setStudentRegistrations(items => items.map(item => item.id === updatedRegistration.id ? updatedRegistration : item));
      const historyCount = consultations.filter(item => item.studentId === studentRecord.id).length;
      notify(`${studentRecord.name} 학생과 상담 이력 ${historyCount}건을 ${counselor.displayName}에게 재배정했습니다.`);
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  const reviewCounselor = async (candidate, decision) => {
    const now = new Date().toISOString();
    const updated = {
      ...candidate,
      active: decision === 'approved',
      approvalStatus: decision,
      reviewedAt: now,
      reviewedBy: currentCounselorUid,
      updatedAt: now,
    };
    try {
      await persistDocument('users', updated);
      setUsers(items => items.map(item => item.id === updated.id ? updated : item));
      notify(`${candidate.displayName} 상담사 가입을 ${decision === 'approved' ? '승인' : '거절'}했습니다.`);
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  const restoreStudentAccount = async candidate => {
    const now = new Date().toISOString();
    const restoredUser = { ...candidate, active: true, withdrawalStatus: 'restored', restoredAt: now, restoredBy: currentCounselorUid, updatedAt: now };
    const studentRecord = students.find(item => item.uid === candidate.id);
    const restoredStudent = studentRecord ? { ...studentRecord, accountStatus: 'active', updatedAt: now } : null;
    try {
      await persistDocumentGroup([
        { name: 'users', record: restoredUser },
        ...(restoredStudent ? [{ name: 'students', record: restoredStudent }] : []),
      ]);
      setUsers(items => items.map(item => item.id === restoredUser.id ? restoredUser : item));
      if (restoredStudent) setStudents(items => items.map(item => item.id === restoredStudent.id ? restoredStudent : item));
      notify(`${candidate.displayName} 학생 계정을 복구했습니다.`);
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  const resetPassword = async user => {
    try {
      await sendManagedPasswordReset(user.email);
      notify(`${user.email}로 비밀번호 재설정 메일을 보냈습니다.`);
    } catch {
      notify('비밀번호 재설정 메일을 보내지 못했습니다.');
    }
  };

  const toggleRegistration = registrationId => {
    setSelectedRegistrationIds(current => current.includes(registrationId) ? current.filter(id => id !== registrationId) : [...current, registrationId]);
  };

  const assignSelectedToMe = async () => {
    if (assigning || !selectedRegistrationIds.length || !currentCounselorUid) return;
    const selected = pendingRegistrations.filter(item => selectedRegistrationIds.includes(item.id) && item.emailVerified !== false);
    if (!selected.length) { setError('이메일 인증이 완료된 학생을 선택해 주세요.'); return; }
    setAssigning(true);
    setError('');
    const now = new Date().toISOString();
    const counselorName = (profile?.displayName || counselors.find(item => item.id === currentCounselorUid)?.displayName || '담당 상담사').replace(/\s*상담사$/, '');
    const assignedStudents = selected.map(registration => ({
      id: `student-${registration.uid}`,
      uid: registration.uid,
      counselorUid: currentCounselorUid,
      counselor: counselorName,
      name: registration.displayName,
      studentNo: registration.studentNo,
      department: registration.department,
      grade: registration.grade,
      phone: registration.phone || '',
      interests: registration.interests || [],
      goal: registration.goal || '',
      concern: registration.concern || '',
      status: 'scheduled',
      appointmentDate: '',
      appointment: '',
      lastConsultation: '',
      initials: registration.displayName.slice(-2),
      createdAt: now,
      updatedAt: now,
    }));
    const approvedRegistrations = selected.map(item => ({ ...item, status: 'approved', counselorUid: currentCounselorUid, assignedAt: now, updatedAt: now }));
    const approvedUsers = selected.map(item => ({ id: item.uid, active: true, approvalStatus: 'approved', updatedAt: now }));
    try {
      await persistDocumentGroup([
        ...assignedStudents.map(record => ({ name: 'students', record })),
        ...approvedRegistrations.map(record => ({ name: 'studentRegistrations', record })),
        ...approvedUsers.map(record => ({ name: 'users', record })),
      ]);
      setStudents(items => [...items, ...assignedStudents.filter(record => !items.some(item => item.uid === record.uid))]);
      setStudentRegistrations(items => items.map(item => approvedRegistrations.find(record => record.id === item.id) || item));
      setUsers(items => items.map(item => approvedUsers.find(record => record.id === item.id) ? { ...item, ...approvedUsers.find(record => record.id === item.id) } : item));
      setSelectedRegistrationIds([]);
      notify(`${selected.length}명의 학생을 내 담당으로 배정했습니다.`);
    } catch { /* 공통 저장 오류 메시지를 사용합니다. */ }
    finally { setAssigning(false); }
  };

  return <>
    <PageIntro eyebrow="운영 관리" title="사용자와 담당 학생 관리" description="상담 담당자가 상담사와 학생 계정을 등록하고 담당 상담사를 배정합니다." />
    <section className="card pending-assignment-card">
      <div className="section-header"><div><span className="eyebrow">상담사 가입 승인</span><h2>승인 대기 {pendingCounselors.length}명</h2><p>이메일 인증을 마친 신규 상담사의 가입 요청을 승인하거나 거절하세요.</p></div></div>
      {pendingCounselors.length ? <div className="pending-registration-list counselor-approval-list">
        {pendingCounselors.map(item => <article key={item.id}><span className="approval-avatar">{item.displayName.slice(0, 1)}</span><div><strong>{item.displayName}</strong><small>{item.email}</small></div><div className="approval-actions"><button className="button primary small" onClick={() => reviewCounselor(item, 'approved')}>승인</button><button className="text-button danger" onClick={() => reviewCounselor(item, 'rejected')}>거절</button></div></article>)}
      </div> : <p className="empty-assignment">현재 승인 대기 중인 상담사가 없습니다.</p>}
    </section>
    <section className="card pending-assignment-card">
      <div className="section-header"><div><span className="eyebrow">회원 탈퇴 관리</span><h2>30일 보관 중 {withdrawalUsers.length}명</h2><p>해커톤 버전에서는 삭제 예정일을 표시하고 필요할 때 상담사가 계정을 복구합니다.</p></div></div>
      {withdrawalUsers.length ? <div className="pending-registration-list">{withdrawalUsers.map(item => <article key={item.id}><span className="approval-avatar">{item.displayName.slice(0, 1)}</span><div><strong>{item.displayName}</strong><span>삭제 예정 {item.deletionScheduledAt?.slice(0, 10) || '-'}</span><small>{item.email}</small></div><button className="button secondary small" onClick={() => restoreStudentAccount(item)}>계정 복구</button></article>)}</div> : <p className="empty-assignment">현재 탈퇴 보관 중인 학생이 없습니다.</p>}
    </section>
    <section className="card pending-assignment-card">
      <div className="section-header"><div><span className="eyebrow">회원가입 학생</span><h2>배정 대기 {pendingRegistrations.length}명</h2><p>이메일 인증을 마친 학생을 선택해 내 담당 학생으로 배정하세요.</p></div><button className="button primary" onClick={assignSelectedToMe} disabled={assigning || !selectedRegistrationIds.length}>{assigning ? '배정 중...' : `선택 학생 내게 배정 (${selectedRegistrationIds.length})`}</button></div>
      {pendingRegistrations.length ? <div className="pending-registration-list">
        {pendingRegistrations.map(item => <article key={item.id} className={selectedRegistrationIds.includes(item.id) ? 'selected' : ''}>
          <label className="pending-registration-select"><input type="checkbox" checked={selectedRegistrationIds.includes(item.id)} disabled={item.emailVerified === false} onChange={() => toggleRegistration(item.id)} /><span className="sr-only">{item.displayName} 선택</span></label>
          <div><strong>{item.displayName}</strong><span>{item.studentNo} · {item.department} · {item.grade}</span><small>{item.email}</small></div>
          <span className={`verification-badge ${item.emailVerified === false ? 'waiting' : ''}`}>{item.emailVerified === false ? '이메일 인증 대기' : '이메일 인증 완료'}</span>
        </article>)}
      </div> : <p className="empty-assignment">현재 배정 대기 중인 학생이 없습니다.</p>}
    </section>
    <div className="admin-grid">
      <section className="card admin-create-card">
        <h2>새 계정 등록</h2>
        <form onSubmit={submit}>
          <label>역할<select value={account.role} onChange={event => updateAccount('role', event.target.value)}><option value="counselor">상담사</option><option value="student">학생</option></select></label>
          <label>이름<input value={account.displayName} onChange={event => updateAccount('displayName', event.target.value)} required /></label>
          <label>이메일<input type="email" value={account.email} onChange={event => updateAccount('email', event.target.value)} required /></label>
          {useRemoteAdmin && <label>임시 비밀번호<input type="password" minLength="6" autoComplete="new-password" value={account.password} onChange={event => updateAccount('password', event.target.value)} required /></label>}
          {!useRemoteAdmin && <p className="demo-admin-hint">데모 모드에서는 계정이 현재 브라우저에만 생성되며 비밀번호가 필요하지 않습니다.</p>}
          {account.role === 'student' && <div className="student-account-fields">
            <div className="form-row"><label>학번<input value={student.studentNo} onChange={event => updateStudent('studentNo', event.target.value)} required /></label><label>학년<select value={student.grade} onChange={event => updateStudent('grade', event.target.value)}>{['1학년','2학년','3학년','4학년','졸업생'].map(grade => <option key={grade}>{grade}</option>)}</select></label></div>
            <label>학과<input value={student.department} onChange={event => updateStudent('department', event.target.value)} required /></label>
            <label>담당 상담사<select value={student.counselorUid} onChange={event => updateStudent('counselorUid', event.target.value)} required><option value="">상담사를 선택하세요</option>{counselors.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
            <label>연락처<input value={student.phone} onChange={event => updateStudent('phone', event.target.value)} required /></label>
            <label>관심 분야<input value={student.interests} onChange={event => updateStudent('interests', event.target.value)} placeholder="기획, 데이터 분석" /></label>
            <label>진로 목표<input value={student.goal} onChange={event => updateStudent('goal', event.target.value)} required /></label>
            <label>현재 고민<textarea rows="3" value={student.concern} onChange={event => updateStudent('concern', event.target.value)} required /></label>
          </div>}
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button primary" disabled={saving}>{saving ? '등록 중...' : '계정 등록'}</button>
        </form>
      </section>
      <section className="card admin-user-list">
        <div className="section-header"><div><span className="eyebrow">등록 계정</span><h2>사용자 {users.length}명</h2></div></div>
        {users.map(item => <article key={item.id}><div><strong>{item.displayName}</strong><span>{item.email}</span></div><b>{item.approvalStatus === 'pending' ? '승인 대기' : item.approvalStatus === 'rejected' ? '가입 거절' : item.role === 'admin' ? '관리자' : item.role === 'student' ? '학생' : '상담사'}</b>{useRemoteAdmin && <button className="text-button" onClick={() => resetPassword(item)}>비밀번호 재설정</button>}</article>)}
      </section>
    </div>
    <section className="card assignment-card">
      <div className="section-header"><div><span className="eyebrow">담당 배정</span><h2>학생별 담당 상담사</h2></div></div>
      {students.length ? <div className="assignment-list">{students.map(item => <article key={item.id}><div><strong>{item.name}</strong><span>{item.studentNo} · {item.department} · 상담 기록 {consultations.filter(record => record.studentId === item.id).length}건</span></div><label><span className="sr-only">{item.name} 담당 상담사</span><select value={item.counselorUid || ''} onChange={event => assignCounselor(item, event.target.value)}><option value="">미배정</option>{counselors.map(counselor => <option key={counselor.id} value={counselor.id}>{counselor.displayName}</option>)}</select></label></article>)}</div> : <p>등록된 학생이 없습니다.</p>}
    </section>
  </>;
}
