import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, update, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getMessaging, getToken, deleteToken, isSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const C = window.CONFIG;
const app = initializeApp(C.firebase), db = getDatabase(app), auth = getAuth(app);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let me = null, notifs = [], ready = false, unN = null, mode = 'login', installEvt = null, swReg = null, hasToken = false;

/* ---------- service worker (পুশ + PWA) ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('firebase-messaging-sw.js').then(r => { swReg = r; }).catch(e => console.warn('sw', e));
}

/* ---------- লগইন / নতুন অ্যাকাউন্ট ---------- */
const authMsg = c => ({
  'auth/invalid-credential': 'ইমেইল বা পাসওয়ার্ড ভুল', 'auth/invalid-email': 'ইমেইল সঠিক নয়', 'auth/user-not-found': 'এই ইমেইলে অ্যাকাউন্ট নেই',
  'auth/wrong-password': 'পাসওয়ার্ড ভুল', 'auth/email-already-in-use': 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে', 'auth/weak-password': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর দিন',
  'auth/too-many-requests': 'অনেকবার চেষ্টা হয়েছে, একটু পরে আবার দিন', 'auth/network-request-failed': 'ইন্টারনেট সংযোগ নেই'
}[c] || 'ব্যর্থ হয়েছে');
function setMode(m) {
  mode = m; $('tab-login').classList.toggle('on', m === 'login'); $('tab-reg').classList.toggle('on', m === 'reg');
  $('f-name').hidden = m === 'login'; $('a-btn').innerText = m === 'login' ? 'লগইন' : 'অ্যাকাউন্ট খুলুন'; $('a-err').innerText = '';
}
async function submitAuth() {
  const email = $('a-email').value.trim(), pass = $('a-pass').value, name = $('a-name').value.trim();
  if (!email || !pass) return ($('a-err').innerText = 'ইমেইল ও পাসওয়ার্ড দিন');
  if (mode === 'reg' && !name) return ($('a-err').innerText = 'আপনার নাম দিন');
  $('a-err').innerText = ''; $('a-btn').disabled = true;
  try {
    if (mode === 'login') await signInWithEmailAndPassword(auth, email, pass);
    else { const cr = await createUserWithEmailAndPassword(auth, email, pass); await updateProfile(cr.user, { displayName: name }); }
  } catch (e) { $('a-err').innerText = authMsg(e.code); }
  $('a-btn').disabled = false;
}

/* ---------- লগইন অবস্থা ---------- */
onAuthStateChanged(auth, u => {
  me = u; if (unN) { unN(); unN = null; }
  notifs = []; ready = false; hasToken = false;
  $('auth').hidden = !!u; $('home').hidden = !u;
  if (!u) return;
  $('who').innerText = u.displayName || u.email;
  // ইউজারের নোডে মৃদু আপডেট (আগের তথ্য মুছে যায় না)
  get(ref(db, 'users/' + u.uid)).then(s => {
    const d = s.val() || {}, up = { lastSeen: serverTimestamp() };
    if (!d.username) up.username = u.displayName || u.email.split('@')[0];
    if (!d.email) up.email = u.email;
    hasToken = !!d.fcmToken; refreshStatus();
    return update(ref(db, 'users/' + u.uid), up);
  }).catch(() => {});
  unN = onValue(ref(db, 'user_notifications/' + u.uid), s => {
    const next = Object.entries(s.val() || {}).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (ready) next.filter(n => !n.read && !notifs.some(o => o.key === n.key)).forEach(toast);
    notifs = next; ready = true; renderList();
  });
  refreshStatus();
  if ('Notification' in window && Notification.permission === 'granted') pushOn(true);   // টোকেন নতুন রাখা
});

