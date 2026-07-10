import { Component } from "react";

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <section className="app-status page-frame">
          <h1>页面遇到了一点问题</h1>
          <p>你的答题进度会尽量保留。刷新后可以继续；如果配置已经升级，会从首页重新开始。</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </section>
      </main>
    );
  }
}
