import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { PageIntro } from '../components/UI';
import { useApp } from '../context/AppContext';
import {
  loadEmailNotificationPreference,
  saveEmailNotificationPreference,
} from '../services/emailNotificationPreferenceService';
import { updateOwnSensitivePhone } from '../services/sensitiveAccessService';
import { DEMO_STUDENT_ID, DEMO_STUDENT_UID } from '../utils/demoInteraction';
import { buildEventNotification } from '../utils/notifications';

const createForm = (student, demoMode) => ({
  phone: demoMode ? student?.phone || '' : '',
  interests: (student?.interests || []).join(', '),
  goal: student?.goal || '',
  concern: student?.concern || '',
});

export default function StudentProfilePage() {
  const { students, setStudents, setNotifications, persistDocumentGroup, notify } = useApp();
  const { user, demoModeEnabled } = useAuth();
  const demoMode = demoModeEnabled && !user;
  const student = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);
  const notificationUid = user?.uid || DEMO_STUDENT_UID;
  const [form, setForm] = useState(() => createForm(student, demoMode));
  const [emailPreference, setEmailPreference] = useState({
    email: user?.email || '',
    appointmentEmailEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (student) setForm(createForm(student, demoMode)); }, [student?.id, demoMode]);
  useEffect(() => {
    let active = true;
    loadEmailNotificationPreference({
      uid: notificationUid,
      fallbackEmail: user?.email || '',
      demoMode,
    }).then(preference => {
      if (active) setEmailPreference(preference);
    }).catch(() => {});
    return () => { active = false; };
  }, [demoMode, notificationUid, user?.email]);

  if (!student) return <div className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</div>;

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const save = async event => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      let nextPhone = student.phone;
      if (!demoMode && form.phone.trim()) nextPhone = (await updateOwnSensitivePhone(form.phone.trim())).phone;
      else if (demoMode) nextPhone = form.phone.trim();
      const now = new Date().toISOString();
      const updated = {
        ...student,
        phone: nextPhone,
        interests: form.interests.split(',').map(item => item.trim()).filter(Boolean),
        goal: form.goal.trim(),
        concern: form.concern.trim(),
        updatedAt: now,
      };
      const notification = buildEventNotification({
        eventId: `${student.id}-profile-${now}`,
        recipientUid: student.counselorUid,
        actorUid: student.uid || user?.uid || 'demo-student-s1',
        type: 'profile',
        title: '학생이 상담 정보를 업데이트했습니다',
        description: `${student.name} 학생 · 관심 분야, 진로 목표 또는 현재 고민을 확인하세요.`,
        to: `/students/${student.id}`,
        createdAt: now,
      });
      await Promise.all([
        persistDocumentGroup([{ name: 'students', record: updated }, { name: 'notifications', record: notification }]),
        saveEmailNotificationPreference({
          uid: notificationUid,
          email: emailPreference.email,
          appointmentEmailEnabled: emailPreference.appointmentEmailEnabled,
          demoMode,
        }),
      ]);
      setStudents(items => items.map(item => item.id === student.id ? updated : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      setForm(createForm(updated, demoMode));
      notify('내 정보를 안전하게 업데이트했습니다.');
    } catch (error) {
      notify(error.message || '내 정보를 업데이트하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="student-page student-profile-page">
    <PageIntro icon="user" title="내 정보 수정" description="상담사가 더 잘 이해할 수 있도록 관심 분야와 진로 목표를 최신 상태로 유지하세요." action={<Link className="button secondary" to="/student/withdrawal">계정 관리</Link>} />
    <div className="student-profile-layout">
      <aside className="card student-profile-summary">
        <span className="student-profile-large-avatar" aria-hidden="true">{student.name.slice(0, 1)}</span>
        <h2>{student.name}</h2><p>{student.department} · {student.grade}</p>
        <dl><div><dt>학번</dt><dd>{student.studentNo}</dd></div><div><dt>담당 상담사</dt><dd>{student.counselor || '담당 상담사'} 상담사</dd></div><div><dt>현재 진로 목표</dt><dd>{student.goal || '아직 입력하지 않았습니다.'}</dd></div></dl>
        <div className="student-profile-guide"><Icon name="shield" size={18} /><p><strong>학적 정보는 안전하게 관리됩니다</strong>이름, 학번, 학과와 학년 변경은 담당 센터에 요청해 주세요.</p></div>
      </aside>
      <section className="card student-profile-form-card">
        <div className="student-page-panel-heading"><div><h2>상담 정보</h2><p>변경 내용은 담당 상담사에게 전달되어 다음 상담 준비에 활용됩니다.</p></div><span>직접 수정 가능</span></div>
        <form onSubmit={save}>
          <label>{demoMode ? '연락처' : '새 연락처'}{!demoMode && <small>연락처를 변경할 때만 새 번호를 입력해 주세요.</small>}<input type="tel" autoComplete="tel" value={form.phone} onChange={event => update('phone', event.target.value)} placeholder={demoMode ? '' : '010-0000-0000'} required={demoMode} /></label>
          <label>관심 분야<small>여러 항목은 쉼표로 구분해 주세요.</small><input value={form.interests} onChange={event => update('interests', event.target.value)} placeholder="예: 서비스 기획, 데이터 분석" /></label>
          <label>진로 목표<input value={form.goal} onChange={event => update('goal', event.target.value)} placeholder="예: IT 서비스 기획자 취업" required /></label>
          <label>현재 고민<small>지금 가장 도움받고 싶은 내용을 적어 주세요.</small><textarea rows="6" value={form.concern} onChange={event => update('concern', event.target.value)} required /></label>
          <fieldset className="student-email-notification-settings">
            <legend>상담 이메일 알림</legend>
            <p>{demoMode ? '데모 상담사가 예약을 확정하거나 취소해도 아래 주소로 실제 발송됩니다.' : '상담사가 예약을 확정하거나 취소하면 아래 주소로 알려드립니다.'}</p>
            <label>이메일 알림 수신 주소<input type="email" autoComplete="email" value={emailPreference.email} onChange={event => setEmailPreference(current => ({ ...current, email: event.target.value }))} placeholder="name@example.com" required={emailPreference.appointmentEmailEnabled} /></label>
            <label className="student-email-notification-toggle"><input type="checkbox" checked={emailPreference.appointmentEmailEnabled} onChange={event => setEmailPreference(current => ({ ...current, appointmentEmailEnabled: event.target.checked }))} /><span>상담 확정·취소 이메일 받기</span></label>
          </fieldset>
          <div className="student-profile-form-actions"><Link className="button secondary" to="/student">취소</Link><button className="button primary" disabled={saving}>{saving ? '저장 중...' : '변경 내용 저장'}</button></div>
        </form>
      </section>
    </div>
  </div>;
}
