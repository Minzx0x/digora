import { checkUsernameFormat } from "@/lib/telegram";

type Result =
    | { status: "ok"; name: string }
    | { status: "not_found" }
    | { status: "not_user" }
    | { status: "invalid"; message: string }
    | { status: "unknown" };

// cache singkat supaya tidak memukul t.me berulang untuk username yang sama
const cache = new Map<string, { at: number; result: Result }>();
const TTL = 5 * 60 * 1000;

const decode = (s: string) =>
    s
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

const meta = (html: string, prop: string) => {
    const m = html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`, "i"));
    return m ? decode(m[1]) : "";
};

export async function GET(request: Request) {
    const raw = new URL(request.url).searchParams.get("u") ?? "";
    const bad = checkUsernameFormat(raw);
    if (bad) return Response.json({ status: "invalid", message: bad } satisfies Result);

    const u = raw.trim().replace(/^@/, "");
    const key = u.toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return Response.json(hit.result);

    let result: Result = { status: "unknown" };
    try {
        const res = await fetch(`https://t.me/${u}`, {
            headers: { "user-agent": "Mozilla/5.0 (compatible; DigoraBot/1.0)" },
            signal: AbortSignal.timeout(5000),
            redirect: "follow",
        });
        if (res.ok) {
            const html = await res.text();
            const title = meta(html, "og:title");
            // halaman username yang tidak ada: og:title = "Telegram: Contact @username"
            if (!title || /^Telegram: Contact @/i.test(title)) {
                result = { status: "not_found" };
            } else if (/(subscribers?|members?|pelanggan|anggota)/i.test(html.match(/tgme_page_extra">([^<]*)</)?.[1] ?? "")) {
                // channel / grup, bukan akun pengguna
                result = { status: "not_user" };
            } else {
                result = { status: "ok", name: title };
            }
        }
    } catch {
        // t.me tidak terjangkau / timeout: jangan blokir pembeli
        result = { status: "unknown" };
    }

    if (result.status !== "unknown") cache.set(key, { at: Date.now(), result });
    return Response.json(result);
}