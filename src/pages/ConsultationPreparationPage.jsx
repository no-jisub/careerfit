import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { openAttachment } from '../services/attachmentService';
import { maskStudentNo } from '../utils/sensitiveData';
import { toDateKey } from '../utils/date';

const activeAppointmentStatuses = ['pending', 'confirmed', 'scheduled'];
const preparationDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

function formatPreparationDate(value) {
  if (!value) return '기록 없음';
  return preparationDateFormatter.format(new Date(`${value}T00:00:00`));
}

export default function ConsultationPreparationPage() {
  const { studentId } = useParams();
  const { students, consultations, followUps, appointments } = useApp();
  const student = students.find(item => item.id === studentId);

  if (!student) {
    return <section className="card"><EmptyState title="담당 학생을 찾을 수 없습니다" description="배정이 해제되었거나 현재 계정에서 조회할 수 없는 학생입니다." action={<Link className="button secondary" to="/consultation-prep">다른 학생 선택</Link>} /></section>;
  }

  const history = consultations
    .filter(item => item.studentId === student.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const tasks = followUps
    .filter(item => item.studentId === student.id && item.status !== 'complete')
    .sort((a, b) => (a.status === 'overdue' ? -1 : b.status === 'overdue' ? 1 : a.dueDate.localeCompare(b.dueDate)));
  const upcomingAppointment = appointments
    .filter(item => item.studentId === student.id && activeAppointmentStatuses.includes(item.status) && item.date >= toDateKey())
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const relevantAppointment = upcomingAppointment || appointments
    .filter(item => item.studentId === student.id && item.status !== 'cancelled')
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0];
  const attachments = (relevantAppointment?.attachments || []);
  const briefingHistory = history.slice(0, 3).reverse();
  const latestConsultation = history[0];
  const overdueTaskCount = tasks.filter(task => task.status === 'overdue').length;
  const briefingSummary = latestConsultation
    ? `${student.name} 학생의 진로 목표는 ${student.goal}입니다. ${briefingHistory.length > 1
      ? `최근 ${briefingHistory.length}회의 상담에서 ${briefingHistory.map(item => item.purpose).join(' → ')} 순으로 준비를 구체화했습니다.`
      : `최근 상담에서는 ${latestConsultation.summary}`}`
    : `${student.name} 학생의 진로 목표는 ${student.goal}입니다. 현재 ${student.concern}에 대한 첫 상담이 필요합니다.`;
  const briefingCaution = latestConsultation?.concern || student.concern;
  const briefingNextStep = latestConsultation?.nextCheckItems || '첫 상담에서 현재 상황과 기대하는 지원을 확인해 주세요.';

  return <>
    <nav className="breadcrumb" aria-label="현재 위치"><Link to="/consultation-prep">상담 전 준비</Link><Icon name="chevron" size={14} /><span>{student.name}</span></nav>
    <section className="profile-hero preparation-hero" aria-labelledby="preparation-student-name">
      <div className="profile-main">
        <span className="profile-avatar-large" aria-hidden="true">{student.initials || student.name.slice(1, 3)}</span>
        <div><span className="eyebrow">상담 대상 학생</span><div className="profile-name"><h1 id="preparation-student-name">{student.name}</h1><StatusBadge status={student.status} /></div><p>{maskStudentNo(student.studentNo)} · {student.department} · {student.grade}</p></div>
      </div>
      <div className="preparation-hero-overview">
        <span className="preparation-overview-label"><Icon name="target" size={14} />현재 진로 목표</span>
        <strong>{student.goal}</strong>
        <dl className="preparation-hero-stats" aria-label="학생 상담 현황">
          <div><dt>누적 상담</dt><dd>{history.length}<small>회</small></dd></div>
          <div><dt>남은 할 일</dt><dd>{tasks.length}<small>건</small></dd></div>
          <div className={overdueTaskCount > 0 ? 'attention' : ''}><dt>기한 초과</dt><dd>{overdueTaskCount}<small>건</small></dd></div>
        </dl>
      </div>
      <div className="preparation-hero-actions" aria-label="상담 준비 작업">
        <Link className="button primary" to={`/students/${student.id}/consultation/new${upcomingAppointment ? `?appointment=${upcomingAppointment.id}` : ''}`}><Icon name="note" size={17} />상담 기록 작성</Link>
        <Link className="button secondary" to="/consultation-prep"><Icon name="students" size={17} />학생 변경</Link>
      </div>
    </section>

    <div className="preparation-workspace">
      <section className="card prep-card">
        <div className="section-header"><div><span className="eyebrow">30초 상담 브리핑</span><h2>이번 상담 전에 확인할 3가지</h2><p>{student.name} 학생의 이전 상담 맥락과 이어갈 질문을 빠르게 확인하세요.</p></div><span className="updated-label"><Icon name="clock" size={14} />{latestConsultation ? `최근 상담 ${formatPreparationDate(latestConsultation.date)}` : '이전 상담 기록 없음'}</span></div>
        <div className="student-briefing">
          <article className="briefing-overview">
            <div className="briefing-title"><span className="prep-icon blue"><Icon name="list" /></span><div><small>1 · 지금까지의 상담 흐름</small><strong>{student.name} 학생의 현재 맥락</strong></div></div>
            <p>{briefingSummary}</p>
            {briefingHistory.length > 0 && <ol className="briefing-journey" aria-label="최근 상담 흐름">{briefingHistory.map(item => <li key={item.id}><time dateTime={item.date}>{item.date.slice(5).replace('-', '.')}</time><span>{item.purpose}</span></li>)}</ol>}
            <small className="briefing-source"><Icon name="shield" size={13} />{latestConsultation ? '최근 상담 기록의 목적·고민·확인 항목을 바탕으로 정리했습니다.' : '이전 상담 기록이 없어 학생 기본 정보의 진로 목표·현재 고민을 바탕으로 정리했습니다.'}</small>
          </article>
          <div className="briefing-focus-list">
            <article className="briefing-focus caution"><span className="prep-icon blue"><Icon name="alert" /></span><div><small>2 · 주의해서 볼 점</small><strong>{briefingCaution}</strong></div></article>
            <article className="briefing-focus next"><span className="prep-icon blue"><Icon name="target" /></span><div><small>3 · 이번 상담에서 확인할 질문</small><strong>{briefingNextStep}</strong></div></article>
            {overdueTaskCount > 0 && <Link className="briefing-task-alert" to="/follow-ups"><Icon name="alert" size={14} /><span><strong>기한이 지난 할 일 {overdueTaskCount}건</strong>을 상담 전에 확인하세요.</span><Icon name="chevron" size={14} /></Link>}
          </div>
        </div>
      </section>

      <aside className="preparation-checklist" aria-label="상담 전 확인 사항">
        <section className="card preparation-check-card">
          <div className="preparation-check-heading"><span><Icon name="calendar" size={18} /></span><div><small>다음 상담 일정</small><h2>{upcomingAppointment ? <time dateTime={`${upcomingAppointment.date}T${upcomingAppointment.time}`}>{formatPreparationDate(upcomingAppointment.date)} · {upcomingAppointment.time}</time> : '예정된 상담 없음'}</h2></div></div>
          {upcomingAppointment ? <dl><div><dt>상담 유형</dt><dd>{upcomingAppointment.type}</dd></div><div><dt>장소</dt><dd>{upcomingAppointment.location}</dd></div><div><dt>준비 사항</dt><dd>{upcomingAppointment.preparation || '별도 준비 사항 없음'}</dd></div></dl> : <p>상담 일정에서 새 예약을 확인하거나 등록해 주세요.</p>}
          {attachments.length > 0 && <div className="preparation-attachments"><strong>학생 첨부 자료</strong>{attachments.map(file => <button type="button" className="text-button" key={file.id} onClick={() => openAttachment(file)}><Icon name="note" size={14} />{file.fileName}</button>)}</div>}
        </section>

        <section className="card preparation-check-card">
          <div className="preparation-check-heading"><span><Icon name="check" size={18} /></span><div><small>이전 상담 후 할 일</small><h2>확인할 항목 {tasks.length}건</h2></div></div>
          {tasks.length ? <div className="preparation-task-list">{tasks.slice(0, 4).map(task => <article className={task.status === 'overdue' ? 'overdue' : ''} key={task.id}><div><StatusBadge status={task.status} context="followUp" /><span>{task.owner === '교직원' ? '상담사' : task.owner} 담당</span></div><strong>{task.content}</strong><small><time dateTime={task.dueDate}>{formatPreparationDate(task.dueDate)}</time>까지</small></article>)}</div> : <p>이전 상담에서 남은 할 일이 없습니다.</p>}
          {tasks.length > 4 && <Link className="text-link" to="/follow-ups">나머지 {tasks.length - 4}건 보기 <Icon name="chevron" size={14} /></Link>}
        </section>

        <Link className="preparation-record-link" to={`/students/${student.id}`}>
          <span><Icon name="list" size={18} /></span>
          <div><strong>날짜별 상담 기록 보기</strong><small>총 {history.length}회의 상세 상담일지</small></div>
          <Icon name="chevron" size={17} />
        </Link>
      </aside>
    </div>
  </>;
}
