import { useApp } from '../App';
import { PageIntro } from '../components/UI';
import { useAuth } from '../auth/AuthContext';

export default function SettingsPage() {
  const { notify, resetDemoData } = useApp();
  const { user, demoModeEnabled } = useAuth();
  const reset = () => {
    if (window.confirm('학생, 상담, 일정, 후속 조치와 프로그램 데모 데이터를 처음 상태로 되돌릴까요?')) resetDemoData();
  };
  return <><PageIntro eyebrow="설정" title="업무 환경 설정" description="상담 알림과 화면 표시 방식을 관리합니다." /><section className="card settings-card"><h2>알림 설정</h2><label><span><strong>상담 일정 알림</strong><small>상담 시작 30분 전에 알려드려요.</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>후속 조치 기한 알림</strong><small>기한 전날과 당일에 알려드려요.</small></span><input type="checkbox" defaultChecked /></label><button className="button primary" onClick={() => notify('설정을 저장했습니다.')}>설정 저장</button></section>{demoModeEnabled && !user && <section className="card settings-card demo-reset-card"><h2>발표용 데이터</h2><p>발표 중 변경된 학생 배정, 상담 기록, 예약과 후속 조치를 초기 상태로 되돌립니다.</p><button className="button secondary danger" onClick={reset}>전체 데모 데이터 초기화</button></section>}</>;
}
