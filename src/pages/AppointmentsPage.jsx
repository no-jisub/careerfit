import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { getTimeRangeEnd, parseDateKey, toDateKey } from '../utils/date';
import { validateAppointmentInput } from '../utils/validation';
import { activeAppointmentStatuses, buildHourlyAvailabilitySlots, buildMonthCalendar, canBulkReopenAvailability, canRescheduleAppointment, closeAvailabilityAfterCancellation, createRescheduleRequest, getAppointmentCancellationLabel, hasCounselorAppointmentConflict, holdAvailabilityForReschedule, resolveCancelledAvailability, resolveRescheduleRequest, upsertAppointmentById } from '../utils/appointments';
import { useAuth } from '../auth/AuthContext';
import { buildEventNotification } from '../utils/notifications';

const emptyForm = () => ({ studentId: '', date: toDateKey(), time: '10:00', endTime: '10:50', type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '' });
const emptyAvailabilityForm = () => ({ dates: [toDateKey()], startTime: '09:00', endTime: '18:00', exclusions: [], location: '대학일자리플러스센터 상담실 2' });
const appointmentStatusLabels = { pending: '승인 대기', confirmed: '확정', scheduled: '확정', completed: '완료', cancelled: '취소' };
const formatMonthTitle = monthKey => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(parseDateKey(monthKey));
const shiftMonth = (monthKey, amount) => {
  const date = parseDateKey(monthKey);
  date.setMonth(date.getMonth() + amount, 1);
  return toDateKey(date);
};

