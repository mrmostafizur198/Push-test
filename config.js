/* ===== সেটিংস — শুধু VAPID_KEY বসান ===== */
var CONFIG = {
  firebase: {
    apiKey: "AIzaSyBQXDEFuilbYDsry-ktqWylIzqgPZNbUWQ",
    authDomain: "mr-techlabe.firebaseapp.com",
    projectId: "mr-techlabe",
    storageBucket: "mr-techlabe.firebasestorage.app",
    messagingSenderId: "172436004844",
    appId: "1:172436004844:web:466012505fa13297eb2ac9"
    // ডাটাবেস অন্য অঞ্চলে হলে এখানে databaseURL: "https://....firebasedatabase.app" যোগ করুন
  },
  // Firebase Console > Project settings > Cloud Messaging > Web Push certificates > Key pair
  VAPID_KEY: "YOUR_VAPID_KEY"
};
