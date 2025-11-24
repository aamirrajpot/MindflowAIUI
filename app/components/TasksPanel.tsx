"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaskItem, WellnessCheckInDto } from "../types";

type TasksPanelProps = {
  apiBaseUrl: string;
  authToken: string;
};

const repeatLabels: Record<number, string> = {
  0: "Never",
  1: "Daily",
  2: "Weekly",
  3: "Monthly",
};

const statusLabels: Record<number, string> = {
  0: "Pending",
  1: "In Progress",
  2: "Completed",
  3: "Skipped",
};

const formatTime = (value?: string, timeZone?: string | null) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toLocaleTimeString([], { 
      hour: "numeric", 
      minute: "2-digit",
      timeZone: timeZone || undefined
    });
  } catch {
    return value;
  }
};

export function TasksPanel({ apiBaseUrl, authToken }: TasksPanelProps) {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [timezoneId, setTimezoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = Boolean(authToken?.trim());

  // Fetch wellness data to get timezoneId
  const fetchWellness = async () => {
    if (!hasAuth) return;
    
    try {
      const res = await fetch(`${apiBaseUrl}/api/wellness/check-in`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const wellnessData = (await res.json()) as WellnessCheckInDto;
        setTimezoneId(wellnessData?.timezoneId || null);
      }
    } catch (err) {
      // Silently fail - timezone is optional
      console.warn("Failed to fetch wellness data for timezone:", err);
    }
  };

  const fetchTasks = async () => {
    if (!hasAuth) {
      setError("Provide a bearer token to call the API.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/tasks", apiBaseUrl);
      url.searchParams.set("date", selectedDate);

      const res = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Request failed with ${res.status}`);
      }
      const body = (await res.json()) as TaskItem[];
      setTasks(body || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch wellness data once when auth token is available
  useEffect(() => {
    if (hasAuth) {
      fetchWellness();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // Fetch tasks when date or auth token changes
  useEffect(() => {
    if (hasAuth) {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, authToken]);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Tasks by date</h2>
          <p className="text-sm text-slate-500">
            Pulls `/api/tasks?date=yyyy-MM-dd` using the same bearer token.
            {timezoneId && (
              <span className="ml-2 text-xs text-slate-400">
                (Timezone: {timezoneId})
              </span>
            )}
          </p>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Date
          <input
            type="date"
            value={selectedDate}
            max="9999-12-31"
            onChange={(event) => setSelectedDate(event.target.value)}
            className="ml-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-0"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
          onClick={fetchTasks}
          disabled={loading || !hasAuth}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {!hasAuth && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Add a bearer token to fetch tasks
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
          <strong className="font-semibold">Failed:</strong> {error}
        </div>
      )}

      {!loading && !error && tasks.length === 0 && hasAuth && (
        <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          No tasks found for {selectedDate}.
        </p>
      )}

      {tasks.length > 0 && (
        <ul className="mt-6 space-y-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border border-slate-200 p-5 shadow-sm shadow-slate-100"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {statusLabels[task.status] ?? "Status n/a"}
                </span>
              </div>
              {task.description && (
                <p className="mt-2 text-sm text-slate-600">{task.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                <span>Start: {formatTime(task.time, timezoneId)}</span>
                <span>Duration: {task.durationMinutes} min</span>
                <span>Repeat: {repeatLabels[task.repeatType] ?? "n/a"}</span>
                <span>{task.createdBySuggestionEngine ? "AI Suggested" : "Manual"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TasksPanel;

