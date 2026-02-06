import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Subscriber } from "@/types/subscriber";
import { getTodayTR } from "@/lib/date";

export const dynamic = "force-dynamic";

type OverdueWithDays = Subscriber & { days_overdue: number };

async function getStats() {
  const todayStr = getTodayTR();
  const startOfMonth = new Date(todayStr);
  startOfMonth.setDate(1);
  const startOfMonthStr = startOfMonth.toISOString().slice(0, 10);

  // 1. Fetch ALL relevant data in 2 queries
  const [subscribersRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from("subscribers")
      .select("*")
      .neq("status", "cancelled"),
    supabaseAdmin
      .from("payments")
      .select("amount, subscriber_id")
      .gte("payment_date", startOfMonthStr)
  ]);

  const allActiveSubscribers = (subscribersRes.data ?? []) as Subscriber[];
  const allPayments = (paymentsRes.data ?? []) as any[];

  // 2. Identify Active Subscriber IDs
  const activeSubscriberIds = new Set(allActiveSubscribers.map(s => s.id));

  // 3. Compute Financials
  // A. Kasa (Tahsil Edilen) - Includes payments from cancelled users too
  const totalReceived = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // B. Active Expected (Total fees of currently active subscribers)
  const totalActiveFees = allActiveSubscribers.reduce(
    (sum, s) => sum + Number(s.monthly_fee || 0),
    0
  );

  // C. Active Paid (Payments gathered ONLY from currently active subscribers)
  const totalActivePaid = allPayments
    .filter(p => activeSubscriberIds.has(p.subscriber_id))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // D. Pending (Tahsilat Bekleyen) = Active Expected - Active Paid
  // This logic assumes 1 payment = 1 fee.
  const pendingCollection = Math.max(0, totalActiveFees - totalActivePaid);

  // E. Ciro (Turnover) = Kasa + Pending
  const totalTurnover = totalReceived + pendingCollection;


  // 4. Counts & Lists
  const totalSubscribers = allActiveSubscribers.length;
  let activeSubscribers = 0;
  let overdueSubscribers = 0;
  let overdueList: OverdueWithDays[] = [];
  let approachingList: Subscriber[] = [];

  const startOfToday = new Date(todayStr + "T00:00:00");
  const fiveDaysLater = new Date(startOfToday);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
  const fiveDaysLaterStr = fiveDaysLater.toISOString().slice(0, 10);

  allActiveSubscribers.forEach(sub => {
    // Active vs Overdue Count
    if (sub.end_date >= todayStr) {
      activeSubscribers++;
    } else {
      overdueSubscribers++;
    }

    // Overdue List Logic
    if (sub.end_date < todayStr) {
      const nextPaymentDate = new Date(sub.end_date);
      const diffMs = startOfToday.getTime() - nextPaymentDate.getTime();
      const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      overdueList.push({ ...sub, days_overdue: daysOverdue });
    }

    // Approaching List Logic
    if (sub.end_date >= todayStr && sub.end_date <= fiveDaysLaterStr) {
      approachingList.push(sub);
    }
  });

  // Sort lists
  overdueList.sort((a, b) => a.end_date.localeCompare(b.end_date));
  approachingList.sort((a, b) => a.end_date.localeCompare(b.end_date));

  return {
    totalSubscribers,
    activeSubscribers,
    overdueSubscribers,
    totalReceived,      // Kasa
    pendingCollection,  // Bekleyen
    totalTurnover,      // Ciro
    overdueList,
    overdueListCount: overdueList.length,
    approachingList
  };
}

export default async function Dashboard() {
  const stats = await getStats();
  const approachingList = stats.approachingList;
  const todayStr = getTodayTR();

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Toplam Abone"
            value={stats.totalSubscribers}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-500">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Aktif Abone"
            value={stats.activeSubscribers}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <StatCard
            label="Geciken Ödeme"
            value={stats.overdueSubscribers}
            variant="danger"
            hoverItems={stats.overdueList.map(s => ({
              label: s.full_name,
              subLabel: `${s.days_overdue} gün`
            }))}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-600">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            }
          />
          <StatCard
            label="Tahsil Edilen (Kasa)"
            value={stats.totalReceived.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY"
            })}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-500">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="Tahsilat Bekleyen"
            value={stats.pendingCollection.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY"
            })}
            variant="warning"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber-600">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Aylık Toplam Ciro"
            value={stats.totalTurnover.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY"
            })}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-500">
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Ödemesi Gecikenler
          </h3>
          <span className="text-xs text-slate-600">
            Toplam geciken abone sayısı:{" "}
            <span className="font-semibold">{stats.overdueListCount}</span>
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ad Soyad
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Telefon
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Son Ödeme Tarihi
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Kaç gün gecikti
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.overdueList.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-sm text-slate-500"
                  >
                    Şu anda geciken abone yok.
                  </td>
                </tr>
              ) : (
                stats.overdueList.map((sub) => (
                  <tr key={sub.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                      {sub.full_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                      {sub.phone}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                      {sub.end_date}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                      {sub.days_overdue}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Yaklaşan Ödemeler (Gelecek 5 Gün)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ad Soyad
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Telefon
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Bitiş Tarihi
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Kalan Gün
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approachingList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-slate-500">
                    Yaklaşan ödeme yok.
                  </td>
                </tr>
              ) : (
                approachingList.map((sub) => {
                  const diff = Math.ceil((new Date(sub.end_date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={sub.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                        {sub.full_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                        {sub.phone}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                        {sub.end_date}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-800">
                        {diff} gün
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
  hoverItems,
  icon
}: {
  label: string;
  value: number | string;
  variant?: "danger" | "warning";
  hoverItems?: { label: string; subLabel: string }[];
  icon?: React.ReactNode;
}) {
  const color =
    variant === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : variant === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`relative group rounded-lg border ${color} p-4 shadow-sm transition-all hover:shadow-md cursor-default`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">
          {label}
        </div>
        {icon && <div className="opacity-70">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>

      {/* Tooltip / Dropdown on Hover */}
      {hoverItems && hoverItems.length > 0 && (
        <div className="absolute left-0 top-full mt-2 z-10 hidden w-64 rounded-md border border-slate-200 bg-white p-2 shadow-xl group-hover:block">
          <div className="text-xs font-semibold text-slate-400 mb-2 px-2">Gecikenler Listesi</div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {hoverItems.map((item, i) => (
              <div key={i} className="flex justify-between items-center rounded px-2 py-1.5 hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-700 truncate">{item.label}</span>
                <span className="text-xs text-red-600 whitespace-nowrap ml-2">{item.subLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

