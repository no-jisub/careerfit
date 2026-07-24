import { timeToMinutes } from './date.js';

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function cleanText(value, maxLength = 500) {
  return String(value ?? '').replace(controlCharacters, '').trim().slice(0, maxLength);
}

export function isDateKey(value) {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateAccountInput(account, student, existingUsers = []) {
  const email = cleanText(account.email, 254).toLowerCase();
  const displayName = cleanText(account.displayName, 50);
  if (!displayName) return { error: '이름을 입력해 주세요.' };
  if (!emailPattern.test(email)) return { error: '유효한 이메일 형식으로 입력해 주세요.' };
  if (existingUsers.some(item => item.email?.toLowerCase() === email)) return { error: '이미 등록된 이메일입니다.' };
  if (account.role === 'student') {
    if (!cleanText(student.studentNo, 30) || !cleanText(student.department, 80) || !student.counselorUid) return { error: '학번, 학과, 담당 상담사를 확인해 주세요.' };
  }
  return { value: { ...account, displayName, email } };
}

export function validateStudentRegistrationInput(form) {
  const displayName = cleanText(form.displayName, 80);
  const email = cleanText(form.email, 254).toLowerCase();
  const studentNo = cleanText(form.studentNo, 40);
  const department = cleanText(form.department, 100);
  const phone = cleanText(form.phone, 40);
  const goal = cleanText(form.goal, 1000);
  const concern = cleanText(form.concern, 5000);
  const interests = cleanText(form.interests, 500)
    .split(',')
    .map(value => cleanText(value, 50))
    .filter(Boolean)
    .slice(0, 20);

  if (!displayName) return { error: '이름을 입력해 주세요.' };
  if (!emailPattern.test(email)) return { error: '유효한 이메일 형식으로 입력해 주세요.' };
  if (!studentNo || !department || !form.grade) return { error: '학번, 학과, 학년을 모두 입력해 주세요.' };
  if (String(form.password || '').length < 8) return { error: '비밀번호는 8자 이상으로 입력해 주세요.' };
  if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) return { error: '비밀번호에 영문과 숫자를 모두 포함해 주세요.' };
  if (form.password !== form.passwordConfirm) return { error: '비밀번호 확인이 일치하지 않습니다.' };
  if (!form.privacyConsent) return { error: '개인정보 수집·이용에 동의해 주세요.' };

  return {
    value: {
      displayName,
      email,
      password: form.password,
      studentNo,
      department,
      grade: cleanText(form.grade, 20),
      phone,
      goal,
      concern,
      interests,
    },
  };
}

export function validateCounselorRegistrationInput(form) {
  const displayName = cleanText(form.displayName, 80);
  const email = cleanText(form.email, 254).toLowerCase();
  if (!displayName) return { error: '이름을 입력해 주세요.' };
  if (!emailPattern.test(email)) return { error: '유효한 이메일 형식으로 입력해 주세요.' };
  if (String(form.password || '').length < 8) return { error: '비밀번호는 8자 이상으로 입력해 주세요.' };
  if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) return { error: '비밀번호에 영문과 숫자를 모두 포함해 주세요.' };
  if (form.password !== form.passwordConfirm) return { error: '비밀번호 확인이 일치하지 않습니다.' };
  return { value: { displayName, email, password: form.password } };
}

export function validateAppointmentInput(form, nowDate, nowTime) {
  if (!form.studentId) return { error: '상담할 학생을 선택해 주세요.' };
  if (!isDateKey(form.date) || !timePattern.test(form.time)) return { error: '상담 날짜와 시간을 확인해 주세요.' };
  if (`${form.date}T${form.time}` < `${nowDate}T${nowTime}`) return { error: '과거 시간으로는 상담을 예약할 수 없습니다.' };
  if (!timePattern.test(form.endTime)) return { error: '상담 종료 예정 시간을 확인해 주세요.' };
  const duration = timeToMinutes(form.endTime) - timeToMinutes(form.time);
  if (duration < 15 || duration > 240) return { error: '상담 시간은 15분에서 240분 사이로 설정해 주세요.' };
  const location = cleanText(form.location, 120);
  if (!location) return { error: '상담 장소를 입력해 주세요.' };
  return { value: { ...form, duration, type: cleanText(form.type, 50), location, preparation: cleanText(form.preparation, 500) } };
}

export function validateAvailabilityInput(form, nowDate, nowTime) {
  if (!isDateKey(form.date) || !timePattern.test(form.time)) return { error: '상담 가능 날짜와 시간을 확인해 주세요.' };
  if (`${form.date}T${form.time}` < `${nowDate}T${nowTime}`) return { error: '과거 시간은 상담 가능 시간으로 등록할 수 없습니다.' };
  const location = cleanText(form.location, 200);
  if (!timePattern.test(form.endTime)) return { error: '상담 종료 예정 시간을 확인해 주세요.' };
  const duration = timeToMinutes(form.endTime) - timeToMinutes(form.time);
  if (!location) return { error: '상담 장소를 입력해 주세요.' };
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) return { error: '종료 예정 시간은 시작 시간보다 15분 이상, 240분 이내로 설정해 주세요.' };
  return { value: { date: form.date, time: form.time, endTime: form.endTime, location, duration } };
}

export function validateStudentAppointmentRequest(form) {
  const type = cleanText(form.type, 80);
  const subject = cleanText(form.subject, 200);
  const requestMessage = cleanText(form.requestMessage, 2000);
  const preferredOutcome = cleanText(form.preferredOutcome, 1000);
  if (!type) return { error: '상담 유형을 선택해 주세요.' };
  if (subject.length < 2) return { error: '상담받고 싶은 주제를 2자 이상 입력해 주세요.' };
  if (requestMessage.length < 10) return { error: '상담사에게 전달할 내용을 10자 이상 입력해 주세요.' };
  return { value: { type, subject, requestMessage, preferredOutcome } };
}

export function validateFollowUpInput(form) {
  const content = cleanText(form.content, 300);
  if (!form.studentId || !content) return { error: '학생과 할 일 내용을 입력해 주세요.' };
  if (!isDateKey(form.dueDate)) return { error: '유효한 완료 기한을 선택해 주세요.' };
  return { value: { ...form, content } };
}

export function validateConsultationInput(form) {
  const purpose = cleanText(form.purpose, 200);
  const rawMemo = cleanText(form.rawMemo, 10000);
  if (!isDateKey(form.date)) return { error: '상담 날짜를 확인해 주세요.' };
  if (!purpose) return { error: '상담 목적을 입력해 주세요.' };
  if (rawMemo.length < 10) return { error: '상담 메모를 10자 이상 입력해 주세요.' };
  if (form.nextDate && !isDateKey(form.nextDate)) return { error: '다음 상담 예정일을 확인해 주세요.' };
  return { value: { ...form, purpose, rawMemo, currentConcern: cleanText(form.currentConcern, 2000), guidance: cleanText(form.guidance, 3000), studentActions: cleanText(form.studentActions, 1000), counselorActions: cleanText(form.counselorActions, 1000), nextCheckItems: cleanText(form.nextCheckItems, 1000) } };
}
