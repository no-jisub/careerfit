import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const app = initializeApp({
  apiKey: 'careerfit-emulator-key',
  authDomain: 'careerfit-local.firebaseapp.com',
  projectId: 'careerfit-local',
  appId: '1:000000000000:web:careerfitlocal',
});
const auth = getAuth(app);
const db = getFirestore(app);
const adminApp = initializeAdminApp({ projectId: 'careerfit-local' }, 'careerfit-verification-admin');
const adminAuth = getAdminAuth(adminApp);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const signupCredential = await createUserWithEmailAndPassword(
    auth,
    'self-signup@careerfit.local',
    'CareerFit123!',
  );
  const signupAt = new Date().toISOString();
  const signupBatch = writeBatch(db);
  signupBatch.set(doc(db, 'users', signupCredential.user.uid), {
    email: 'self-signup@careerfit.local',
    displayName: '회원가입 검증 학생',
    role: 'student',
    active: false,
    approvalStatus: 'pending',
    createdAt: signupAt,
    updatedAt: signupAt,
  });
  signupBatch.set(doc(db, 'studentRegistrations', signupCredential.user.uid), {
    uid: signupCredential.user.uid,
    email: 'self-signup@careerfit.local',
    displayName: '회원가입 검증 학생',
    studentNo: 'VERIFY-SIGNUP',
    department: '검증학과',
    grade: '1학년',
    phone: '',
    interests: ['진로 탐색'],
    goal: '',
    concern: '',
    emailVerified: false,
    status: 'pending',
    counselorUid: '',
    createdAt: signupAt,
    updatedAt: signupAt,
  });
  await signupBatch.commit();
  assert((await getDoc(doc(db, 'studentRegistrations', signupCredential.user.uid))).exists(), '학생 셀프 회원가입 문서가 저장되지 않았습니다.');
  let blockedFakeEmailVerification = false;
  try {
    await updateDoc(doc(db, 'studentRegistrations', signupCredential.user.uid), {
      emailVerified: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    blockedFakeEmailVerification = error.code === 'permission-denied';
  }
  assert(blockedFakeEmailVerification, '이메일 미인증 사용자가 인증 상태를 직접 변경할 수 있습니다.');
  await adminAuth.updateUser(signupCredential.user.uid, { emailVerified: true });
  await signupCredential.user.reload();
  await signupCredential.user.getIdToken(true);
  await updateDoc(doc(db, 'studentRegistrations', signupCredential.user.uid), {
    emailVerified: true,
    updatedAt: new Date().toISOString(),
  });
  assert(
    (await getDoc(doc(db, 'studentRegistrations', signupCredential.user.uid))).data().emailVerified === true,
    '인증 완료 학생의 가입 문서가 최신 상태로 동기화되지 않았습니다.',
  );
  await signOut(auth);

  const adminCredential = await signInWithEmailAndPassword(
    auth,
    'admin@careerfit.local',
    'CareerFit123!',
  );
  const adminToken = await adminCredential.user.getIdTokenResult(true);
  assert(adminToken.claims.role === 'admin', '관리자 역할 claim을 확인하지 못했습니다.');
  const allStudents = await getDocs(collection(db, 'students'));
  assert(allStudents.size === 2, `관리자가 전체 학생을 조회하지 못했습니다: ${allStudents.size}`);
  await setDoc(doc(db, 'users', 'verification-managed-user'), {
    email: 'verification@careerfit.local',
    displayName: '검증 상담사',
    role: 'counselor',
    active: true,
  });
  assert((await getDoc(doc(db, 'users', 'verification-managed-user'))).exists(), '관리자 사용자 등록 권한을 확인하지 못했습니다.');
  await signOut(auth);

  const counselorCredential = await signInWithEmailAndPassword(
    auth,
    'counselor@careerfit.local',
    'CareerFit123!',
  );
  const counselorToken = await counselorCredential.user.getIdTokenResult(true);
  assert(counselorToken.claims.role === 'counselor', '상담 담당자 역할 claim을 확인하지 못했습니다.');

  const assignedStudents = await getDocs(query(
    collection(db, 'students'),
    where('counselorUid', '==', counselorCredential.user.uid),
  ));
  assert(
    assignedStudents.size === 1 && assignedStudents.docs[0].id === 's1',
    `배정 학생 필터 결과가 올바르지 않습니다: ${assignedStudents.docs.map(item => item.id).join(', ')}`,
  );

  const allStudentsForCounselor = await getDocs(collection(db, 'students'));
  assert(allStudentsForCounselor.size === 2, '상담 담당자가 운영 관리를 위해 전체 학생을 조회하지 못했습니다.');
  assert((await getDoc(doc(db, 'students', 's2'))).exists(), '상담 담당자가 다른 담당자의 학생을 조회하지 못했습니다.');

  const pendingRegistrationSnapshot = await getDocs(query(
    collection(db, 'studentRegistrations'),
    where('email', '==', 'pending-student@careerfit.local'),
  ));
  assert(pendingRegistrationSnapshot.size === 1, '배정 대기 학생을 조회하지 못했습니다.');
  const pendingRegistrationDocument = pendingRegistrationSnapshot.docs[0];
  const pendingRegistration = pendingRegistrationDocument.data();
  const assignmentAt = new Date().toISOString();
  const assignmentBatch = writeBatch(db);
  assignmentBatch.set(doc(db, 'students', `student-${pendingRegistration.uid}`), {
    uid: pendingRegistration.uid,
    counselorUid: counselorCredential.user.uid,
    counselor: '박지현',
    name: pendingRegistration.displayName,
    studentNo: pendingRegistration.studentNo,
    department: pendingRegistration.department,
    grade: pendingRegistration.grade,
    phone: pendingRegistration.phone,
    interests: pendingRegistration.interests,
    goal: pendingRegistration.goal,
    concern: pendingRegistration.concern,
    status: 'scheduled',
    appointmentDate: '',
    appointment: '',
    lastConsultation: '',
    createdAt: assignmentAt,
    updatedAt: assignmentAt,
  });
  assignmentBatch.set(doc(db, 'users', pendingRegistration.uid), {
    active: true,
    approvalStatus: 'approved',
    updatedAt: assignmentAt,
  }, { merge: true });
  assignmentBatch.set(pendingRegistrationDocument.ref, {
    status: 'approved',
    counselorUid: counselorCredential.user.uid,
    assignedAt: assignmentAt,
    updatedAt: assignmentAt,
  }, { merge: true });
  await assignmentBatch.commit();
  assert((await getDoc(doc(db, 'students', `student-${pendingRegistration.uid}`))).data().counselorUid === counselorCredential.user.uid, '상담사의 학생 본인 배정이 저장되지 않았습니다.');
  assert((await getDoc(pendingRegistrationDocument.ref)).data().status === 'approved', '학생 가입 승인 상태가 변경되지 않았습니다.');

  const managedStudentUid = 'verification-counselor-managed-student';
  const managedStudentId = 'verification-counselor-managed-profile';
  const managedAt = new Date().toISOString();
  const managedAccountGroup = writeBatch(db);
  managedAccountGroup.set(doc(db, 'users', managedStudentUid), {
    email: 'counselor-created-student@careerfit.local',
    displayName: '상담사 등록 학생',
    role: 'student',
    active: true,
    createdAt: managedAt,
    updatedAt: managedAt,
  });
  managedAccountGroup.set(doc(db, 'students', managedStudentId), {
    uid: managedStudentUid,
    counselorUid: counselorCredential.user.uid,
    counselor: '박지현',
    name: '상담사 등록 학생',
    studentNo: 'VERIFY-001',
    department: '검증학과',
    grade: '2학년',
    phone: '010-0000-0000',
    interests: ['진로 탐색'],
    goal: '상담 담당자 운영 권한 검증',
    concern: '계정 등록과 학생 배정 흐름 확인',
    status: 'scheduled',
    appointmentDate: '',
    appointment: '',
    lastConsultation: '',
    createdAt: managedAt,
    updatedAt: managedAt,
  });
  await managedAccountGroup.commit();
  assert((await getDoc(doc(db, 'users', managedStudentUid))).exists(), '상담 담당자의 사용자 등록 권한을 확인하지 못했습니다.');
  assert((await getDoc(doc(db, 'students', managedStudentId))).exists(), '상담 담당자의 학생 등록 권한을 확인하지 못했습니다.');

  const assignedAppointments = await getDocs(query(
    collection(db, 'appointments'),
    where('counselorUid', '==', counselorCredential.user.uid),
  ));
  assert(assignedAppointments.size === 1 && assignedAppointments.docs[0].id === 'a1', '상담사의 배정 일정 조회가 올바르지 않습니다.');

  let blockedInvalidAppointment = false;
  try {
    await setDoc(doc(db, 'appointments', 'invalid-appointment'), {
      studentId: 's1',
      studentUid: assignedStudents.docs[0].data().uid,
      counselorUid: counselorCredential.user.uid,
      date: '2026-07-30',
      time: '15:00',
      type: '진로 상담',
      location: '',
      status: 'scheduled',
    });
  } catch (error) {
    blockedInvalidAppointment = error.code === 'permission-denied';
  }
  assert(blockedInvalidAppointment, '잘못된 상담 일정 데이터가 Firestore 규칙에서 차단되지 않았습니다.');

  const verificationId = 'verification-consultation';
  const verificationFollowUpId = 'verification-follow-up';
  const verificationAppointmentId = 'verification-appointment';
  const documentGroup = writeBatch(db);
  documentGroup.set(doc(db, 'consultations', verificationId), {
    studentId: 's1',
    studentUid: assignedStudents.docs[0].data().uid,
    counselorUid: counselorCredential.user.uid,
    studentVisible: true,
    date: '2026-07-22',
    type: '기능 검증',
    purpose: '문서 단위 저장 검증',
    counselor: '박지현',
    summary: 'Emulator 기능 검증용 상담 기록입니다.',
  });
  documentGroup.set(doc(db, 'consultationSummaries', verificationId), {
    consultationId: verificationId,
    studentId: 's1',
    studentUid: assignedStudents.docs[0].data().uid,
    counselorUid: counselorCredential.user.uid,
    counselor: '박지현',
    date: '2026-07-22',
    type: '기능 검증',
    purpose: '학생 공개 문서 분리 검증',
    summary: '학생에게 공개되는 검증 요약입니다.',
    strengths: '',
    concern: '',
    programs: [],
    studentActions: '',
    nextCheckItems: '',
    visibleFields: ['summary'],
    published: true,
  });
  documentGroup.set(doc(db, 'consultationNotes', verificationId), {
    consultationId: verificationId,
    studentId: 's1',
    counselorUid: counselorCredential.user.uid,
    note: '상담 담당자 전용 검증 메모',
  });
  documentGroup.set(doc(db, 'followUps', verificationFollowUpId), {
    studentId: 's1',
    ownerUid: counselorCredential.user.uid,
    assigneeUid: assignedStudents.docs[0].data().uid,
    owner: '학생',
    content: '문서 단위 저장 결과 확인',
    dueDate: '2026-07-30',
    status: 'scheduled',
    consultationDate: '2026-07-22',
  });
  documentGroup.set(doc(db, 'appointments', verificationAppointmentId), {
    studentId: 's1',
    studentUid: assignedStudents.docs[0].data().uid,
    counselorUid: counselorCredential.user.uid,
    date: '2026-07-30',
    time: '15:00',
    type: '진로 상담',
    location: '상담실 2',
    preparation: '직무 비교표',
    status: 'scheduled',
  });
  await documentGroup.commit();
  assert((await getDoc(doc(db, 'consultations', verificationId))).exists(), '상담 문서 저장에 실패했습니다.');
  assert((await getDoc(doc(db, 'consultationSummaries', verificationId))).exists(), '학생 공개 상담 요약 저장에 실패했습니다.');
  assert((await getDoc(doc(db, 'consultationNotes', verificationId))).exists(), '내부 메모 문서 저장에 실패했습니다.');
  assert((await getDoc(doc(db, 'appointments', verificationAppointmentId))).exists(), '상담 일정 저장에 실패했습니다.');

  await signOut(auth);
  const studentCredential = await signInWithEmailAndPassword(
    auth,
    'student@careerfit.local',
    'CareerFit123!',
  );
  const ownStudents = await getDocs(query(
    collection(db, 'students'),
    where('uid', '==', studentCredential.user.uid),
  ));
  assert(ownStudents.size === 1 && ownStudents.docs[0].id === 's1', '학생 본인 문서를 찾지 못했습니다.');
  const profileUpdatedAt = new Date().toISOString();
  await updateDoc(doc(db, 'students', 's1'), {
    phone: '010-0000-0000',
    interests: ['UX', '서비스 기획'],
    goal: '서비스 기획자',
    concern: '프로필 수정 권한 검증',
    updatedAt: profileUpdatedAt,
  });
  const updatedStudentProfile = await getDoc(doc(db, 'students', 's1'));
  assert(updatedStudentProfile.data().goal === '서비스 기획자', '학생의 허용된 프로필 수정이 저장되지 않았습니다.');
  let blockedAcademicUpdate = false;
  try {
    await updateDoc(doc(db, 'students', 's1'), { department: '임의 변경 학과' });
  } catch (error) {
    blockedAcademicUpdate = error.code === 'permission-denied';
  }
  assert(blockedAcademicUpdate, '학생의 학적 정보 변경이 차단되지 않았습니다.');
  const ownAppointments = await getDocs(query(
    collection(db, 'appointments'),
    where('studentUid', '==', studentCredential.user.uid),
  ));
  assert(ownAppointments.size === 2, `학생 본인 상담 일정 조회 결과가 올바르지 않습니다: ${ownAppointments.size}`);
  const publicSummaries = await getDocs(query(
    collection(db, 'consultationSummaries'),
    where('studentUid', '==', studentCredential.user.uid),
    where('published', '==', true),
  ));
  assert(publicSummaries.size === 2, `학생 공개 상담 요약 조회 결과가 올바르지 않습니다: ${publicSummaries.size}`);
  let blockedPrivateConsultation = false;
  try {
    await getDoc(doc(db, 'consultations', verificationId));
  } catch (error) {
    blockedPrivateConsultation = error.code === 'permission-denied';
  }
  assert(blockedPrivateConsultation, '학생의 비공개 상담 원본 조회가 차단되지 않았습니다.');
  const cancelledAt = new Date().toISOString();
  await updateDoc(doc(db, 'appointments', verificationAppointmentId), {
    status: 'cancelled',
    cancelledAt,
    cancelledBy: studentCredential.user.uid,
    updatedAt: cancelledAt,
  });
  assert((await getDoc(doc(db, 'appointments', verificationAppointmentId))).data().status === 'cancelled', '학생의 상담 예약 취소가 저장되지 않았습니다.');
  let blockedInternalNote = false;
  try {
    await getDoc(doc(db, 'consultationNotes', 'n1'));
  } catch (error) {
    blockedInternalNote = error.code === 'permission-denied';
  }
  assert(blockedInternalNote, '학생의 상담 담당자 전용 메모 조회가 차단되지 않았습니다.');
  const completedAt = new Date().toISOString();
  await updateDoc(doc(db, 'followUps', verificationFollowUpId), {
    status: 'complete',
    completedAt,
    updatedAt: completedAt,
  });
  const completedFollowUp = await getDoc(doc(db, 'followUps', verificationFollowUpId));
  assert(completedFollowUp.data().status === 'complete', '학생의 후속 조치 완료 저장에 실패했습니다.');

  console.log('CareerFit emulator flow verification passed.');
  console.log('- counselor login and role claim');
  console.log('- administrator login and managed user creation');
  console.log('- assigned student query (s1 only)');
  console.log('- counselor global student access for combined operations role');
  console.log('- counselor managed user and student creation');
  console.log('- student self-signup and protected email verification status');
  console.log('- verified student token refresh and registration status sync');
  console.log('- counselor self-assignment for verified pending students');
  console.log('- student login and own profile query');
  console.log('- student profile update limited to self-managed fields');
  console.log('- atomic consultation/note/follow-up document save');
  console.log('- student follow-up completion update');
  console.log('- counselor appointment save and student appointment query');
  console.log('- student-selected public summary document and private original isolation');
  console.log('- student appointment cancellation');
  console.log('- invalid document shape denied by Firestore rules');
  console.log('- counselor-only consultation note denied for student');
} finally {
  await signOut(auth).catch(() => {});
  await deleteAdminApp(adminApp);
  await deleteApp(app);
}
