// Aturan username Telegram: 5–32 karakter, huruf/angka/underscore,
// harus diawali huruf, tidak boleh diakhiri underscore, tanpa "__".
export function checkUsernameFormat(raw: string): string | null {
    const u = raw.trim().replace(/^@/, "");
    if (!u) return "Isi username Telegram tujuan.";
    if (u.length < 5) return "Username minimal 5 karakter.";
    if (u.length > 32) return "Username maksimal 32 karakter.";
    if (!/^[A-Za-z0-9_]+$/.test(u)) return "Hanya huruf, angka, dan underscore (_).";
    if (!/^[A-Za-z]/.test(u)) return "Username harus diawali huruf.";
    if (u.endsWith("_")) return "Username tidak boleh diakhiri underscore.";
    if (u.includes("__")) return "Username tidak boleh memuat dua underscore berurutan.";
    return null;
}