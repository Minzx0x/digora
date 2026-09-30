"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction, changePasswordAction, uploadAvatarAction } from "@/lib/actions/data";
import { TIER_COLORS, type TierInfo } from "@/lib/tier";

function pwStrength(pw: string) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
    return pw ? Math.max(1, s) : 0;
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export default function ProfilView({
    initial,
    tier,
}: {
    initial: { name: string; telegramUsername: string; email: string; avatarUrl: string | null };
    tier: TierInfo;
}) {
    const router = useRouter();
    const [profile, setProfile] = useState({ name: initial.name, tg: initial.telegramUsername, email: initial.email });
    const [profMsg, setProfMsg] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
    const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            setAvatarMsg({ ok: false, t: "Format foto tidak didukung (cuma JPEG/PNG/WEBP)." });
            return;
        }
        if (file.size > MAX_AVATAR_BYTES) {
            setAvatarMsg({ ok: false, t: "Ukuran foto maksimal 3MB." });
            return;
        }
        setUploadingAvatar(true);
        setAvatarMsg(null);
        const res = await uploadAvatarAction(file);
        setUploadingAvatar(false);
        if (res.error) {
            setAvatarMsg({ ok: false, t: res.error });
            return;
        }
        setAvatarUrl(res.url);
        setAvatarMsg({ ok: true, t: "Foto profil diperbarui." });
        router.refresh();
        if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const [changingPw, setChangingPw] = useState(false);
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [newPwVal, setNewPwVal] = useState("");

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault();
        setSavingProfile(true);
        const res = await updateProfileAction({ name: profile.name, telegramUsername: profile.tg });
        setSavingProfile(false);
        if (res.error) {
            setProfMsg(res.error);
            return;
        }
        setProfMsg("Profil tersimpan.");
        router.refresh();
        setTimeout(() => setProfMsg(""), 2000);
    }

    async function savePw(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const oldPw = String(f.get("old") ?? "");
        const a = String(f.get("new") ?? "");
        if (a.length < 8) return setPwMsg({ ok: false, t: "Password baru minimal 8 karakter." });
        if (a !== f.get("again")) return setPwMsg({ ok: false, t: "Konfirmasi password tidak sama." });
        setChangingPw(true);
        const res = await changePasswordAction({ oldPassword: oldPw, newPassword: a });
        setChangingPw(false);
        if (res.error) return setPwMsg({ ok: false, t: res.error });
        setPwMsg({ ok: true, t: "Password diperbarui." });
        form.reset();
        setNewPwVal("");
    }

    return (
        <div className="u-narrow u-profil-stack">
            <div className="d-card">
                <div className="u-avatar-row">
                    <div className="u-avatar-wrap">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Foto profil" className="u-avatar" />
                        ) : (
                            <span className="u-avatar u-avatar-fallback" aria-hidden="true">
                                {initials(profile.name)}
                            </span>
                        )}
                        <button
                            type="button"
                            className="u-avatar-edit"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={uploadingAvatar}
                        >
                            {uploadingAvatar ? "…" : "Ganti"}
                        </button>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            onChange={handleAvatarChange}
                        />
                    </div>
                    <div className="u-avatar-info">
                        <b>{profile.name || "Pengguna Digora"}</b>
                        <span
                            className="u-tier-badge"
                            style={{ background: TIER_COLORS[tier.tier].bg, color: TIER_COLORS[tier.tier].text }}
                        >
                            {tier.label}
                        </span>
                        <p className="d-note">JPEG/PNG/WEBP, maks 3MB.</p>
                        {avatarMsg && <div className={avatarMsg.ok ? "u-ok" : "u-bad"}>{avatarMsg.t}</div>}
                    </div>
                </div>

                <div className="u-tier-progress">
                    {tier.nextLabel ? (
                        <>
                            <div className="stat-bar-top">
                                <span>Total belanja sukses: {rp(tier.totalSpend)}</span>
                                <span>
                                    Menuju {tier.nextLabel}: {rp(Math.max(0, (tier.nextThreshold ?? 0) - tier.totalSpend))} lagi
                                </span>
                            </div>
                            <div className="stat-bar-track">
                                <div
                                    className="stat-bar-fill"
                                    style={{ width: `${tier.progressPct}%`, background: TIER_COLORS[tier.tier].text }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="stat-bar-top">
                            <span>Total belanja sukses: {rp(tier.totalSpend)}</span>
                            <span>Tier tertinggi 🎉</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="d-card">
                <div className="d-card-head">
                    <h2>Profil</h2>
                </div>
                <form className="u-mini" onSubmit={saveProfile}>
                    <label>
                        Nama lengkap
                        <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Nama kamu" />
                    </label>
                    <label>
                        Username Telegram
                        <input
                            value={profile.tg}
                            onChange={(e) => setProfile({ ...profile, tg: e.target.value.replace(/^@/, "") })}
                            placeholder="@username"
                        />
                    </label>
                    <label>
                        Email
                        <input type="email" value={profile.email} disabled readOnly title="Email tidak bisa diubah di sini" />
                    </label>
                    <p className="d-note d-note-email">
                        Email dipakai untuk login, tidak bisa diganti dari halaman ini.
                    </p>
                    <button className="d-btn" type="submit" disabled={savingProfile}>
                        {savingProfile ? "Menyimpan…" : "Simpan profil"}
                    </button>
                    {profMsg && <div className="u-ok">{profMsg}</div>}
                </form>
            </div>

            <div className="d-card">
                <div className="d-card-head">
                    <h2>Keamanan</h2>
                </div>
                <form className="u-mini" onSubmit={savePw}>
                    <label>
                        Password lama
                        <div className="u-mini-pw">
                            <input name="old" type={showOldPw ? "text" : "password"} autoComplete="current-password" />
                            <button type="button" className="eye" onClick={() => setShowOldPw((s) => !s)}>
                                {showOldPw ? "Tutup" : "Lihat"}
                            </button>
                        </div>
                    </label>
                    <label>
                        Password baru
                        <div className="u-mini-pw">
                            <input
                                name="new"
                                type={showNewPw ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="Minimal 8 karakter"
                                value={newPwVal}
                                onChange={(e) => setNewPwVal(e.target.value)}
                            />
                            <button type="button" className="eye" onClick={() => setShowNewPw((s) => !s)}>
                                {showNewPw ? "Tutup" : "Lihat"}
                            </button>
                        </div>
                        {newPwVal && (
                            <div className="pw-meter" aria-hidden="true">
                                {[1, 2, 3].map((n) => (
                                    <i key={n} className={pwStrength(newPwVal) >= n ? `on${pwStrength(newPwVal)}` : ""} />
                                ))}
                            </div>
                        )}
                    </label>
                    <label>
                        Ulangi password baru
                        <div className="u-mini-pw">
                            <input name="again" type={showNewPw ? "text" : "password"} autoComplete="new-password" />
                        </div>
                    </label>
                    <button className="d-btn" type="submit" disabled={changingPw}>
                        {changingPw ? "Memproses…" : "Ganti password"}
                    </button>
                    {pwMsg && <div className={pwMsg.ok ? "u-ok" : "u-bad"}>{pwMsg.t}</div>}
                </form>
            </div>
        </div>
    );
}