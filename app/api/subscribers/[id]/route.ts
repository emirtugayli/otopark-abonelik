import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeTurkishPhone } from "@/lib/phone";

interface Params {
  params: {
    id: string;
  };
}

export async function PUT(request: Request, { params }: Params) {
  const body = await request.json();
  const { full_name, phone, plate_number, start_date, end_date, monthly_fee } =
    body ?? {};

  let normalizedPhone: string | undefined;
  if (phone) {
    try {
      normalizedPhone = normalizeTurkishPhone(phone);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Invalid phone format" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .update({
      full_name,
      phone: normalizedPhone ?? phone,
      plate_number,
      start_date,
      end_date,
      monthly_fee
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ subscriber: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await supabaseAdmin
    .from("subscribers")
    .update({ status: "cancelled" })
    .eq("id", params.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ success: true });
}

