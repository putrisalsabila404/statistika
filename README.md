# Web Statistika

Web Statistika adalah aplikasi web interaktif untuk belajar dasar-dasar statistika (mean, median, modus, kuartil, desil, persentil) lengkap dengan simulasi, grafik interaktif, kalkulator statistik, dan kuis.

Dokumentasi ini dibuat berdasarkan isi proyek saat ini. Tujuan README yang diperbarui ini adalah memberikan ringkasan teknologi, cara menjalankan proyek, struktur folder, dan dokumentasi singkat komponen utama agar kolaborator atau pengembang lain bisa cepat memahami dan menjalankan proyek.

## Ringkasan teknis (tech stack)

- Framework: React (lihat dependency: react ^19.1)
- Build tool / dev server: Vite (rolled as `rolldown-vite` via an override)
- Styling: Tailwind CSS
- Animations: GSAP (dengan plugin Inertia) dan Framer Motion
- Charting / visualisasi: Recharts
- 3D / WebGL (opsional dalam project): three, @react-three/fiber, @react-three/drei, maath
- Ikon: lucide-react

Dependencies (diambil dari `package.json`): react, react-dom, recharts, gsap, framer-motion, lucide-react, three, @react-three/fiber, @react-three/drei, maath, tailwindcss

Dev tooling: vite, @vitejs/plugin-react, tailwindcss postcss, eslint (konfigurasi di `eslint.config.js`)

Catatan penting: package.json menggunakan override untuk `vite` (`rolldown-vite`) — ini menggantikan paket Vite default di proyek ini.

## Cara menjalankan (development)

Pastikan Node.js dan npm (atau pnpm/yarn) terpasang. Contoh perintah menggunakan npm:

```powershell
cd d:\webb\web statistika\web statistika\web_statistika
npm install
npm run dev
```

- `npm run dev` — menjalankan Vite dev server (hot reload)
- `npm run build` — membangun versi produksi (Vite build)
- `npm run preview` — melihat hasil build secara lokal
- `npm run lint` — menjalankan ESLint terhadap kode

Jika ada masalah dengan versi Vite, periksa key `overrides` di `package.json` yang memaksa `rolldown-vite`.

## Struktur folder (ringkasan)

Berikut struktur utama yang relevan di repository:

- `index.html` — entry HTML; memuat `src/main.jsx` dan tempat root React (#root)
- `src/` — source code React
	- `src/main.jsx` — entry React (render ke root)
	- `src/App.jsx` — komponen utama aplikasi (mengandung banyak komponen: DotGrid, Confetti, KalkulatorStatistik, BentoCard, TextType dan konten materi/kuis)
	- `src/index.css` — import Tailwind CSS
	- `src/assets/` — aset statis (gambar, svg, dll.)
- `public/` — file publik (mis. favicon, svg statis)
- `vite.config.js` — konfigurasi Vite (plugin React + tailwind plugin)
- `eslint.config.js` — konfigurasi linting
- `package.json` — dependencies & scripts

## Dokumentasi komponen utama & arsitektur singkat

Catatan: kode utama ada di `src/App.jsx`. Ringkasan fungsi/fitur:

- DotGrid (komponen background): komponen canvas yang menggambar grid titik (dot) dan bereaksi terhadap mouse (proximity, shock on click) — menggunakan canvas 2D, Path2D, dan GSAP untuk tweening/inertia.
- Confetti: elemen visual confetti sederhana untuk perayaan ketika pengguna lulus kuis.
- KalkulatorStatistik: komponen yang membaca input angka (dipisah koma/spasi), menghitung mean, median, modus, kuartil, desil, persentil, dan menampilkan hasil. Menyertakan validasi input dasar.
- Visualisasi interaktif: menggunakan Recharts (BarChart, LineChart, PieChart) untuk menampilkan distribusi frekuensi berdasarkan data interaktif yang dapat diubah lewat slider/input.
- Quiz / Uji Pemahaman: kumpulan soal (beberapa set) disimpan sebagai object di `App.jsx`, dengan mekanisme jawaban, skor, dan hasil (trigger confetti bila >=75%).
- TextType: utilitas typing effect yang memakai state hooks dan GSAP untuk cursor blinking; mendukung beberapa opsi (kecepatan, loop, warna teks).
- BentoCard: kartu menu interaktif menggunakan framer-motion untuk hover/entry animation.

Arsitektur singkat: seluruh UI dibangun dalam satu file `App.jsx` sebagai implementasi monolitik; komponen-komponen besar dibuat sebagai fungsi di file tersebut. Ini membuatnya cepat untuk pengembangan inkremental, namun apabila proyek berkembang, saya sarankan memecah ke file/komponen terpisah (mis. `components/` dan `pages/`).

## Linting & quality

- ESLint konfigurasi ada di `eslint.config.js`. Perintah: `npm run lint`.
- Disarankan menambahkan pre-commit hook (husky) dan CI linting untuk menjaga kualitas kode jika proyek berkembang.

## Catatan implementasi & rekomendasi

- Tailwind: `src/index.css` mengimpor Tailwind (`@import "tailwindcss";`). Pastikan Tailwind sudah dikonfigurasikan (tidak ada `tailwind.config.js` di repo saat ini — jika belum ada, tambahkan konfigurasi Tailwind bila Anda perlu kustomisasi tema).
- Vite override: package.json menimpa vite dengan `rolldown-vite@7.1.14`. Jika Anda mengalami perilaku tak terduga di dev/build, periksa bagian `overrides` dan pertimbangkan mengembalikan ke `vite` standar atau menyesuaikan plugin sesuai versi.
- Performansi: beberapa animasi (GSAP + canvas) cukup ringan, tapi jika jumlah dot besar atau device lemah, pertimbangkan mengurangi density atau menggunakan requestAnimationFrame throttling (sudah ada throttling sederhana pada mousemove di DotGrid).
- Pemisahan kode: jika ingin memperkaya aplikasi, pisahkan `App.jsx` menjadi beberapa file: `components/`, `views/`, `hooks/`, `utils/`.

## Cara kontribusi singkat

1. Fork atau buat branch baru dari `main`.
2. Jalankan `npm install` lalu `npm run dev`.
3. Tambahkan fitur / perbaiki bug, jalankan `npm run lint` sebelum PR.
4. Buat PR ke `main` dengan deskripsi perubahan.

## Hal yang saya lakukan saat membuat dokumentasi ini

- Membaca `package.json`, `vite.config.js`, `index.html`, `eslint.config.js`, `src/main.jsx`, dan `src/App.jsx` untuk mengekstrak informasi teknis dan ringkasan fitur.

---

Jika Anda ingin, saya bisa:
- Memecah `src/App.jsx` menjadi beberapa file komponen dan membuat struktur `components/` terpisah.
- Menambahkan `tailwind.config.js` dengan konfigurasi dasar.
- Menambahkan skrip dev helper (contoh: `format`, `typecheck` jika Anda pindah ke TypeScript).

Beritahu langkah mana yang Anda ingin saya lanjutkan.
