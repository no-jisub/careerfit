import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { getTimeRangeEnd, toDateKey } from '../utils/date';
import { validateAppointmentInput, validateAvailabilityInput } from '../utils/validation';
import { activeAppointmentStatuses, getAppointmentCancellationLabel, hasCounselorAppointmentConflict, hasCounselorAvailabilityConflict, upsertAppointmentById } from '../utils/appointments';
import { useAuth } from '../auth/AuthContext';

const emptyForm = () => ({ studentId: '', date: toDateKey(), time: '10:00', endTime: '10:50', type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '' });
const emptyAvailabilityForm = () => ({ date: toDateKey(), time: '10:00', endTime: '10:50', location: '대학일자리플러스센터 상담실 2' });
const appointmentStatusLabels = { pending: '승인 대기', confirmed: '확정', scheduled: '확정', completed: '완료', cancelled: '취소' };

export default function AppointmentsPage() {
  const { students, appointments, setAppointments, setStudents, counselorAvailability, setCounselorAvailability, persistDocument, persistDocumentGroup, notify } = useApp();
  const { user, profile } = useAuth();
  const counselorUid = user?.uid || profile?.id || 'demo-counselor';
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailabilityForm);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const myAvailability = useMemo(() => counselorAvailability
    .filter(item => item.counselorUid === counselorUid)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [counselorAvailability, counselorUid]);
  const ordered = useMemo(() => appointments
    .filter(item => statusFilter === 'all' || item.status === statusFilter)
    .filter(item => {
      const student = students.find(candidate => candidate.id === item.studentId);
      const keyword = query.trim().toLowerCase();
      return !keyword || [student?.name, student?.studentNo, item.type, item.location, item.subject, item.requestMessage].some(value => value?.toLowerCase().includes(keyword));
    })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [appointments, students, query, statusFilter]);

  const openCreate = () => {
    setEditingId('');
    setForm({ ...emptyForm(), studentId: students[0]?.id || '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = appointment => {
    setEditingId(appointment.id);
    setForm({ studentId: appointment.studentId, date: appointment.date, time: appointment.time, endTime: getTimeRangeEnd(appointment), type: appointment.type, location: appointment.location, preparation: appointment.preparation || '' });
    setError('');
    setShowForm(true);
  };

  const save = async event => {
    event.preventDefault();
    if (saving) return;
    const student = students.find(item => item.id === form.studentId);
    if (!student) return;
    const validated = validateAppointmentInput(form, toDateKey(), new Date().toTimeString().slice(0, 5));
    if (validated.error) { setError(validated.error); return; }
    const safeForm = validated.value;
    const conflict = hasCounselorAppointmentConflict(appointments, students, { ...safeForm, counselorUid: student.counselorUid }, editingId);
    if (conflict) {
      setError('같은 시간에 이미 등록된 상담 일정이 있습니다.');
      return;
    }
    const now = new Date().toISOString();
    const previous = appointments.find(item => item.id === editingId);
    const appointment = {
      ...previous,
      id: editingId || `appointment-${Date.now()}`,
      ...safeForm,
      counselorUid: student.counselorUid,
      studentUid: student.uid || '',
      status: previous?.status || 'pending',
      updatedAt: now,
      ...(!editingId ? { createdAt: now } : {}),
    };
    const updatedStudent = { ...student, appointmentDate: form.date, appointment: form.time, status: 'scheduled', updatedAt: now };
    setSaving(true);
    try {
      await persistDocumentGroup([{ name: 'appointments', record: appointment }, { name: 'students', record: updatedStudent }]);
      setAppointments(items => upsertAppointmentById(items, appointment));
      setStudents(items => items.map(item => item.id === student.id ? updatedStudent : item));
      setShowForm(false);
      notify(editingId ? '상담 일정을 변경했습니다.' : '상담 일정을 등록했습니다.');
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
    finally { setSaving(false); }
  };

  const updateStatus = async (appointment, status) => {
    const now = new Date().toISOString();
    const updated = { ...appointment, status, updatedAt: now, ...(status === 'cancelled' ? { cancelledAt: now, cancelledBy: counselorUid, cancelledByRole: 'counselor' } : {}), ...(status === 'confirmed' ? { confirmedAt: now } : {}), ...(status === 'completed' ? { completedAt: now } : {}) };
    const student = students.find(item => item.id === appointment.studentId);
    const updatedStudent = ['completed', 'cancelled'].includes(status) && student && student.appointmentDate === appointment.date && student.appointment === appointment.time
      ? { ...student, appointmentDate: '', appointment: '', status: 'complete', updatedAt: updated.updatedAt }
      : null;
    try {
      await persistDocumentGroup([{ name: 'appointments', record: updated }, ...(updatedStudent ? [{ name: 'students', record: updatedStudent }] : [])]);
      setAppointments(items => items.map(item => item.id === appointment.id ? updated : item));
      if (updatedStudent) setStudents(items => items.map(item => item.id === updatedStudent.id ? updatedStudent : item));
      notify(`상담 일정을 ${appointmentStatusLabels[status]} 상태로 변경했습니다.`);
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  const saveAvailability = async event => {
    event.preventDefault();
    if (availabilitySaving) return;
    const validated = validateAvailabilityInput(availabilityForm, toDateKey(), new Date().toTimeString().slice(0, 5));
    if (validated.error) { setAvailabilityError(validated.error); return; }
    if (hasCounselorAvailabilityConflict(myAvailability, { ...validated.value, counselorUid })) {
      setAvailabilityError('기존 상담 가능 시간과 겹칩니다. 시작 시간과 종료 예정 시간을 확인해 주세요.');
      return;
    }
    const now = new Date().toISOString();
    const availability = {
      id: `availability-${counselorUid}-${Date.now()}`,
      counselorUid,
      ...validated.value,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    setAvailabilitySaving(true);
    try {
      await persistDocument('counselorAvailability', availability);
      setCounselorAvailability(items => items.some(item => item.id === availability.id)
        ? items.map(item => item.id === availability.id ? availability : item)
        : [...items, availability]);
      setAvailabilityForm(emptyAvailabilityForm());
      setShowAvailabilityForm(false);
      notify('학생이 신청할 수 있는 상담 시간을 등록했습니다.');
    } catch { /* 공통 저장 오류 메시지를 사용합니다. */ }
    finally { setAvailabilitySaving(false); }
  };

  const updateAvailabilityStatus = async (availability, status) => {
    const updated = { ...availability, status, updatedAt: new Date().toISOString() };
    if (status === 'open') {
      delete updated.appointmentId;
      delete updated.bookedByUid;
    }
    try {
      await persistDocument('counselorAvailability', updated);
      setCounselorAvailability(items => items.map(item => item.id === updated.id ? updated : item));
      notify(status === 'open' ? '상담 신청 가능 시간을 다시 열었습니다.' : '상담 신청 가능 시간을 마감했습니다.');
    } catch { /* 공통 저장 오류 메시지를 사용합니다. */ }
  };

  return <>
    <PageIntro eyebrow="상담 운영" title="상담 일정 관리" description="학생이 신청할 수 있는 시간을 열고, 접수된 상담 내용을 확인해 일정을 확정하세요." action={<div className="page-action-group"><button className="button secondary" onClick={() => { setAvailabilityError(''); setAvailabilityForm(emptyAvailabilityForm()); setShowAvailabilityForm(true); }}><Icon name="calendar" size={18} />상담 가능 시간 설정</button><button className="button primary" onClick={openCreate}><Icon name="plus" size={18} />직접 예약</button></div>} />
    <section className="card availability-management-card">
      <div className="section-header"><div><span className="eyebrow">상담 신청 설정</span><h2>학생에게 공개된 상담 가능 시간</h2><p>열린 시간만 담당 학생의 상담 신청 화면에 표시됩니다.</p></div><span className="availability-open-count">신청 가능 {myAvailability.filter(item => item.status === 'open').length}개</span></div>
      {myAvailability.length ? <div className="availability-slot-list">{myAvailability.map(item => { const linkedAppointment = appointments.find(appointment => appointment.id === item.appointmentId); const linkedStudent = linkedAppointment ? students.find(student => student.id === linkedAppointment.studentId) : null; const canReopen = item.status === 'booked' && linkedAppointment?.status === 'cancelled'; const cancellationLabel = getAppointmentCancellationLabel(linkedAppointment); return <article key={item.id} className={item.status}><time><strong>{item.date}</strong><span>{item.time}–{getTimeRangeEnd(item)} · {item.duration}분</span></time><div><strong>{item.location}</strong><span>{item.status === 'booked' ? `${linkedStudent?.name || '학생'} ${linkedAppointment?.status === 'cancelled' ? `신청 취소 · ${cancellationLabel}` : '상담 신청 접수'}` : item.status === 'closed' ? '학생에게 표시되지 않음' : '학생 신청 가능'}</span></div><span className={`availability-status ${item.status}`}>{item.status === 'open' ? '신청 가능' : item.status === 'booked' ? linkedAppointment?.status === 'cancelled' ? cancellationLabel : '신청 접수' : '마감'}</span>{(item.status !== 'booked' || canReopen) && <button className="text-button" onClick={() => updateAvailabilityStatus(item, item.status === 'open' ? 'closed' : 'open')}>{item.status === 'open' ? '마감' : '다시 열기'}</button>}</article>; })}</div> : <EmptyState icon="calendar" title="등록한 상담 가능 시간이 없습니다" description="상담 가능 시간 설정 버튼으로 학생이 신청할 날짜와 시간을 열어 주세요." />}
    </section>
    <section className="filter-card" aria-label="상담 일정 검색 및 필터"><label className="search-field"><span className="sr-only">일정 검색</span><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="학생, 학번, 상담 유형, 장소 검색" /></label><label><span>상태</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">전체</option><option value="pending">대기</option><option value="confirmed">확정</option><option value="completed">완료</option><option value="cancelled">취소</option></select></label><button className="text-button" onClick={() => { setQuery(''); setStatusFilter('all'); }}>필터 초기화</button></section>
    <section className="card appointment-list-card">
      <div className="list-toolbar"><div><h2>조회된 일정 <span>{ordered.length}</span></h2><p>날짜와 시간순으로 표시됩니다.</p></div></div>
      {ordered.length ? <div className="appointment-list">{ordered.map(item => { const student = students.find(candidate => candidate.id === item.studentId); const active = activeAppointmentStatuses.includes(item.status); const cancellationLabel = getAppointmentCancellationLabel(item); return <article key={item.id} className={item.status}><time><strong>{item.date}</strong><span>{item.time}–{getTimeRangeEnd(item)}</span></time><div><Link to={`/students/${item.studentId}`}>{student?.name || '학생'}</Link><p>{item.type} · {item.location}</p>{item.requestedBy === 'student' ? <details className="appointment-request-details"><summary>학생 사전 상담 내용 보기</summary><dl><div><dt>상담 주제</dt><dd>{item.subject}</dd></div><div><dt>전달 내용</dt><dd>{item.requestMessage}</dd></div>{item.preferredOutcome && <div><dt>원하는 결과</dt><dd>{item.preferredOutcome}</dd></div>}</dl></details> : <small>{item.preparation ? `준비사항: ${item.preparation}` : '별도 준비사항 없음'}</small>}</div><span className={`appointment-status ${item.status}`}>{item.status === 'cancelled' ? cancellationLabel : appointmentStatusLabels[item.status] || item.status}</span><div className="appointment-actions">{active && <><button className="button secondary small" onClick={() => openEdit(item)}>변경</button>{item.status === 'pending' && <button className="button primary small" onClick={() => updateStatus(item, 'confirmed')}>확정</button>}{['confirmed', 'scheduled'].includes(item.status) && <button className="button primary small" onClick={() => updateStatus(item, 'completed')}>완료</button>}<button className="text-button danger" onClick={() => updateStatus(item, 'cancelled')}>취소</button></>}</div></article>; })}</div> : <EmptyState icon="calendar" title="등록된 상담 일정이 없습니다" description="상담 예약 버튼으로 첫 일정을 등록해 주세요." />}
    </section>
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !saving && setShowForm(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title"><button className="modal-close" aria-label="닫기" disabled={saving} onClick={() => setShowForm(false)}><Icon name="close" size={19} /></button><span className="eyebrow">상담 일정</span><h2 id="appointment-form-title">{editingId ? '예약 변경' : '새 상담 예약'}</h2><form onSubmit={save}><label>학생<select autoFocus value={form.studentId} onChange={event => setForm(current => ({ ...current, studentId: event.target.value }))} required disabled={Boolean(editingId)}><option value="">학생을 선택하세요</option>{students.map(item => <option key={item.id} value={item.id}>{item.name} · {item.department}</option>)}</select></label><label>날짜<input type="date" value={form.date} min={toDateKey()} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} required /></label><div className="form-row"><label>상담 시작 시간<input type="time" value={form.time} onChange={event => setForm(current => ({ ...current, time: event.target.value }))} required /></label><label>종료 예정 시간<input type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} required /></label></div><label>상담 유형<select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>{['진로 상담','취업 상담','자기소개서 상담','면접 상담','기타 상담'].map(type => <option key={type}>{type}</option>)}</select></label><label>장소<input value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} required /></label><label>학생 준비사항<textarea rows="3" value={form.preparation} onChange={event => setForm(current => ({ ...current, preparation: event.target.value }))} /></label>{error && <p className="field-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={() => setShowForm(false)}>닫기</button><button className="button primary" disabled={saving}>{saving ? '저장 중...' : '일정 저장'}</button></div></form></section></div>}
    {showAvailabilityForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !availabilitySaving && setShowAvailabilityForm(false)}><section className="modal availability-form-modal" role="dialog" aria-modal="true" aria-labelledby="availability-form-title"><button className="modal-close" aria-label="닫기" disabled={availabilitySaving} onClick={() => setShowAvailabilityForm(false)}><Icon name="close" size={19} /></button><span className="eyebrow">상담 신청 설정</span><h2 id="availability-form-title">상담 가능 시간 등록</h2><p className="availability-form-description">등록한 시간은 담당 학생에게 즉시 공개됩니다.</p><form onSubmit={saveAvailability}><label>날짜<input autoFocus type="date" min={toDateKey()} value={availabilityForm.date} onChange={event => setAvailabilityForm(current => ({ ...current, date: event.target.value }))} required /></label><div className="form-row"><label>상담 시작 시간<input type="time" value={availabilityForm.time} onChange={event => setAvailabilityForm(current => ({ ...current, time: event.target.value }))} required /></label><label>종료 예정 시간<input type="time" value={availabilityForm.endTime} onChange={event => setAvailabilityForm(current => ({ ...current, endTime: event.target.value }))} required /></label></div><label>상담 장소<input value={availabilityForm.location} onChange={event => setAvailabilityForm(current => ({ ...current, location: event.target.value }))} placeholder="상담실 또는 온라인 상담 주소" required /></label>{availabilityError && <p className="field-error" role="alert">{availabilityError}</p>}<div className="modal-actions"><button type="button" className="button secondary" disabled={availabilitySaving} onClick={() => setShowAvailabilityForm(false)}>취소</button><button className="button primary" disabled={availabilitySaving}>{availabilitySaving ? '등록 중...' : '학생에게 공개'}</button></div></form></section></div>}
  </>;
}
