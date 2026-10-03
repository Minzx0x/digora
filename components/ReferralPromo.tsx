import Reveal from "./Reveal";
import { FaGift, FaUserGroup, FaCoins } from "react-icons/fa6";
import IconBadge from "./IconBadge";

const pin = (s: object) => ({ position: "absolute" as const, ...s });

// Promosi program "Ajak Teman" di landing page buat visitor yang BELUM
// daftar -- makanya kodenya di sini cuma ilustrasi format (6 karakter, sama
// kayak format asli di supabase/referrals.sql, mix huruf+angka biar kebaca
// kayak kode beneran -- bukan "XXXXXX" yang kesannya cuma placeholder
// kosong), BUKAN kode akun siapa pun. Copy-nya juga sengaja nggak bilang
// "kalian sama-sama untung" -- di skema final cuma yang ngajak (referrer)
// yang dapat komisi, yang diajak nggak dapat bonus tambahan (lihat
// lib/actions/referral.ts).
export default function ReferralPromo() {
    return (
        <section id="referral" className="sec sec-dark" style={{ overflow: "hidden" }}>
            <div className="ref-art" aria-hidden="true">
                <IconBadge icon={FaUserGroup} bg="#ffffff" color="#2540ff" size={56} className="float-slow" style={pin({ left: "6%", top: 24 })} />
                <IconBadge icon={FaCoins} bg="#ffffff" color="#f5a623" size={48} className="float" style={pin({ left: "20%", bottom: 10, animationDelay: "-2s" })} />
            </div>

            <div className="sec-in">
                <Reveal className="ref-grid">
                    <div>
                        <p className="eyebrow eyebrow-light">Program Referral</p>
                        <h2 className="h2">
                            Ajak teman,
                            <br />
                            dapat komisi
                        </h2>
                        <p className="cta-text" style={{ maxWidth: 440 }}>
                            Daftar gratis, lalu bagikan kode referral kamu ke teman atau komunitas. Begitu ada yang pakai
                            kodemu dan top up saldo untuk pertama kali, komisi otomatis masuk ke saldo kamu — nggak ada
                            batas berapa kali kamu bisa ajak orang.
                        </p>
                        <div style={{ display: "flex", marginTop: 32 }}>
                            <a className="btn-light" href="/daftar">
                                Mulai Ajak Teman →
                            </a>
                        </div>
                    </div>

                    <div className="ref-card">
                        <IconBadge icon={FaGift} bg="#ffffff" color="#2540ff" size={56} className="ref-card-icon" />
                        <p className="ref-card-label">Kode referral kamu sendiri</p>
                        <div className="ref-card-code">A8K2QX</div>
                        <p className="ref-card-note">Dapat otomatis begitu kamu daftar. Komisi langsung masuk saldo tiap ada yang order pakai kode ini.</p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
