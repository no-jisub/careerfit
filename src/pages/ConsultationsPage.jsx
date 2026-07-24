import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';

const fullDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});
const weekdayFormatter = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' });

function parseDate(date) {
  return new Date(`${date}T00:00:00`);
}

function getDateTabLabel(date) {
  const [, month, day] = date.split('-').map(Number);
  return {
    short: `${month}.${day}`,
    weekday: weekdayFormatter.format(parseDate(date)),
    full: fullDateFormatter.format(parseDate(date)),
  };
}

export default function ConsultationsPage() {
  const { consultations, students } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [visibility, setVisibility] = useState('all');
  const [selectedByStudent, setSelectedByStudent] = useState({});
  const types = [...new Set(consultations.map(item => item.type))];
  const filtered = useMemo(() => consultations.filter(item => {
    const student = students.find(candidate => candidate.id === item.studentId);
    const keyword = query.trim().toLowerCase();
    return (!keyword || [student?.name, student?.studentNo, item.purpose, item.summary, item.guidance].some(value => value?.toLowerCase().includes(keyword)))
      && (type === 'all' || item.type === type)
      && (visibility === 'all' || (visibility === 'public' ? item.studentVisible !== false : item.studentVisible === false));
  }).sort((a, b) => b.date.localeCompare(a.date)), [consultations, students, query, type, visibility]);
  const studentGroups = useMemo(() => {
    const groups = new Map();
    filtered.forEach(record => {
      const student = students.find(item => item.id === record.studentId);
      if (!student) return;
      if (!groups.has(student.id)) groups.set(student.id, { student, records: [] });
      groups.get(student.id).records.push(record);
    });
    return [...groups.values()].sort((a, b) => b.records[0].date.localeCompare(a.records[0].date));
  }, [filtered, students]);

  return <>
    <PageIntro icon="note" eyebrow="상담 기록" title="학생별 상담 흐름을 이어가세요" description="한 학생의 상담을 한곳에 모으고, 날짜를 선택해 회차별 기록과 검토 이력을 확인하세요." action={<Link className="button primary" to="/students?select=consultation"><Icon name="plus" size={18} />상담 기록 작성</Link>} />
    <section className="filter-card" aria-label="상담 기록 검색 및 필터"><label className="search-field"><span className="sr-only">상담 기록 검색</span><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="학생, 학번, 상담 내용 검색" /></label><label><span>상담 유형</span><select value={type} onChange={event => setType(event.target.value)}><option value="all">전체 유형</option>{types.map(item => <option key={item}>{item}</option>)}</select></label><label><span>학생 공개</span><select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="all">전체</option><option value="public">공개</option><option value="private">비공개</option></select></label><button className="text-button" onClick={() => { setQuery(''); setType('all'); setVisibility('all'); }}>필터 초기화</button></section>
    <section className="consultation-directory" aria-labelledby="consultation-directory-title">
      <div className="card consultation-directory-heading">
        <div><span className="eyebrow">Student record archive</span><h2 id="consultation-directory-title">학생별 상담 기록</h2><p>학생을 찾은 뒤 날짜만 바꾸면 이전 상담 맥락을 끊김 없이 비교할 수 있어요.</p></div>
        <div className="consultation-directory-count"><span><strong>{studentGroups.length}</strong>명</span><i aria-hidden="true" /><span><strong>{filtered.length}</strong>건</span></div>
      </div>
      {studentGroups.length ? <div className="consultation-student-list">{studentGroups.map(({ student, records }) => {
        const selected = records.find(record => record.id === selectedByStudent[student.id]) || records[0];
        const selectedDate = getDateTabLabel(selected.date);
        return <article className="card consultation-student-card" key={student.id}>
          <header className="consultation-student-head">
            <span className="consultation-student-avatar" aria-hidden="true">{student.name.slice(1, 3)}</span>
            <div><h2>{student.name}</h2><p>{student.studentNo} · {student.department} · {student.grade}</p></div>
            <dl><div><dt>누적 상담</dt><dd>{records.length}회</dd></div><div><dt>최근 상담</dt><dd>{getDateTabLabel(records[0].date).short}</dd></div></dl>
            <Link className="button secondary small" to={`/students/${student.id}`}>학생 전체 기록 <Icon name="arrow" size={15} /></Link>
          </header>
          <div className="consultation-date-navigation">
            <div><span>상담 날짜 선택</span><small>최신순</small></div>
            <div role="tablist" aria-label={`${student.name} 학생 상담 날짜`}>
              {records.map(record => {
                const date = getDateTabLabel(record.date);
                const active = record.id === selected.id;
                return <button id={`consultation-tab-${record.id}`} type="button" role="tab" aria-selected={active} aria-controls={`consultation-panel-${student.id}`} className={active ? 'active' : ''} onClick={() => setSelectedByStudent(current => ({ ...current, [student.id]: record.id }))} key={record.id}>
                  <time dateTime={record.date}><strong>{date.short}</strong><span>{date.weekday}</span></time>
                  <small>{record.type}</small>
                </button>;
              })}
            </div>
          </div>
          <section className="consultation-record-preview" id={`consultation-panel-${student.id}`} role="tabpanel" aria-labelledby={`consultation-tab-${selected.id}`}>
            <div className="consultation-record-preview-head">
              <div><time dateTime={selected.date}>{selectedDate.full}</time><div><span className="tag">{selected.type}</span><span className={`visibility-tag ${selected.studentVisible === false ? 'private' : ''}`}>{selected.studentVisible === false ? '학생 비공개' : '학생 공개'}</span>{selected.aiReview && <span className="ai-reviewed-tag"><Icon name="shield" size={12} />근거 검토 완료</span>}</div></div>
              <Link className="button secondary small" to={`/students/${student.id}?consultation=${selected.id}`}>상세 기록 보기 <Icon name="chevron" size={15} /></Link>
            </div>
            <h3>{selected.purpose}</h3>
            <p className="consultation-record-summary">{selected.summary}</p>
            <div className="consultation-record-context">
              {selected.concern && <div><span><Icon name="alert" size={15} />학생의 고민</span><p>{selected.concern}</p></div>}
              <div><span><Icon name="target" size={15} />추천 프로그램</span>{selected.programs?.length ? <ul>{selected.programs.map(program => <li key={program}>{program}</li>)}</ul> : <p className="muted">연결된 프로그램이 없습니다.</p>}</div>
            </div>
            <footer><span>상담 담당자 {selected.counselor || student.counselor || '담당 상담사'}</span><span>{selected.aiReview ? '작성 도우미 활용 · 상담사 검토 완료' : '상담사 직접 작성'}</span></footer>
          </section>
        </article>;
      })}</div> : <section className="card"><EmptyState title="조건에 맞는 상담 기록이 없습니다" description="검색어나 필터를 바꾸어 보세요." /></section>}
    </section>
  </>;
}
