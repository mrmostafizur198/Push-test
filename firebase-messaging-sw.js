/* পুশ নোটিফিকেশন + PWA service worker */
importScripts('config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// নোটিফিকেশনে চাপলে অ্যাপ খোলে বা সামনে আনে (এগুলো প্রথমেই রাখতে হয়)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow(self.registration.scope);
  }));
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});   // PWA হিসেবে ইনস্টলযোগ্য হওয়ার জন্য

firebase.initializeApp(CONFIG.firebase);
firebase.messaging();   // background এ notification অংশ থাকলে SDK নিজেই দেখায়
