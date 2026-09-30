"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TicketStatus = "open" | "closed";

export type TicketRow = {
    id: string;
    subject: string;
    status: TicketStatus;
    category: string | null;
    subcategory: string | null;
    orderId: string | null;
    lastMessage: string;
    lastMessageAt: string;
};

export type TicketMessageRow = {
    id: string;
    isAdmin: boolean;
    message: string;
    createdAt: string;
    attachmentUrl: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const ATTACHMENT_BUCKET = "ticket-attachments";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Upload foto lampiran ke Storage privat "ticket-attachments" — path
// "{ticket_id}/{uuid}.{ext}", segmen folder pertama dipakai storage RLS buat
// cek kepemilikan tiket (pemilik atau admin), sama pola dengan RLS
// ticket_messages_select_own_or_admin. Dipakai juga dari admin-tickets.ts.
export async function uploadTicketAttachment(
    supabase: SupabaseServerClient,
    ticketId: string,
    file: File,
): Promise<{ path: string | null; error: string | null }> {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        return { path: null, error: "Format foto tidak didukung (cuma JPEG/PNG/WEBP/GIF)." };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return { path: null, error: "Ukuran foto maksimal 5MB." };
    }
    const ext = file.name.split(".").pop()?.toLowerCase().slice(0, 5) || "jpg";
    const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { contentType: file.type });
    if (error) return { path: null, error: "Gagal upload foto." };
    return { path, error: null };
}

// Signed URL berlaku 6 jam — cukup buat satu sesi buka thread tanpa perlu
// nge-refresh, tanpa harus bikin bucket-nya public (yang bakal bikin siapapun
// dengan link bisa buka foto walau bukan pemilik/admin tiketnya).
export async function signAttachment(supabase: SupabaseServerClient, path: string | null): Promise<string | null> {
    if (!path) return null;
    const { data } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 6 * 3600);
    return data?.signedUrl ?? null;
}

// Daftar tiket milik user sendiri (RLS: tickets_select_own_or_admin sudah
// nyaring, jadi query di sini nggak perlu .eq("user_id", ...) manual) —
// dilengkapi cuplikan pesan terakhir tiap tiket buat ditampilin di list.
export async function getMyTicketsAction(): Promise<TicketRow[]> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];

    const { data: ticketsRaw } = await supabase
        .from("tickets")
        .select("id, subject, status, category, subcategory, order_id, created_at, updated_at")
        .order("updated_at", { ascending: false });

    const ids = (ticketsRaw ?? []).map((t) => t.id as string);
    const { data: msgsRaw } =
        ids.length > 0
            ? await supabase
                  .from("ticket_messages")
                  .select("ticket_id, message, attachment_path, created_at")
                  .in("ticket_id", ids)
                  .order("created_at", { ascending: false })
            : { data: [] as { ticket_id: string; message: string; attachment_path: string | null; created_at: string }[] };

    const lastMsg = new Map<string, { message: string; attachmentPath: string | null; createdAt: string }>();
    for (const m of msgsRaw ?? []) {
        const tid = m.ticket_id as string;
        if (!lastMsg.has(tid))
            lastMsg.set(tid, { message: m.message as string, attachmentPath: m.attachment_path as string | null, createdAt: m.created_at as string });
    }

    return (ticketsRaw ?? []).map((t) => {
        const last = lastMsg.get(t.id as string);
        return {
            id: t.id as string,
            subject: t.subject as string,
            status: t.status as TicketStatus,
            category: t.category as string | null,
            subcategory: t.subcategory as string | null,
            orderId: t.order_id as string | null,
            lastMessage: last?.message?.trim() ? last.message : last?.attachmentPath ? "📷 Foto" : "",
            lastMessageAt: last?.createdAt ?? (t.updated_at as string),
        };
    });
}

// Isi thread satu tiket — RLS ticket_messages_select_own_or_admin sudah
// mastiin tiket ini emang punya user yang minta (atau admin).
export async function getTicketThreadAction(ticketId: string): Promise<TicketMessageRow[]> {
    const supabase = await createClient();
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

export async function createTicketAction(input: {
    subject: string;
    message: string;
    category?: string;
    subcategory?: string;
    orderId?: string;
    file?: File | null;
}): Promise<{ error: string | null; ticketId?: string }> {
    if (!input.subject.trim() || !input.message.trim()) return { error: "Isi subjek dan pesan dulu." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_ticket", {
        p_subject: input.subject.trim(),
        p_message: input.message.trim(),
        p_category: input.category?.trim() || null,
        p_subcategory: input.subcategory?.trim() || null,
        p_order_id: input.orderId?.trim() || null,
    });
    if (error) return { error: "Gagal membuat tiket. Coba lagi." };
    const ticket = data as { id?: string } | null;

    // Lampiran (kalau ada) dikirim sebagai pesan susulan lewat reply_ticket --
    // tiketnya sendiri harus sudah ada dulu (storage RLS ticket_attachments_*
    // ngecek folder path = ticket_id yang beneran ada di tabel tickets),
    // sama pola upload yang dipakai tk-reply.
    if (input.file && ticket?.id) {
        const uploaded = await uploadTicketAttachment(supabase, ticket.id, input.file);
        if (!uploaded.error && uploaded.path) {
            await supabase.rpc("reply_ticket", { p_ticket_id: ticket.id, p_message: "", p_attachment_path: uploaded.path });
        }
    }

    revalidatePath("/dashboard", "layout");
    return { error: null, ticketId: ticket?.id };
}

export async function replyTicketAction(input: { ticketId: string; message: string; file?: File | null }): Promise<{ error: string | null }> {
    if (!input.message.trim() && !input.file) return { error: "Isi pesan atau lampirkan foto dulu." };
    const supabase = await createClient();

    let attachmentPath: string | null = null;
    if (input.file) {
        const uploaded = await uploadTicketAttachment(supabase, input.ticketId, input.file);
        if (uploaded.error) return { error: uploaded.error };
        attachmentPath = uploaded.path;
    }

    const { error } = await supabase.rpc("reply_ticket", {
        p_ticket_id: input.ticketId,
        p_message: input.message.trim(),
        p_attachment_path: attachmentPath,
    });
    if (error) {
        if (error.message.includes("ticket_closed")) return { error: "Tiket ini sudah ditutup. Buat tiket baru kalau masih ada kendala." };
        return { error: "Gagal mengirim pesan. Coba lagi." };
    }
    revalidatePath("/dashboard", "layout");
    return { error: null };
}

export async function closeTicketAction(ticketId: string): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("close_ticket_own", { p_ticket_id: ticketId });
    if (error) return { error: "Gagal menutup tiket." };
    revalidatePath("/dashboard", "layout");
    return { error: null };
}
