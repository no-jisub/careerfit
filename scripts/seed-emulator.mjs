import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'careerfit-local';
const localHosts = {
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
};

for (const [name, fallback] of Object.entries(localHosts)) {
  const value = process.env[name] || fallback;
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(value)) {
    throw new Error(`${name} must point to localhost. Received: ${value}`);
  }
  process.env[name] = value;
}
process.env.GCLOUD_PROJECT = projectId;

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
const db = getFirestore(app);
const password = 'CareerFit123!';

async function upsertUser({ email, displayName, role }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    user = await auth.updateUser(user.uid, { displayName, password, disabled: false });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({ email, displayName, password, emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, { role });
  await db.collection('users').doc(user.uid).set({
    email,
    displayName,
    role,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return user;
}

const admin = await upsertUser({
  email: 'admin@careerfit.local',
  displayName: '커리어핏 관리자',
  role: 'admin',
});
const counselor = await upsertUser({
  email: 'counselor@careerfit.local',
  displayName: '박지현 상담사',
  role: 'counselor',
});
const otherCounselor = await upsertUser({
  email: 'other-counselor@careerfit.local',
  displayName: '이민수 상담사',
  role: 'counselor',
});
const student = await upsertUser({
  email: 'student@careerfit.local',
  displayName: '김하늘 학생',
  role: 'student',
});
const otherStudent = await upsertUser({
  email: 'other-student@careerfit.local',
  displayName: '이서준 학생',
  role: 'student',
});

const now = new Date().toISOString();
const batch = db.batch();
const documents = {
  students: {
    s1: {
      uid: student.uid,
      counselorUid: counselor.uid,
      name: '김하늘',
      studentNo: '20251234',
      department: '컴퓨터공학과',
      grade: '2학년',
      phone: '010-24**-56**',
      interests: ['IT 서비스 기획', 'UX', '디지털 역량'],
      goal: 'IT 서비스 기획자',
      concern: '개발과 서비스 기획 중 어떤 직무가 더 적합한지 고민하고 있어요.',
      counselor: '박지현',
      status: 'scheduled',
      appointmentDate: '2026-07-22',
      appointment: '10:00',
      lastConsultation: '2026-07-08',
      initials: '하늘',
      updatedAt: now,
    },
    s2: {
      uid: otherStudent.uid,
      counselorUid: otherCounselor.uid,
      name: '이서준',
      studentNo: '20241107',
      department: '경영학과',
      grade: '3학년',
      phone: '010-55**-12**',
      interests: ['마케팅', '데이터 분석'],
      goal: '데이터 기반 마케터',
      concern: '인턴 지원을 위한 포트폴리오 구성',
      counselor: '이민수',
      status: 'inProgress',
      appointmentDate: '2026-07-22',
      appointment: '11:30',
      lastConsultation: '2026-07-17',
      initials: '서준',
      updatedAt: now,
    },
  },
  consultations: {
    c1: {
      studentId: 's1',
      studentUid: student.uid,
      counselorUid: counselor.uid,
      studentVisible: true,
      date: '2026-07-08',
      type: '진로 탐색',
      purpose: '관심 직무 구체화',
      counselor: '박지현',
      summary: '개발 수업 경험과 서비스 기획 관심을 바탕으로 두 직무를 비교하기로 했습니다.',
      guidance: 'IT 직무 소개 자료에서 역할과 필요 역량을 비교하도록 안내했습니다.',
      concern: '개발과 서비스 기획 중 적합한 직무를 판단하기 어려움.',
      programs: [],
      studentActions: '관심 직무 두 개의 역할과 필요 역량 정리',
      counselorActions: 'UX 직무 체험 프로그램 일정 확인',
      nextCheckItems: '직무 비교 결과와 프로그램 신청 여부',
      updatedAt: now,
    },
  },
  consultationNotes: {
    n1: {
      consultationId: 'c1',
      studentId: 's1',
      counselorUid: counselor.uid,
      note: '다음 상담에서 직무 비교표를 함께 검토할 예정입니다.',
      updatedAt: now,
    },
  },
  followUps: {
    f1: {
      studentId: 's1',
      ownerUid: counselor.uid,
      assigneeUid: student.uid,
      content: '관심 직무 두 개의 역할과 필요 역량 정리',
      owner: '학생',
      dueDate: '2026-07-29',
      status: 'inProgress',
      consultationDate: '2026-07-08',
      updatedAt: now,
    },
    f2: {
      studentId: 's1',
      ownerUid: counselor.uid,
      assigneeUid: counselor.uid,
      content: 'UX 직무 체험 프로그램 일정 확인',
      owner: '교직원',
      dueDate: '2026-07-25',
      status: 'scheduled',
      consultationDate: '2026-07-08',
      updatedAt: now,
    },
  },
  appointments: {
    a1: {
      studentId: 's1',
      studentUid: student.uid,
      counselorUid: counselor.uid,
      date: '2026-07-22',
      time: '10:00',
      type: '진로 상담',
      location: '대학일자리플러스센터 상담실 2',
      preparation: '관심 직무 비교표',
      status: 'scheduled',
      updatedAt: now,
    },
    a2: {
      studentId: 's2',
      studentUid: otherStudent.uid,
      counselorUid: otherCounselor.uid,
      date: '2026-07-22',
      time: '11:30',
      type: '취업 상담',
      location: '대학일자리플러스센터 상담실 1',
      preparation: '포트폴리오 초안',
      status: 'scheduled',
      updatedAt: now,
    },
  },
};

for (const [collectionName, records] of Object.entries(documents)) {
  for (const [id, record] of Object.entries(records)) {
    batch.set(db.collection(collectionName).doc(id), record);
  }
}
await batch.commit();

console.log('CareerFit Firebase Emulator seed completed.');
console.log(`Admin:     admin@careerfit.local / ${password}`);
console.log(`Counselor: counselor@careerfit.local / ${password}`);
console.log(`Student:   student@careerfit.local / ${password}`);
console.log('The second counselor/student pair verifies assigned-student filtering.');
