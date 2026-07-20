import { useApp } from '../App';
import { PageIntro } from '../components/UI';

export default function SettingsPage() {
  const { notify } = useApp();
  return <><PageIntro eyebrow="설정" title="업무 환경 설정" description="상담 알림과 화면 표시 방식을 관리합니다." /><section className="card settings-card"><h2>알림 설정</h2><label><span><strong>상담 일정 알림</strong><small>상담 시작 30분 전에 알려드려요.</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>후속 조치 기한 알림</strong><small>기한 전날과 당일에 알려드려요.</small></span><input type="checkbox" defaultChecked /></label><button className="button primary" onClick={() => notify('설정을 저장했습니다.')}>설정 저장</button></section></>;
}
