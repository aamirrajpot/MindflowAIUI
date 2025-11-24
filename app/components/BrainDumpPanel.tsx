"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AddTaskResult, BrainDumpResponse, TaskSuggestion } from "../types";

type BrainDumpPanelProps = {
  apiBaseUrl: string;
  authToken: string;
};

type FormState = {
  text: string;
  context: string;
  mood: string;
  stress: string;
  purpose: string;
};

const initialForm: FormState = {
  text: "",
  context: "",
  mood: "",
  stress: "",
  purpose: "",
};

const formatLocalDateTime = (value?: string) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const repeatTypeLabel = (repeatType?: number) => {
  switch (repeatType) {
    case 0:
      return "Never";
    case 1:
      return "Daily";
    case 2:
      return "Weekly";
    case 3:
      return "Monthly";
    default:
      return "Custom";
  }
};

export function BrainDumpPanel({ apiBaseUrl, authToken }: BrainDumpPanelProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [response, setResponse] = useState<BrainDumpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [addingTaskKey, setAddingTaskKey] = useState<string | null>(null);
  const [calendarResult, setCalendarResult] = useState<AddTaskResult | null>(null);

  const hasAuth = Boolean(authToken?.trim());

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      text: form.text.trim(),
    };
    if (form.context.trim()) payload.context = form.context.trim();
    if (form.mood) payload.mood = Number(form.mood);
    if (form.stress) payload.stress = Number(form.stress);
    if (form.purpose) payload.purpose = Number(form.purpose);
    return payload;
  };

  const requestSuggestions = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasAuth) {
      setError("Paste a bearer token first.");
      return;
    }
    if (!form.text.trim()) {
      setError("Write at least a short brain dump.");
      return;
    }

    setLoadingSuggestions(true);
    setError(null);
    setStatusMessage(null);
    setCalendarResult(null);

    try {
      const res = await fetch(`${apiBaseUrl}/brain-dump/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Request failed with ${res.status}`);
      }

      const body = (await res.json()) as BrainDumpResponse;
      setResponse(body);
      setStatusMessage(`Received ${body.suggestedActivities.length} suggestions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch task suggestions");
      setResponse(null);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addToCalendar = async (suggestion: TaskSuggestion, idx: number) => {
    if (!hasAuth) {
      setError("Paste a bearer token first.");
      return;
    }
    if (!response?.brainDumpEntryId) {
      setError("brainDumpEntryId missing in response; cannot link task.");
      return;
    }

    const key = `${suggestion.task}-${idx}`;
    setAddingTaskKey(key);
    setError(null);
    setStatusMessage(null);
    setCalendarResult(null);

    try {
      const payload = {
        task: suggestion.task,
        frequency: suggestion.frequency ?? "Once",
        duration: suggestion.duration ?? "15 minutes",
        notes: suggestion.notes,
        brainDumpEntryId: response.brainDumpEntryId,
        reminderEnabled: false,
      };

      const res = await fetch(`${apiBaseUrl}/brain-dump/add-to-calendar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Request failed with ${res.status}`);
      }

      const body = (await res.json()) as AddTaskResult;
      setCalendarResult(body);
      setStatusMessage(
        `Scheduled for ${formatLocalDateTime(body.task.time)} (${body.task.durationMinutes} minutes)`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task to calendar");
    } finally {
      setAddingTaskKey(null);
    }
  };

  const suggestions = useMemo(() => response?.suggestedActivities ?? [], [response]);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Brain dump → smart tasks</h2>
        <p className="text-sm text-slate-500">
          Send text to the RunPod endpoint, review the activity list, and push single items into the
          smart scheduler.
        </p>
      </div>

      <form onSubmit={requestSuggestions} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Brain dump text
          <textarea
            rows={6}
            placeholder="Stream your thoughts here…"
            className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-0"
            value={form.text}
            onChange={handleChange("text")}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Context (optional)
          <textarea
            rows={3}
            placeholder="Deadlines, reminders, anything else to ground the AI"
            className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-0"
            value={form.context}
            onChange={handleChange("context")}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Mood (0-10)
            <input
              type="number"
              min="0"
              max="10"
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-0"
              value={form.mood}
              onChange={handleChange("mood")}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Stress (0-10)
            <input
              type="number"
              min="0"
              max="10"
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-0"
              value={form.stress}
              onChange={handleChange("stress")}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Purpose/Meaning (0-10)
            <input
              type="number"
              min="0"
              max="10"
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-0"
              value={form.purpose}
              onChange={handleChange("purpose")}
            />
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-fit sm:px-6"
          disabled={loadingSuggestions || !hasAuth}
        >
          {loadingSuggestions ? "Generating…" : "Generate suggestions"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
          <strong className="font-semibold">Failed:</strong> {error}
        </div>
      )}

      {statusMessage && (
        <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
          {statusMessage}
        </p>
      )}

      {response && (
        <section className="mt-6 space-y-6">
          <header className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{response.userProfile.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {response.userProfile.name}
                </p>
                <p className="text-base font-medium text-slate-900">
                  {response.userProfile.currentState}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">{response.aiSummary}</p>
            <div className="flex flex-wrap gap-2">
              {response.keyThemes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900"
                >
                  {theme}
                </span>
              ))}
            </div>
          </header>

          <ul className="space-y-4">
            {suggestions.map((suggestion, idx) => {
              const key = `${suggestion.task}-${idx}`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 shadow-sm shadow-slate-100 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{suggestion.task}</h4>
                    <p className="text-sm text-slate-600">{suggestion.notes}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                      <span>{suggestion.priority ?? "Priority n/a"}</span>
                      <span>{suggestion.duration ?? "Duration n/a"}</span>
                      <span>{suggestion.frequency ?? "Frequency n/a"}</span>
                      {suggestion.suggestedTime && <span>{suggestion.suggestedTime}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                    onClick={() => addToCalendar(suggestion, idx)}
                    disabled={addingTaskKey === key || !hasAuth}
                  >
                    {addingTaskKey === key ? "Scheduling…" : "Add to calendar"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {calendarResult && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong className="font-semibold">Scheduled:</strong> {calendarResult.task.title} at{" "}
          {formatLocalDateTime(calendarResult.task.time)} • Repeat:{" "}
          {repeatTypeLabel(calendarResult.task.repeatType)}
        </div>
      )}
    </div>
  );
}

export default BrainDumpPanel;