/* ---------- বার্তার তালিকা ---------- */
const ICON = { success: '✅', error: '❌', info: '🔔' };
function renderList() {
  $('list').innerHTML = notifs.length ? notifs.slice(0, 50).map(n => `<div class="n ${n.read ? '' : 'unread'}" data-act="read" data-k="${esc(n.key)}"><i>${ICON[n.type] || '🔔'}</i><div><b>${esc(n.title)}${n.read ? '' : '<span class="dotn"></span>'}</b><div class="b">${esc(n.body)}</div><small>${esc(n.time || '')}</small></div></div>`).join('')
    : '<div class="empty">এখনো কোনো বার্তা আসেনি</div>';
}
const markRead = k => me && update(ref(db, `user_notifications/${me.uid}/${k}`), { read: true }).catch(() => {});
function readAll() {
  const up = {}; notifs.filter(n => !n.read).forEach(n => { up[n.key + '/read'] = true; });
  if (Object.keys(up).length) update(ref(db, 'user_notifications/' + me.uid), up).catch(() => {});
}
let tt = null;
function toast(n) {
  $('t-title').innerText = (ICON[n.type] || '🔔') + ' ' + (n.title || 'নোটিফিকেশন'); $('t-body').innerText = n.body || '';
  $('toast').classList.add('on'); if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
  clearTimeout(tt); tt = setTimeout(() => $('toast').classList.remove('on'), 5000);
}

/* ---------- পুশ চালু / বন্ধ ---------- */
const pill = (id, cls, text) => { const e = $(id); e.className = 'pill ' + cls; e.innerText = text; };
async function refreshStatus() {
  const sup = await isSupported().catch(() => false);
  pill('s-sup', sup ? 'ok' : 'no', sup ? 'আছে' : 'নেই');
  const p = 'Notification' in window ? Notification.permission : 'denied';
  pill('s-perm', p === 'granted' ? 'ok' : p === 'denied' ? 'no' : 'wait', p === 'granted' ? 'দেওয়া হয়েছে' : p === 'denied' ? 'ব্লক করা' : 'এখনো চাওয়া হয়নি');
  pill('s-tok', hasToken ? 'ok' : 'wait', hasToken ? 'সংরক্ষিত ✓' : 'নেই');
  $('p-on').hidden = hasToken && p === 'granted'; $('p-off').hidden = !(hasToken && p === 'granted');
}
async function pushOn(silent) {
  const fail = t => { if (silent !== true) $('p-err').innerText = t; };
  $('p-err').innerText = '';
  try {
    if (!(await isSupported())) return fail('এই ব্রাউজারে পুশ সমর্থিত নয়। Chrome ব্যবহার করুন।');
    if (!C.VAPID_KEY || C.VAPID_KEY.startsWith('YOUR')) return fail('config.js এ VAPID_KEY বসানো হয়নি।');
    if (Notification.permission === 'denied') return fail('নোটিফিকেশন ব্লক করা আছে। ব্রাউজারের সাইট সেটিংসে গিয়ে অনুমতি দিন।');
    if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') return fail('অনুমতি দেওয়া হয়নি।');
    const reg = swReg || await navigator.serviceWorker.register('firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), { vapidKey: C.VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return fail('ডিভাইস টোকেন পাওয়া যায়নি।');
    await update(ref(db, 'users/' + me.uid), { fcmToken: token, pushAt: serverTimestamp() });
    hasToken = true;
  } catch (e) { fail('ত্রুটি: ' + (e.message || e)); }
  refreshStatus();
}
async function pushOff() {
  try { await deleteToken(getMessaging(app)); } catch (e) { /* চলবে */ }
  await update(ref(db, 'users/' + me.uid), { fcmToken: null }).catch(() => {});
  hasToken = false; refreshStatus();
}

/* ---------- অ্যাপ ইনস্টল ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('i-btn').hidden = false; });
window.addEventListener('appinstalled', () => { $('i-btn').hidden = true; installEvt = null; });
async function install() { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('i-btn').hidden = true; }

/* ---------- বাটন ---------- */
const A = {
  mode: el => setMode(el.dataset.m), auth: submitAuth, logout: () => signOut(auth),
  pushOn: () => pushOn(), pushOff, install, readAll, read: el => markRead(el.dataset.k)
};
document.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (a && A[a.dataset.act]) A[a.dataset.act](a); });
$('a-pass').addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
