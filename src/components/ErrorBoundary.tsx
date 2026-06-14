import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error; info?: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Surface to the console for anyone with devtools open.
    console.error("[ErrorBoundary]", error, info.componentStack);
    this.setState({ info: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const detail = [
        err?.name && err?.message ? `${err.name}: ${err.message}` : String(err ?? "Unknown error"),
        err?.stack ? `\n${err.stack}` : "",
        this.state.info ? `\nComponent stack:${this.state.info}` : "",
      ].join("");
      return (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          minHeight: "100vh", gap: "12px", padding: "20px",
          background: "#F8FAFC", color: "#0F0721",
        }}>
          <div style={{ fontSize: "32px" }}>⚠️</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: "13px", color: "#64748B", textAlign: "center" }}>
            Please refresh the page. If the issue persists, contact support.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px", padding: "8px 20px",
              background: "#6366F1", color: "#fff",
              border: "none", borderRadius: "8px",
              cursor: "pointer", fontSize: "13px",
            }}
          >
            Refresh page
          </button>
          {/* Diagnostic details — readable on-device so the error can be reported. */}
          <details style={{ marginTop: "8px", maxWidth: "92vw", width: "560px" }}>
            <summary style={{ fontSize: "12px", color: "#94A3B8", cursor: "pointer", textAlign: "center" }}>
              Show error details
            </summary>
            <pre style={{
              marginTop: "8px", whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontSize: "11px", lineHeight: 1.45, color: "#334155",
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: "8px",
              padding: "12px", maxHeight: "50vh", overflow: "auto",
            }}>{detail}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
