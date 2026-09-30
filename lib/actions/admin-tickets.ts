"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin";
import { uploadTicketAttachment, signAttachment, type TicketStatus, type TicketMessageRow } from "@/lib/actions/tickets";

export type AdminTicketRow = {
    id: string;
    subject: string;
    status: TicketStatus;
    category: string | null;
    subcategory: string | null;
    orderId: string | null;
    userName: string;
    userEmail: string;
    lastMessage: string;
    lastMessageAt: string;
};

// Semua tiket (lintas customer) — RLS tickets_select_own_or_admin ngizinin
// admin lihat semua baris, jadi query pakai client biasa (bukan service role),
// sama pola dengan getCustomersData/getPaymentsData.
export async function getAdminTicketsData(): Promise<{ isAdmin: boolean; tickets: AdminTicketRow[] }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { isAdmin: false, tickets: [] };

    const { data: ticketsRaw } = await supabase
        .from("tickets")
        .select("id, user_id, subject, status, category, subcategory, order_id, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);

    const ticketIds = (ticketsRaw ?? []).map((t) => t.id as string);
    const userIds = [...new Set((ticketsRaw ?? []).map((t) => t.user_id as string))];

    const [{ data: msgsRaw }, { data: profilesRaw }] = await Promise.all([
        ticketIds.length > 0
            ? supabase
                  .from("ticket_messages")
                  .select("ticket_id, message, attachment_path, created_at")
                  .in("ticket_id", ticketIds)
                  .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] as { ticket_id: string; message: string; attachment_path: string | null; created_at: string }[] }),
        userIds.length > 0
            ? supabase.from("profiles").select("id, name, email").in("id", userIds)
            : Promise.resolve({ data: [] as { id: string; name: string; email: string }[] }),
    ]);

    const lastMsg = new Map<string, { message: string; attachmentPath: string | null; createdAt: string }>();
    for (const m of msgsRaw ?? []) {
        const tid = m.ticket_id as string;
        if (!lastMsg.has(tid))
            lastMsg.set(tid, { message: m.message as string, attachmentPath: m.attachment_path as string | null, createdAt: m.created_at as string });
    }
    const profileMap = new Map((profilesRaw ?? []).map((p) => [p.id as string, { name: p.name as string, email: p.email as string }]));

    const tickets: AdminTicketRow[] = (ticketsRaw ?? []).map((t) => {
        const last = lastMsg.get(t.id as string);
        return {
            id: t.id as string,
            subject: t.subject as string,
            status: t.status as TicketStatus,
            category: t.category as string | null,
            subcategory: t.subcategory as string | null,
            orderId: t.order_id as string | null,
            userName: profileMap.get(t.user_id as string)?.name || "(tanpa nama)",
            userEmail: profileMap.get(t.user_id as string)?.email || "-",
            lastMessage: last?.message?.trim() ? last.message : last?.attachmentPath ? "📷 Foto" : "",
            lastMessageAt: last?.createdAt ?? (t.updated_at as string),
        };
    });

    return { isAdmin: true, tickets };
}

export async function getAdminTicketThreadAction(ticketId: string): Promise<TicketMessageRow[]> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return [];

    const { data } = await supabase
        .from("ticket_messages")
        .select("id, is_admin, message, attachment_path, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

    return Promise.all(
        (data ?? []).map(async (m) => ({
            id: m.id as string,
            isAdmin: !!m.is_admin,
            message: m.message as string,
            createdAt: m.created_at as string,
            attachmentUrl: await signAttachment(supabase, m.attachment_path as string | null),
        })),
    );
}

export async function adminReplyTicketAction(input: { ticketId: string; message: string; file?: File | null }): Promise<{ error: string | null }> {
    if (!input.message.trim() && !input.file) return { error: "Isi pesan atau lampirkan foto dulu." };
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };

    let attachmentPath: string | null = null;
    if (input.file) {
        const uploaded = await uploadTicketAttachment(supabase, input.ticketId, input.file);
        if (uploaded.error) return { error: uploaded.error };
        attachmentPath = uploaded.path;
    }

    const { error } = await supabase.rpc("admin_reply_ticket", {
        p_ticket_id: input.ticketId,
        p_message: input.message.trim(),
        p_attachment_path: attachmentPath,
    });
    if (error) return { error: "Gagal mengirim balasan." };
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}

export async function adminSetTicketStatusAction(ticketId: string, status: TicketStatus): Promise<{ error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };

    const { error } = await supabase.rpc("admin_set_ticket_status", { p_ticket_id: ticketId, p_status: status });
    if (error) return { error: "Gagal ubah status tiket." };
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}
