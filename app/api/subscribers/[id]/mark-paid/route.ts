import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTodayTR } from "@/lib/date";

interface Params {
  params: { id: string };
}

export async function POST(_req: Request, { params }: Params) {
  const { error } = await supabaseAdmin
    .from("subscribers")
    .update({ last_paid_at: getTodayTR() })
    .eq("id", params.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "İşaretlenemedi" }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { error } = await supabaseAdmin
    .from("subscribers")
    .update({ last_paid_at: null })
    .eq("id", params.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Geri alınamadı" }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
