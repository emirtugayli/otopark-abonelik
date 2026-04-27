"use client";

import { useEffect, useMemo, useState } from "react";
import type { Subscriber, VehicleType } from "@/types/subscriber";
import { computeCycleInfo, type CycleStatus } from "@/lib/subscriberStatus";
import { buildWhatsAppLink } from "@/lib/whatsappMessage";

type FormState = {
  full_name: string;
  phone: string;
  plate_number: string;
  vehicle_type: VehicleType;
  payment_day: number;
};

const EMPTY_FORM: FormState = {
  full_name: "",
  phone: "",
  plate_number: "",
  vehicle_type: "OTOMOBIL",
  payment_day: 1,
};

type Filter = "ALL" | VehicleType;

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function loadSubscribers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribers");
      if (!res.ok) throw new Error("Aboneler yüklenemedi");
      const data = await res.json();
      setSubscribers(data.subscribers);
    } catch (e: any) {
      setError(e.message ?? "Aboneler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(sub: Subscriber) {
    setEditing(sub);
    setForm({
      full_name: sub.full_name,
      phone: sub.phone ?? "",
      plate_number: sub.plate_number,
      vehicle_type: sub.vehicle_type,
      payment_day: sub.payment_day,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editing ? `/api/subscribers/${editing.id}` : "/api/subscribers";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kaydedilemedi");
      }
      setModalOpen(false);
      await loadSubscribers();
    } catch (e: any) {
      setError(e.message ?? "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sub: Subscriber) {
    if (!confirm(`${sub.full_name} aboneliğini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/subscribers/${sub.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silinemedi");
      await loadSubscribers();
    } catch (e: any) {
      setError(e.message ?? "Silinemedi");
    }
  }

  async function handleMarkPaid(sub: Subscriber) {
    try {
      const res = await fetch(`/api/subscribers/${sub.id}/mark-paid`, { method: "POST" });
      if (!res.ok) throw new Error("İşaretlenemedi");
      await loadSubscribers();
    } catch (e: any) {
      setError(e.message ?? "İşaretlenemedi");
    }
  }

  async function handleUndoPaid(sub: Subscriber) {
    if (!confirm("Bu ay için 'ödendi' işaretini geri almak istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/subscribers/${sub.id}/mark-paid`, { method: "DELETE" });
      if (!res.ok) throw new Error("Geri alınamadı");
      await loadSubscribers();
    } catch (e: any) {
      setError(e.message ?? "Geri alınamadı");
    }
  }

  const filtered = useMemo(() => {
    let list = subscribers;
    if (filter !== "ALL") list = list.filter((s) => s.vehicle_type === filter);

    const q = search.trim();
    if (!q) return list;

    const qLower = q.toLocaleLowerCase("tr");
    const qDigits = q.replace(/\D/g, "");
    const qPlate = q.replace(/\s+/g, "").toLocaleUpperCase("tr");

    return list.filter((s) => {
      if (s.full_name.toLocaleLowerCase("tr").includes(qLower)) return true;
      if (s.plate_number.replace(/\s+/g, "").toLocaleUpperCase("tr").includes(qPlate)) return true;
      if (qDigits && s.phone && s.phone.replace(/\D/g, "").includes(qDigits)) return true;
      return false;
    });
  }, [subscribers, filter, search]);

  const counts = useMemo(() => {
    return {
      ALL: subscribers.length,
      OTOMOBIL: subscribers.filter((s) => s.vehicle_type === "OTOMOBIL").length,
      MOTOR: subscribers.filter((s) => s.vehicle_type === "MOTOR").length,
    };
  }, [subscribers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Aboneler</h2>
        <button
          onClick={openCreate}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          + Yeni Abone Ekle
        </button>
      </div>

      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 İsim, plaka veya telefonla ara..."
          className="block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 pr-12 text-base focus:border-emerald-500 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Aramayı temizle"
            className="absolute inset-y-0 right-0 flex items-center px-4 text-lg text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterBtn label={`Tümü (${counts.ALL})`} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
        <FilterBtn label={`🚗 Otomobil (${counts.OTOMOBIL})`} active={filter === "OTOMOBIL"} onClick={() => setFilter("OTOMOBIL")} />
        <FilterBtn label={`🏍️ Motor (${counts.MOTOR})`} active={filter === "MOTOR"} onClick={() => setFilter("MOTOR")} />
      </div>

      {error && (
        <div className="rounded-md border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-base text-slate-600">Yükleniyor...</div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center text-base text-slate-500">
              {search.trim() ? "Aramaya uyan abone bulunamadı." : "Bu listede abone yok."}
            </div>
          )}
          {filtered.map((sub) => (
            <SubscriberCard
              key={sub.id}
              sub={sub}
              onEdit={() => openEdit(sub)}
              onDelete={() => handleDelete(sub)}
              onMarkPaid={() => handleMarkPaid(sub)}
              onUndoPaid={() => handleUndoPaid(sub)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? "Aboneyi Düzenle" : "Yeni Abone Ekle"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Araç Tipi</Label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, vehicle_type: "OTOMOBIL" }))}
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-base font-bold ${
                    form.vehicle_type === "OTOMOBIL"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  🚗 Otomobil
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, vehicle_type: "MOTOR" }))}
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-base font-bold ${
                    form.vehicle_type === "MOTOR"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  🏍️ Motor
                </button>
              </div>
            </div>

            <BigInput
              label="Ad Soyad"
              value={form.full_name}
              onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
              required
            />
            <BigInput
              label="Telefon (başında 0 olmadan)"
              placeholder="Örn: 5321234567"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
            <BigInput
              label="Plaka"
              placeholder="Örn: 34 ABC 123"
              value={form.plate_number}
              onChange={(v) => setForm((f) => ({ ...f, plate_number: v }))}
              required
            />
            <div>
              <Label>Ayın Hangi Günü Ödeme Yapıyor? (1-31)</Label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={form.payment_day}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payment_day: Number(e.target.value) }))
                }
                className="mt-1 block w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1 text-sm text-slate-500">
                Örn: 15 yazarsanız her ayın 15&apos;inde ödeme günüdür.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border-2 border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SubscriberCard({
  sub,
  onEdit,
  onDelete,
  onMarkPaid,
  onUndoPaid,
}: {
  sub: Subscriber;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  onUndoPaid: () => void;
}) {
  const info = computeCycleInfo(sub);
  const badge = STATUS_BADGES[info.status];
  const wa = buildWhatsAppLink(sub, { daysOverdue: info.daysOverdue });
  const paid = info.status === "PAID" || info.status === "APPROACHING";
  const showApproachingPaid = info.status === "APPROACHING" && !!sub.last_paid_at;

  return (
    <div
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${badge.borderClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-slate-900">{sub.full_name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {sub.vehicle_type === "MOTOR" ? "🏍️ Motor" : "🚗 Otomobil"}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Plaka: <strong className="text-slate-800">{sub.plate_number}</strong>
            {sub.phone ? (
              <>
                {" · "}Telefon:{" "}
                <strong className="text-slate-800">{formatPhoneTR(sub.phone)}</strong>
              </>
            ) : (
              " · Telefon: yok"
            )}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Ödeme Günü: <strong className="text-slate-800">Ayın {sub.payment_day}&apos;i</strong>
            {sub.last_paid_at && (
              <>
                {" · "}Son Ödendi:{" "}
                <strong className="text-slate-800">
                  {new Date(sub.last_paid_at).toLocaleDateString("tr-TR")}
                </strong>
              </>
            )}
          </div>
        </div>

        <span
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold ${badge.pillClass}`}
        >
          {info.status === "OVERDUE"
            ? `Gecikti · ${info.daysOverdue} gün`
            : info.status === "DUE_TODAY"
              ? "Bugün Ödeme Günü"
              : info.status === "APPROACHING"
                ? showApproachingPaid
                  ? `Ödendi · ${info.daysUntilDue} gün sonra yeni ödeme`
                  : `${info.daysUntilDue} gün kaldı`
                : info.status === "PAID"
                  ? "Bu Ay Ödendi"
                  : "Ödeme Bekliyor"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700"
          >
            <WhatsAppIcon />
            Mesaj Gönder
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">
            Telefon Yok
          </span>
        )}

        {paid ? (
          <button
            onClick={onUndoPaid}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ↶ Ödendiyi Geri Al
          </button>
        ) : (
          <button
            onClick={onMarkPaid}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            ✓ Ödendi
          </button>
        )}

        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ✎ Düzenle
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          🗑 Sil
        </button>
      </div>
    </div>
  );
}

const STATUS_BADGES: Record<
  CycleStatus,
  { borderClass: string; pillClass: string }
> = {
  PAID: { borderClass: "border-emerald-200", pillClass: "bg-emerald-100 text-emerald-800" },
  APPROACHING: { borderClass: "border-amber-200", pillClass: "bg-amber-100 text-amber-800" },
  DUE_TODAY: { borderClass: "border-blue-300", pillClass: "bg-blue-100 text-blue-800" },
  OVERDUE: { borderClass: "border-red-300", pillClass: "bg-red-100 text-red-800" },
  PENDING: { borderClass: "border-slate-200", pillClass: "bg-slate-100 text-slate-700" },
};

function FilterBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border-2 px-4 py-2 text-base font-bold ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-700">{children}</label>;
}

function BigInput({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none"
      />
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
    </svg>
  );
}

function formatPhoneTR(phone: string): string {
  const p = phone.startsWith("90") ? phone.slice(2) : phone;
  if (p.length !== 10) return phone;
  return `0${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}`;
}
