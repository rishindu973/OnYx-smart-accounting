"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";

type GovernanceDay = {
  date: string; // YYYY-MM-DD
  limitAmount: number;
  currentSpending: number;
  remainingAmount: number;
  usedPercent: number;
  status: "BLUE" | "YELLOW" | "RED";
  blocked: boolean;
};

type ApiNotification = {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  code?: string;
};

const LS_COMPANY_KEY = "onyx_company_id";
const ENV_COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID ?? "";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // YYYY-MM
}

function monthTitle(d: Date) {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function parseYYYYMM(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function currency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusClass(status: GovernanceDay["status"]) {
  if (status === "RED") return "border-red-600";
  if (status === "YELLOW") return "border-yellow-500";
  return "border-blue-500";
}

function progressClass(status: GovernanceDay["status"]) {
  if (status === "RED") return "bg-red-600";
  if (status === "YELLOW") return "bg-yellow-500";
  return "bg-blue-500";
}

export default function GovernancePage() {
  const [companyId, setCompanyId] = useState<string>(ENV_COMPANY_ID);
  const [companyIdInput, setCompanyIdInput] = useState<string>("");

  const [month, setMonth] = useState(() => monthKeyFromDate(new Date()));
  const [days, setDays] = useState<GovernanceDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<GovernanceDay | null>(null);
  const [limitInput, setLimitInput] = useState<string>("");

  const monthDate = useMemo(() => parseYYYYMM(month), [month]);

  // Load companyId from localStorage (Option B) and override env if present
  useEffect(() => {
    const ls = localStorage.getItem(LS_COMPANY_KEY);
    if (ls && ls.trim()) setCompanyId(ls.trim());
  }, []);

  function saveCompanyIdToLocalStorage() {
    const v = companyIdInput.trim();
    if (!v) return;
    localStorage.setItem(LS_COMPANY_KEY, v);
    setCompanyId(v);
    setCompanyIdInput("");
  }

  async function loadCalendar(activeCompanyId: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await apiGet<{ ok: boolean; data: { month: string; days: GovernanceDay[] } }>(
        `/api/governance/calendar?month=${month}&companyId=${activeCompanyId}`
      );
      setDays(res.data.days);
    } catch (e: any) {
      setDays([]);
      setError(e?.error?.message || e?.message || "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!companyId) {
      setDays([]);
      setError(
        'Company ID is not configured. Add NEXT_PUBLIC_COMPANY_ID in .env.local OR store it in localStorage (key: "onyx_company_id").'
      );
      return;
    }
    loadCalendar(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, companyId]);

  function prevMonth() {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() - 1);
    setMonth(monthKeyFromDate(d));
  }

  function nextMonth() {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + 1);
    setMonth(monthKeyFromDate(d));
  }

  function openDayModal(day: GovernanceDay) {
    setSelectedDay(day);
    setLimitInput(day.limitAmount ? String(day.limitAmount) : "");
    setOpen(true);
  }

  async function saveLimit() {
    if (!selectedDay) return;
    if (!companyId) {
      alert("Company ID missing. Configure it first.");
      return;
    }

    const limitAmount = Number(limitInput);
    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      alert("Limit must be greater than 0");
      return;
    }

    try {
      const res = await apiPut<{
        ok: boolean;
        data: any;
        notification?: ApiNotification;
      }>(`/api/governance/day/${selectedDay.date}/limit`, {
        companyId,
        limitAmount,
        reason: "Updated via Governance UI",
      });

      if (res?.notification) {
        alert(`${res.notification.title}\n${res.notification.message}`);
      }

      setOpen(false);
      setSelectedDay(null);
      await loadCalendar(companyId);
    } catch (e: any) {
      const n: ApiNotification | undefined = e?.notification;
      if (n) alert(`${n.title}\n${n.message}`);
      else alert(e?.error?.message || "Failed to save limit");
    }
  }

  const grid = useMemo(() => {
    if (!days.length) return { leading: 0, items: [] as GovernanceDay[] };

    const first = days[0]?.date; // YYYY-MM-DD
    const [y, m, d] = first.split("-").map(Number);
    const firstDate = new Date(y, m - 1, d);
    const leading = firstDate.getDay(); // 0=Sun

    return { leading, items: days };
  }, [days]);

  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Governance</h1>
        <p className="text-sm text-slate-400">Daily limit calendar and spending guardrails</p>
      </div>

      {/* Company ID helper (Option B UI) */}
      {!companyId && (
        <div className="mb-4 rounded-2xl border border-red-700 bg-red-950/30 p-4">
          <div className="text-sm text-red-200 font-semibold">Company ID not configured</div>
          <div className="text-xs text-red-300 mt-1">
            Get a real Company.id from Prisma Studio → Company table → copy id.
            <br />
            Then either set <code className="text-red-200">NEXT_PUBLIC_COMPANY_ID</code> in{" "}
            <code className="text-red-200">.env.local</code> (restart dev server),
            or paste it here to store in localStorage.
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={companyIdInput}
              onChange={(e) => setCompanyIdInput(e.target.value)}
              className="w-full rounded-xl border border-red-700 bg-slate-950 px-3 py-2 text-sm outline-none"
              placeholder="Paste REAL company id here..."
            />
            <button
              onClick={saveCompanyIdToLocalStorage}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Daily Limit Calendar</div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Safe
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> Warning (80%+)
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-600" /> Limit Reached
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="rounded-lg border border-slate-700 px-3 py-1 text-sm hover:bg-slate-900">
              ◀
            </button>
            <div className="text-sm font-semibold">{monthTitle(monthDate)}</div>
            <button onClick={nextMonth} className="rounded-lg border border-slate-700 px-3 py-1 text-sm hover:bg-slate-900">
              ▶
            </button>
          </div>
        </div>

        {loading && <div className="text-sm text-slate-400">Loading calendar...</div>}
        {error && <div className="text-sm text-red-400">{error}</div>}

        <div className="grid grid-cols-7 gap-3 mt-4 text-xs text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
            <div key={x} className="px-2">
              {x}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3 mt-2">
          {Array.from({ length: grid.leading }).map((_, i) => (
            <div key={`blank-${i}`} className="h-32 rounded-xl border border-transparent" />
          ))}

          {grid.items.map((day) => {
            const dayNum = Number(day.date.slice(8, 10));
            const pct = Math.max(0, Math.min(100, day.usedPercent || 0));

            return (
              <button
                key={day.date}
                onClick={() => openDayModal(day)}
                className={`group h-32 rounded-xl border ${statusClass(day.status)} bg-slate-950/40 p-3 text-left hover:bg-slate-950/60`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{dayNum}</div>
                  {day.blocked && (
                    <span className="text-[10px] rounded-full bg-red-600/20 text-red-300 px-2 py-0.5">BLOCKED</span>
                  )}
                </div>

                <div className="mt-6 text-xs text-slate-400">Remaining</div>
                <div className="text-sm font-semibold">
                  {day.limitAmount > 0 ? currency(day.remainingAmount) : "No limit"}
                </div>

                <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-2 ${progressClass(day.status)}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  Spend: {currency(day.currentSpending)} / {day.limitAmount > 0 ? currency(day.limitAmount) : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {open && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Set Daily Limit</div>
                <div className="text-sm text-slate-400">
                  Configure the maximum spending limit for {selectedDay.date}. Changes are logged.
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-700 px-2 py-1 text-sm hover:bg-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <label className="text-sm text-slate-300">Maximum Amount (LKR)</label>
              <input
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                type="number"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                placeholder="500000"
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-sm text-slate-400">Current Spending</div>
              <div className="text-xl font-semibold">{currency(selectedDay.currentSpending)}</div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900">
                Cancel
              </button>
              <button onClick={saveLimit} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
                Save Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
