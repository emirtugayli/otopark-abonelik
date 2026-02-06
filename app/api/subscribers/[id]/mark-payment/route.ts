import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import { getTodayTR } from "@/lib/date";

interface Params {
  params: {
    id: string;
  };
}

export async function POST(request: Request, { params }: Params) {
  const body = await request.json();
  const amount = Number(body?.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const { data: subscriber, error: subError } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (subError || !subscriber) {
    console.error(subError);
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  const todayStr = getTodayTR();
  const today = new Date(todayStr);
  const currentEnd = new Date(subscriber.end_date);
  const baseDate = currentEnd > today ? currentEnd : today;
  const newEnd = new Date(baseDate);
  newEnd.setMonth(newEnd.getMonth() + 1);

  const newEndStr = newEnd.toISOString().slice(0, 10);

  const { error: insertError } = await supabaseAdmin.from("payments").insert({
    subscriber_id: params.id,
    amount,
    payment_date: todayStr,
    payment_method: "cash"
  });

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("subscribers")
    .update({
      end_date: newEndStr,
      status: "active",
      pre_reminder_sent_at: null,
      due_reminder_sent_at: null,
      last_overdue_reminder_sent_at: null
    })
    .eq("id", params.id);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ success: true });
}

