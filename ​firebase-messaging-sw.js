// ফায়ারবেস সার্ভিস ওয়ার্কার ফাইল
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// আপনার ফায়ারবেস কনফিগারেশন এখানেও দিতে হবে
firebase.initializeApp({
  apiKey: "AIzaSyBQXDEFuilbYDsry-ktqWylIzqgPZNbUWQ",
  authDomain: "mr-techlabe.firebaseapp.com",
  databaseURL: "https://mr-techlabe-default-rtdb.firebaseio.com",
  projectId: "mr-techlabe",
  storageBucket: "mr-techlabe.firebasestorage.app",
  messagingSenderId: "172436004844",
  appId: "1:172436004844:web:466012505fa13297eb2ac9",
  measurementId: "G-E64JT771TM"
});

const messaging = firebase.messaging();
