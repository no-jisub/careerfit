import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser, onAuthStateChanged, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db, demoModeEnabled, firebaseAuthEnabled } from '../lib/firebase';

const AuthContext = createContext(null);
const demoProfiles = {
  admin: { id: 'demo-admin', displayName: '개발 관리자', role: 'admin', active: true },
  counselor: { id: 'demo-counselor', displayName: '박지현 상담사', role: 'counselor', active: true },
  student: { id: 'demo-student-s1', displayName: '김하늘', role: 'student', active: true },
};

async function resolveProfile(user) {
  const token = await user.getIdTokenResult();
  const profileRef = doc(db, 'users', user.uid);
  let snapshot = await getDoc(profileRef);
  if (!snapshot.exists() && ['admin', 'counselor'].includes(token.claims.role)) {
    const now = new Date().toISOString();
    await setDoc(profileRef, {
      email: user.email,
      displayName: user.displayName || user.email,
      role: token.claims.role,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    snapshot = await getDoc(profileRef);
  }
  const storedProfile = snapshot.exists() ? snapshot.data() : {};
  return {
    id: user.uid,
    ...storedProfile,
    email: storedProfile.email || user.email,
    displayName: storedProfile.displayName || user.displayName || user.email,
    role: token.claims.role || storedProfile.role || null,
  };
}

function resolveAccountStatus(user, profile) {
  if (profile?.withdrawalStatus === 'pending') return 'withdrawalPending';
  if (!user.emailVerified) return 'emailVerificationRequired';
  if (!profile?.role) return 'profileMissing';
  if (profile.approvalStatus === 'rejected') return 'rejected';
  if (profile.active === false || profile.approvalStatus === 'pending') return profile.role === 'counselor' ? 'counselorApprovalPending' : 'assignmentPending';
  return 'approved';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => firebaseAuthEnabled ? null : localStorage.getItem('careerfit_role'));
  const [profile, setProfile] = useState(() => {
    const savedRole = firebaseAuthEnabled ? null : localStorage.getItem('careerfit_role');
    return demoProfiles[savedRole] || null;
  });
  const [accountStatus, setAccountStatus] = useState(() => firebaseAuthEnabled ? null : 'approved');
  const [loading, setLoading] = useState(firebaseAuthEnabled);

  const applyFirebaseSession = async nextUser => {
    const nextProfile = await resolveProfile(nextUser);
    const nextStatus = resolveAccountStatus(nextUser, nextProfile);
    setUser(nextUser);
    setProfile(nextProfile);
    setAccountStatus(nextStatus);
    setRole(nextStatus === 'approved' ? nextProfile.role : null);
    return { role: nextStatus === 'approved' ? nextProfile.role : null, status: nextStatus };
  };

  useEffect(() => {
    if (!firebaseAuthEnabled) return undefined;
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      if (!nextUser) {
        setRole(demoModeEnabled ? localStorage.getItem('careerfit_role') : null);
        setProfile(demoProfiles[localStorage.getItem('careerfit_role')] || null);
        setAccountStatus(demoModeEnabled && localStorage.getItem('careerfit_role') ? 'approved' : null);
        setLoading(false);
        return;
      }
      try {
        await applyFirebaseSession(nextUser);
      } catch {
        setProfile(null);
        setRole(null);
        setAccountStatus('profileMissing');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loginWithEmail = async (email, password) => {
    if (!firebaseAuthEnabled) throw new Error('Firebase 로그인이 아직 활성화되지 않았습니다.');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    localStorage.removeItem('careerfit_role');
    return applyFirebaseSession(credential.user);
  };

  const registerStudent = async registration => {
    if (!firebaseAuthEnabled || !auth || !db) throw new Error('Firebase 회원가입이 활성화되지 않았습니다.');
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, registration.email, registration.password);
      await updateProfile(credential.user, { displayName: registration.displayName });
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', credential.user.uid), {
        email: registration.email,
        displayName: registration.displayName,
        role: 'student',
        active: false,
        approvalStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      batch.set(doc(db, 'studentRegistrations', credential.user.uid), {
        uid: credential.user.uid,
        email: registration.email,
        displayName: registration.displayName,
        studentNo: registration.studentNo,
        department: registration.department,
        grade: registration.grade,
        phone: registration.phone,
        interests: registration.interests,
        goal: registration.goal,
        concern: registration.concern,
        emailVerified: false,
        status: 'pending',
        counselorUid: '',
        createdAt: now,
        updatedAt: now,
      });
      await batch.commit();
      await sendEmailVerification(credential.user).catch(() => {});
      return applyFirebaseSession(credential.user);
    } catch (error) {
      if (credential?.user && !error?.code?.startsWith('auth/')) {
        await deleteUser(credential.user).catch(() => {});
      }
      throw error;
    }
  };

  const registerCounselor = async registration => {
    if (!firebaseAuthEnabled || !auth || !db) throw new Error('Firebase 회원가입이 활성화되지 않았습니다.');
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, registration.email, registration.password);
      await updateProfile(credential.user, { displayName: registration.displayName });
      const now = new Date().toISOString();
      await setDoc(doc(db, 'users', credential.user.uid), {
        email: registration.email,
        displayName: registration.displayName,
        role: 'counselor',
        active: false,
        approvalStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      await sendEmailVerification(credential.user).catch(() => {});
      return applyFirebaseSession(credential.user);
    } catch (error) {
      if (credential?.user && !error?.code?.startsWith('auth/')) await deleteUser(credential.user).catch(() => {});
      throw error;
    }
  };

  const loginDemo = async nextRole => {
    if (!demoModeEnabled || !Object.hasOwn(demoProfiles, nextRole)) {
      throw new Error('데모 로그인이 허용되지 않았습니다.');
    }
    if (auth?.currentUser) await signOut(auth);
    localStorage.setItem('careerfit_role', nextRole);
    setUser(null);
    setProfile(demoProfiles[nextRole]);
    setRole(nextRole);
    setAccountStatus('approved');
    return { role: nextRole, status: 'approved' };
  };

  const refreshAccount = async () => {
    if (!auth?.currentUser) return { role: null, status: null };
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      await setDoc(doc(db, 'studentRegistrations', auth.currentUser.uid), {
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    }
    return applyFirebaseSession(auth.currentUser);
  };

  const resendVerificationEmail = async () => {
    if (!auth?.currentUser) throw new Error('로그인된 계정이 없습니다.');
    await sendEmailVerification(auth.currentUser);
  };

  const requestPasswordReset = async email => {
    if (!firebaseAuthEnabled || !auth) throw new Error('Firebase 로그인이 활성화되지 않았습니다.');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('이메일을 입력해 주세요.');
    await sendPasswordResetEmail(auth, normalizedEmail);
  };

  const requestAccountWithdrawal = async () => {
    if (!auth?.currentUser || !db) throw new Error('로그인된 학생 계정이 없습니다.');
    const requestedAt = new Date();
    const deletionScheduledAt = new Date(requestedAt);
    deletionScheduledAt.setDate(deletionScheduledAt.getDate() + 30);
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      active: false,
      withdrawalStatus: 'pending',
      withdrawalRequestedAt: requestedAt.toISOString(),
      deletionScheduledAt: deletionScheduledAt.toISOString(),
      updatedAt: requestedAt.toISOString(),
    }, { merge: true });
    await signOut(auth);
    return { deletionScheduledAt: deletionScheduledAt.toISOString() };
  };

  const logout = async () => {
    if (user && auth) await signOut(auth);
    localStorage.removeItem('careerfit_role');
    setUser(null);
    setProfile(null);
    setRole(null);
    setAccountStatus(null);
  };

  const value = useMemo(() => ({ user, role, profile, accountStatus, loading, demoModeEnabled, firebaseAuthEnabled, loginWithEmail, loginDemo, registerStudent, registerCounselor, refreshAccount, resendVerificationEmail, requestPasswordReset, requestAccountWithdrawal, logout }), [user, role, profile, accountStatus, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
