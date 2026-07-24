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
  const attachments = upcomingAppointment?.attachments || [];
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
    <section className="profile-hero preparation-hero" aria-labelledby="preparation-student-name">
      <div className="preparation-student-summary">
        <div className="profile-main">
          <div><div className="profile-name"><h1 id="preparation-student-name">{student.name}</h1><StatusBadge status={student.status} /></div><p>{maskStudentNo(student.studentNo)} · {student.department} · {student.grade}</p></div>
        </div>
        <div className="preparation-goal">
          <span><Icon name="target" size={15} />현재 진로 목표</span>
          <strong>{student.goal}</strong>
        </div>
      </div>

      <section className="preparation-appointment-summary" aria-labelledby="preparation-next-appointment-title">
        <div className="preparation-appointment-heading">
          <span aria-hidden="true"><Icon name="calendar" size={19} /></span>
          <div>
            <h2 id="preparation-next-appointment-title">다음 상담 일정</h2>
            <strong>{upcomingAppointment ? <time dateTime={`${upcomingAppointment.date}T${upcomingAppointment.time}`}>{formatPreparationDate(upcomingAppointment.date)} · {upcomingAppointment.time}</time> : '예정된 상담이 없습니다'}</strong>
          </div>
        </div>
        {upcomingAppointment ? <>
          <dl className="preparation-appointment-details">
            <div><dt>상담 유형</dt><dd>{upcomingAppointment.type}</dd></div>
            <div><dt>장소</dt><dd>{upcomingAppointment.location}</dd></div>
            <div><dt>준비 사항</dt><dd>{upcomingAppointment.preparation || '별도 준비 사항 없음'}</dd></div>
          </dl>
          {attachments.length > 0 && <div className="preparation-attachments"><strong>학생 첨부 자료</strong><div>{attachments.map(file => <button type="button" className="text-button" key={file.id} onClick={() => openAttachment(file)}><Icon name="note" size={14} />{file.fileName}</button>)}</div></div>}
        </> : <p className="preparation-appointment-empty">상담 일정에서 다음 예약을 확인하거나 새 일정을 등록해 주세요.</p>}
      </section>

      <div className="preparation-hero-operations">
        <dl className="preparation-hero-stats" aria-label="학생 상담 현황">
          <div><dt>누적 상담</dt><dd>{history.length}<small>회</small></dd></div>
          <div><dt>남은 할 일</dt><dd>{tasks.length}<small>건</small></dd></div>
          <div className={overdueTaskCount > 0 ? 'attention' : ''}><dt>기한 초과</dt><dd>{overdueTaskCount}<small>건</small></dd></div>
        </dl>
        <div className="preparation-hero-actions" aria-label="상담 준비 작업">
          <Link className="button primary" to={`/students/${student.id}/consultation/new${upcomingAppointment ? `?appointment=${upcomingAppointment.id}` : ''}`}><Icon name="note" size={17} />상담 기록 작성</Link>
          <Link className="button secondary" to="/consultation-prep"><Icon name="students" size={17} />학생 변경</Link>
        </div>
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

      <div className="preparation-support-grid">
        <section className="card preparation-support-card" id="preparation-followups">
          <div className="preparation-support-heading">
            <span aria-hidden="true"><Icon name="check" size={19} /></span>
            <div><h2>이전 상담 후 할 일</h2><p>이번 상담 전에 완료 여부를 확인하세요.</p></div>
            <strong>{tasks.length}건</strong>
          </div>
          {tasks.length ? <div className="preparation-task-list">{tasks.slice(0, 4).map(task => <article className={task.status === 'overdue' ? 'overdue' : ''} key={task.id}><div><StatusBadge status={task.status} context="followUp" /><span>{task.owner === '교직원' ? '상담사' : task.owner} 담당</span></div><strong>{task.content}</strong><small><time dateTime={task.dueDate}>{formatPreparationDate(task.dueDate)}</time>까지</small></article>)}</div> : <p>이전 상담에서 남은 할 일이 없습니다.</p>}
          {tasks.length > 4 && <Link className="text-link" to="/follow-ups">나머지 {tasks.length - 4}건 보기 <Icon name="chevron" size={14} /></Link>}
        </section>

        <section className="card preparation-support-card">
          <div className="preparation-support-heading">
            <span aria-hidden="true"><Icon name="list" size={19} /></span>
            <div><h2>날짜별 상담 기록</h2><p>날짜를 선택하면 상세 상담일지로 이동합니다.</p></div>
            <strong>{history.length}회</strong>
          </div>
          {history.length ? <div className="preparation-history-list">{history.slice(0, 4).map(record => <Link to={`/students/${student.id}?consultation=${record.id}`} aria-label={`${formatPreparationDate(record.date)} ${record.purpose} 상세 상담일지 보기`} key={record.id}>
            <time dateTime={record.date}><strong>{formatPreparationDate(record.date)}</strong><span>{record.type}</span></time>
            <div><strong>{record.purpose}</strong><span>{record.summary || '상세 상담일지에서 기록을 확인하세요.'}</span></div>
            <Icon name="chevron" size={16} />
          </Link>)}</div> : <p>아직 작성된 상담 기록이 없습니다.</p>}
          <Link className="preparation-all-records-link" to={`/students/${student.id}`}>전체 상담 기록 보기 <Icon name="arrow" size={15} /></Link>
        </section>
      </div>
    </div>
  </>;
}
