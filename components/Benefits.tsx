import Reveal from "./Reveal";
import { RpCoin, StarCoin, GiftCoin, BoltCoin } from "./Coins";

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
                                <RpCoin className="float-slow" style={pin({ right: 150, top: 34 })} />
                                <GiftCoin className="float" scale={0.62} style={pin({ right: 40, top: 22, animationDelay: "-2s" })} />
                                <StarCoin className="float-slow" scale={0.55} style={pin({ right: -14, top: 176, animationDelay: "-3s" })} />
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
                                <BoltCoin className="float" scale={0.85} style={pin({ right: -8, top: 14 })} />
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
                </div>
            </div>
        </section>
    );
}