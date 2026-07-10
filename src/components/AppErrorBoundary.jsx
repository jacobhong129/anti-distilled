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
          <h1>页面刚才绊了一下</h1>
          <p>已经答过的内容会尽量保留。刷新后可以接着来；如果题库恰好更新了，就会从首页重新开始。</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            刷新一下
          </button>
        </section>
      </main>
    );
  }
}
