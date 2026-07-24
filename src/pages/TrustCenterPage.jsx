import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { getEvidenceCoverage, summarizeTrustPosture } from '../utils/trust';

const controlCopy = [
  { icon: 'students', label: '접근 격리', title: '담당 학생 단위 최소 권한', text: '상담사는 배정된 학생 문서만 구독하고, 승인·재배정은 관리자에게 분리합니다.', state: '적용 중' },
  { icon: 'lock', label: '전송 보호', title: '직접 식별정보 자동 마스킹', text: 'AI 요청에서 이름·학번·연락처를 제외하고 메모 속 이메일·전화번호·주민번호 형식을 가립니다.', state: '서버 적용' },
  { icon: 'spark', label: 'AI 거버넌스', title: '항목별 근거와 사람의 승인', text: '요약·강점·고민·안내의 근거를 각각 확인해야 최종 기록을 저장할 수 있습니다.', state: '검토 필수' },
  { icon: 'clock', label: '보존 통제', title: '임시 기록 7일 보존 기한', text: '임시 상담 기록에 만료 시각을 부여해 장기 잔존을 방지하고 파기 정책의 근거를 남깁니다.', state: '기한 기록' },
];

const flowSteps = [
  { icon: 'note', title: '상담 메모', text: '내부 원문' },
  { icon: 'lock', title: '식별정보 마스킹', text: '서버 전처리' },
  { icon: 'spark', title: 'AI 초안 + 근거', text: '구조화' },
  { icon: 'check', title: '상담사 검토', text: '사람의 승인' },
  { icon: 'students', title: '선택 공개', text: '학생 포털' },
];

