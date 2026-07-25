import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { PageIntro, StatusBadge } from '../components/UI';
import { toDateKey } from '../utils/date';

const workflowSteps = [
  {
    id: 'schedule',
    number: '01',
    title: '상담 일정',
    description: '신청을 확인하고 일정을 확정해요.',
    icon: 'calendar',
    to: '/appointments',
  },
  {
    id: 'preparation',
    number: '02',
    title: '상담 전 준비',
    description: '학생 맥락과 확인 질문을 준비해요.',
    icon: 'list',
    to: '/consultation-prep',
  },
  {
    id: 'writing',
    number: '03',
    title: '상담 기록 작성',
    description: '상담 내용을 기록하고 공개 범위를 검토해요.',
    icon: 'note',
    to: '/consultation-write',
  },
  {
    id: 'followUp',
    number: '04',
    title: '상담 후 할 일',
    description: '학생과 상담사의 다음 행동을 이어가요.',
    icon: 'check',
    to: '/follow-ups',
  },
];

function StudentActionRow({ student, meta, status, statusContext = 'consultation', to, action }) {
  return <Link className="consultation-action-row" to={to}>
    <span className="consultation-action-avatar" aria-hidden="true">{student?.initials || student?.name?.slice(-2) || '학생'}</span>
    <span className="consultation-action-copy">
      <strong>{student?.name || '학생 정보 없음'}</strong>
      <small>{student ? `${student.department} · ${student.grade}` : '배정 정보를 확인해 주세요'}</small>
      <span>{meta}</span>
    </span>
    <span className="consultation-action-side">
      <StatusBadge status={status} context={statusContext} />
      <b>{action}<Icon name="chevron" size={14} /></b>
    </span>
  </Link>;
}

