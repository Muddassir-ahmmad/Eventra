import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./styles-registration.css";
import "./eventra-edit-delete.css";
import "./eventra-builder.css"
import "./certificate-manager.css";
import "./report-manager.css";;
import "./report-manager.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
