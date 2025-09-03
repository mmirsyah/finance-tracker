// next.config.js
import pwa from "@ducanh2912/next-pwa";

const withPWA = pwa({
  dest: "public",
  register: true,
  skipWaiting: true,
    workboxOptions: {
    disableDevLogs: true,
    importScripts: ['/push-worker.js'], // Impor skrip push worker kita
  },
  runtimeCaching: [
    // Aturan untuk halaman (navigasi)
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 hari
      },
    },
    // Aturan untuk aset statis (JS, CSS, font, dll.)
    {
      urlPattern: /\.(?:js|css|woff2|png|svg|jpg|jpeg)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 hari
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Konfigurasi Next.js Anda yang lain (jika ada) bisa ditambahkan di sini
};

export default withPWA(nextConfig);