export default function ConsultationsPage() {
  const { students, consultations, followUps, appointments } = useApp();
  const today = toDateKey();
  const studentById = id => students.find(student => student.id === id);
  const activeAppointments = appointments
    .filter(item => item.date >= today && ['pending', 'confirmed', 'scheduled'].includes(item.status))
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
  const preparationAppointments = activeAppointments.filter(item => ['confirmed', 'scheduled'].includes(item.status));
  const writingStudents = students.filter(student => ['inProgress', 'writing'].includes(student.status));
  const pendingFollowUps = followUps.filter(item => item.status !== 'complete');
  const pendingStudentIds = [...new Set(pendingFollowUps.map(item => item.studentId))];
  const overdueCount = pendingFollowUps.filter(item => item.status === 'overdue').length;
  const counts = {
    schedule: activeAppointments.length,
    preparation: preparationAppointments.length,
    writing: writingStudents.length,
    followUp: pendingFollowUps.length,
  };
  const attentionCount = appointments.filter(item => item.status === 'pending').length + writingStudents.length + overdueCount;

  return <>
    <PageIntro
      icon="calendar"
      title="상담은 네 단계로 이어집니다"
      action={<Link className="button secondary" to="/students">전체 학생 보기<Icon name="chevron" size={16} /></Link>}
    />

    <section className="card consultation-workflow-overview" aria-labelledby="consultation-workflow-title">
      <header className="consultation-workflow-heading">
        <div>
          <h2 id="consultation-workflow-title">상담 업무 흐름</h2>
          <p>각 단계의 학생 수를 확인하고 바로 이어서 처리할 수 있습니다.</p>
        </div>
        <span className={attentionCount ? 'needs-attention' : ''}>
          <Icon name={attentionCount ? 'alert' : 'check'} size={16} />
          {attentionCount ? `우선 확인 ${attentionCount}건` : '지연된 업무 없음'}
        </span>
      </header>
      <ol className="consultation-workflow-steps">
        {workflowSteps.map(step => <li key={step.id}>
          <Link to={step.to} aria-label={`${step.title} ${counts[step.id]}건 확인`}>
            <span className="workflow-step-top"><b>{step.number}</b><Icon name="arrow" size={16} /></span>
            <span className="workflow-step-icon"><Icon name={step.icon} size={21} /></span>
            <strong>{step.title}</strong>
            <p>{step.description}</p>
            <span className="workflow-step-count"><em>{counts[step.id]}</em>건 확인</span>
          </Link>
        </li>)}
      </ol>
    </section>

    <section className="consultation-action-section" aria-labelledby="consultation-action-title">
      <header>
        <div>
          <h2 id="consultation-action-title">지금 이어서 처리할 학생</h2>
          <p>학생이 현재 머물러 있는 단계와 다음 버튼만 모았습니다.</p>
        </div>
        <Link to="/students">학생별 전체 맥락 보기<Icon name="chevron" size={15} /></Link>
      </header>
      <div className="consultation-action-lanes">
        <section className="card consultation-action-lane preparation">
          <header>
            <span className="consultation-lane-icon"><Icon name="list" size={20} /></span>
            <div><small className="consultation-lane-step">2단계</small><h3>상담 전 준비</h3><p>확정된 일정의 학생</p></div>
            <b className="consultation-lane-count"><strong>{preparationAppointments.length}</strong><small>명</small></b>
          </header>
          <div>
            {preparationAppointments.slice(0, 3).map(appointment => <StudentActionRow
              key={appointment.id}
              student={studentById(appointment.studentId)}
              meta={`${appointment.date.slice(5).replace('-', '.')} ${appointment.time} · ${appointment.type}`}
              status="scheduled"
              to={`/students/${appointment.studentId}/preparation`}
              action="브리핑"
            />)}
            {!preparationAppointments.length && <p className="consultation-lane-empty">준비할 상담이 없습니다.</p>}
          </div>
          <Link className="consultation-lane-link" to="/consultation-prep">준비할 학생 전체 보기<Icon name="arrow" size={15} /></Link>
        </section>

        <section className="card consultation-action-lane writing">
          <header>
            <span className="consultation-lane-icon"><Icon name="note" size={20} /></span>
            <div><small className="consultation-lane-step">3단계</small><h3>상담 기록 작성</h3><p>진행 중이거나 기록이 필요한 학생</p></div>
            <b className="consultation-lane-count"><strong>{writingStudents.length}</strong><small>명</small></b>
          </header>
          <div>
            {writingStudents.slice(0, 3).map(student => <StudentActionRow
              key={student.id}
              student={student}
              meta={student.status === 'inProgress' ? '상담 진행 중 · 핵심 메모 작성' : '상담 완료 · 기록 마무리 필요'}
              status={student.status}
              to={`/students/${student.id}/consultation/new`}
              action="기록"
            />)}
            {!writingStudents.length && <p className="consultation-lane-empty">작성할 상담 기록이 없습니다.</p>}
          </div>
          <Link className="consultation-lane-link" to="/consultation-write">기록할 학생 전체 보기<Icon name="arrow" size={15} /></Link>
        </section>

        <section className="card consultation-action-lane follow-up">
          <header>
            <span className="consultation-lane-icon"><Icon name="check" size={20} /></span>
            <div><small className="consultation-lane-step">4단계</small><h3>상담 후 할 일</h3><p>미완료 행동이 있는 학생</p></div>
            <b className="consultation-lane-count"><strong>{pendingFollowUps.length}</strong><small>건</small></b>
          </header>
          <div>
            {pendingStudentIds.slice(0, 3).map(studentId => {
              const tasks = pendingFollowUps.filter(item => item.studentId === studentId);
              const urgent = tasks.filter(item => item.status === 'overdue').length;
              return <StudentActionRow
                key={studentId}
                student={studentById(studentId)}
                meta={`${tasks[0]?.content || '다음 행동 확인'}${tasks.length > 1 ? ` 외 ${tasks.length - 1}건` : ''}`}
                status={urgent ? 'overdue' : 'inProgress'}
                statusContext="followUp"
                to={`/follow-ups?student=${studentId}`}
                action={urgent ? `기한 초과 ${urgent}` : '할 일'}
              />;
            })}
            {!pendingStudentIds.length && <p className="consultation-lane-empty">남은 후속 할 일이 없습니다.</p>}
          </div>
          <Link className="consultation-lane-link" to="/follow-ups">후속 할 일 전체 보기<Icon name="arrow" size={15} /></Link>
        </section>
      </div>
    </section>

    <section className="consultation-history-shortcut">
      <div><span><Icon name="note" size={19} /></span><div><strong>이전 상담 기록은 학생 관리에서 확인합니다</strong><p>학생 한 명을 선택하면 상담 요약, 공개 범위, 추천 프로그램과 다음 행동이 시간순으로 이어집니다.</p></div></div>
      <Link className="button secondary" to="/students">학생 기록 열기<Icon name="arrow" size={16} /></Link>
      <small>누적 상담 {consultations.length}건</small>
    </section>
  </>;
}
