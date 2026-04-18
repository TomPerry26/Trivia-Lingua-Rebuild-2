import { Component, type ErrorInfo, type ReactNode } from "react";

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  error: Error | null;
};

class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Root error boundary caught an unhandled error", error, errorInfo);
  }

  private getErrorMessage(): string {
    if (!this.state.error) {
      return "";
    }

    if (import.meta.env.PROD) {
      return "An unexpected error occurred while starting the app.";
    }

    return this.state.error.message || "Unknown error";
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "36rem" }}>
            <h1 style={{ marginBottom: "0.75rem" }}>App failed to load</h1>
            <p style={{ marginBottom: "1rem", wordBreak: "break-word" }}>
              {this.getErrorMessage()}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: "0.625rem 1rem", cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RootErrorBoundary;
