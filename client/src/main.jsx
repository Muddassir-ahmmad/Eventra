import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./styles-registration.css";
import "./eventra-edit-delete.css";
import "./eventra-builder.css";
import "./event-builder-pro.css";
import "./public-event.css";
import "./attendance-dashboard.css";
import "./certificate-manager.css";
import "./email-manager.css";
import "./feedback.css";
import "./report-manager.css";
import "./participant-dashboard.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
