import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, demoModeEnabled, firebaseAuthEnabled } from '../lib/firebase';

const AuthContext = createContext(null);
const demoProfiles = {
  admin: { displayName: '개발 관리자', role: 'admin', active: true },
  counselor: { displayName: '박지현 상담사', role: 'counselor', active: true },
  student: { displayName: '김하늘', role: 'student', active: true },
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
    ...storedProfile,
    email: storedProfile.email || user.email,
    displayName: storedProfile.displayName || user.displayName || user.email,
    role: token.claims.role || storedProfile.role || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => firebaseAuthEnabled ? null : localStorage.getItem('careerfit_role'));
  const [profile, setProfile] = useState(() => {
    const savedRole = firebaseAuthEnabled ? null : localStorage.getItem('careerfit_role');
    return demoProfiles[savedRole] || null;
  });
  const [loading, setLoading] = useState(firebaseAuthEnabled);

  useEffect(() => {
    if (!firebaseAuthEnabled) return undefined;
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      if (!nextUser) {
        setRole(demoModeEnabled ? localStorage.getItem('careerfit_role') : null);
        setProfile(demoProfiles[localStorage.getItem('careerfit_role')] || null);
        setLoading(false);
        return;
      }
      try {
        const nextProfile = await resolveProfile(nextUser);
        setProfile(nextProfile);
        setRole(nextProfile.role);
      } catch {
        setProfile(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loginWithEmail = async (email, password) => {
    if (!firebaseAuthEnabled) throw new Error('Firebase 로그인이 아직 활성화되지 않았습니다.');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const nextProfile = await resolveProfile(credential.user);
    if (!nextProfile.role) {
      await signOut(auth);
      throw new Error('계정에 커리어핏 역할이 지정되지 않았습니다.');
    }
    localStorage.removeItem('careerfit_role');
    setUser(credential.user);
    setProfile(nextProfile);
    setRole(nextProfile.role);
    return nextProfile.role;
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
    return nextRole;
  };

  const logout = async () => {
    if (user && auth) await signOut(auth);
    localStorage.removeItem('careerfit_role');
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  const value = useMemo(() => ({ user, role, profile, loading, demoModeEnabled, firebaseAuthEnabled, loginWithEmail, loginDemo, logout }), [user, role, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
