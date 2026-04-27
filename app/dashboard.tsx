import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Subscriber } from "@/types/subscriber";
import { computeCycleInfo } from "@/lib/subscriberStatus";

export const dynamic = "force-dynamic";

interface RowInfo {
  sub: Subscriber;
  daysOverdue: number;
  daysUntilDue: number;
}

async function getStats() {
  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .neq("status", "cancelled");

  if (error) {
    console.error(error);
    return {
      total: 0,
      todayCount: 0,
      overdueCount: 0,
      approachingCount: 0,
      overdueList: [] as RowInfo[],
      todayList: [] as RowInfo[],
      approachingList: [] as RowInfo[],
    };
  }

  const subs = (data ?? []) as Subscriber[];
  const today = new Date();

  const overdueList: RowInfo[] = [];
  const todayList: RowInfo[] = [];
  const approachingList: RowInfo[] = [];

  for (const sub of subs) {
    const info = computeCycleInfo(sub, today);
    if (info.status === "OVERDUE") {
      overdueList.push({ sub, daysOverdue: info.daysOverdue, daysUntilDue: info.daysUntilDue });
    } else if (info.status === "DUE_TODAY") {
      todayList.push({ sub, daysOverdue: 0, daysUntilDue: 0 });
    } else if (info.status === "APPROACHING") {
      approachingList.push({ sub, daysOverdue: 0, daysUntilDue: info.daysUntilDue });
    }
  }

  overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);
  todayList.sort((a, b) => a.sub.full_name.localeCompare(b.sub.full_name));
  approachingList.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return {
    total: subs.length,
    todayCount: todayList.length,
    overdueCount: overdueList.length,
    approachingCount: approachingList.length,
    overdueList,
    todayList,
    approachingList,
  };
}

export default async function Dashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Ana Sayfa</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigCard label="Toplam Abone" value={stats.total} color="slate" />
        <BigCard label="Bugün Ödeme Günü" value={stats.todayCount} color="blue" />
        <BigCard label="Yaklaşan (5 Gün)" value={stats.approachingCount} color="amber" />
        <BigCard label="Geciken Ödeme" value={stats.overdueCount} color="red" />
      </div>

      <Section
        title="Bugün Ödeme Günü Olanlar"
        emptyText="Bugün ödeme günü olan abone yok."
        rows={stats.todayList.map((r) => ({
          name: r.sub.full_name,
          plate: r.sub.plate_number,
          vehicle: r.sub.vehicle_type,
          phone: r.sub.phone,
          right: "Bugün",
          rightTone: "blue",
        }))}
      />

      <Section
        title="Ödemesi Gecikenler"
        emptyText="Geciken abone yok. Tebrikler!"
        rows={stats.overdueList.map((r) => ({
          name: r.sub.full_name,
          plate: r.sub.plate_number,
          vehicle: r.sub.vehicle_type,
          phone: r.sub.phone,
          right: `${r.daysOverdue} gün gecikti`,
          rightTone: "red",
        }))}
      />

      <Section
        title="Yaklaşan Ödemeler (Önümüzdeki 5 Gün)"
        emptyText="Yaklaşan ödeme yok."
        rows={stats.approachingList.map((r) => ({
          name: r.sub.full_name,
          plate: r.sub.plate_number,
          vehicle: r.sub.vehicle_type,
          phone: r.sub.phone,
          right: r.daysUntilDue === 0 ? "Bugün" : `${r.daysUntilDue} gün kaldı`,
          rightTone: "amber",
        }))}
      />
    </div>
  );
}

function BigCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "slate" | "blue" | "amber" | "red";
}) {
  const palette = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-300 bg-blue-50 text-blue-900",
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    red: "border-red-300 bg-red-50 text-red-900",
  }[color];
  return (
    <div className={`rounded-2xl border-2 p-6 shadow-sm ${palette}`}>
      <div className="text-base font-semibold opacity-80">{label}</div>
      <div className="mt-3 text-5xl font-extrabold">{value}</div>
    </div>
  );
}

interface SectionRow {
  name: string;
  plate: string;
  vehicle: string;
  phone: string | null;
  right: string;
  rightTone: "blue" | "amber" | "red";
}

function Section({
  title,
  emptyText,
  rows,
}: {
  title: string;
  emptyText: string;
  rows: SectionRow[];
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-base text-slate-500">{emptyText}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">{row.name}</div>
                  <div className="text-sm text-slate-600">
                    {row.vehicle === "MOTOR" ? "🏍️ Motor" : "🚗 Otomobil"} · {row.plate}
                    {row.phone ? ` · ${formatPhoneTR(row.phone)}` : ""}
                  </div>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${
                    row.rightTone === "red"
                      ? "bg-red-100 text-red-800"
                      : row.rightTone === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {row.right}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function formatPhoneTR(phone: string): string {
  const p = phone.startsWith("90") ? phone.slice(2) : phone;
  if (p.length !== 10) return phone;
  return `0${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}`;
}
