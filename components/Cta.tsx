import Reveal from "./Reveal";
import { Plane, StarCoin, RpCoin, BoltCoin, GiftCoin } from "./Coins";

const pin = (s: object) => ({ position: "absolute" as const, ...s });

export default function Cta() {
    return (
        <section id="beli" className="cta">
            <div className="cta-art" aria-hidden="true">
                <Plane className="float cta-top" scale={0.95} style={pin({ left: "5%", top: 70, animationDelay: "-1s" })} />
                <RpCoin className="float-slow" scale={0.6} style={pin({ left: "15%", bottom: -6, animationDelay: "-3s" })} />
                <StarCoin className="float-slow cta-top" scale={0.6} style={pin({ right: "6%", top: 40, animationDelay: "-2s" })} />
                <BoltCoin className="float" scale={0.62} style={pin({ right: "17%", bottom: 10 })} />
                <GiftCoin className="float" scale={0.5} style={pin({ right: "3%", bottom: 90, animationDelay: "-4s" })} />
            </div>

            <Reveal className="cta-in">
                <p className="eyebrow eyebrow-light">Mulai sekarang</p>
                <h2 className="h2 cta-title">
                    Siap mulai?
                    <br />
                    Daftar dan pesan dalam hitungan detik.
                </h2>
                <p className="cta-text">Pilih Stars, Premium, atau layanan SMM Panel — isi tujuan, bayar, dan pesananmu diproses otomatis.</p>
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