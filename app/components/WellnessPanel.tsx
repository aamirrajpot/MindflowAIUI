"use client";

import { useEffect, useMemo, useState } from "react";
import type { WellnessCheckInDto } from "../types";

type WellnessPanelProps = {
  apiBaseUrl: string;
  authToken: string;
};


const toUtcDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.endsWith("Z") || value.includes("+") ? value : `${value}Z`;
  return new Date(normalized);
};

const formatLocalTime = (value?: string | null, timeZone?: string) => {
  const date = toUtcDate(value);
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return value ?? "—";
  }
};

const formatUtc = (value?: string | null) => {
  const date = toUtcDate(value);
  if (!date) return "—";
  try {
    return date.toISOString().substring(11, 16) + " UTC";
  } catch {
    return value ?? "—";
  }
};

export function WellnessPanel({ apiBaseUrl, authToken }: WellnessPanelProps) {
  const [data, setData] = useState<WellnessCheckInDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = Boolean(authToken?.trim());

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const targetTimezone = data?.timezoneId || browserTimezone;

  const ranges = useMemo(
    () => [
      {
        label: "Weekday focus window",
        start: data?.weekdayStartTimeUtc,
        end: data?.weekdayEndTimeUtc,
      },
      {
        label: "Weekend focus window",
        start: data?.weekendStartTimeUtc,
        end: data?.weekendEndTimeUtc,
      },
    ],
    [data],
  );

  const fetchWellness = async () => {
    if (!hasAuth) {
      setError("Paste a bearer token to call the API.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/wellness/check-in`, {
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

      const body = (await res.json()) as WellnessCheckInDto;
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wellness data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAuth) {
      fetchWellness();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Wellness slots</h2>
          <p className="text-sm text-slate-500">
            Times shown in check-in timezone ({targetTimezone}).
            {browserTimezone !== targetTimezone && (
              <span> Your browser timezone: {browserTimezone}.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={fetchWellness}
          disabled={loading || !hasAuth}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {!hasAuth && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Add a bearer token above to enable API requests.
        </p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
          <strong className="font-semibold">Failed:</strong> {error}
        </div>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          {ranges.map((range) => (
            <article
              key={range.label}
              className="rounded-2xl border border-slate-200 p-4 shadow-sm shadow-slate-100"
            >
              <h3 className="text-lg font-semibold text-slate-900">{range.label}</h3>
              <p className="text-xl font-bold text-slate-900">
                {formatLocalTime(range.start, targetTimezone)} –{" "}
                {formatLocalTime(range.end, targetTimezone)}
              </p>
              <p className="text-sm text-slate-500">
                {formatUtc(range.start)} – {formatUtc(range.end)}
              </p>
              <p className="text-sm text-slate-500">
                Reminder enabled: {data.reminderEnabled ? "Yes" : "No"}
              </p>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && !data && hasAuth && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No wellness check-in yet. Once the user completes one, slots will appear here.
        </p>
      )}
    </div>
  );
}

export default WellnessPanel;

