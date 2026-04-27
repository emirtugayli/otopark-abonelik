import type { Subscriber } from "@/types/subscriber";

const TEMPLATE_DEFAULT =
  "Sayın {ad_soyad}, otopark abonelik ödemenizi her ayın {gun}. günü yapmaktasınız. " +
  "Hatırlatma amacıyla yazıyoruz, kolay gelsin.";

const TEMPLATE_OVERDUE =
  "Sayın {ad_soyad}, otopark abonelik ödemeniz ayın {gun}. günü idi ve {gecikme} gün gecikmiştir. " +
  "Lütfen en kısa zamanda ödemenizi yapmayı unutmayınız.";

export function buildWhatsAppLink(
  sub: Pick<Subscriber, "phone" | "full_name" | "payment_day">,
  opts?: { daysOverdue?: number }
): string | null {
  if (!sub.phone) return null;

  const phone = String(sub.phone).replace(/[^0-9]/g, "");
  if (!phone) return null;

  const isOverdue = (opts?.daysOverdue ?? 0) > 0;
  const template = isOverdue ? TEMPLATE_OVERDUE : TEMPLATE_DEFAULT;

  const message = template
    .replace(/\{ad_soyad\}/g, sub.full_name)
    .replace(/\{gun\}/g, String(sub.payment_day))
    .replace(/\{gecikme\}/g, String(opts?.daysOverdue ?? 0));

  const target = phone.startsWith("90") ? phone : `90${phone}`;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}
