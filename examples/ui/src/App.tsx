import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { PhantomUIProvider } from "@phantom/react-ui";
import ConnectionDemo from "./components/ConnectionDemo";
import TransactionDemo from "./components/TransactionDemo";
import MessageSigningDemo from "./components/MessageSigningDemo";
import ThemeDemo from "./components/ThemeDemo";
import AuthCallback from "./auth-callback";
import "./App.css";

function App() {
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");

  return (
    <PhantomUIProvider theme={theme}>
      <div className="app">
        <header className="app-header">
          <h1>Phantom React UI Components Demo</h1>
          <p>Explore different configurations of the Phantom React UI components</p>
        </header>

        <nav className="app-nav">
          <Link 
            to="/connection" 
            className={location.pathname === "/connection" ? "active" : ""}
          >
            Connection Modal
          </Link>
          <Link 
            to="/transaction" 
            className={location.pathname === "/transaction" ? "active" : ""}
          >
            Transaction Modal
          </Link>
          <Link 
            to="/message" 
            className={location.pathname === "/message" ? "active" : ""}
          >
            Message Signing
          </Link>
          <Link 
            to="/theme" 
            className={location.pathname === "/theme" ? "active" : ""}
          >
            Theme Configuration
          </Link>
        </nav>

        <div className="theme-switcher">
          <label>
            Theme:
            <select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "auto")}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </label>
        </div>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<ConnectionDemo />} />
            <Route path="/connection" element={<ConnectionDemo />} />
            <Route path="/transaction" element={<TransactionDemo />} />
            <Route path="/message" element={<MessageSigningDemo />} />
            <Route path="/theme" element={<ThemeDemo />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>
            Built with{" "}
            <a href="https://github.com/phantom/wallet-sdk" target="_blank" rel="noopener noreferrer">
              @phantom/react-ui
            </a>
          </p>
        </footer>
      </div>
    </PhantomUIProvider>
  );
}

export default App;