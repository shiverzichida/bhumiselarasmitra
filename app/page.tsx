import Image from "next/image";
import styles from "./home.module.css";

const services = [
  { icon: "▥", image: "/services/trucking.jpg", title: "Trucking Kontainer", items: ["Pickup kontainer kosong.", "Pengantaran ke gudang.", "Pengiriman dari gudang ke pelabuhan.", "Trucking antarkota.", "Pengembalian kontainer ke depo."] },
  { icon: "≋", image: "/media/activity-11.jpg", title: "Pengiriman Laut", items: ["FCL 20 feet.", "FCL 40 feet.", "FCL 40 feet high cube.", "LCL / konsolidasi.", "Port-to-port, door-to-port, port-to-door, dan door-to-door."] },
  { icon: "▤", image: "/services/documents.jpg", title: "Dokumen Ekspor-Impor", items: ["Booking kapal dan Shipping Instruction.", "VGM, draft BL, dan Bill of Lading.", "Manifest, invoice, dan packing list.", "COO/SKA, PEB, PIB, serta dokumen pendukung lainnya."] },
  { icon: "▧", image: "/services/customs.jpg", title: "Customs Clearance", items: ["Pengurusan ekspor dan impor.", "Pemeriksaan fisik barang.", "Konsultasi HS Code, lartas, dan nilai pabean.", "Penanganan respons dokumen hingga barang mendapatkan persetujuan keluar."] },
  { icon: "◇", image: "/services/stuffing.jpg", title: "Stuffing & Handling", items: ["Bongkar-muat dan stuffing kontainer.", "Stripping, palletizing, dan labeling.", "Fumigasi dan penimbangan.", "Dokumentasi foto serta laporan kondisi muatan."] },
  { icon: "⌁", image: "/services/port.jpg", title: "Pelabuhan & Depo", items: ["Koordinasi gate-in dan gate-out.", "Pengurusan EIR.", "Penarikan dan pengembalian kontainer.", "Monitoring free time, demurrage, dan detention."] },
];

const activityMedia = [
  ["/media/activity-01.jpg", "Pergerakan kontainer melalui jalur sungai", "Operasional Tongkang"],
  ["/media/activity-02.jpg", "Tongkang melintasi jalur logistik Kalimantan Barat", "Jalur Logistik"],
  ["/media/activity-03.jpg", "Crane mengangkat kontainer di area pelabuhan", "Container Handling"],
  ["/media/activity-04.jpg", "Proses bongkar muat kontainer menggunakan crane", "Bongkar Muat"],
  ["/media/activity-05.jpg", "Aktivitas crane dan kontainer di dermaga", "Koordinasi Pelabuhan"],
  ["/media/activity-06.jpg", "Tongkang kontainer dilihat dari udara", "Transportasi Sungai"],
  ["/media/activity-07.jpg", "Penataan kontainer di area operasional", "Container Yard"],
  ["/media/activity-08.jpg", "Kontainer ekspor yang siap diberangkatkan", "Kargo Ekspor"],
  ["/media/activity-09.jpg", "Crane dan tongkang kontainer di dermaga", "Port Handling"],
  ["/media/activity-10.jpg", "Pengangkatan kontainer ke kapal", "Loading Operation"],
  ["/media/activity-11.jpg", "Kapal MMSS 2711 dengan muatan kontainer", "Sea Freight"],
  ["/media/activity-12.jpg", "Aktivitas di atas kapal kontainer", "On-board Operation"],
];

const whatsappUrl = "https://wa.me/6289619320345?text=Halo%20PT.%20Bhumi%20Selaras%20Mitra%2C%20saya%20ingin%20berkonsultasi%20mengenai%20layanan%20forwarding.";

