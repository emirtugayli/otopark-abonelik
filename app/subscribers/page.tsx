"use client";

import { useEffect, useMemo, useState } from "react";
import type { Subscriber } from "@/types/subscriber";

type SubscriberFormState = Omit<
  Subscriber,
  "id" | "status" | "created_at"
> & { status?: string };

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [form, setForm] = useState<Partial<SubscriberFormState>>({});
  const [saving, setSaving] = useState(false);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSubscriber, setPaymentSubscriber] = useState<Subscriber | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<{
    reminder_days?: string;
    reminder_template?: string;
    reminder_template_overdue?: string;
  }>({});

  useEffect(() => {
    loadSubscribers();
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error("Ayarlar yüklenemedi", err));
  }, []);

  function getWhatsAppLink(sub: Subscriber) {
    const phone = sub.phone.replace(/[^0-9]/g, "");
    if (!phone) return null;

    const today = new Date();
    const end = new Date(sub.end_date);
    const isOverdue = end < today;

    let template = isOverdue
      ? settings.reminder_template_overdue
      : settings.reminder_template;

    if (!template) {
      if (isOverdue) {
        template = "Sayın {ad_soyad}, {odeme_tarihi} tarihli {tutar} TL abonelik ödemeniz GECİKMİŞTİR. Lütfen en kısa sürede ödeme yapınız.";
      } else {
        template = "Sayın {ad_soyad}, {odeme_tarihi} son ödeme tarihli {tutar} TL abonelik ücretiniz yaklaşmıştır.";
      }
    }

    let message = template
      .replace(/{ad_soyad}/g, sub.full_name)
      .replace(/{odeme_tarihi}/g, new Date(sub.end_date).toLocaleDateString("tr-TR"))
      .replace(/{tutar}/g, sub.monthly_fee?.toString() || "0");

    return `https://wa.me/${phone.startsWith("90") ? phone : "90" + phone}?text=${encodeURIComponent(message)}`;
  }

  function isReminderDue(sub: Subscriber) {
    const days = Number(settings.reminder_days || 3);
    const today = new Date();
    const end = new Date(sub.end_date);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Show if overdue (diffDays < 0) OR within reminder days
    return diffDays <= days;
  }

  async function loadSubscribers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribers");
      if (!res.ok) throw new Error("Failed to load subscribers");
      const data = await res.json();
      setSubscribers(data.subscribers);
    } catch (e: any) {
      setError(e.message ?? "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditing(null);
    setForm({
      full_name: "",
      phone: "",
      plate_number: "",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      monthly_fee: 0
    });
    setModalOpen(true);
  }

  function openEditModal(sub: Subscriber) {
    setEditing(sub);
    setForm({
      full_name: sub.full_name,
      phone: sub.phone,
      plate_number: sub.plate_number,
      start_date: sub.start_date,
      end_date: sub.end_date,
      monthly_fee: Number(sub.monthly_fee)
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/subscribers/${editing.id}` : "/api/subscribers";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Failed to save subscriber");
      setModalOpen(false);
      await loadSubscribers();
    } catch (e: any) {
      setError(e.message ?? "Failed to save subscriber");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu aboneyi silmek istediğinize emin misiniz?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/subscribers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme işlemi başarısız");
      await loadSubscribers();
    } catch (e: any) {
      setError(e.message ?? "Silme işlemi başarısız");
    }
  }

  function handleMarkPayment(sub: Subscriber) {
    setPaymentSubscriber(sub);
    setPaymentAmount(Number(sub.monthly_fee));
    setPaymentModalOpen(true);
  }

  async function confirmPayment() {
    if (!paymentSubscriber) return;

    setPaymentProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscribers/${paymentSubscriber.id}/mark-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: paymentAmount })
      });
      if (!res.ok) throw new Error("Failed to mark payment");
      setPaymentModalOpen(false);
      setPaymentSubscriber(null);
      await loadSubscribers();
    } catch (e: any) {
      setError(e.message ?? "Failed to mark payment");
    } finally {
      setPaymentProcessing(false);
    }
  }

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Aboneler</h2>
        <button
          onClick={openCreateModal}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          Abone Ekle
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-600">Yükleniyor...</div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Ad Soyad</Th>
                <Th>Telefon</Th>
                <Th>Plaka</Th>
                <Th>Başlangıç</Th>
                <Th>Bitiş</Th>
                <Th>Durum</Th>
                <Th>Son Mesaj</Th>
                <Th>Aylık Ücret</Th>
                <Th className="text-right">İşlemler</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscribers.map((sub) => {
                const overdue = sub.end_date < todayStr || sub.status === "overdue";
                return (
                  <tr
                    key={sub.id}
                    className={overdue ? "bg-red-50" : undefined}
                  >
                    <Td>{sub.full_name}</Td>
                    <Td>{sub.phone}</Td>
                    <Td>{sub.plate_number}</Td>
                    <Td>{sub.start_date}</Td>
                    <Td>{sub.end_date}</Td>
                    <Td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sub.status === "active"
                          ? "bg-green-50 text-green-700"
                          : sub.status === "overdue"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-700"
                          }`}
                      >
                      </span>
                    </Td>
                    <Td>
                      {sub.last_overdue_reminder_sent_at ? (
                        <span className="text-xs text-red-600">Gecikme: {new Date(sub.last_overdue_reminder_sent_at).toLocaleDateString("tr-TR")}</span>
                      ) : sub.due_reminder_sent_at ? (
                        <span className="text-xs text-orange-600">Ödeme Günü: {new Date(sub.due_reminder_sent_at).toLocaleDateString("tr-TR")}</span>
                      ) : sub.pre_reminder_sent_at ? (
                        <span className="text-xs text-blue-600">Ön Hatırlatma: {new Date(sub.pre_reminder_sent_at).toLocaleDateString("tr-TR")}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </Td>
                    <Td>{Number(sub.monthly_fee).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {isReminderDue(sub) && getWhatsAppLink(sub) && (
                          <a
                            href={getWhatsAppLink(sub)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                            title="WhatsApp Hatırlatma Gönder"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                            </svg>
                            Hatırlat
                          </a>
                        )}
                        <button
                          onClick={() => handleMarkPayment(sub)}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                        >
                          Ödeme İşaretle
                        </button>
                        <button
                          onClick={() => openEditModal(sub)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Sil
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {subscribers.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-6 text-center text-slate-500">
                    No subscribers yet.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
            <h3 className="text-sm font-semibold">
              {editing ? "Abone Düzenle" : "Abone Ekle"}
            </h3>
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <Input
                label="Ad Soyad"
                value={form.full_name ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                required
              />
              <Input
                label="Telefon (Lütfen başında 0 olmadan yazınız)"
                placeholder="Örn: 5321234567"
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
              <Input
                label="Plaka"
                value={form.plate_number ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plate_number: e.target.value }))
                }
                required
              />
              <Input
                label="Başlangıç Tarihi"
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
                required
              />
              <Input
                label="Bitiş Tarihi"
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
                required
              />
              <Input
                label="Aylık Ücret (₺)"
                type="number"
                min={0}
                step="0.01"
                value={form.monthly_fee?.toString() ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    monthly_fee: Number(e.target.value)
                  }))
                }
                required
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentModalOpen && paymentSubscriber && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900">
              Ödeme Onayı
            </h3>
            <div className="mt-3 space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">
                  {paymentSubscriber.full_name}
                </span>{" "}
                adlı abonenin aylık ödemesini onaylıyor musunuz?
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Ödenecek Tutar
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={paymentProcessing}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={confirmPayment}
                  disabled={paymentProcessing}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {paymentProcessing ? "İşleniyor..." : "Ödemeyi Onayla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  colSpan
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`whitespace-nowrap px-3 py-2 text-sm text-slate-800 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      <span>{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        {...props}
      />
    </label>
  );
}

