import { useMemo, useState } from 'react';
import { useApp } from '../App';
import { createManagedUser, sendManagedPasswordReset } from '../services/adminUserService';
import { PageIntro } from '../components/UI';
import { useAuth } from '../auth/AuthContext';
import { validateAccountInput } from '../utils/validation';

const emptyAccount = { role: 'counselor', displayName: '', email: '', password: '' };
const emptyStudent = { studentNo: '', department: '', grade: '1학년', phone: '', goal: '', concern: '', interests: '', counselorUid: '' };

export default function AdminUsersPage() {
  const { users, setUsers, students, setStudents, persistDocument, notify } = useApp();
  const { firebaseAuthEnabled } = useAuth();
  const counselors = useMemo(() => users.filter(item => item.role === 'counselor' && item.active !== false), [users]);
  const [account, setAccount] = useState(emptyAccount);
  const [student, setStudent] = useState(emptyStudent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      if (firebaseAuthEnabled) {
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
    const updated = {
      ...studentRecord,
      counselorUid,
      counselor: counselor.displayName.replace(/\s*상담사$/, ''),
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistDocument('students', updated);
      setStudents(items => items.map(item => item.id === updated.id ? updated : item));
      notify(`${studentRecord.name} 학생의 담당 상담사를 변경했습니다.`);
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

  return <>
    <PageIntro eyebrow="운영 관리" title="사용자와 담당 학생 관리" description="상담 담당자가 상담사와 학생 계정을 등록하고 담당 상담사를 배정합니다." />
    <div className="admin-grid">
      <section className="card admin-create-card">
        <h2>새 계정 등록</h2>
        <form onSubmit={submit}>
          <label>역할<select value={account.role} onChange={event => updateAccount('role', event.target.value)}><option value="counselor">상담사</option><option value="student">학생</option></select></label>
          <label>이름<input value={account.displayName} onChange={event => updateAccount('displayName', event.target.value)} required /></label>
          <label>이메일<input type="email" value={account.email} onChange={event => updateAccount('email', event.target.value)} required /></label>
          {firebaseAuthEnabled && <label>임시 비밀번호<input type="password" minLength="6" autoComplete="new-password" value={account.password} onChange={event => updateAccount('password', event.target.value)} required /></label>}
          {!firebaseAuthEnabled && <p className="demo-admin-hint">개발 모드에서는 계정이 현재 브라우저에만 생성되며 비밀번호가 필요하지 않습니다.</p>}
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
        {users.map(item => <article key={item.id}><div><strong>{item.displayName}</strong><span>{item.email}</span></div><b>{item.role === 'admin' ? '관리자' : item.role === 'student' ? '학생' : '상담사'}</b>{firebaseAuthEnabled && <button className="text-button" onClick={() => resetPassword(item)}>비밀번호 재설정</button>}</article>)}
      </section>
    </div>
    <section className="card assignment-card">
      <div className="section-header"><div><span className="eyebrow">담당 배정</span><h2>학생별 담당 상담사</h2></div></div>
      {students.length ? <div className="assignment-list">{students.map(item => <article key={item.id}><div><strong>{item.name}</strong><span>{item.studentNo} · {item.department}</span></div><label><span className="sr-only">{item.name} 담당 상담사</span><select value={item.counselorUid || ''} onChange={event => assignCounselor(item, event.target.value)}><option value="">미배정</option>{counselors.map(counselor => <option key={counselor.id} value={counselor.id}>{counselor.displayName}</option>)}</select></label></article>)}</div> : <p>등록된 학생이 없습니다.</p>}
    </section>
  </>;
}
