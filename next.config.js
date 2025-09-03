// next.config.js

const withPWA = require("@ducanh2912/next-pwa").default({
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

module.exports = withPWA(nextConfig);