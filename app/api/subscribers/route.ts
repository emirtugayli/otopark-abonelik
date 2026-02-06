import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeTurkishPhone } from "@/lib/phone";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load subscribers" }, { status: 500 });
  }

  return NextResponse.json({ subscribers: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { full_name, phone, plate_number, start_date, end_date, monthly_fee } =
    body ?? {};

  if (
    !full_name ||
    !phone ||
    !plate_number ||
    !start_date ||
    !end_date ||
    monthly_fee == null
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeTurkishPhone(phone);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Invalid phone format" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .insert({
      full_name,
      phone: normalizedPhone,
      plate_number,
      start_date,
      end_date,
      monthly_fee,
      status: "active"
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 });
  }

  return NextResponse.json({ subscriber: data }, { status: 201 });
}

