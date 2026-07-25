export const DEMO_EMAIL_SESSION_DAILY_LIMIT = 15;
export const DEMO_EMAIL_GLOBAL_DAILY_LIMIT = 100;

const ALLOWED_EVENT_KEYS = new Set([
  'student-requested',
  'student-cancelled',
  'counselor-confirmed',
  'counselor-cancelled',
]);

function cleanText(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

export function sanitizeDemoEmailRequest(data) {
  const recipientEmail = cleanText(data?.recipientEmail, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    throw new Error('데모 이메일 수신 주소가 올바르지 않습니다.');
  }

  const eventKey = cleanText(data?.eventKey, 40);
  if (!ALLOWED_EVENT_KEYS.has(eventKey)) {
    throw new Error('지원하지 않는 데모 상담 알림입니다.');
  }

  const appointmentId = cleanText(data?.appointment?.id, 128);
  const date = cleanText(data?.appointment?.date, 40);
  const time = cleanText(data?.appointment?.time, 20);
  if (!appointmentId || !date || !time) {
    throw new Error('데모 상담 일정 정보가 올바르지 않습니다.');
  }

  return {
    recipientEmail,
    eventKey,
    studentName: cleanText(data?.studentName, 80) || '학생',
    appointment: {
      id: appointmentId,
      date,
      time,
      location: cleanText(data?.appointment?.location, 200) || '장소 미정',
    },
  };
}

export function getDemoEmailQuotaDocumentIds(uid, dateKey) {
  const normalizedUid = cleanText(uid, 128);
  const normalizedDateKey = cleanText(dateKey, 10);
  if (!normalizedUid || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateKey)) {
    throw new Error('데모 이메일 사용량 키가 올바르지 않습니다.');
  }
  return {
    session: `${normalizedUid}_${normalizedDateKey}`,
    global: `_global_${normalizedDateKey}`,
  };
}
