import Reveal from "./Reveal";

// Nama-nama bank/metode di sini bukan pilihan langsung yang muncul satu-satu
// di checkout (Digora cuma nawarin 3 tombol: QRIS / E-wallet / Transfer Bank
// — lihat lib/paymenku.ts) -- tapi transfer bank via Virtual Account itu
// bank-agnostic, bisa dibayar DARI bank mana pun termasuk yang disebut di
// sini, makanya framing-nya "transfer dari" bukan "pilih salah satu dari".
type Method = { name: string; logo?: string };

const METHODS: Method[] = [
    { name: "QRIS", logo: "/banks/qris.svg" },
    { name: "BNI", logo: "/banks/bni.svg" },
    { name: "Mandiri", logo: "/banks/mandiri.svg" },
    { name: "BCA", logo: "/banks/bca.svg" },
    { name: "BRI", logo: "/banks/bri.svg" },
    { name: "Permata Bank", logo: "/banks/permata.svg" },
    { name: "BSI", logo: "/banks/bsi.svg" },
    { name: "Bank Neo Commerce", logo: "/banks/bnc.svg" },
    { name: "Maybank", logo: "/banks/maybank.svg" },
    { name: "SeaBank", logo: "/banks/seabank.svg" },
    { name: "Bank Jago", logo: "/banks/jago.svg" },
];

export default function PaymentMethods() {
    return (
        <section className="sec sec-pay">
            <div className="sec-in">
                <Reveal>
                    <div className="sec-head">
                        <div>
                            <p className="eyebrow">Metode pembayaran</p>
                            <h2 className="h2">Bayar dengan cara favoritmu</h2>
                        </div>
                        <p className="lead">
                            QRIS, e-wallet, atau transfer bank dari bank apa saja — termasuk semua ini.
                        </p>
                    </div>
                </Reveal>

                <Reveal delay={100} className="pay-chips">
                    {METHODS.map((m) =>
                        m.logo ? (
                            <span key={m.name} className="pay-chip pay-chip-logo">
                                <img src={m.logo} alt={m.name} />
                            </span>
                        ) : (
                            <span key={m.name} className="pay-chip">
                                {m.name}
                            </span>
                        )
                    )}
                </Reveal>
            </div>
        </section>
    );
}
