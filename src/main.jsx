import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: "32px",
            color: "#f5f6ff",
            background: "#090d15",
            fontFamily: '"DM Mono", monospace',
          }}
        >
          <h1 style={{ marginTop: 0, fontFamily: '"Playfair Display", serif', fontWeight: 400 }}>
            App Error
          </h1>
          <p style={{ lineHeight: 1.6 }}>
            {this.state.error.message || "Something went wrong while rendering the app."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
