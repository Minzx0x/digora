import Reveal from "./Reveal";
import { FaPaperPlane, FaWallet, FaStar, FaBolt, FaGift } from "react-icons/fa6";
import IconBadge from "./IconBadge";

const pin = (s: object) => ({ position: "absolute" as const, ...s });

export default function Cta() {
    return (
        <section id="beli" className="cta">
            <div className="cta-art" aria-hidden="true">
                <IconBadge icon={FaPaperPlane} bg="#ffffff" color="#2540ff" size={64} className="float cta-top" style={pin({ left: "5%", top: 70, animationDelay: "-1s" })} />
                <IconBadge icon={FaWallet} bg="#ffffff" color="#12874a" size={58} className="float-slow" style={pin({ left: "15%", bottom: -6, animationDelay: "-3s" })} />
                <IconBadge icon={FaStar} bg="#ffffff" color="#f5a623" size={58} className="float-slow cta-top" style={pin({ right: "6%", top: 40, animationDelay: "-2s" })} />
                <IconBadge icon={FaBolt} bg="#ffffff" color="#2540ff" size={54} className="float" style={pin({ right: "17%", bottom: 10 })} />
                <IconBadge icon={FaGift} bg="#ffffff" color="#e4483c" size={48} className="float" style={pin({ right: "3%", bottom: 90, animationDelay: "-4s" })} />
            </div>

            <Reveal className="cta-in">
                <p className="eyebrow eyebrow-light">Mulai sekarang</p>
                <h2 className="h2 cta-title">
                    Siap mulai?
                    <br />
                    Daftar dan pesan dalam hitungan detik.
                </h2>
                <p className="cta-text">Satu akun buat Stars, Premium, dan SMM Panel — isi tujuan, bayar, dan pesananmu diproses otomatis.</p>
                <div className="cta-actions">
                    <a className="btn-light" href="/daftar">
                        Daftar sekarang
                    </a>
                    <a className="btn-ghost" href="#bantuan">
                        Lihat bantuan
                    </a>
                </div>
            </Reveal>
        </section>
    );
}