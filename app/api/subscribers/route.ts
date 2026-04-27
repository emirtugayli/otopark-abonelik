import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeTurkishPhone } from "@/lib/phone";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .neq("status", "cancelled")
    .order("vehicle_type", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Aboneler yüklenemedi" }, { status: 500 });
  }

  return NextResponse.json({ subscribers: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { full_name, phone, plate_number, vehicle_type, payment_day } = body ?? {};

  if (!full_name || !plate_number || !vehicle_type || !payment_day) {
    return NextResponse.json({ error: "Eksik alan var" }, { status: 400 });
  }

  if (!["OTOMOBIL", "MOTOR"].includes(vehicle_type)) {
    return NextResponse.json({ error: "Geçersiz araç tipi" }, { status: 400 });
  }

  const day = Number(payment_day);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return NextResponse.json({ error: "Ödeme günü 1-31 arası olmalı" }, { status: 400 });
  }

  let normalizedPhone: string | null = null;
  if (phone && String(phone).trim()) {
    try {
      normalizedPhone = normalizeTurkishPhone(String(phone));
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Geçersiz telefon formatı" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .insert({
      full_name: String(full_name).trim(),
      phone: normalizedPhone,
      plate_number: String(plate_number).trim(),
      vehicle_type,
      payment_day: day,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Abone eklenemedi" }, { status: 500 });
  }

  return NextResponse.json({ subscriber: data }, { status: 201 });
}
