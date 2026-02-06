// Supabase Edge Function: send-reminders
// Schedule this to run daily at 09:00 from the Supabase dashboard.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const WHATSAPP_API_BASE = "https://graph.facebook.com/v18.0";

function normalizeTurkishPhone(raw: string): string | null {
  if (!raw) return null;
  let phone = raw.trim();
  if (phone.startsWith("+")) {
    phone = phone.slice(1);
  }
  phone = phone.replace(/\D/g, "");

  if (phone.length === 12 && phone.startsWith("90")) {
    return phone;
  }

  if (phone.length === 11 && phone.startsWith("05")) {
    return "9" + phone.slice(1);
  }

  if (phone.length === 10 && phone.startsWith("5")) {
    return "90" + phone;
  }

  if (phone.length === 12 && phone.startsWith("905")) {
    return phone;
  }

  return null;
}

async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  parameters: string[]
): Promise<boolean> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    console.warn("WhatsApp environment variables are not configured.");
    return false;
  }

  const normalized = normalizeTurkishPhone(phone);
  if (!normalized) {
    console.error("Invalid phone number, skipping WhatsApp send", phone);
    return false;
  }

  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: normalized,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en_US"
      },
      components: [
        {
          type: "body",
          parameters: parameters.map((value) => ({
            type: "text",
            text: value
          }))
        }
      ]
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("WhatsApp API error", res.status, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error("WhatsApp API network error", err);
    return false;
  }
}

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  function getTodayTR(): string {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Istanbul",
    });
  }

  const todayStr = getTodayTR();
  const today = new Date(todayStr);

  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysLaterStr = threeDaysLater.toISOString().slice(0, 10);
  const { data: preDue, error: preError } = await supabase
    .from("subscribers")
    .select("*")
    .eq("end_date", threeDaysLaterStr) // next_payment_date = today + 3
    .neq("status", "cancelled") // is_active = true -> status != cancelled
    .is("pre_reminder_sent_at", null);

  const preIdsToMark: string[] = [];

  if (preError) {
    console.error("Error fetching 3-days-before reminders", preError);
  } else if (preDue?.length) {
    for (const sub of preDue) {
      try {
        const success = await sendWhatsAppTemplate(sub.phone, "parking_pre_reminder", [
          sub.full_name,
          sub.end_date // next_payment_date
        ]);
        if (success) {
          preIdsToMark.push(sub.id);
        }
      } catch (e) {
        console.error("Failed to send pre reminder for subscriber", sub.id, e);
      }
    }
  }

  if (preIdsToMark.length > 0) {
    const { error: markPreError } = await supabase
      .from("subscribers")
      .update({ pre_reminder_sent_at: new Date().toISOString() })
      .in("id", preIdsToMark);
    if (markPreError) {
      console.error("Failed to mark pre reminders", markPreError);
    }
  }

  // B) Ödeme günü (1 kez)
  const { data: dueToday, error: dueError } = await supabase
    .from("subscribers")
    .select("*")
    .eq("end_date", todayStr) // next_payment_date = today
    .neq("status", "cancelled")
    .is("due_reminder_sent_at", null);

  const dueIdsToMark: string[] = [];

  if (dueError) {
    console.error("Error fetching due-today reminders", dueError);
  } else if (dueToday?.length) {
    for (const sub of dueToday) {
      try {
        const success = await sendWhatsAppTemplate(sub.phone, "parking_due_reminder", [
          sub.full_name,
          sub.end_date // next_payment_date
        ]);
        if (success) {
          dueIdsToMark.push(sub.id);
        }
      } catch (e) {
        console.error("Failed to send due reminder for subscriber", sub.id, e);
      }
    }
  }

  if (dueIdsToMark.length > 0) {
    const { error: markDueError } = await supabase
      .from("subscribers")
      .update({ due_reminder_sent_at: new Date().toISOString() })
      .in("id", dueIdsToMark);
    if (markDueError) {
      console.error("Failed to mark due reminders", markDueError);
    }
  }

  // C) Gecikme (her gün 1 kez / abone)
  const { data: overdueRaw, error: overdueError } = await supabase
    .from("subscribers")
    .select("*")
    .lt("end_date", todayStr) // next_payment_date < today
    .neq("status", "cancelled");

  const overdueToNotify =
    (overdueRaw as any[])?.filter((sub: any) => {
      const last: string | null = sub.last_overdue_reminder_sent_at;
      if (!last) return true;
      const lastDate = new Date(last).toISOString().slice(0, 10);
      return lastDate < todayStr; // son gönderim tarihi bugünden küçükse tekrar gönder
    }) ?? [];

  const overdueIdsToMark: string[] = [];

  if (overdueError) {
    console.error("Error fetching overdue reminders", overdueError);
  } else if (overdueToNotify.length) {
    const startOfToday = new Date(todayStr + "T00:00:00");
    for (const sub of overdueToNotify) {
      try {
        const nextPaymentDate = new Date(sub.end_date);
        const diffMs = startOfToday.getTime() - nextPaymentDate.getTime();
        const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        const success = await sendWhatsAppTemplate(
          sub.phone,
          "parking_overdue_reminder",
          [
            sub.full_name,
            String(daysOverdue),
            sub.end_date // next_payment_date
          ]
        );
        if (success) {
          overdueIdsToMark.push(sub.id);
        }
      } catch (e) {
        console.error("Failed to send overdue reminder for subscriber", sub.id, e);
      }
    }
  }

  if (overdueIdsToMark.length > 0) {
    const { error: markOverdueError } = await supabase
      .from("subscribers")
      .update({ last_overdue_reminder_sent_at: new Date().toISOString() })
      .in("id", overdueIdsToMark);
    if (markOverdueError) {
      console.error("Failed to mark overdue reminders", markOverdueError);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      preRemindersSent: preIdsToMark.length,
      dueRemindersSent: dueIdsToMark.length,
      overdueRemindersSent: overdueIdsToMark.length
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
});

