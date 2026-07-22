import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { useAuth } from '../auth/AuthContext';

export default function ConsultationsPage() {
  const { consultations, setConsultations, students, recordDeletionRequests, setRecordDeletionRequests, persistDocumentGroup, notify } = useApp();
  const { user, profile } = useAuth();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [visibility, setVisibility] = useState('all');
  const types = [...new Set(consultations.map(item => item.type))];
  const filtered = useMemo(() => consultations.filter(item => {
    const student = students.find(candidate => candidate.id === item.studentId);
    const keyword = query.trim().toLowerCase();
    return (!keyword || [student?.name, student?.studentNo, item.purpose, item.summary, item.guidance].some(value => value?.toLowerCase().includes(keyword)))
      && (type === 'all' || item.type === type)
      && (visibility === 'all' || (visibility === 'public' ? item.studentVisible !== false : item.studentVisible === false));
  }).sort((a, b) => b.date.localeCompare(a.date)), [consultations, students, query, type, visibility]);
  const pendingRequests = recordDeletionRequests.filter(item => item.status === 'pending');
  const reviewDeletion = async (request, decision) => {
    const student = students.find(item => item.id === request.studentId);
    const reviewerUid = user?.uid || profile?.id || '';
    if (student?.counselorUid && student.counselorUid !== reviewerUid) { notify('현재 담당 상담사만 이 요청을 처리할 수 있습니다.'); return; }
    const resolutionReason = decision === 'rejected' ? window.prompt('반려 사유를 입력해 주세요.') : '';
    if (decision === 'rejected' && !resolutionReason?.trim()) return;
    const now = new Date().toISOString();
    const updatedRequest = { ...request, status: decision, resolutionReason: resolutionReason?.trim() || '', resolvedAt: now, resolvedBy: reviewerUid, updatedAt: now };
    const consultation = consultations.find(item => item.id === request.consultationId);
    const updatedConsultation = decision === 'approved' && consultation ? { ...consultation, studentVisible: false, deletionStatus: 'approved', deletionApprovedAt: now, updatedAt: now } : null;
    try {
      await persistDocumentGroup([{ name: 'recordDeletionRequests', record: updatedRequest }, ...(updatedConsultation ? [{ name: 'consultations', record: updatedConsultation }] : [])]);
      setRecordDeletionRequests(items => items.map(item => item.id === updatedRequest.id ? updatedRequest : item));
      if (updatedConsultation) setConsultations(items => items.map(item => item.id === updatedConsultation.id ? updatedConsultation : item));
      notify(`상담 기록 삭제 요청을 ${decision === 'approved' ? '승인' : '반려'}했습니다.`);
    } catch { /* 공통 오류 안내를 사용합니다. */ }
  };
  return <><PageIntro eyebrow="상담 기록" title="상담의 흐름을 이어가세요" description="최근 작성된 상담 기록을 학생별로 확인할 수 있어요." action={<Link className="button primary" to="/students?select=consultation"><Icon name="plus" size={18} />상담 기록 작성</Link>} />{pendingRequests.length > 0 && <section className="card deletion-request-card"><div className="section-header"><div><span className="eyebrow">학생 요청</span><h2>상담 기록 삭제 검토 {pendingRequests.length}건</h2></div></div><div className="deletion-request-list">{pendingRequests.map(request => { const student = students.find(item => item.id === request.studentId); const consultation = consultations.find(item => item.id === request.consultationId); return <article key={request.id}><div><strong>{student?.name || '학생'} · {consultation?.purpose || '상담 기록'}</strong><span>{request.reason || '요청 사유 없음'} · {request.requestedAt?.slice(0, 10)}</span></div><div><button className="button secondary small" onClick={() => reviewDeletion(request, 'approved')}>승인</button><button className="text-button danger" onClick={() => reviewDeletion(request, 'rejected')}>반려</button></div></article>; })}</div></section>}<section className="filter-card" aria-label="상담 기록 검색 및 필터"><label className="search-field"><span className="sr-only">상담 기록 검색</span><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="학생, 학번, 상담 내용 검색" /></label><label><span>상담 유형</span><select value={type} onChange={event => setType(event.target.value)}><option value="all">전체 유형</option>{types.map(item => <option key={item}>{item}</option>)}</select></label><label><span>학생 공개</span><select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="all">전체</option><option value="public">공개</option><option value="private">비공개</option></select></label><button className="text-button" onClick={() => { setQuery(''); setType('all'); setVisibility('all'); }}>필터 초기화</button></section><section className="card"><div className="list-toolbar"><div><h2>상담 기록 <span>{filtered.length}</span></h2><p>학생에게 공개되는지 함께 확인하세요.</p></div></div>{filtered.length ? <div className="consultation-index">{filtered.map(c => { const student = students.find(s => s.id === c.studentId); if (!student) return null; return <Link to={`/students/${student.id}`} key={c.id}><time>{c.date}</time><div><span className="tag">{c.type}</span><span className={`visibility-tag ${c.studentVisible === false ? 'private' : ''}`}>{c.studentVisible === false ? '학생 비공개' : '학생 공개'}</span><h2>{student.name} · {c.purpose}</h2><p>{c.summary}</p></div><Icon name="chevron" /></Link>; })}</div> : <EmptyState title="조건에 맞는 상담 기록이 없습니다" description="검색어나 필터를 바꾸어 보세요." />}</section></>;
}