const formatDateTime = value => {
  if (!value) return '기록 없음';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '기록 없음' : date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function TrustCenterPage() {
  const { consultations, consultationSummaries, consultationDrafts, students } = useApp();
  const posture = summarizeTrustPosture({ consultations, summaries: consultationSummaries, drafts: consultationDrafts });
  const aiRecords = consultations
    .filter(item => item.aiReview)
    .map(item => ({ ...item, student: students.find(student => student.id === item.studentId) }))
    .sort((a, b) => String(b.aiReview.reviewedAt).localeCompare(String(a.aiReview.reviewedAt)));
  const reviewedFieldCount = aiRecords.reduce((sum, item) => sum + (item.aiReview.reviewedFields?.length || 0), 0);

  return <div className="trust-center-page">
    <section className="trust-hero">
      <div className="trust-hero-copy">
        <span className="trust-live"><i /> Responsible AI control plane</span>
        <p className="eyebrow">AI 신뢰 센터</p>
        <h1>상담 AI의 안전성을<br />말이 아닌 데이터로 증명합니다</h1>
        <p>민감한 상담정보가 어디까지 전달되고, 어떤 근거로 요약되며, 누가 최종 확인했는지 한 화면에서 추적합니다.</p>
        <div className="trust-hero-actions"><Link className="button primary" to="/students?select=consultation">검증된 상담 기록 만들기 <Icon name="arrow" size={16} /></Link><Link className="button secondary" to="/settings">권한 설계 보기</Link></div>
      </div>
      <div className="trust-score-card" aria-label={`데이터 기반 신뢰 점수 ${posture.score}점`}>
        <div className="trust-score-ring" style={{ '--score': `${posture.score * 3.6}deg` }}><div><strong>{posture.score}</strong><span>/ 100</span></div></div>
        <div><span className={`trust-status ${posture.score >= 90 ? 'good' : 'attention'}`}><Icon name={posture.score >= 90 ? 'check' : 'alert'} size={14} />{posture.status}</span><h2>데이터 기반 신뢰 점수</h2><p>근거 충족 40% · 사람 검토 30% · 마스킹 20% · 임시기록 만료 10%</p></div>
      </div>
    </section>

    <section className="trust-kpi-grid" aria-label="AI 신뢰 핵심 지표">
      <article><span className="trust-kpi-icon purple"><Icon name="spark" /></span><div><small>근거 충족률</small><strong>{posture.averageEvidenceCoverage}<em>%</em></strong><p>AI 상담 {posture.aiCount}건 기준</p></div><i><b style={{ width: `${posture.averageEvidenceCoverage}%` }} /></i></article>
      <article><span className="trust-kpi-icon green"><Icon name="check" /></span><div><small>사람의 검토 완료</small><strong>{posture.humanReviewRate}<em>%</em></strong><p>{posture.reviewedCount}건 · 항목 {reviewedFieldCount}개 확인</p></div><i><b style={{ width: `${posture.humanReviewRate}%` }} /></i></article>
      <article><span className="trust-kpi-icon blue"><Icon name="lock" /></span><div><small>식별정보 마스킹</small><strong>{posture.redactionRate}<em>%</em></strong><p>AI 전송 전 서버 처리</p></div><i><b style={{ width: `${posture.redactionRate}%` }} /></i></article>
      <article><span className="trust-kpi-icon amber"><Icon name="clock" /></span><div><small>임시기록 만료 설정</small><strong>{posture.ttlCoverage}<em>%</em></strong><p>활성 초안 {posture.ttlDraftCount}건</p></div><i><b style={{ width: `${posture.ttlCoverage}%` }} /></i></article>
    </section>

    <section className="trust-section">
      <div className="section-header"><div><span className="eyebrow">Privacy by design</span><h2>민감정보가 이동하는 모든 지점에 통제를 둡니다</h2><p>정책 설명이 아니라 실제 제품 흐름과 연결된 네 가지 통제입니다.</p></div></div>
      <div className="trust-control-grid">{controlCopy.map(item => <article className="card" key={item.label}><div><span><Icon name={item.icon} size={19} /></span><em>{item.state}</em></div><small>{item.label}</small><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
    </section>

    <section className="card trust-flow-card">
      <div className="section-header"><div><span className="eyebrow">Safe-by-default flow</span><h2>상담 메모에서 학생 공개까지</h2><p>원문은 내부에 남고, 검토된 최소 정보만 학생에게 전달됩니다.</p></div><span className="trust-flow-proof"><Icon name="shield" size={16} />5단계 통제</span></div>
      <div className="trust-flow" role="list">{flowSteps.map((step, index) => <div className="trust-flow-step" role="listitem" key={step.title}><span><Icon name={step.icon} size={20} /></span><div><strong>{step.title}</strong><small>{step.text}</small></div>{index < flowSteps.length - 1 && <Icon className="trust-flow-arrow" name="arrow" size={18} />}</div>)}</div>
    </section>

    <section className="trust-audit-grid">
      <div className="card trust-records">
        <div className="section-header"><div><span className="eyebrow">Evidence ledger</span><h2>최근 AI 검토 기록</h2><p>모델 결과보다 근거와 검토자를 중심으로 보여줍니다.</p></div><span className="record-count">{aiRecords.length}건</span></div>
        {aiRecords.length ? <div className="trust-record-list">{aiRecords.slice(0, 6).map(item => {
          const coverage = getEvidenceCoverage(item.aiReview);
          return <Link to={`/students/${item.studentId}`} key={item.id}><span className="record-avatar">{item.student?.name?.slice(0, 1) || '학'}</span><div><strong>{item.student?.name || '담당 학생'} · {item.purpose}</strong><small>{item.date} · {item.aiReview.reviewedBy} 검토</small></div><span className={`coverage-badge ${coverage === 100 ? 'complete' : ''}`}>근거 {coverage}%</span><Icon name="chevron" size={16} /></Link>;
        })}</div> : <div className="trust-empty"><Icon name="shield" size={28} /><strong>아직 AI 검토 기록이 없습니다</strong><p>상담 기록에서 AI 초안을 만들고 항목별 근거를 검토하면 여기에 자동으로 표시됩니다.</p></div>}
      </div>
      <aside className="card trust-activity">
        <div className="section-header"><div><span className="eyebrow">Review trail</span><h2>검토 이력</h2></div></div>
        <div className="trust-timeline">
          {aiRecords.slice(0, 4).map(item => <article key={item.id}><i /><div><strong>{item.aiReview.reviewedBy} 상담사 검토 완료</strong><p>{item.student?.name || '담당 학생'}의 {item.type} 기록 · 근거 {getEvidenceCoverage(item.aiReview)}%</p><time>{formatDateTime(item.aiReview.reviewedAt)}</time></div></article>)}
          {posture.publishedAiCount > 0 && <article><i /><div><strong>학생 공개 요약 {posture.publishedAiCount}건</strong><p>AI 활용 여부와 최종 검토자를 함께 공개했습니다.</p><time>현재 데이터 기준</time></div></article>}
          {!aiRecords.length && <p className="trust-timeline-empty">검토가 완료되면 검토자와 시각이 기록됩니다.</p>}
        </div>
        <div className="trust-disclaimer"><Icon name="alert" size={15} /><p>이 화면은 저장된 운영 데이터의 통제 이행 현황이며 보안 인증 결과를 의미하지 않습니다.</p></div>
      </aside>
    </section>
  </div>;
}