export default function AppointmentsPage() {
  const { students, consultations, appointments, setAppointments, setStudents, counselorAvailability, setCounselorAvailability, setNotifications, persistDocument, persistDocumentGroup, notify } = useApp();
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
  const [availabilityMonth, setAvailabilityMonth] = useState(`${toDateKey().slice(0, 7)}-01`);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [expandedAvailabilityDates, setExpandedAvailabilityDates] = useState([]);
  const [proposalFor, setProposalFor] = useState(null);
  const [proposalSlotId, setProposalSlotId] = useState('');
  const myAvailability = useMemo(() => counselorAvailability
    .filter(item => item.counselorUid === counselorUid)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [counselorAvailability, counselorUid]);
  const availabilityCalendarDays = useMemo(() => buildMonthCalendar(availabilityMonth), [availabilityMonth]);
  const availabilityPreview = useMemo(() => buildHourlyAvailabilitySlots({
    ...availabilityForm,
    counselorUid,
    existingAvailability: myAvailability,
    appointments,
    nowDate: toDateKey(),
    nowTime: new Date().toTimeString().slice(0, 5),
  }), [availabilityForm, counselorUid, myAvailability, appointments]);
  const availabilityByDate = useMemo(() => myAvailability.reduce((groups, item) => {
    groups[item.date] = [...(groups[item.date] || []), item];
    return groups;
  }, {}), [myAvailability]);
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
    const linkedAvailability = status === 'cancelled' ? counselorAvailability.find(item => item.id === appointment.availabilityId) : null;
    const closedAvailability = closeAvailabilityAfterCancellation(linkedAvailability, appointment, now);
    const eventNotification = ['confirmed', 'cancelled'].includes(status) && appointment.studentUid ? buildEventNotification({ eventId: `${appointment.id}-${status}`, recipientUid: appointment.studentUid, actorUid: counselorUid, type: 'appointment', title: status === 'confirmed' ? '상담 예약이 확정되었습니다' : '상담사가 예약을 취소했습니다', description: `${appointment.date} ${appointment.time} · ${appointment.location}`, to: '/student/appointments', createdAt: now }) : null;
    try {
      await persistDocumentGroup([{ name: 'appointments', record: updated }, ...(updatedStudent ? [{ name: 'students', record: updatedStudent }] : []), ...(closedAvailability ? [{ name: 'counselorAvailability', record: closedAvailability }] : []), ...(eventNotification ? [{ name: 'notifications', record: eventNotification }] : [])]);
      setAppointments(items => items.map(item => item.id === appointment.id ? updated : item));
      if (updatedStudent) setStudents(items => items.map(item => item.id === updatedStudent.id ? updatedStudent : item));
      if (closedAvailability) setCounselorAvailability(items => items.map(item => item.id === closedAvailability.id ? closedAvailability : item));
      if (eventNotification) setNotifications(items => items.some(item => item.id === eventNotification.id) ? items : [...items, eventNotification]);
      notify(`상담 일정을 ${appointmentStatusLabels[status]} 상태로 변경했습니다.`);
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  const saveAvailability = async event => {
    event.preventDefault();
    if (availabilitySaving) return;
    if (availabilityPreview.error) { setAvailabilityError(availabilityPreview.error); return; }
    setAvailabilitySaving(true);
    try {
      await persistDocumentGroup(availabilityPreview.slots.map(record => ({ name: 'counselorAvailability', record })));
      setCounselorAvailability(items => [...items, ...availabilityPreview.slots.filter(slot => !items.some(item => item.id === slot.id))]);
      setAvailabilityForm(emptyAvailabilityForm());
      setShowAvailabilityForm(false);
      notify(`1시간 상담 가능 시간 ${availabilityPreview.slots.length}개를 등록했습니다.${availabilityPreview.skipped ? ` 제외 설정 또는 기존 일정과 겹친 ${availabilityPreview.skipped}개 시간은 제외했습니다.` : ''}`);
    } catch { /* 공통 저장 오류 메시지를 사용합니다. */ }
    finally { setAvailabilitySaving(false); }
  };

  const toggleAvailabilityDate = date => {
    setAvailabilityForm(current => ({
      ...current,
      dates: current.dates.includes(date) ? current.dates.filter(item => item !== date) : [...current.dates, date].sort(),
    }));
    setAvailabilityError('');
  };

  const toggleAvailabilityDateDetails = date => {
    setExpandedAvailabilityDates(current => current.includes(date)
      ? current.filter(item => item !== date)
      : [...current, date]);
  };

  const addAvailabilityExclusion = () => {
    setAvailabilityForm(current => ({
      ...current,
      exclusions: [...current.exclusions, { startTime: '12:00', endTime: '13:00' }],
    }));
    setAvailabilityError('');
  };

  const updateAvailabilityExclusion = (index, key, value) => {
    setAvailabilityForm(current => ({
      ...current,
      exclusions: current.exclusions.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
    setAvailabilityError('');
  };

  const removeAvailabilityExclusion = index => {
    setAvailabilityForm(current => ({
      ...current,
      exclusions: current.exclusions.filter((_, itemIndex) => itemIndex !== index),
    }));
    setAvailabilityError('');
  };

  const updateAvailabilityStatus = async (availability, status) => {
    const cancellationResolution = availability.closedReason === 'appointment-cancelled'
      ? resolveCancelledAvailability(availability, status === 'open' ? 'reopen' : 'keep-closed')
      : null;
    if (cancellationResolution?.error) { notify(cancellationResolution.error); return; }
    const updated = cancellationResolution?.value || { ...availability, status, updatedAt: new Date().toISOString() };
    if (status === 'open' && !cancellationResolution) { delete updated.appointmentId; delete updated.bookedByUid; }
    try {
      await persistDocument('counselorAvailability', updated);
      setCounselorAvailability(items => items.map(item => item.id === updated.id ? updated : item));
      notify(status === 'open' ? '상담 신청 가능 시간을 다시 열었습니다.' : '상담 신청 가능 시간을 마감했습니다.');
    } catch { /* 공통 저장 오류 메시지를 사용합니다. */ }
  };

  const keepCancelledAvailabilityClosed = availability => updateAvailabilityStatus(availability, 'closed');

  const submitRescheduleProposal = async event => {
    event.preventDefault();
    const slot = counselorAvailability.find(item => item.id === proposalSlotId);
    const result = createRescheduleRequest(proposalFor, slot, 'counselor');
    if (result.error) { notify(result.error); return; }
    const heldSlot = holdAvailabilityForReschedule(slot, proposalFor);
    const notification = buildEventNotification({ eventId: `${result.value.rescheduleRequest.id}-proposed`, recipientUid: proposalFor.studentUid, actorUid: counselorUid, type: 'appointment', title: '상담사가 일정 변경을 제안했습니다', description: `${slot.date} ${slot.time} · 응답이 필요합니다.`, to: '/student/appointments' });
    try {
      await persistDocumentGroup([{ name: 'appointments', record: result.value }, { name: 'counselorAvailability', record: heldSlot }, { name: 'notifications', record: notification }]);
      setAppointments(items => items.map(item => item.id === proposalFor.id ? result.value : item));
      setCounselorAvailability(items => items.map(item => item.id === heldSlot.id ? heldSlot : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      setProposalFor(null);
      notify('학생에게 일정 변경을 제안했습니다. 기존 예약은 응답 전까지 유지됩니다.');
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  const decideStudentReschedule = async (appointment, approve) => {
    const originalAction = approve ? 'keep' : (window.confirm('변경 요청을 거절하고 기존 예약도 취소할까요?\n확인: 기존 예약 취소 / 취소: 기존 예약 유지') ? 'cancel' : 'keep');
    const original = counselorAvailability.find(item => item.id === appointment.availabilityId);
    const proposed = counselorAvailability.find(item => item.id === appointment.rescheduleRequest?.availabilityId);
    const result = resolveRescheduleRequest(appointment, original, proposed, { approve, originalAction, actorUid: counselorUid });
    if (result.error) { notify(result.error); return; }
    const value = result.value;
    const student = students.find(item => item.id === appointment.studentId);
    const updatedStudent = approve && student ? { ...student, appointmentDate: value.appointment.date, appointment: value.appointment.time, updatedAt: value.appointment.updatedAt } : null;
    const entries = [{ name: 'appointments', record: value.appointment }, ...(value.originalAvailability ? [{ name: 'counselorAvailability', record: value.originalAvailability }] : []), ...(value.proposedAvailability ? [{ name: 'counselorAvailability', record: value.proposedAvailability }] : []), ...(updatedStudent ? [{ name: 'students', record: updatedStudent }] : [])];
    const notification = buildEventNotification({ eventId: `${appointment.rescheduleRequest.id}-${approve ? 'approved' : 'rejected'}`, recipientUid: appointment.studentUid, actorUid: counselorUid, type: 'appointment', title: approve ? '일정 변경 요청이 승인되었습니다' : '일정 변경 요청이 거절되었습니다', description: approve ? `${value.appointment.date} ${value.appointment.time}` : `기존 예약 ${originalAction === 'keep' ? '유지' : '취소'}`, to: '/student/appointments' });
    entries.push({ name: 'notifications', record: notification });
    try {
      await persistDocumentGroup(entries);
      setAppointments(items => items.map(item => item.id === appointment.id ? value.appointment : item));
      const slots = new Map([value.originalAvailability, value.proposedAvailability].filter(Boolean).map(item => [item.id, item]));
      setCounselorAvailability(items => items.map(item => slots.get(item.id) || item));
      if (updatedStudent) setStudents(items => items.map(item => item.id === updatedStudent.id ? updatedStudent : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      notify(approve ? '학생의 일정 변경 요청을 승인했습니다.' : `변경 요청을 거절하고 기존 예약을 ${originalAction === 'keep' ? '유지했습니다' : '취소했습니다'}.`);
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  const updateAvailabilityDateStatus = async (date, status) => {
    const targets = myAvailability.filter(item => item.date === date && (status === 'closed'
      ? item.status === 'open'
      : canBulkReopenAvailability(item)));
    if (!targets.length) return;
    const now = new Date().toISOString();
    const updates = targets.map(item => ({ ...item, status, updatedAt: now }));
    try {
      await persistDocumentGroup(updates.map(record => ({ name: 'counselorAvailability', record })));
      const updatesById = new Map(updates.map(item => [item.id, item]));
      setCounselorAvailability(items => items.map(item => updatesById.get(item.id) || item));
      notify(status === 'closed' ? `${date} 상담 신청을 모두 마감했습니다.` : `${date}의 닫힌 상담 시간을 다시 열었습니다.`);
    } catch { /* 공통 저장 오류 메시지를 사용합니다. */ }
  };

  return <>
    <PageIntro eyebrow="상담 운영" title="상담 일정 관리" description="학생이 신청할 수 있는 시간을 열고, 접수된 상담 내용을 확인해 일정을 확정하세요." action={<div className="page-action-group"><button className="button secondary" onClick={() => { setAvailabilityError(''); setAvailabilityForm(emptyAvailabilityForm()); setAvailabilityMonth(`${toDateKey().slice(0, 7)}-01`); setShowAvailabilityForm(true); }}><Icon name="calendar" size={18} />가능 시간 일괄 등록</button><button className="button primary" onClick={openCreate}><Icon name="plus" size={18} />직접 예약</button></div>} />
    <section className="card availability-management-card">
      <div className="section-header"><div><span className="eyebrow">상담 신청 설정</span><h2>학생에게 공개된 상담 가능 시간</h2><p>열린 시간만 담당 학생의 상담 신청 화면에 표시됩니다.</p></div><span className="availability-open-count">신청 가능 {myAvailability.filter(item => item.status === 'open').length}개</span></div>
      {myAvailability.length ? <div className="availability-date-groups">{Object.entries(availabilityByDate).map(([date, slots]) => {
        const openCount = slots.filter(item => item.status === 'open').length;
        const closedCount = slots.filter(item => item.status === 'closed').length;
        const expanded = expandedAvailabilityDates.includes(date);
        const contentId = `availability-date-${date}`;
        return <section key={date} className={`availability-date-group ${expanded ? 'expanded' : ''}`}>
          <button type="button" className="availability-date-toggle" aria-expanded={expanded} aria-controls={contentId} onClick={() => toggleAvailabilityDateDetails(date)}>
            <span><strong>{date}</strong><small>신청 가능 {openCount}개 · 예약/마감 {slots.length - openCount}개</small></span>
            <span className="availability-date-toggle-label">{expanded ? '시간 접기' : '시간 보기'}<Icon name="chevron" size={17} /></span>
          </button>
          {expanded && <div id={contentId} className="availability-date-content">
            <div className="availability-date-actions">{openCount > 0 ? <button className="text-button danger" onClick={() => updateAvailabilityDateStatus(date, 'closed')}>이 날짜 전체 마감</button> : closedCount > 0 && <button className="text-button" onClick={() => updateAvailabilityDateStatus(date, 'open')}>닫힌 시간 다시 열기</button>}</div>
            <div className="availability-slot-list">{slots.map(item => { const linkedAppointment = appointments.find(appointment => appointment.id === item.appointmentId); const linkedStudent = linkedAppointment ? students.find(student => student.id === linkedAppointment.studentId) : null; const cancelledSlot = item.closedReason === 'appointment-cancelled'; const cancellationLabel = getAppointmentCancellationLabel(linkedAppointment); return <article key={item.id} className={item.status}><time><strong>{item.time}–{getTimeRangeEnd(item)}</strong><span>{item.duration}분</span></time><div><strong>{item.location}</strong><span>{cancelledSlot ? `${linkedStudent?.name || '학생'} 예약 취소 · ${item.reopenDecision === 'pending' ? '재오픈 결정 필요' : '마감 유지'}` : item.status === 'booked' ? `${linkedStudent?.name || '학생'} 상담 신청 접수` : item.status === 'closed' ? '학생에게 표시되지 않음' : '학생 신청 가능'}</span></div><span className={`availability-status ${item.status}`}>{cancelledSlot ? cancellationLabel || '취소 시간' : item.status === 'open' ? '신청 가능' : item.status === 'booked' ? '신청 접수' : '마감'}</span>{cancelledSlot && item.reopenDecision === 'pending' ? <div className="appointment-actions"><button className="text-button" onClick={() => updateAvailabilityStatus(item, 'open')}>다시 열기</button><button className="text-button danger" onClick={() => keepCancelledAvailabilityClosed(item)}>마감 유지</button></div> : item.status !== 'booked' && <button className="text-button" onClick={() => updateAvailabilityStatus(item, item.status === 'open' ? 'closed' : 'open')}>{item.status === 'open' ? '마감' : '다시 열기'}</button>}</article>; })}</div>
          </div>}
        </section>;
      })}</div> : <EmptyState icon="calendar" title="등록한 상담 가능 시간이 없습니다" description="가능 시간 일괄 등록 버튼으로 학생이 신청할 날짜와 시간을 열어 주세요." />}
    </section>
    <section className="filter-card" aria-label="상담 일정 검색 및 필터"><label className="search-field"><span className="sr-only">일정 검색</span><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="학생, 학번, 상담 유형, 장소 검색" /></label><label><span>상태</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">전체</option><option value="pending">대기</option><option value="confirmed">확정</option><option value="completed">완료</option><option value="cancelled">취소</option></select></label><button className="text-button" onClick={() => { setQuery(''); setStatusFilter('all'); }}>필터 초기화</button></section>
    <section className="card appointment-list-card">
      <div className="list-toolbar"><div><h2>조회된 일정 <span>{ordered.length}</span></h2><p>날짜와 시간순으로 표시됩니다.</p></div></div>
      {ordered.length ? <div className="appointment-list">{ordered.map(item => { const student = students.find(candidate => candidate.id === item.studentId); const active = activeAppointmentStatuses.includes(item.status); const cancellationLabel = getAppointmentCancellationLabel(item); const studentChange = item.rescheduleRequest?.status === 'pending' && item.rescheduleRequest.initiatedByRole === 'student'; const linkedConsultation = consultations.find(record => record.appointmentId === item.id); return <article key={item.id} className={item.status}><time><strong>{item.date}</strong><span>{item.time}–{getTimeRangeEnd(item)}</span></time><div><Link to={`/students/${item.studentId}`}>{student?.name || '학생'}</Link><p>{item.type} · {item.location}</p>{item.requestedBy === 'student' ? <details className="appointment-request-details"><summary>학생 사전 상담 내용 보기</summary><dl><div><dt>상담 주제</dt><dd>{item.subject}</dd></div><div><dt>전달 내용</dt><dd>{item.requestMessage}</dd></div>{item.preferredOutcome && <div><dt>원하는 결과</dt><dd>{item.preferredOutcome}</dd></div>}</dl></details> : <small>{item.preparation ? `준비사항: ${item.preparation}` : '별도 준비사항 없음'}</small>}{item.rescheduleRequest?.status === 'pending' && <small>변경 요청 · {item.rescheduleRequest.date} {item.rescheduleRequest.time}</small>}</div><span className={`appointment-status ${item.status}`}>{item.status === 'cancelled' ? cancellationLabel : studentChange ? '변경 승인 대기' : appointmentStatusLabels[item.status] || item.status}</span><div className="appointment-actions">{linkedConsultation ? <Link className="button secondary small" to={`/students/${item.studentId}`}>작성된 기록 보기</Link> : ['confirmed', 'scheduled', 'completed'].includes(item.status) && <Link className="button primary small" to={`/students/${item.studentId}/consultation/new?appointment=${item.id}`}>상담 기록 작성</Link>}{studentChange ? <><button className="button primary small" onClick={() => decideStudentReschedule(item, true)}>변경 승인</button><button className="button secondary small" onClick={() => decideStudentReschedule(item, false)}>거절</button></> : active && <>{canRescheduleAppointment(item) && <button className="button secondary small" onClick={() => { setProposalFor(item); setProposalSlotId(''); }}>변경 제안</button>}{item.status === 'pending' && <button className="button primary small" onClick={() => updateStatus(item, 'confirmed')}>확정</button>}<button className="text-button danger" onClick={() => updateStatus(item, 'cancelled')}>취소</button></>}</div></article>; })}</div> : <EmptyState icon="calendar" title="등록된 상담 일정이 없습니다" description="상담 예약 버튼으로 첫 일정을 등록해 주세요." />}
    </section>
    {proposalFor && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setProposalFor(null)}><section className="modal" role="dialog" aria-modal="true"><button className="modal-close" aria-label="닫기" onClick={() => setProposalFor(null)}><Icon name="close" size={19} /></button><span className="eyebrow">일정 변경 제안</span><h2>학생에게 새 시간을 제안합니다</h2><p>학생이 응답할 때까지 기존 시간과 새 시간이 모두 마감됩니다.</p><form onSubmit={submitRescheduleProposal}><label>새 상담 시간<select value={proposalSlotId} onChange={event => setProposalSlotId(event.target.value)} required><option value="">시간을 선택하세요</option>{myAvailability.filter(item => item.status === 'open').map(item => <option key={item.id} value={item.id}>{item.date} {item.time}–{getTimeRangeEnd(item)} · {item.location}</option>)}</select></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setProposalFor(null)}>취소</button><button className="button primary">변경 제안 보내기</button></div></form></section></div>}
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !saving && setShowForm(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title"><button className="modal-close" aria-label="닫기" disabled={saving} onClick={() => setShowForm(false)}><Icon name="close" size={19} /></button><span className="eyebrow">상담 일정</span><h2 id="appointment-form-title">{editingId ? '예약 변경' : '새 상담 예약'}</h2><form onSubmit={save}><label>학생<select autoFocus value={form.studentId} onChange={event => setForm(current => ({ ...current, studentId: event.target.value }))} required disabled={Boolean(editingId)}><option value="">학생을 선택하세요</option>{students.map(item => <option key={item.id} value={item.id}>{item.name} · {item.department}</option>)}</select></label><label>날짜<input type="date" value={form.date} min={toDateKey()} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} required /></label><div className="form-row"><label>상담 시작 시간<input type="time" value={form.time} onChange={event => setForm(current => ({ ...current, time: event.target.value }))} required /></label><label>종료 예정 시간<input type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} required /></label></div><label>상담 유형<select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>{['진로 상담','취업 상담','자기소개서 상담','면접 상담','기타 상담'].map(type => <option key={type}>{type}</option>)}</select></label><label>장소<input value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} required /></label><label>학생 준비사항<textarea rows="3" value={form.preparation} onChange={event => setForm(current => ({ ...current, preparation: event.target.value }))} /></label>{error && <p className="field-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={() => setShowForm(false)}>닫기</button><button className="button primary" disabled={saving}>{saving ? '저장 중...' : '일정 저장'}</button></div></form></section></div>}
    {showAvailabilityForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !availabilitySaving && setShowAvailabilityForm(false)}>
      <section className="modal availability-form-modal bulk-availability-modal" role="dialog" aria-modal="true" aria-labelledby="availability-form-title">
        <button className="modal-close" aria-label="닫기" disabled={availabilitySaving} onClick={() => setShowAvailabilityForm(false)}><Icon name="close" size={19} /></button>
        <span className="eyebrow">상담 신청 설정</span><h2 id="availability-form-title">1시간 상담 가능 시간 일괄 등록</h2>
        <p className="availability-form-description">가능한 날짜를 여러 개 선택하고 운영 시간 범위를 지정하면 1시간 단위로 자동 생성됩니다.</p>
        <form onSubmit={saveAvailability}>
          <div className="bulk-availability-layout">
            <section className="availability-calendar-panel">
              <div className="calendar-toolbar"><button type="button" aria-label="이전 달" onClick={() => setAvailabilityMonth(month => shiftMonth(month, -1))}><Icon name="chevron" size={17} /></button><strong>{formatMonthTitle(availabilityMonth)}</strong><button type="button" aria-label="다음 달" onClick={() => setAvailabilityMonth(month => shiftMonth(month, 1))}><Icon name="chevron" size={17} /></button></div>
              <div className="calendar-weekdays" aria-hidden="true">{['일','월','화','수','목','금','토'].map(day => <span key={day}>{day}</span>)}</div>
              <div className="availability-calendar-grid">{availabilityCalendarDays.map(day => { const selected = availabilityForm.dates.includes(day.date); const disabled = day.isPast || !day.inMonth; return <button type="button" key={day.date} className={`${selected ? 'selected' : ''} ${!day.inMonth ? 'outside' : ''}`} disabled={disabled} aria-pressed={selected} onClick={() => toggleAvailabilityDate(day.date)}><span>{day.day}</span>{myAvailability.some(item => item.date === day.date) && <i aria-label="기존 일정 있음" />}</button>; })}</div>
              <p>날짜를 여러 개 선택할 수 있습니다. 점이 있는 날짜에는 기존 시간이 있습니다.</p>
            </section>
            <section className="bulk-availability-settings">
              <div className="selected-date-summary"><span>선택한 날짜</span><strong>{availabilityForm.dates.length}일</strong><p>{availabilityForm.dates.length ? availabilityForm.dates.join(', ') : '달력에서 날짜를 선택해 주세요.'}</p></div>
              <div className="form-row"><label>시작 시간<input type="time" step="3600" value={availabilityForm.startTime} onChange={event => setAvailabilityForm(current => ({ ...current, startTime: event.target.value }))} required /></label><label>종료 시간<input type="time" step="3600" value={availabilityForm.endTime} onChange={event => setAvailabilityForm(current => ({ ...current, endTime: event.target.value }))} required /></label></div>
              <section className="availability-exclusions">
                <div className="availability-exclusions-heading"><div><strong>제외 시간</strong><span>점심시간처럼 상담을 받지 않는 시간을 제외할 수 있어요.</span></div><button type="button" className="text-button" onClick={addAvailabilityExclusion}><Icon name="plus" size={15} />제외 시간 추가</button></div>
                {availabilityForm.exclusions.length ? <div className="availability-exclusion-list">{availabilityForm.exclusions.map((exclusion, index) => <div className="availability-exclusion-row" key={index}><label><span>시작</span><input type="time" value={exclusion.startTime} onChange={event => updateAvailabilityExclusion(index, 'startTime', event.target.value)} required /></label><span aria-hidden="true">–</span><label><span>종료</span><input type="time" value={exclusion.endTime} onChange={event => updateAvailabilityExclusion(index, 'endTime', event.target.value)} required /></label><button type="button" className="text-button danger" aria-label={`${exclusion.startTime}부터 ${exclusion.endTime} 제외 시간 삭제`} onClick={() => removeAvailabilityExclusion(index)}>삭제</button></div>)}</div> : <p>제외 시간이 없으면 선택한 운영 시간 전체가 등록됩니다.</p>}
              </section>
              <label>상담 장소<input value={availabilityForm.location} onChange={event => setAvailabilityForm(current => ({ ...current, location: event.target.value }))} placeholder="상담실 또는 온라인 상담 주소" required /></label>
              <div className="availability-preview"><span>등록 예정</span><strong>{availabilityPreview.slots.length}개 시간</strong><small>각 60분{availabilityPreview.excluded ? ` · 설정한 제외 시간 ${availabilityPreview.excluded}개 제외` : ''}{availabilityPreview.skipped - (availabilityPreview.excluded || 0) > 0 ? ` · 기존 일정/마감 ${availabilityPreview.skipped - (availabilityPreview.excluded || 0)}개 제외` : ''}</small></div>
            </section>
          </div>
          {availabilityError && <p className="field-error" role="alert">{availabilityError}</p>}
          <div className="modal-actions"><button type="button" className="button secondary" disabled={availabilitySaving} onClick={() => setShowAvailabilityForm(false)}>취소</button><button className="button primary" disabled={availabilitySaving || !availabilityPreview.slots.length}>{availabilitySaving ? '등록 중...' : `${availabilityPreview.slots.length}개 시간 등록`}</button></div>
        </form>
      </section>
    </div>}
  </>;
}
