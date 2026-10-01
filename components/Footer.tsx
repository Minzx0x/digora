import Brand from "./Brand";

export default function Footer() {
    return (
        <footer className="foot">
            <div className="foot-in">
                <div className="foot-brand">
                    <Brand light />
                    <p>Telegram Stars, Premium, dan SMM Panel — cepat dan terjangkau.</p>
                    <div className="foot-social">
                        <a href="https://facebook.com/digora.codes" target="_blank" rel="noopener noreferrer">
                            Facebook
                        </a>
                        <a href="https://tiktok.com/@digora.codes" target="_blank" rel="noopener noreferrer">
                            TikTok
                        </a>
                        <a href="https://t.me/Digoracsv" target="_blank" rel="noopener noreferrer">
                            Telegram
                        </a>
                    </div>
                </div>

                <nav className="foot-cols" aria-label="Footer">
                    <div>
                        <h3>Produk</h3>
                        <a href="#smm">SMM Panel</a>
                        <a href="#produk">Paket Stars</a>
                        <a href="#produk">Kirim ke teman</a>
                        <a href="#harga">Harga</a>
                    </div>
                    <div>
                        <h3>Bantuan</h3>
                        <a href="#cara-order">Cara order</a>
                        <a href="#bantuan">FAQ</a>
                        <a href="#beli">Hubungi admin</a>
                        <a href="/blog">Blog</a>
                    </div>
                </nav>
            </div>

            <div className="foot-word" aria-hidden="true">
                Digora
            </div>

            <div className="foot-copy">© 2026 Digora. Semua hak dilindungi.</div>
        </footer>
    );
}