import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { PageIntro } from '../components/UI';

export default function ConsultationsPage() {
  const { consultations, students } = useApp();
  return <><PageIntro eyebrow="상담 기록" title="상담의 흐름을 이어가세요" description="최근 작성된 상담 기록을 학생별로 확인할 수 있어요." action={<Link className="button primary" to="/students?select=consultation"><Icon name="plus" size={18} />상담 기록 작성</Link>} /><section className="card"><div className="consultation-index">{[...consultations].sort((a,b) => b.date.localeCompare(a.date)).map(c => { const student = students.find(s => s.id === c.studentId); return <Link to={`/students/${student.id}`} key={c.id}><time>{c.date}</time><div><span className="tag">{c.type}</span><h2>{student.name} · {c.purpose}</h2><p>{c.summary}</p></div><Icon name="chevron" /></Link>; })}</div></section></>;
}
