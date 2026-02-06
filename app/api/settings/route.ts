import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
    const { data, error } = await supabaseAdmin.from("settings").select("*");
    if (error) {
        return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }

    // Transform array to object
    const settings: Record<string, string> = {};
    data?.forEach((item: { key: string; value: string }) => {
        settings[item.key] = item.value;
    });

    return NextResponse.json(settings);
}

export async function POST(request: Request) {
    const body = await request.json();
    const validKeys = ["reminder_days", "reminder_template", "reminder_template_overdue"];

    // Upsert each key
    for (const key of validKeys) {
        if (body[key] !== undefined) {
            await supabaseAdmin.from("settings").upsert({ key, value: String(body[key]) });
        }
    }

    revalidatePath("/ayarlar");
    return NextResponse.json({ success: true });
}
