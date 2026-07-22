import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'careerfit-emulator-key',
  authDomain: 'careerfit-local.firebaseapp.com',
  projectId: 'careerfit-local',
  appId: '1:000000000000:web:careerfitlocal',
});
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
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

  let blockedOtherStudent = false;
  try {
    await getDoc(doc(db, 'students', 's2'));
  } catch (error) {
    blockedOtherStudent = error.code === 'permission-denied';
  }
  assert(blockedOtherStudent, '다른 상담 담당자의 학생 문서 읽기가 차단되지 않았습니다.');

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

  console.log('CareerFit emulator flow verification passed.');
  console.log('- counselor login and role claim');
  console.log('- assigned student query (s1 only)');
  console.log('- unassigned student read denied');
  console.log('- student login and own profile query');
} finally {
  await signOut(auth).catch(() => {});
  await deleteApp(app);
}
