const emailEvents = {
  studentRequested: {
    key: 'student-requested',
    recipientRole: 'counselor',
    subject: '[커리어핏] 새로운 상담 신청이 도착했습니다',
  },
  studentCancelled: {
    key: 'student-cancelled',
    recipientRole: 'counselor',
    subject: '[커리어핏] 학생이 상담 예약을 취소했습니다',
  },
  counselorConfirmed: {
    key: 'counselor-confirmed',
    recipientRole: 'student',
    subject: '[커리어핏] 상담 예약이 확정되었습니다',
  },
  counselorCancelled: {
    key: 'counselor-cancelled',
    recipientRole: 'student',
    subject: '[커리어핏] 상담 예약이 취소되었습니다',
  },
};

function resolveRecipientUid(event, appointment) {
  return event.recipientRole === 'counselor'
    ? appointment?.counselorUid
    : appointment?.studentUid;
}

export function normalizeNotificationEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function getAppointmentEmailEvent(before, after) {
  if (!after) return null;

  if (!before) {
    if (after.requestedBy !== 'student' || after.status !== 'pending') return null;
    const event = emailEvents.studentRequested;
    return { ...event, recipientUid: resolveRecipientUid(event, after) };
  }

  const becameCancelled = before.status !== 'cancelled' && after.status === 'cancelled';
  if (becameCancelled && after.cancelledByRole === 'student') {
    const event = emailEvents.studentCancelled;
    return { ...event, recipientUid: resolveRecipientUid(event, after) };
  }
  if (becameCancelled && after.cancelledByRole === 'counselor') {
    const event = emailEvents.counselorCancelled;
    return { ...event, recipientUid: resolveRecipientUid(event, after) };
  }
  if (before.status !== 'confirmed' && after.status === 'confirmed') {
    const event = emailEvents.counselorConfirmed;
    return { ...event, recipientUid: resolveRecipientUid(event, after) };
  }
  return null;
}

export function buildAppointmentMailId(appointmentId, eventKey) {
  const safeAppointmentId = String(appointmentId || '').replace(/[^A-Za-z0-9_-]/g, '-');
  const safeEventKey = String(eventKey || '').replace(/[^A-Za-z0-9_-]/g, '-');
  return `appointment-${safeAppointmentId}-${safeEventKey}`;
}

export function getAppointmentEmailEventByKey(eventKey) {
  const event = Object.values(emailEvents).find(item => item.key === eventKey);
  return event ? { ...event, recipientUid: 'demo-recipient' } : null;
}

export function buildAppointmentEmailMessage(event, appointment, studentName = '학생') {
  const dateTime = `${appointment.date || '날짜 미정'} ${appointment.time || ''}`.trim();
  const location = appointment.location || '장소 미정';
  const counselorUrl = 'https://careerfit-aiboost-a601a.web.app/#/appointments';
  const studentUrl = 'https://careerfit-aiboost-a601a.web.app/#/student/appointments';

  const details = event.key === 'student-requested'
    ? `${studentName} 학생이 상담을 신청했습니다.`
    : event.key === 'student-cancelled'
      ? `${studentName} 학생이 상담 예약을 취소했습니다.`
      : event.key === 'counselor-confirmed'
        ? '신청한 상담 예약이 확정되었습니다.'
        : '상담사가 상담 예약을 취소했습니다.';
  const actionUrl = event.recipientRole === 'counselor' ? counselorUrl : studentUrl;

  return {
    subject: event.subject,
    text: [
      details,
      '',
      `일시: ${dateTime}`,
      `장소: ${location}`,
      '',
      `커리어핏에서 확인하기: ${actionUrl}`,
      '',
      '이 메일에는 상담 내용과 첨부파일 등 민감정보가 포함되지 않습니다.',
    ].join('\n'),
  };
}
