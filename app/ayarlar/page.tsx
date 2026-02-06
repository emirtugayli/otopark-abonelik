"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [reminderDays, setReminderDays] = useState("3");
    const [reminderTemplate, setReminderTemplate] = useState("");
    const [reminderTemplateOverdue, setReminderTemplateOverdue] = useState("");

    useEffect(() => {
        fetch("/api/settings")
            .then((res) => res.json())
            .then((data) => {
                if (data.reminder_days) setReminderDays(data.reminder_days);
                if (data.reminder_template) setReminderTemplate(data.reminder_template);
                if (data.reminder_template_overdue) setReminderTemplateOverdue(data.reminder_template_overdue);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reminder_days: reminderDays,
                    reminder_template: reminderTemplate,
                    reminder_template_overdue: reminderTemplateOverdue
                })
            });

            if (!res.ok) throw new Error("Kaydedilemedi");
            setMessage("Ayarlar başarıyla kaydedildi.");
        } catch (error) {
            setMessage("Hata oluştu.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-4">Yükleniyor...</div>;

    return (
        <div className="mx-auto max-w-2xl space-y-8 py-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Sistem Ayarları
                </h1>
                <p className="text-lg text-slate-600">
                    Otomatik hatırlatma ve sistem tercihlerini buradan yönetebilirsiniz.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800">Hatırlatma Ayarları</h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Kaç Gün Kala Hatırlatılsın?
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            value={reminderDays}
                            onChange={(e) => setReminderDays(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Abonenin ödeme gününe bu kadar gün kaldığında "Hatırlat" butonu aktif olur.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            WhatsApp Mesaj Şablonu (Ödeme Yaklaşanlar İçin)
                        </label>
                        <textarea
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            value={reminderTemplate}
                            onChange={(e) => setReminderTemplate(e.target.value)}
                            placeholder="Varsayılan: Sayın {ad_soyad}, {odeme_tarihi} son ödeme tarihli..."
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Ödeme günü gelmemiş ama yaklaşmış abonelere gidecek mesaj.
                        </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <label className="block text-sm font-medium text-slate-700">
                            WhatsApp Mesaj Şablonu (GECİKENLER İçin)
                        </label>
                        <textarea
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            value={reminderTemplateOverdue}
                            onChange={(e) => setReminderTemplateOverdue(e.target.value)}
                            placeholder="Varsayılan: Sayın {ad_soyad}, ödemeniz GECİKMİŞTİR..."
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Ödeme günü geçmiş abonelere gidecek mesaj.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            Değişkenler: <code className="bg-slate-100 px-1">{`{ad_soyad}`}</code>, <code className="bg-slate-100 px-1">{`{odeme_tarihi}`}</code>, <code className="bg-slate-100 px-1">{`{tutar}`}</code>
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="text-sm font-medium text-emerald-600 min-h-[20px]">
                        {message}
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                        {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
                    </button>
                </div>
            </form>
        </div>
    );
}