export default function HomePage() {
  return (
    <main className={styles.site}>
      <section className={styles.hero} id="beranda">
        <Image className={styles.heroImage} src="/hero-kijing-sunset.png" alt="Terminal Kijing saat senja" fill priority sizes="100vw" />
        <div className={styles.heroShade} />
        <header className={styles.header}>
          <a className={styles.logo} href="#beranda"><Image src="/logo-bsm-dark-bg.png" alt="PT Bhumi Selaras Mitra" width={450} height={190} priority /></a>
          <nav aria-label="Navigasi utama"><a className={styles.active} href="#beranda">Beranda</a><a href="#tentang">Tentang Kami</a><a href="#layanan">Layanan</a><a href="#solusi">Solusi</a><a href={whatsappUrl} target="_blank" rel="noreferrer">Kontak</a></nav>
          <a className={styles.outlineButton} href={whatsappUrl} target="_blank" rel="noreferrer">Hubungi Kami <span>→</span></a>
          <details className="mobile-menu">
            <summary aria-label="Buka menu navigasi"><i /><i /><i /></summary>
            <nav aria-label="Navigasi mobile">
              <a href="#beranda">Beranda</a>
              <a href="#tentang">Tentang Kami</a>
              <a href="#layanan">Layanan</a>
              <a href="#solusi">Solusi</a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">Kontak</a>
            </nav>
          </details>
        </header>

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>TERMINAL KIJING · PELABUHAN MEMPAWAH</p>
          <h1>Solusi Forwarding<br />Terpercaya untuk<br />Bisnis Anda</h1>
          <p className={styles.heroLead}>Berbasis di Terminal Kijing, Pelabuhan Mempawah, kami menghadirkan layanan forwarding kontainer lokal dan internasional yang efisien, aman, dan profesional.</p>
          <div className={styles.heroButtons}><a className={styles.primaryButton} href="#layanan">Lihat Layanan Kami <span>→</span></a><a className={styles.outlineButton} href={whatsappUrl} target="_blank" rel="noreferrer">Hubungi Kami <span>→</span></a></div>
          <div className={styles.trustBar}>
            <div><b>♢</b><span>Pengalaman<br />Bertahun-tahun</span></div>
            <div><b>⌘</b><span>Layanan<br />Terintegrasi</span></div>
            <div><b>♧</b><span>Tim Profesional<br />& Berpengalaman</span></div>
            <div><b>◎</b><span>Jangkauan<br />Luas</span></div>
          </div>
        </div>
      </section>

      <section className={styles.services} id="layanan">
        <div className={styles.sectionTitle}><p className="services-label">LAYANAN KAMI</p><span>Kami menyediakan berbagai layanan forwarding yang terintegrasi<br />dan disesuaikan dengan kebutuhan bisnis Anda.</span></div>
        <div className={styles.cardGrid}>
          {services.map((service) => (
            <article className={`${styles.card} service-card`} key={service.title}>
              <div className={styles.cardPhoto}><Image src={service.image} alt={service.title} fill sizes="(max-width: 720px) 100vw, 33vw" loading="eager" /></div>
              <div className={styles.cardBody}><div className={styles.serviceIcon}>{service.icon}</div><h3>{service.title}</h3><ul>{service.items.map((item) => <li key={item}>{item}</li>)}</ul></div>
            </article>
          ))}
        </div>

        <section className="media-gallery" id="media">
          <div className="media-heading">
            <div><p>AKTIVITAS KAMI</p><h2>Operasional nyata.<br />Koordinasi langsung.</h2></div>
            <span>Dokumentasi kegiatan pengangkutan, bongkar-muat, dan penanganan kontainer oleh tim kami di Terminal Kijing, Pelabuhan Mempawah.</span>
          </div>
          <div className="media-grid">
            {activityMedia.map(([src, alt, caption], index) => (
              <figure className={index === 0 || index === 7 ? "media-item media-featured" : "media-item"} key={src}>
                <Image src={src} alt={alt} fill sizes="(max-width: 700px) 100vw, 25vw" loading="eager" />
                <figcaption><small>{String(index + 1).padStart(2, "0")}</small><strong>{caption}</strong></figcaption>
              </figure>
            ))}
          </div>
          <div className="video-grid">
            <article><div className="video-label"><span>01</span><strong>Perjalanan Operasional</strong></div><video controls preload="metadata" poster="/media/activity-02.jpg"><source src="/media/operations-01.mp4" type="video/mp4" />Browser Anda tidak mendukung video.</video></article>
            <article><div className="video-label"><span>02</span><strong>Handling Kontainer</strong></div><video controls preload="metadata" poster="/media/activity-06.jpg"><source src="/media/operations-02.mp4" type="video/mp4" />Browser Anda tidak mendukung video.</video></article>
          </div>
        </section>

        <div className={styles.contactStrip} id="solusi"><div className={styles.serviceIcon}>⬡</div><div><strong>Butuh layanan forwarding yang sesuai dengan kebutuhan Anda?</strong><span>Tim kami siap membantu memberikan solusi terbaik untuk bisnis Anda.</span></div><a className={styles.outlineButton} href={whatsappUrl} target="_blank" rel="noreferrer">Hubungi Kami <b>→</b></a></div>

        <div className={styles.stats} id="tentang">
          <div><b>♧</b><strong>10+</strong><span>Tahun Pengalaman</span></div>
          <div><b>◈</b><strong>500+</strong><span>Klien Terpercaya</span></div>
          <div><b>⌘</b><strong>20+</strong><span>Negara Tujuan</span></div>
          <div><b>◎</b><strong>100%</strong><span>Komitmen Layanan</span></div>
          <footer><span>♢ Aman & Terpercaya</span><span>◷ Tepat Waktu</span><span>⌘ Layanan Terintegrasi</span><span>◇ Harga Kompetitif</span></footer>
        </div>
      </section>

      <section className={styles.finalCta} id="kontak"><div><p>MULAI PENGIRIMAN ANDA</p><h2>Siap mengirim bersama kami?</h2><span>Konsultasikan kebutuhan forwarding Anda dengan tim PT. Bhumi Selaras Mitra melalui WhatsApp 0896-1932-0345.</span></div><div><a className={styles.primaryButton} href={whatsappUrl} target="_blank" rel="noreferrer">Hubungi via WhatsApp <span>→</span></a></div></section>
    </main>
  );
}
