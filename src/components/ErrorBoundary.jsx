import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('CareerFit render error', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="fatal-error" role="alert"><section><span>화면을 표시하지 못했습니다</span><h1>일시적인 오류가 발생했어요.</h1><p>작성 중인 내용은 현재 브라우저에 남아 있습니다. 화면을 다시 불러와 주세요.</p><button className="button primary" onClick={() => window.location.reload()}>화면 다시 불러오기</button></section></main>;
  }
}
