import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { initialStudents } from './data/students';
import { initialConsultations } from './data/consultations';
import { initialFollowUps } from './data/followUps';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import ConsultationFormPage from './pages/ConsultationFormPage';
import ConsultationsPage from './pages/ConsultationsPage';
import FollowUpsPage from './pages/FollowUpsPage';
import ProgramsPage from './pages/ProgramsPage';
import StudentMyPage from './pages/StudentMyPage';
import SettingsPage from './pages/SettingsPage';

const AppContext = createContext(null);
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
};

export function useApp() { return useContext(AppContext); }

function AppProvider({ children }) {
  const [students, setStudents] = useState(() => read('careerfit_students', initialStudents));
  const [consultations, setConsultations] = useState(() => read('careerfit_consultations', initialConsultations));
  const [followUps, setFollowUps] = useState(() => read('careerfit_followups', initialFollowUps));
  const [toast, setToast] = useState('');
  const [draftForm, setDraftForm] = useState(null);

  useEffect(() => localStorage.setItem('careerfit_students', JSON.stringify(students)), [students]);
  useEffect(() => localStorage.setItem('careerfit_consultations', JSON.stringify(consultations)), [consultations]);
  useEffect(() => localStorage.setItem('careerfit_followups', JSON.stringify(followUps)), [followUps]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);

  const value = useMemo(() => ({ students, setStudents, consultations, setConsultations, followUps, setFollowUps, toast, notify: setToast, draftForm, setDraftForm }), [students, consultations, followUps, toast, draftForm]);
  return <AppContext.Provider value={value}>{children}{toast && <div className="toast" role="status" aria-live="polite"><span>✓</span>{toast}</div>}</AppContext.Provider>;
}

function CounselorRoutes() {
  const logout = () => {
    localStorage.removeItem('careerfit_role');
    window.location.hash = '/login';
    window.location.reload();
  };
  return <Routes>
    <Route element={<AppLayout logout={logout} />}>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="students" element={<StudentsPage />} />
      <Route path="students/:studentId" element={<StudentDetailPage />} />
      <Route path="students/:studentId/consultation/new" element={<ConsultationFormPage />} />
      <Route path="consultations" element={<ConsultationsPage />} />
      <Route path="follow-ups" element={<FollowUpsPage />} />
      <Route path="programs" element={<ProgramsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>
  </Routes>;
}

export default function App() {
  const role = localStorage.getItem('careerfit_role');
  return <AppProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/student" element={role === 'student' ? <StudentMyPage /> : <Navigate to="/login" replace />} />
    <Route path="/*" element={role === 'counselor' ? <CounselorRoutes /> : <Navigate to="/login" replace />} />
  </Routes></AppProvider>;
}
