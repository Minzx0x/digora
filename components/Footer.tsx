import Brand from "./Brand";

export default function Footer() {
    return (
        <footer className="foot">
            <div className="foot-in">
                <div className="foot-brand">
                    <Brand light />
                    <p>Beli Telegram Stars cepat dan terjangkau.</p>
                    <div className="foot-social">
                        <a href="#">Instagram</a>
                        <a href="#">TikTok</a>
                        <a href="#">Telegram</a>
                    </div>
                </div>

                <nav className="foot-cols" aria-label="Footer">
                    <div>
                        <h3>Produk</h3>
                        <a href="#produk">Paket Stars</a>
                        <a href="#produk">Kirim ke teman</a>
                        <a href="#harga">Harga</a>
                    </div>
                    <div>
                        <h3>Bantuan</h3>
                        <a href="#cara-order">Cara order</a>
                        <a href="#bantuan">FAQ</a>
                        <a href="#beli">Hubungi admin</a>
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