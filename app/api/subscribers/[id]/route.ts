import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeTurkishPhone } from "@/lib/phone";

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params) {
  const body = await request.json();
  const { full_name, phone, plate_number, vehicle_type, payment_day } = body ?? {};

  const update: Record<string, any> = {};
  if (full_name != null) update.full_name = String(full_name).trim();
  if (plate_number != null) update.plate_number = String(plate_number).trim();
  if (vehicle_type != null) {
    if (!["OTOMOBIL", "MOTOR"].includes(vehicle_type)) {
      return NextResponse.json({ error: "Geçersiz araç tipi" }, { status: 400 });
    }
    update.vehicle_type = vehicle_type;
  }
  if (payment_day != null) {
    const day = Number(payment_day);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return NextResponse.json({ error: "Ödeme günü 1-31 arası olmalı" }, { status: 400 });
    }
    update.payment_day = day;
  }
  if (phone !== undefined) {
    const trimmed = phone == null ? "" : String(phone).trim();
    if (!trimmed) {
      update.phone = null;
    } else {
      try {
        update.phone = normalizeTurkishPhone(trimmed);
      } catch (e: any) {
        return NextResponse.json(
          { error: e?.message ?? "Geçersiz telefon formatı" },
          { status: 400 }
        );
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Güncellenemedi" }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ subscriber: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { error } = await supabaseAdmin
    .from("subscribers")
    .update({ status: "cancelled" })
    .eq("id", params.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
