
// public/push-worker.js

// Listener untuk saat notifikasi push diterima
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const { title, body, icon, data: notificationData } = data;

  const options = {
    body: body,
    icon: icon || '/favicon.ico',
    badge: '/badge-72x72.png',
    data: {
      url: notificationData?.url || '/'
    },
    // Parameter tambahan untuk memastikan notifikasi muncul sebagai pop-up
    requireInteraction: true,  // Notifikasi tetap muncul sampai ditindaklanjuti
    tag: 'finance-tracker-notification',  // Tag untuk mengelompokkan notifikasi
    renotify: true,  // Tampilkan kembali notifikasi dengan tag yang sama
    vibrate: [200, 100, 200],  // Pola getaran: 200ms on, 100ms off, 200ms on
    silent: false,  // Izinkan suara notifikasi (jika diatur di device)
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Listener untuk saat notifikasi diklik
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Tutup notifikasi

  // Buka window baru atau fokus ke window yang sudah ada
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = event.notification.data.url;
      // Jika ada window yang sudah terbuka, fokus ke sana
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(c => c.navigate(urlToOpen));
      }
      // Jika tidak, buka window baru
      return clients.openWindow(urlToOpen);
    })
  );
});
