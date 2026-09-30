import Reveal from "./Reveal";
import { FaTag, FaReceipt, FaBolt, FaTelegram, FaHeart } from "react-icons/fa6";
import IconBadge from "./IconBadge";

const pin = (s: object) => ({ position: "absolute" as const, ...s });

export default function Benefits() {
    return (
        <section id="harga" className="sec">
            <div className="sec-in">
                <Reveal>
                    <div className="sec-head">
                        <div>
                            <p className="eyebrow">Kenapa Digora</p>
                            <h2 className="h2">
                                Cepat, jelas,
                                <br />
                                dan tidak bikin ribet
                            </h2>
                        </div>
                    </div>
                </Reveal>

                <div className="bento">
                    <Reveal className="b-cell b-cell-blue">
                        <article className="b-card b-blue">
                            <div className="b-art" aria-hidden="true">
                                <IconBadge icon={FaTag} bg="#ffffff" color="#2540ff" size={92} className="float-slow" style={pin({ right: 60, top: 24 })} />
                                <IconBadge icon={FaReceipt} bg="#1a2cff" size={56} className="float" style={pin({ right: -6, top: 150, animationDelay: "-2s" })} />
                            </div>
                            <span className="chip chip-light">Harga terjangkau</span>
                            <div>
                                <h3 className="b-title">Harga jelas, tanpa biaya tersembunyi</h3>
                                <p className="b-text">Semua harga tampil di depan sebelum kamu membayar. Tidak ada kejutan di akhir.</p>
                            </div>
                        </article>
                    </Reveal>

                    <Reveal delay={100} className="b-cell b-cell-yellow">
                        <article className="b-card b-yellow">
                            <div className="b-art" aria-hidden="true">
                                <IconBadge icon={FaBolt} bg="#0e0d3a" size={72} className="float" style={pin({ right: 6, top: 10 })} />
                            </div>
                            <div className="b-big">24/7</div>
                            <div>
                                <h3 className="b-title b-title-sm">Proses otomatis</h3>
                                <p className="b-text b-text-dark">Pesanan diproses sistem kapan saja, tanpa antre admin.</p>
                            </div>
                        </article>
                    </Reveal>

                    <Reveal delay={200} className="b-cell b-cell-gray">
                        <article className="b-card b-gray">
                            <div className="b-icons" aria-hidden="true">
                                <span>
                                    <svg width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h2v2H9zM12 12h2v2h-2zM12 9h2v2h-2zM9 12h2v2H9z" fill="currentColor" />
                                    </svg>
                                    QRIS
                                </span>
                                <span>
                                    <svg width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H13v2H3.5a.5.5 0 0 0 0 1H14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3.5A1.5 1.5 0 0 1 2 11.5zM11 9.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z" fill="currentColor" />
                                    </svg>
                                    E-wallet
                                </span>
                                <span>
                                    <svg width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M8 1.5 14.5 5v1.5h-13V5zM3 7.5h2v4H3zM7 7.5h2v4H7zM11 7.5h2v4h-2zM2 12.5h12V14H2z" fill="currentColor" />
                                    </svg>
                                    Bank
                                </span>
                            </div>
                            <div>
                                <h3 className="b-title b-title-sm">Banyak metode bayar</h3>
                                <p className="b-text b-text-dark">Bayar lewat QRIS, e-wallet, atau transfer bank, sesukamu.</p>
                            </div>
                        </article>
                    </Reveal>

                    <Reveal delay={300} className="b-cell b-cell-full">
                        <article className="b-card b-navy">
                            <div className="b-art" aria-hidden="true">
                                <IconBadge icon={FaTelegram} bg="#26A5E4" size={60} className="float-slow" style={pin({ right: 110, top: 20 })} />
                                <IconBadge icon={FaHeart} bg="#E4405F" size={52} className="float" style={pin({ right: 20, top: 60, animationDelay: "-2s" })} />
                            </div>
                            <div>
                                <h3 className="b-title b-title-sm">Satu akun, dua kebutuhan</h3>
                                <p className="b-text">
                                    Beli Telegram Stars/Premium atau pesan SMM Panel dari akun yang sama — nggak perlu daftar dua kali. Pesanan gagal? Saldo otomatis dikembalikan, nggak perlu diminta manual.
                                </p>
                            </div>
                        </article>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}