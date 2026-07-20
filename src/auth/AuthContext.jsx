import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, demoModeEnabled, firebaseAuthEnabled } from '../lib/firebase';

const AuthContext = createContext(null);

async function resolveRole(user) {
  const token = await user.getIdTokenResult();
  if (token.claims.role) return token.claims.role;
  const profile = await getDoc(doc(db, 'users', user.uid));
  return profile.exists() ? profile.data().role : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(() => localStorage.getItem('careerfit_role'));
  const [loading, setLoading] = useState(firebaseAuthEnabled);

  useEffect(() => {
    if (!firebaseAuthEnabled) return undefined;
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      if (!nextUser) {
        setRole(localStorage.getItem('careerfit_role'));
        setLoading(false);
        return;
      }
      try {
        const nextRole = await resolveRole(nextUser);
        setRole(nextRole);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loginWithEmail = async (email, password) => {
    if (!firebaseAuthEnabled) throw new Error('Firebase 로그인이 아직 활성화되지 않았습니다.');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const nextRole = await resolveRole(credential.user);
    if (!nextRole) {
      await signOut(auth);
      throw new Error('계정에 커리어핏 역할이 지정되지 않았습니다.');
    }
    localStorage.removeItem('careerfit_role');
    setUser(credential.user);
    setRole(nextRole);
    return nextRole;
  };

  const loginDemo = async nextRole => {
    if (!demoModeEnabled || !['counselor', 'student'].includes(nextRole)) {
      throw new Error('데모 로그인이 허용되지 않았습니다.');
    }
    if (auth?.currentUser) await signOut(auth);
    localStorage.setItem('careerfit_role', nextRole);
    setUser(null);
    setRole(nextRole);
    return nextRole;
  };

  const logout = async () => {
    if (user && auth) await signOut(auth);
    localStorage.removeItem('careerfit_role');
    setUser(null);
    setRole(null);
  };

  const value = useMemo(() => ({ user, role, loading, demoModeEnabled, firebaseAuthEnabled, loginWithEmail, loginDemo, logout }), [user, role, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
