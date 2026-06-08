import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          height: "100vh", gap: "12px",
          background: "#F8FAFC", color: "#0F0721",
        }}>
          <div style={{ fontSize: "32px" }}>⚠️</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
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
        </div>
      );
    }
    return this.props.children;
  }
}
