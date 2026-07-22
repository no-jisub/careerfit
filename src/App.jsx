import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { initialStudents } from './data/students';
import { initialConsultations } from './data/consultations';
import { initialConsultationSummaries } from './data/consultationSummaries';
import { initialFollowUps } from './data/followUps';
import { initialAppointments } from './data/appointments';
import { initialCounselorAvailability } from './data/counselorAvailability';
import { initialUsers } from './data/users';
import { initialStudentRegistrations } from './data/studentRegistrations';
import { initialPrograms } from './data/programs';
import { initialProgramRecommendations } from './data/programRecommendations';
import { resolveFollowUpStatus, toDateKey } from './utils/date';
import { useAuth } from './auth/AuthContext';
import { deleteCareerDocument, saveCareerDocument, saveCareerDocumentGroup, subscribeCareerData } from './services/firebaseDataService';
import { firestoreSyncEnabled } from './lib/firebase';
import { isOperationsStaff } from './utils/roles';
import { createProgramRecommendationStore, createProgramStore, restoreProgramRecommendationStore, restoreProgramStore } from './utils/programs';
import { restoreCounselorAvailabilityStore } from './utils/appointments';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const AccountStatusPage = lazy(() => import('./pages/AccountStatusPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const StudentDetailPage = lazy(() => import('./pages/StudentDetailPage'));
const ConsultationFormPage = lazy(() => import('./pages/ConsultationFormPage'));
const ConsultationsPage = lazy(() => import('./pages/ConsultationsPage'));
const FollowUpsPage = lazy(() => import('./pages/FollowUpsPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'));
const StudentMyPage = lazy(() => import('./pages/StudentMyPage'));
const StudentWithdrawalPage = lazy(() => import('./pages/StudentWithdrawalPage'));
const StudentAppointmentSlotsPage = lazy(() => import('./pages/StudentAppointmentSlotsPage'));
const StudentAppointmentRequestPage = lazy(() => import('./pages/StudentAppointmentRequestPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));

const AppContext = createContext(null);
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
};

export function useApp() { return useContext(AppContext); }

function RouteScrollManager() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return null;
}

function AppProvider({ children }) {
  const { user, role } = useAuth();
  const syncingRemoteData = firestoreSyncEnabled && Boolean(user) && Boolean(role);
  const [users, setUsers] = useState(() => syncingRemoteData ? [] : read('careerfit_users', initialUsers));
  const [studentRegistrations, setStudentRegistrations] = useState(() => syncingRemoteData ? [] : read('careerfit_student_registrations', initialStudentRegistrations));
  const [students, setStudents] = useState(() => syncingRemoteData ? [] : read('careerfit_students', initialStudents).map(student => student.appointment && !student.appointmentDate ? { ...student, appointmentDate: toDateKey() } : student));
  const [consultations, setConsultations] = useState(() => syncingRemoteData ? [] : read('careerfit_consultations', initialConsultations));
  const [consultationSummaries, setConsultationSummaries] = useState(() => syncingRemoteData ? [] : read('careerfit_consultation_summaries', initialConsultationSummaries));
  const [consultationNotes, setConsultationNotes] = useState(() => syncingRemoteData ? [] : read('careerfit_consultation_notes', []));
  const [consultationDrafts, setConsultationDrafts] = useState(() => syncingRemoteData ? [] : read('careerfit_consultation_drafts', []));
  const [followUps, setFollowUps] = useState(() => syncingRemoteData ? [] : read('careerfit_followups', initialFollowUps).map(followUp => ({ ...followUp, status: resolveFollowUpStatus(followUp) })));
  const [appointments, setAppointments] = useState(() => syncingRemoteData ? [] : read('careerfit_appointments', initialAppointments));
  const [counselorAvailability, setCounselorAvailability] = useState(() => syncingRemoteData ? [] : restoreCounselorAvailabilityStore(read('careerfit_counselor_availability', initialCounselorAvailability), initialCounselorAvailability));
  const [notifications, setNotifications] = useState(() => syncingRemoteData ? [] : read('careerfit_notifications', []));
  const [programs, setPrograms] = useState(() => restoreProgramStore(read('careerfit_program_store', null), initialPrograms));
  const [programRecommendations, setProgramRecommendations] = useState(() => restoreProgramRecommendationStore(read('careerfit_program_recommendation_store', null), initialProgramRecommendations));
  const [toast, setToast] = useState('');
  const [draftForm, setDraftForm] = useState(null);
  const [dataLoading, setDataLoading] = useState(syncingRemoteData);

  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_students', JSON.stringify(students)); }, [students, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_consultations', JSON.stringify(consultations)); }, [consultations, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_consultation_summaries', JSON.stringify(consultationSummaries)); }, [consultationSummaries, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_consultation_notes', JSON.stringify(consultationNotes)); }, [consultationNotes, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_consultation_drafts', JSON.stringify(consultationDrafts)); }, [consultationDrafts, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_followups', JSON.stringify(followUps)); }, [followUps, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_appointments', JSON.stringify(appointments)); }, [appointments, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_counselor_availability', JSON.stringify(counselorAvailability)); }, [counselorAvailability, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_notifications', JSON.stringify(notifications)); }, [notifications, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_users', JSON.stringify(users)); }, [users, syncingRemoteData]);
  useEffect(() => { if (!syncingRemoteData) localStorage.setItem('careerfit_student_registrations', JSON.stringify(studentRegistrations)); }, [studentRegistrations, syncingRemoteData]);
  useEffect(() => { localStorage.setItem('careerfit_program_store', JSON.stringify(createProgramStore(programs))); }, [programs]);
  useEffect(() => { localStorage.setItem('careerfit_program_recommendation_store', JSON.stringify(createProgramRecommendationStore(programRecommendations))); }, [programRecommendations]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!role) setDraftForm(null); }, [role]);

  useEffect(() => {
    if (!syncingRemoteData) {
      setDataLoading(false);
      return undefined;
    }
    const loaded = new Set();
    const markLoaded = name => {
      loaded.add(name);
      const expectedCount = isOperationsStaff(role) ? 11 : 6;
      if (loaded.size === expectedCount) setDataLoading(false);
    };
    return subscribeCareerData(
      { user, role },
      {
        users: items => { setUsers(items); markLoaded('users'); },
        studentRegistrations: items => { setStudentRegistrations(items); markLoaded('studentRegistrations'); },
        students: items => { setStudents(items); markLoaded('students'); },
        consultations: items => { setConsultations(items); markLoaded('consultations'); },
        consultationSummaries: items => { setConsultationSummaries(items); markLoaded('consultationSummaries'); },
        consultationNotes: items => { setConsultationNotes(items); markLoaded('consultationNotes'); },
        consultationDrafts: items => { setConsultationDrafts(items); markLoaded('consultationDrafts'); },
        followUps: items => { setFollowUps(items.map(followUp => ({ ...followUp, status: resolveFollowUpStatus(followUp) }))); markLoaded('followUps'); },
        appointments: items => { setAppointments(items); markLoaded('appointments'); },
        counselorAvailability: items => { setCounselorAvailability(items); markLoaded('counselorAvailability'); },
        notifications: items => { setNotifications(items); markLoaded('notifications'); },
      },
      () => { setDataLoading(false); setToast('Firebase 데이터를 불러오지 못했습니다. 권한을 확인해 주세요.'); },
    );
  }, [user, role, syncingRemoteData]);

  const enrichDocument = (name, record) => {
    if (!user) return record;
    const student = students.find(item => item.id === record.studentId);
    if (name === 'students') return { ...record, counselorUid: record.counselorUid || user.uid };
    if (name === 'consultationNotes') return { ...record, counselorUid: record.counselorUid || user.uid };
    if (name === 'consultationDrafts') return { ...record, counselorUid: record.counselorUid || user.uid };
    if (name === 'notifications') return { ...record, recipientUid: record.recipientUid || user.uid };
    if (name === 'consultations') return { ...record, counselorUid: record.counselorUid || user.uid, studentUid: record.studentUid || student?.uid || '', studentVisible: record.studentVisible ?? true };
    if (name === 'consultationSummaries') return { ...record, counselorUid: record.counselorUid || user.uid, studentUid: record.studentUid || student?.uid || '' };
    if (name === 'followUps') return { ...record, ownerUid: record.ownerUid || user.uid, assigneeUid: record.assigneeUid || (record.owner === '학생' ? student?.uid || '' : user.uid) };
    if (name === 'appointments') return { ...record, counselorUid: record.counselorUid || student?.counselorUid || user.uid, studentUid: record.studentUid || student?.uid || '' };
    if (name === 'counselorAvailability') return { ...record, counselorUid: record.counselorUid || user.uid };
    return record;
  };

  const persistDocument = async (name, record) => {
    if (!user) return record;
    const enriched = enrichDocument(name, record);
    try {
      await saveCareerDocument(name, enriched);
      return enriched;
    } catch (error) {
      setToast('Firebase 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      throw error;
    }
  };

  const persistDocumentGroup = async entries => {
    if (!user) return entries;
    const enriched = entries.map(({ name, record }) => ({ name, record: enrichDocument(name, record) }));
    try {
      await saveCareerDocumentGroup(enriched);
      return enriched;
    } catch (error) {
      setToast('Firebase 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      throw error;
    }
  };

  const removeDocument = async (name, id) => {
    if (user) await deleteCareerDocument(name, id);
  };

  const resetProgramDemo = () => {
    setPrograms(initialPrograms);
    setProgramRecommendations(initialProgramRecommendations);
  };

  const resetDemoData = () => {
    setUsers(initialUsers);
    setStudentRegistrations(initialStudentRegistrations);
    setStudents(initialStudents.map(student => student.appointment && !student.appointmentDate ? { ...student, appointmentDate: toDateKey() } : student));
    setConsultations(initialConsultations);
    setConsultationSummaries(initialConsultationSummaries);
    setConsultationNotes([]);
    setConsultationDrafts([]);
    setFollowUps(initialFollowUps.map(followUp => ({ ...followUp, status: resolveFollowUpStatus(followUp) })));
    setAppointments(initialAppointments);
    setCounselorAvailability(initialCounselorAvailability);
    setNotifications([]);
    setPrograms(initialPrograms);
    setProgramRecommendations(initialProgramRecommendations);
    setDraftForm(null);
    setToast('발표용 데모 데이터를 처음 상태로 되돌렸습니다.');
  };

  const value = useMemo(() => ({ users, setUsers, studentRegistrations, setStudentRegistrations, students, setStudents, consultations, setConsultations, consultationSummaries, setConsultationSummaries, consultationNotes, setConsultationNotes, consultationDrafts, setConsultationDrafts, followUps, setFollowUps, appointments, setAppointments, counselorAvailability, setCounselorAvailability, notifications, setNotifications, programs, setPrograms, programRecommendations, setProgramRecommendations, resetProgramDemo, resetDemoData, persistDocument, persistDocumentGroup, removeDocument, toast, notify: setToast, draftForm, setDraftForm }), [users, studentRegistrations, students, consultations, consultationSummaries, consultationNotes, consultationDrafts, followUps, appointments, counselorAvailability, notifications, programs, programRecommendations, toast, draftForm, user]);
  if (dataLoading) return <main className="app-loading" role="status">상담 데이터를 불러오고 있어요...</main>;
  return <AppContext.Provider value={value}>{children}{toast && <div className="toast" role="status" aria-live="polite"><span>✓</span>{toast}</div>}</AppContext.Provider>;
}

function CounselorRoutes() {
  const { logout, role } = useAuth();
  return <Routes>
    <Route element={<AppLayout logout={logout} />}>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="students" element={<StudentsPage />} />
      <Route path="students/:studentId" element={<StudentDetailPage />} />
      <Route path="students/:studentId/consultation/new" element={<ConsultationFormPage />} />
      <Route path="consultations" element={<ConsultationsPage />} />
      <Route path="follow-ups" element={<FollowUpsPage />} />
      <Route path="appointments" element={<AppointmentsPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="programs" element={<ProgramsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="admin/users" element={isOperationsStaff(role) ? <AdminUsersPage /> : <Navigate to="/dashboard" replace />} />
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>
  </Routes>;
}

export default function App() {
  const { user, role, loading } = useAuth();
  if (loading) return <main className="app-loading" role="status">로그인 정보를 확인하고 있어요...</main>;
  const dataSessionKey = firestoreSyncEnabled && user && role ? `firebase:${user.uid}:${role}` : user ? `pending:${user.uid}` : 'demo';
  return <AppProvider key={dataSessionKey}><RouteScrollManager /><Suspense fallback={<main className="app-loading" role="status">화면을 준비하고 있어요...</main>}><Routes>
    <Route path="/login" element={role ? <Navigate to={role === 'student' ? '/student' : '/dashboard'} replace /> : user ? <Navigate to="/account-status" replace /> : <LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/account-status" element={<AccountStatusPage />} />
    <Route path="/student" element={role === 'student' ? <StudentMyPage /> : <Navigate to="/login" replace />} />
    <Route path="/student/withdrawal" element={role === 'student' ? <StudentWithdrawalPage /> : <Navigate to="/login" replace />} />
    <Route path="/student/appointments" element={role === 'student' ? <StudentAppointmentSlotsPage /> : <Navigate to="/login" replace />} />
    <Route path="/student/appointments/request/:availabilityId" element={role === 'student' ? <StudentAppointmentRequestPage /> : <Navigate to="/login" replace />} />
    <Route path="/student/appointments/change/:appointmentId/:availabilityId" element={role === 'student' ? <StudentAppointmentRequestPage /> : <Navigate to="/login" replace />} />
    <Route path="/student/notifications" element={role === 'student' ? <NotificationsPage /> : <Navigate to="/login" replace />} />
    <Route path="/*" element={isOperationsStaff(role) ? <CounselorRoutes /> : <Navigate to="/login" replace />} />
  </Routes></Suspense></AppProvider>;
}
