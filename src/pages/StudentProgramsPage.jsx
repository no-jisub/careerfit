import { useAuth } from '../auth/AuthContext';
import StudentProgramSection from '../components/StudentProgramSection';
import { PageIntro } from '../components/UI';
import { useApp } from '../context/AppContext';
import { DEMO_STUDENT_ID } from '../utils/demoInteraction';

export default function StudentProgramsPage() {
  const { students, notify } = useApp();
  const { user } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);

  if (!student) return <div className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</div>;

  return <div className="student-page student-programs-page">
    <PageIntro icon="layers" title="비교과 프로그램" description="현재 참여할 수 있는 프로그램과 나에게 맞는 추천을 한곳에서 비교하세요." />
    <StudentProgramSection student={student} notify={notify} />
  </div>;
}
