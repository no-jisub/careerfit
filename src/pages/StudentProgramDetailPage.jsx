import { Link, useParams } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { EmptyState } from '../components/UI';
import { PROGRAM_STATUS_LABELS, resolveProgramStatus } from '../utils/programs';

export default function StudentProgramDetailPage() {
  const { programId } = useParams();
  const { programs } = useApp();
  const { user, logout } = useAuth();
  const program = programs.find(item => item.id === programId);
  const effectiveStatus = program ? resolveProgramStatus(program) : '';

  return <div className="student-portal student-program-detail-page">
    <header>
      <Link className="brand" to="/student"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></Link>
      <div><strong>{user?.displayName || '학생'}</strong><button className="text-button" onClick={logout}>로그아웃</button></div>
    </header>
    <main>
      <Link className="student-program-back" to="/student"><Icon name="arrow" size={16} />학생 홈으로</Link>
      {!program ? <EmptyState title="프로그램을 찾을 수 없습니다" description="프로그램 목록이 갱신되었거나 더 이상 제공되지 않는 정보입니다." action={<Link className="button primary" to="/student">학생 홈으로 돌아가기</Link>} /> : <>
        <section className="student-program-detail-hero">
          <div className="student-program-detail-heading">
            <div><span className="tag">{program.type}</span><span className={`program-status status-${effectiveStatus}`}>{PROGRAM_STATUS_LABELS[effectiveStatus]}</span></div>
            <span className="eyebrow">{program.source || program.department}</span>
            <h1>{program.name}</h1>
            <p>{program.description}</p>
            <div className="program-tags">{program.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          </div>
          <aside className="card student-program-application-card">
            <span>신청 정보</span>
            <strong>{program.recruit}</strong>
            <p>{program.sourceStatus ? `원본 상태 · ${program.sourceStatus}` : PROGRAM_STATUS_LABELS[effectiveStatus]}</p>
            <a className="button primary" href={program.sourceUrl || program.applicationUrl} target="_blank" rel="noreferrer">원본 사이트에서 확인 <Icon name="external" size={16} /></a>
            <small>실제 신청 가능 여부와 최신 일정은 강남대학교 원본 사이트에서 최종 확인해 주세요.</small>
          </aside>
        </section>

        {program.dataWarning && <div className="student-program-data-warning" role="note"><Icon name="alert" size={18} /><div><strong>원본 일정 확인 필요</strong><p>{program.dataWarning}</p></div></div>}

        <div className="student-program-detail-grid">
          <section className="card student-program-detail-section">
            <span className="eyebrow">운영 정보</span>
            <h2>프로그램 일정과 참여 조건</h2>
            <dl>
              <div><dt>모집 기간</dt><dd>{program.recruit}</dd></div>
              <div><dt>운영 기간</dt><dd>{program.period}</dd></div>
              <div><dt>세부 일정</dt><dd>{program.schedule || '원본 사이트 확인'}</dd></div>
              <div><dt>운영 방식</dt><dd>{program.mode}</dd></div>
              <div><dt>장소</dt><dd>{program.location || '원본 사이트 확인'}</dd></div>
              <div><dt>신청 대상</dt><dd>{program.target || '강남대학교 재학생'}</dd></div>
              <div><dt>모집 인원</dt><dd>{program.capacity ? `${program.currentApplicants || 0} / ${program.capacity}명` : '원본 사이트 확인'}</dd></div>
              <div><dt>마일리지</dt><dd>{program.mileage ? `${program.mileage}점` : '없음 또는 미표시'}</dd></div>
            </dl>
          </section>
          <section className="card student-program-detail-section">
            <span className="eyebrow">추천 안내</span>
            <h2>이런 준비에 도움이 됩니다</h2>
            <p className="student-program-detail-reason"><Icon name="spark" size={19} />{program.reason}</p>
            <dl>
              <div><dt>담당 부서</dt><dd>{program.department}</dd></div>
              <div><dt>문의</dt><dd>{program.contact || '대학일자리플러스센터'}</dd></div>
              {program.contactEmail && <div><dt>이메일</dt><dd><a href={`mailto:${program.contactEmail}`}>{program.contactEmail}</a></dd></div>}
              <div><dt>원본 프로그램 번호</dt><dd>{program.externalId || '-'}</dd></div>
            </dl>
          </section>
        </div>
        <p className="student-program-source-note">2026년 7월 23일 기준 강남대학교 대학일자리플러스센터 공개 정보를 바탕으로 구성했습니다. CareerFit은 신청을 직접 접수하지 않습니다.</p>
      </>}
    </main>
    <footer><div><strong>커리어핏</strong><span>학생 상담 지원 서비스 · 문의 대학일자리플러스센터</span></div></footer>
  </div>;
}
