import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { doc, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseApp, firebaseConfig } from '../lib/firebase';

const provisioningAppName = 'careerfit-user-provisioning';

function getProvisioningApp() {
  const existing = getApps().find(app => app.name === provisioningAppName);
  return existing || initializeApp(firebaseConfig, provisioningAppName);
}

export async function createManagedUser({ account, student }) {
  if (!firebaseApp || !db) throw new Error('Firebase가 연결되지 않았습니다.');
  if (account.role === 'student' && (!student?.id || !student?.counselorUid)) {
    throw new Error('학생 정보와 담당 상담사를 입력해 주세요.');
  }
  const provisioningApp = getProvisioningApp();
  const provisioningAuth = getAuth(provisioningApp);
  let credential;

  try {
    credential = await createUserWithEmailAndPassword(provisioningAuth, account.email, account.password);
    await updateProfile(credential.user, { displayName: account.displayName });

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', credential.user.uid), {
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    if (account.role === 'student') {
      batch.set(doc(db, 'students', student.id), {
        ...student,
        uid: credential.user.uid,
        status: student.status || 'scheduled',
        interests: student.interests || [],
        appointmentDate: '',
        appointment: '',
        lastConsultation: '',
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
    return { uid: credential.user.uid };
  } catch (error) {
    if (credential?.user) {
      // The client SDK cannot delete another app's account after its profile
      // document fails. Keep the explicit error so an administrator can retry
      // with another address or finish the profile from Firebase Console.
      error.partialAccountCreated = true;
    }
    throw error;
  } finally {
    await signOut(provisioningAuth).catch(() => {});
  }
}

export async function sendManagedPasswordReset(email) {
  if (!auth) throw new Error('Firebase Authentication이 연결되지 않았습니다.');
  await sendPasswordResetEmail(auth, email);
}
