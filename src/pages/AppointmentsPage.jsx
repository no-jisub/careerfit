import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { toDateKey } from '../utils/date';

const emptyForm = () => ({ studentId: '', date: toDateKey(), time: '10:00', type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '' });

export default function AppointmentsPage() {
  const { students, appointments, setAppointments, setStudents, persistDocument, persistDocumentGroup, notify } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('scheduled');
  const ordered = useMemo(() => appointments
    .filter(item => statusFilter === 'all' || item.status === statusFilter)
    .filter(item => {
      const student = students.find(candidate => candidate.id === item.studentId);
      const keyword = query.trim().toLowerCase();
      return !keyword || [student?.name, student?.studentNo, item.type, item.location].some(value => value?.toLowerCase().includes(keyword));
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
    setForm({ studentId: appointment.studentId, date: appointment.date, time: appointment.time, type: appointment.type, location: appointment.location, preparation: appointment.preparation || '' });
    setError('');
    setShowForm(true);
  };

  const save = async event => {
    event.preventDefault();
    if (saving) return;
    const student = students.find(item => item.id === form.studentId);
    if (!student) return;
    if (`${form.date}T${form.time}` < `${toDateKey()}T${new Date().toTimeString().slice(0, 5)}`) {
      setError('과거 시간으로는 상담을 예약할 수 없습니다.');
      return;
    }
    const conflict = appointments.some(item => {
      if (item.id === editingId || item.status !== 'scheduled' || item.date !== form.date || item.time !== form.time) return false;
      const existingStudent = students.find(candidate => candidate.id === item.studentId);
      return (item.counselorUid || existingStudent?.counselorUid || '데모-상담사') === (student.counselorUid || '데모-상담사');
    });
    if (conflict) {
      setError('같은 시간에 이미 등록된 상담 일정이 있습니다.');
      return;
    }
    const now = new Date().toISOString();
    const previous = appointments.find(item => item.id === editingId);
    const appointment = {
      ...previous,
      id: editingId || `appointment-${Date.now()}`,
      ...form,
      location: form.location.trim(),
      preparation: form.preparation.trim(),
      counselorUid: student.counselorUid,
      studentUid: student.uid || '',
      status: 'scheduled',
      updatedAt: now,
      ...(!editingId ? { createdAt: now } : {}),
    };
    const updatedStudent = { ...student, appointmentDate: form.date, appointment: form.time, status: 'scheduled', updatedAt: now };
    setSaving(true);
    try {
      await persistDocumentGroup([{ name: 'appointments', record: appointment }, { name: 'students', record: updatedStudent }]);
      setAppointments(items => editingId ? items.map(item => item.id === editingId ? appointment : item) : [...items, appointment]);
      setStudents(items => items.map(item => item.id === student.id ? updatedStudent : item));
      setShowForm(false);
      notify(editingId ? '상담 일정을 변경했습니다.' : '상담 일정을 등록했습니다.');
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
    finally { setSaving(false); }
  };

  const cancel = async appointment => {
    const updated = { ...appointment, status: 'cancelled', updatedAt: new Date().toISOString() };
    const student = students.find(item => item.id === appointment.studentId);
    const updatedStudent = student && student.appointmentDate === appointment.date && student.appointment === appointment.time
      ? { ...student, appointmentDate: '', appointment: '', status: 'complete', updatedAt: updated.updatedAt }
      : null;
    try {
      await persistDocumentGroup([{ name: 'appointments', record: updated }, ...(updatedStudent ? [{ name: 'students', record: updatedStudent }] : [])]);
      setAppointments(items => items.map(item => item.id === appointment.id ? updated : item));
      if (updatedStudent) setStudents(items => items.map(item => item.id === updatedStudent.id ? updatedStudent : item));
      notify('상담 일정을 취소했습니다.');
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
  };

  return <>
    <PageIntro eyebrow="상담 운영" title="상담 일정 관리" description="담당 학생의 상담을 예약하고 변경 또는 취소할 수 있습니다." action={<button className="button primary" onClick={openCreate}><Icon name="plus" size={18} />상담 예약</button>} />
    <section className="filter-card" aria-label="상담 일정 검색 및 필터"><label className="search-field"><span className="sr-only">일정 검색</span><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="학생, 학번, 상담 유형, 장소 검색" /></label><label><span>상태</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">전체</option><option value="scheduled">예약</option><option value="completed">완료</option><option value="cancelled">취소</option></select></label><button className="text-button" onClick={() => { setQuery(''); setStatusFilter('scheduled'); }}>필터 초기화</button></section>
    <section className="card appointment-list-card">
      <div className="list-toolbar"><div><h2>조회된 일정 <span>{ordered.length}</span></h2><p>날짜와 시간순으로 표시됩니다.</p></div></div>
      {ordered.length ? <div className="appointment-list">{ordered.map(item => { const student = students.find(candidate => candidate.id === item.studentId); return <article key={item.id} className={item.status}><time><strong>{item.date}</strong><span>{item.time}</span></time><div><Link to={`/students/${item.studentId}`}>{student?.name || '학생'}</Link><p>{item.type} · {item.location}</p><small>{item.preparation ? `준비사항: ${item.preparation}` : '별도 준비사항 없음'}</small></div><span className={`appointment-status ${item.status}`}>{item.status === 'scheduled' ? '예약' : item.status === 'completed' ? '완료' : '취소'}</span><div className="appointment-actions">{item.status === 'scheduled' && <><button className="button secondary small" onClick={() => openEdit(item)}>변경</button><button className="text-button danger" onClick={() => cancel(item)}>취소</button></>}</div></article>; })}</div> : <EmptyState icon="calendar" title="등록된 상담 일정이 없습니다" description="상담 예약 버튼으로 첫 일정을 등록해 주세요." />}
    </section>
    {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !saving && setShowForm(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title"><button className="modal-close" aria-label="닫기" disabled={saving} onClick={() => setShowForm(false)}><Icon name="close" size={19} /></button><span className="eyebrow">상담 일정</span><h2 id="appointment-form-title">{editingId ? '예약 변경' : '새 상담 예약'}</h2><form onSubmit={save}><label>학생<select autoFocus value={form.studentId} onChange={event => setForm(current => ({ ...current, studentId: event.target.value }))} required disabled={Boolean(editingId)}><option value="">학생을 선택하세요</option>{students.map(item => <option key={item.id} value={item.id}>{item.name} · {item.department}</option>)}</select></label><div className="form-row"><label>날짜<input type="date" value={form.date} min={toDateKey()} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} required /></label><label>시간<input type="time" value={form.time} onChange={event => setForm(current => ({ ...current, time: event.target.value }))} required /></label></div><label>상담 유형<select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>{['진로 상담','취업 상담','자기소개서 상담','면접 상담','기타 상담'].map(type => <option key={type}>{type}</option>)}</select></label><label>장소<input value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} required /></label><label>학생 준비사항<textarea rows="3" value={form.preparation} onChange={event => setForm(current => ({ ...current, preparation: event.target.value }))} /></label>{error && <p className="field-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={() => setShowForm(false)}>닫기</button><button className="button primary" disabled={saving}>{saving ? '저장 중...' : '일정 저장'}</button></div></form></section></div>}
  </>;
}
