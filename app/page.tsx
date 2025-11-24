"use client";

import { useEffect, useMemo, useState } from "react";
import BrainDumpPanel from "./components/BrainDumpPanel";
import TasksPanel from "./components/TasksPanel";
import WellnessPanel from "./components/WellnessPanel";

type TabId = "wellness" | "brain" | "tasks";

const tabs: { id: TabId; label: string; description: string }[] = [
  { id: "wellness", label: "Wellness Slots", description: "Inspect stored windows" },
  { id: "brain", label: "Brain Dump Tasks", description: "Generate & schedule" },
  { id: "tasks", label: "Tasks", description: "View saved tasks by date" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("wellness");
  const [authToken, setAuthToken] = useState("");
  const [autoLoginStatus, setAutoLoginStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [autoLoginError, setAutoLoginError] = useState<string | null>(null);

  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    // Check localStorage first, then env var, then default
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mindflow-api-base");
      if (stored) return stored;
    }
    const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (envBase) return envBase;
    return getDefaultApiBase("local");
  });

  const credentials = useMemo(
    () => ({
      userNameOrEmail: "user@mindflowai.com",
      password: "User@123",
    }),
    [],
  );

  // Load stored API base URL and token on mount
  useEffect(() => {
    const storedBase = localStorage.getItem("mindflow-api-base");
    if (storedBase) {
      setApiBaseUrl(storedBase);
    }
    
    const storedToken = localStorage.getItem("mindflow-token");
    const storedTokenApiBase = localStorage.getItem("mindflow-token-api-base");
    
    // Only use stored token if it matches the current API base URL
    if (storedToken && storedTokenApiBase === (storedBase || getDefaultApiBase("local"))) {
      setAuthToken(storedToken);
      setAutoLoginStatus("success");
    }
  }, []);

  // Auto-login when API base URL changes or token is missing/invalid
  useEffect(() => {
    if (!apiBaseUrl) return;

    const storedTokenApiBase = localStorage.getItem("mindflow-token-api-base");
    const needsLogin = !authToken || storedTokenApiBase !== apiBaseUrl;

    if (!needsLogin) return;

    const controller = new AbortController();
    const performLogin = async () => {
      setAutoLoginStatus("loading");
      setAutoLoginError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/users/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Sign in failed with status ${res.status}`);
        }

        const data: { access_token?: string } = await res.json();
        if (!data?.access_token) {
          throw new Error("Token missing from response");
        }

        // Store token along with the API base URL it belongs to
        localStorage.setItem("mindflow-token", data.access_token);
        localStorage.setItem("mindflow-token-api-base", apiBaseUrl);
        setAuthToken(data.access_token);
        setAutoLoginStatus("success");
      } catch (err) {
        if (controller.signal.aborted) return;
        setAutoLoginStatus("error");
        setAutoLoginError(err instanceof Error ? err.message : "Auto login failed");
        // Clear token on error
        setAuthToken("");
        localStorage.removeItem("mindflow-token");
        localStorage.removeItem("mindflow-token-api-base");
      }
    };

    performLogin();

    return () => controller.abort();
  }, [apiBaseUrl, authToken, credentials]);

  const handleTokenChange = (value: string) => {
    setAuthToken(value);
    if (value) {
      localStorage.setItem("mindflow-token", value);
      localStorage.setItem("mindflow-token-api-base", apiBaseUrl);
    } else {
      localStorage.removeItem("mindflow-token");
      localStorage.removeItem("mindflow-token-api-base");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-10">
      <header className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Mindflow internal tools
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Wellness & Brain Dump Console
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Minimal console to verify stored wellness windows and push AI-generated activities into
            the scheduling API. No extra chrome—just the endpoints you asked for.
          </p>
        </div>

        <div className="w-full lg:max-w-md space-y-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Bearer token
            <input
              type="text"
              placeholder="Paste JWT here"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-0"
              value={authToken}
              onChange={(event) => handleTokenChange(event.target.value)}
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Auto login status:{" "}
            {autoLoginStatus === "loading"
              ? "Signing in…"
              : autoLoginStatus === "success"
                ? "Ready"
                : autoLoginStatus === "error"
                  ? `Failed (${autoLoginError ?? "unknown error"})`
                  : "Idle"}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              className={`rounded-full border px-3 py-1 ${
                apiBaseUrl === getDefaultApiBase("staging")
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
              onClick={() => {
                const base = getDefaultApiBase("staging");
                // Clear existing token when switching environments
                setAuthToken("");
                localStorage.removeItem("mindflow-token");
                localStorage.removeItem("mindflow-token-api-base");
                // Set new API base URL (this will trigger auto-login)
                setApiBaseUrl(base);
                localStorage.setItem("mindflow-api-base", base);
              }}
            >
              Use Staging API
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 ${
                apiBaseUrl === getDefaultApiBase("dev")
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
              onClick={() => {
                const base = getDefaultApiBase("dev");
                setAuthToken("");
                localStorage.removeItem("mindflow-token");
                localStorage.removeItem("mindflow-token-api-base");
                setApiBaseUrl(base);
                localStorage.setItem("mindflow-api-base", base);
              }}
            >
              Use Dev API
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 ${
                apiBaseUrl === getDefaultApiBase("local")
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
              onClick={() => {
                const base = getDefaultApiBase("local");
                // Clear existing token when switching environments
                setAuthToken("");
                localStorage.removeItem("mindflow-token");
                localStorage.removeItem("mindflow-token-api-base");
                // Set new API base URL (this will trigger auto-login)
                setApiBaseUrl(base);
                localStorage.setItem("mindflow-api-base", base);
              }}
            >
              Use Local API
            </button>
          </div>
        </div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-2xl border px-5 py-3 text-left text-sm font-semibold ${
              tab.id === activeTab
                ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "border-slate-200 bg-white text-slate-900"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="block text-base">{tab.label}</span>
            <span className="text-xs font-normal text-slate-400">{tab.description}</span>
          </button>
        ))}
      </nav>

      <main className="mt-6 space-y-6">
        {activeTab === "wellness" && (
          <WellnessPanel apiBaseUrl={apiBaseUrl} authToken={authToken} />
        )}
        {activeTab === "brain" && (
          <BrainDumpPanel apiBaseUrl={apiBaseUrl} authToken={authToken} />
        )}
        {activeTab === "tasks" && <TasksPanel apiBaseUrl={apiBaseUrl} authToken={authToken} />}
      </main>

      <footer className="mt-8 text-right text-xs text-slate-400">
        API base: <code className="rounded bg-slate-100 px-2 py-1">{apiBaseUrl}</code>
      </footer>
    </div>
  );
}

function getDefaultApiBase(env: "staging" | "dev" | "local") {
  if (env === "local") {
    return "https://localhost:7046";
  }

  if (env === "dev") {
    return sanitizeSwaggerUrl(
      "https://mindflowai-dev-g8g3eqd9avgscgc5.centralindia-01.azurewebsites.net/swagger/index.html",
    );
  }

  return sanitizeSwaggerUrl(
    "https://mindflowai-ducfdehcc0cqaebq.centralindia-01.azurewebsites.net/swagger/index.html",
  );
}

function sanitizeSwaggerUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return urlString.replace(/\/$/, "");
  }
}
