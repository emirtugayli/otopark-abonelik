import type { Subscriber } from "@/types/subscriber";

export type CycleStatus = "PAID" | "DUE_TODAY" | "OVERDUE" | "APPROACHING" | "PENDING";

export interface SubscriberCycleInfo {
  status: CycleStatus;
  nextDueDate: Date;
  daysUntilDue: number;
  daysOverdue: number;
}

const APPROACHING_THRESHOLD_DAYS = 5;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dueInMonth(year: number, month: number, paymentDay: number): Date {
  const day = Math.min(paymentDay, daysInMonth(year, month));
  return new Date(year, month, day);
}

function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function computeCycleInfo(
  sub: Pick<Subscriber, "payment_day" | "last_paid_at">,
  todayInput?: Date
): SubscriberCycleInfo {
  const today = startOfDay(todayInput ?? new Date());
  const paymentDay = sub.payment_day;

  const thisMonthDue = dueInMonth(today.getFullYear(), today.getMonth(), paymentDay);
  const lastCycleStart =
    today >= thisMonthDue
      ? thisMonthDue
      : dueInMonth(today.getFullYear(), today.getMonth() - 1, paymentDay);

  const lastPaid = sub.last_paid_at ? startOfDay(new Date(sub.last_paid_at)) : null;
  const paidForCurrentCycle = !!(lastPaid && lastPaid >= lastCycleStart);

  let nextDueDate: Date;
  if (paidForCurrentCycle) {
    nextDueDate = dueInMonth(
      lastCycleStart.getFullYear(),
      lastCycleStart.getMonth() + 1,
      paymentDay
    );
  } else {
    nextDueDate = lastCycleStart;
  }

  const daysUntilDue = diffDays(nextDueDate, today);

  let status: CycleStatus;
  if (paidForCurrentCycle) {
    status = daysUntilDue <= APPROACHING_THRESHOLD_DAYS ? "APPROACHING" : "PAID";
  } else if (daysUntilDue < 0) {
    status = "OVERDUE";
  } else if (daysUntilDue === 0) {
    status = "DUE_TODAY";
  } else if (daysUntilDue <= APPROACHING_THRESHOLD_DAYS) {
    status = "APPROACHING";
  } else {
    status = "PENDING";
  }

  return {
    status,
    nextDueDate,
    daysUntilDue,
    daysOverdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0,
  };
}

export function formatDateTR(d: Date): string {
  return d.toLocaleDateString("tr-TR");
}
