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
import { resolveFollowUpStatus, toDateKey } from './utils/date';
import { useAuth } from './auth/AuthContext';
import { saveCareerRecords, subscribeCareerData } from './services/firebaseDataService';
import { firestoreSyncEnabled } from './lib/firebase';

const AppContext = createContext(null);
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
};

export function useApp() { return useContext(AppContext); }

function AppProvider({ children }) {
  const { user, role } = useAuth();
  const syncingRemoteData = firestoreSyncEnabled && Boolean(user);
  const [students, setStudents] = useState(() => syncingRemoteData ? [] : read('careerfit_students', initialStudents).map(student => student.appointment && !student.appointmentDate ? { ...student, appointmentDate: toDateKey() } : student));
  const [consultations, setConsultations] = useState(() => syncingRemoteData ? [] : read('careerfit_consultations', initialConsultations));
  const [followUps, setFollowUps] = useState(() => syncingRemoteData ? [] : read('careerfit_followups', initialFollowUps).map(followUp => ({ ...followUp, status: resolveFollowUpStatus(followUp) })));
  const [toast, setToast] = useState('');
  const [draftForm, setDraftForm] = useState(null);
  const [dataLoading, setDataLoading] = useState(syncingRemoteData);

  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_students', JSON.stringify(students)); }, [students, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_consultations', JSON.stringify(consultations)); }, [consultations, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_followups', JSON.stringify(followUps)); }, [followUps, syncingRemoteData]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => {
    if (!syncingRemoteData) {
      setDataLoading(false);
      return undefined;
    }
    const loaded = new Set();
    const markLoaded = name => {
      loaded.add(name);
      if (loaded.size === 3) setDataLoading(false);
    };
    return subscribeCareerData(
      { user, role },
      {
        students: items => { setStudents(items); markLoaded('students'); },
        consultations: items => { setConsultations(items); markLoaded('consultations'); },
        followUps: items => { setFollowUps(items.map(followUp => ({ ...followUp, status: resolveFollowUpStatus(followUp) }))); markLoaded('followUps'); },
      },
      () => { setDataLoading(false); setToast('Firebase 데이터를 불러오지 못했습니다. 권한을 확인해 주세요.'); },
    );
  }, [user, role, syncingRemoteData]);

  const persistRecords = async (name, records) => {
    if (!user) return records;
    const enriched = records.map(record => {
      const student = students.find(item => item.id === record.studentId);
      if (name === 'students') return { ...record, counselorUid: record.counselorUid || user.uid };
      if (name === 'consultations') return { ...record, counselorUid: record.counselorUid || user.uid, studentUid: record.studentUid || student?.uid || '', studentVisible: record.studentVisible ?? true };
      if (name === 'followUps') return { ...record, ownerUid: record.ownerUid || user.uid, assigneeUid: record.assigneeUid || (record.owner === '학생' ? student?.uid || '' : user.uid) };
      return record;
    });
    try {
      await saveCareerRecords(name, enriched);
      return enriched;
    } catch (error) {
      setToast('Firebase 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      throw error;
    }
  };

  const value = useMemo(() => ({ students, setStudents, consultations, setConsultations, followUps, setFollowUps, persistRecords, toast, notify: setToast, draftForm, setDraftForm }), [students, consultations, followUps, toast, draftForm, user]);
  if (dataLoading) return <main className="app-loading" role="status">상담 데이터를 불러오고 있어요...</main>;
  return <AppContext.Provider value={value}>{children}{toast && <div className="toast" role="status" aria-live="polite"><span>✓</span>{toast}</div>}</AppContext.Provider>;
}

function CounselorRoutes() {
  const { logout } = useAuth();
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
  const { user, role, loading } = useAuth();
  if (loading) return <main className="app-loading" role="status">로그인 정보를 확인하고 있어요...</main>;
  const dataSessionKey = firestoreSyncEnabled && user ? `firebase:${user.uid}` : 'demo';
  return <AppProvider key={dataSessionKey}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/student" element={role === 'student' ? <StudentMyPage /> : <Navigate to="/login" replace />} />
    <Route path="/*" element={role === 'counselor' || role === 'admin' ? <CounselorRoutes /> : <Navigate to="/login" replace />} />
  </Routes></AppProvider>;
}
