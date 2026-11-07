import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBqifOsvrWxaHqvwPlq5OnO8ALoSTqWSm0",
  authDomain: "clearlynote.web.app",
  projectId: "clearly-1ad18",
  appId: "1:608938862760:web:3ee3da2537a9f36b51ba9d"
};

const configured = !firebaseConfig.apiKey.startsWith("ISI_");
let auth, db;
if (configured) {
  const fb = initializeApp(firebaseConfig);
  auth = getAuth(fb);
  auth.languageCode = "id";
  db = initializeFirestore(fb, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalAutoDetectLongPolling: true
  });
}

const $ = s => document.querySelector(s);
const page = document.body.dataset.page || "home";
const base = document.body.dataset.base || "";
const homeUrl = base || "./";
const DAY = 864e5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const cacheKey = id => `clearly:debts:${id}`;
const numOf = el => Number(String(el.value).replace(/\./g, "")) || 0;
const num = s => numOf($(s));
const fmt = n => n ? Math.round(n).toLocaleString("id-ID") : "";
const splitEven = (t, n) => { if (!n) return []; const b = Math.floor(t / n); return Array.from({ length: n }, (_, i) => i === n - 1 ? t - b * (n - 1) : b); };
const scheduleOf = d => d.schedule || Array.from({ length: d.tenor }, (_, i) => i === d.tenor - 1 ? Math.max(d.total - d.installment * (d.tenor - 1), 0) : d.installment);
const schedText = d => {
  const s = scheduleOf(d), f = s[0], head = s.slice(0, -1), u = unitOf(d);
  if (s.every(v => v === f)) return `${rp(f)} x ${s.length} ${u}`;
  if (head.length > 1 && head.every(v => v === f)) return `${rp(f)} x ${head.length} ${u}, lalu ${rp(s[s.length - 1])} di cicilan terakhir`;
  return s.map(rp).join(", ");
};
const rp = n => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const parseD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const isoD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtD = d => d ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
const addMonths = (d, n) => {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
};
const unitOf = l => (l && l.unit) || "bulan";
const UNIT_TITLE = { hari: "Hari", minggu: "Minggu", bulan: "Bulan" };
const UNIT_CAP = { hari: 365, minggu: 104, bulan: 60 };
const addPeriod = (d, n, u) => u === "hari" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) : u === "minggu" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7) : addMonths(d, n);
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

let uid = null, me = null, debts = [], tab = "aktif", editingId = null, editingLoan = null, payingId = null, openId = null, unsub = null, draftId = null, saved = false, loaded = false, routed = false, pending = false, registering = false;

const backUrl = () => (page === "tambah" || page === "edit") && editingId ? base + "detail/?id=" + encodeURIComponent(editingId) : homeUrl;

const GOOGLE_SVG = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

const GIRL_SVG = `<svg class="girl" viewBox="0 0 240 150" width="240" height="150" aria-hidden="true">
  <path d="M52 150C52 120 80 106 120 106S188 120 188 150Z" fill="#C58B2B" stroke="#241318" stroke-width="3" stroke-linejoin="round"/>
  <rect x="111" y="98" width="18" height="20" rx="6" fill="#FBE3DA" stroke="#241318" stroke-width="3"/>
  <g class="g-head">
    <path d="M82 72C76 22 164 22 158 72C160 102 156 120 150 126L90 126C84 120 80 102 82 72Z" fill="#241318"/>
    <ellipse cx="120" cy="72" rx="33" ry="36" fill="#FBE3DA" stroke="#241318" stroke-width="3"/>
    <path d="M87 70C88 40 112 34 128 38C147 42 155 56 153 72C144 58 132 52 116 54C102 56 92 62 87 70Z" fill="#241318"/>
    <ellipse class="g-eye" cx="108" cy="78" rx="3" ry="4.2" fill="#241318"/>
    <ellipse class="g-eye" cx="132" cy="78" rx="3" ry="4.2" fill="#241318"/>
    <path d="M108 91Q120 107 132 91Z" fill="#fff" stroke="#241318" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="99" cy="90" r="5" fill="#F3A9B8" opacity=".6"/>
    <circle cx="141" cy="90" r="5" fill="#F3A9B8" opacity=".6"/>
    <circle cx="87" cy="96" r="6" fill="none" stroke="#C58B2B" stroke-width="2.5"/>
  </g>
  <path d="M74 124C58 128 54 138 58 148" fill="none" stroke="#241318" stroke-width="24" stroke-linecap="round"/>
  <path d="M74 124C58 128 54 138 58 148" fill="none" stroke="#C58B2B" stroke-width="18" stroke-linecap="round"/>
  <g>
    <rect x="44" y="142" width="28" height="12" rx="6" fill="#FBE3DA" stroke="#241318" stroke-width="2.5"/>
    <rect x="45" y="150" width="6" height="14" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
    <rect x="52" y="150" width="6" height="15" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
    <rect x="59" y="150" width="6" height="15" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
    <rect x="66" y="150" width="6" height="13" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
  </g>
  <g class="g-gr">
    <path d="M166 124C182 128 186 138 182 148" fill="none" stroke="#241318" stroke-width="24" stroke-linecap="round"/>
    <path d="M166 124C182 128 186 138 182 148" fill="none" stroke="#C58B2B" stroke-width="18" stroke-linecap="round"/>
    <rect x="168" y="142" width="28" height="12" rx="6" fill="#FBE3DA" stroke="#241318" stroke-width="2.5"/>
    <rect x="169" y="150" width="6" height="13" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
    <rect x="176" y="150" width="6" height="15" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
    <rect x="183" y="150" width="6" height="15" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
    <rect x="190" y="150" width="6" height="14" rx="3" fill="#FBE3DA" stroke="#241318" stroke-width="2"/>
  </g>
  <g class="g-peace">
    <path d="M168 122C194 122 206 104 202 84" fill="none" stroke="#241318" stroke-width="24" stroke-linecap="round"/>
    <path d="M168 122C194 122 206 104 202 84" fill="none" stroke="#C58B2B" stroke-width="18" stroke-linecap="round"/>
    <g class="g-wave">
      <line x1="198" y1="68" x2="191" y2="42" stroke="#241318" stroke-width="12" stroke-linecap="round"/>
      <line x1="207" y1="68" x2="216" y2="44" stroke="#241318" stroke-width="12" stroke-linecap="round"/>
      <line x1="198" y1="68" x2="191" y2="42" stroke="#FBE3DA" stroke-width="6" stroke-linecap="round"/>
      <line x1="207" y1="68" x2="216" y2="44" stroke="#FBE3DA" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="192" cy="82" rx="4.5" ry="7" fill="#FBE3DA" stroke="#241318" stroke-width="2.5"/>
      <ellipse cx="202" cy="76" rx="12" ry="13" fill="#FBE3DA" stroke="#241318" stroke-width="2.5"/>
    </g>
  </g>
</svg>`;

const LOGIN_HTML = `<div class="login-card">
  ${GIRL_SVG}
  <div class="lhead"><img class="logo" src="/logo_clearlynote.svg" alt="" width="34" height="34"><h1>Clearly<b>note</b></h1></div>
  <p id="loginSub">Masuk untuk membuka catatan hutangmu.</p>
  <div id="authMain">
  <div class="tabs">
    <button type="button" class="tabb active" data-auth="login">Masuk</button>
    <button type="button" class="tabb" data-auth="register">Daftar</button>
  </div>
  <form id="fLogin" novalidate>
    <label for="lEmail">Email</label>
    <input id="lEmail" type="email" autocomplete="email" placeholder="nama@email.com">
    <label for="lPass">Password</label>
    <input id="lPass" type="password" autocomplete="current-password" placeholder="Password">
    <button type="submit" class="primary wide">Masuk</button>
  </form>
  <form id="fRegister" class="hidden" novalidate>
    <label for="rName">Nama</label>
    <input id="rName" type="text" autocomplete="name" maxlength="60" placeholder="Nama lengkap">
    <label for="rEmail">Email</label>
    <input id="rEmail" type="email" autocomplete="email" placeholder="nama@email.com">
    <div class="two">
      <div>
        <label for="rPass">Password</label>
        <input id="rPass" type="password" autocomplete="new-password" placeholder="Min. 6 karakter">
      </div>
      <div>
        <label for="rPass2">Ulangi password</label>
        <input id="rPass2" type="password" autocomplete="new-password" placeholder="Ulangi">
      </div>
    </div>
    <button type="submit" class="primary wide">Daftar</button>
  </form>
  <div class="or"><span>atau</span></div>
  <button type="button" class="gbtn" id="btnGoogle">${GOOGLE_SVG}<span id="gLabel">Masuk dengan Google</span></button>
  </div>
  <div id="verifyBox" class="hidden">
    <h2 class="vt">Cek emailmu</h2>
    <p class="vp">Kami kirim link verifikasi ke <b id="vMail"></b>. Klik link itu, lalu kembali ke sini. Cek folder spam kalau belum masuk.</p>
    <button type="button" class="primary wide" id="btnVDone">Saya sudah verifikasi</button>
    <button type="button" class="ghost wide" id="btnVResend">Kirim ulang email</button>
    <button type="button" class="link vlink" id="btnVOut">Pakai akun lain</button>
  </div>
  <div id="loginErr"></div>
</div>`;

document.body.insertAdjacentHTML("beforeend", `<dialog id="dConfirm"><div class="dlg"><h2 id="cTitle"></h2><p id="cText" class="mini"></p><div class="actions"><button type="button" class="ghost" id="cNo">Batal</button><button type="button" class="primary" id="cYes"></button></div></div></dialog>`);
$("#login").innerHTML = LOGIN_HTML;
const foot = document.createElement("footer");
foot.className = "foot";
foot.textContent = `\u00A9 ${new Date().getFullYear()} Clearlynote. All rights reserved.`;
$("#app").appendChild(foot);

function ask(title, text, yes, danger) {
  return new Promise(res => {
    const d = $("#dConfirm");
    $("#cTitle").textContent = title;
    $("#cText").textContent = text;
    const y = $("#cYes");
    y.textContent = yes;
    y.className = danger ? "danger solid" : "primary";
    const done = v => {
      d.onclose = null;
      y.onclick = null;
      $("#cNo").onclick = null;
      if (d.open) d.close();
      res(v);
    };
    y.onclick = () => done(true);
    $("#cNo").onclick = () => done(false);
    d.onclose = () => done(false);
    d.showModal();
  });
}

const fineText = l => l.fineMode === "persen" ? l.fineValue + "% per hari dari sisa tagihan" : l.fineMode === "flat" ? rp(l.fineValue) + " tetap sekali per tagihan yang telat" : rp(l.fineValue) + " per hari";
const loansOf = d => d.type === "bunga" ? [d, ...(d.topups || [])] : [d];

function calc(d, now = new Date()) {
  const paid = (d.payments || []).reduce((a, p) => a + p.amount, 0);
  const loans = loansOf(d);
  const total = d.type === "bunga" ? loans.reduce((a, l) => a + (l.total || 0), 0) : d.total;
  let pool = paid;
  const rows = [];
  if (d.type === "bunga") {
    loans.forEach((l, li) => scheduleOf(l).forEach((amt, i) => rows.push({ li, loan: l, i: i + 1, due: addPeriod(parseD(l.startDate), i, unitOf(l)), amt })));
    rows.sort((a, b) => (a.due - b.due) || (a.li - b.li));
  } else {
    rows.push({ li: 0, loan: d, i: 1, due: d.startDate ? parseD(d.startDate) : null, amt: total });
  }
  let fine = 0, maxLate = 0, next = null, crit = false, critLate = 0, limit = 7;
  rows.forEach(r => {
    r.paid = Math.min(r.amt, pool);
    pool -= r.paid;
    r.sisa = r.amt - r.paid;
    r.late = 0;
    r.fine = 0;
    if (r.sisa > 0) {
      if (r.due) {
        const over = now - (r.due.getTime() + DAY);
        if (over >= 0) {
          r.late = Math.floor(over / DAY) + 1;
          if (d.type === "bunga") {
            const l = r.loan;
            r.fine = l.fineMode === "persen" ? r.sisa * (l.fineValue / 100) * r.late : l.fineMode === "flat" ? l.fineValue : l.fineValue * r.late;
          }
        }
      }
      if (!next) next = r;
    }
    r.status = r.sisa === 0 ? "lunas" : r.late ? "telat" : r.paid > 0 ? "sebagian" : "belum";
    const lim = r.loan.warnDays || 7;
    if (r.late > lim && r.late > critLate) { crit = true; critLate = r.late; limit = lim; }
    fine += r.fine;
    maxLate = Math.max(maxLate, r.late);
  });
  const sisa = Math.max(total - paid, 0);
  const diff = next && next.due ? Math.round((next.due - startOfToday()) / DAY) : null;
  const lastPay = (d.payments || []).reduce((a, p) => p.date > a ? p.date : a, "");
  return { paid, total, sisa, fine, maxLate, crit, limit, loans, multi: loans.length > 1, rows, next, diff, done: sisa <= 0, pct: total ? Math.min(paid / total * 100, 100) : 0, lastPay };
}

function statusOf(d, c) {
  if (c.done) return ["Lunas", "ok"];
  if (c.maxLate > 0) return [`Telat ${c.maxLate} hari`, c.crit ? "bad" : "warn"];
  if (c.diff !== null && c.diff <= 3) return [c.diff <= 0 ? "Jatuh tempo hari ini" : `H-${c.diff}`, "warn"];
  return ["Berjalan", ""];
}

function monthly(list) {
  const now = new Date();
  const ms = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, l: MONTHS[d.getMonth()], v: 0 };
  });
  list.forEach(({ d }) => (d.payments || []).forEach(p => {
    const m = ms.find(x => p.date && p.date.startsWith(x.k));
    if (m) m.v += p.amount;
  }));
  return ms;
}

function gaugeSVG(p) {
  const L = Math.PI * 80;
  const f = Math.max(0, Math.min(p, 100)) / 100 * L;
  const arc = "M20 100A80 80 0 0 1 180 100";
  return `<svg class="gauge" viewBox="0 0 200 116" aria-hidden="true"><path d="${arc}" fill="none" stroke="#ECEEF0" stroke-width="26" stroke-linecap="round"/>${f > 0 ? `<path d="${arc}" fill="none" stroke="#6E1A37" stroke-width="26" stroke-linecap="round" stroke-dasharray="${f} ${L}"/>` : ""}<text x="100" y="94" text-anchor="middle" font-size="30" font-weight="700" fill="#17181A">${Math.round(p)}%</text></svg>`;
}

const compact = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + "jt" : n >= 1e3 ? Math.round(n / 1e3) + "rb" : String(Math.round(n || 0));

const ICON_DEBT = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>`;
const ICON_FINE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B3261E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5L2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>`;
const ICON_COIN = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A5F12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.6 5 1.2 5 3.8 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.1-.5-2.6-1.4M12 6.2V8M12 16v1.8"/></svg>`;
const ICON_CHECK = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7A55" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/></svg>`;

const ico = p => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  plusc: ico('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  pay: ico('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  pencil: ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: ico('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>')
};

const WALLET_SVG = `<svg class="wallet" viewBox="0 0 270 250" aria-hidden="true">
<defs>
<linearGradient id="wgG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3F8F62"/><stop offset="1" stop-color="#1C5238"/></linearGradient>
<linearGradient id="wgG2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4E9C71"/><stop offset="1" stop-color="#276B49"/></linearGradient>
<linearGradient id="wgB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B3B41"/><stop offset="1" stop-color="#0B0B0D"/></linearGradient>
<linearGradient id="wgW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6F4728"/><stop offset="1" stop-color="#35200F"/></linearGradient>
<linearGradient id="wgT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4A2C17"/><stop offset="1" stop-color="#7C5431"/></linearGradient>
<filter id="wsh" x="-30%" y="-30%" width="160%" height="175%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#1B0610" flood-opacity=".38"/></filter>
</defs>
<g transform="translate(80 86) rotate(-15)" filter="url(#wsh)">
<rect x="-72" y="-42" width="144" height="84" rx="10" fill="url(#wgG)"/>
<rect x="-63" y="-33" width="126" height="66" rx="6" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
<circle cx="0" cy="0" r="19" fill="#fff" fill-opacity=".22"/>
<text x="0" y="6" text-anchor="middle" font-size="17" font-weight="800" fill="#DDF3E7" font-family="Inter,system-ui,sans-serif">Rp</text>
<circle cx="-50" cy="-20" r="5" fill="#fff" fill-opacity=".3"/>
<circle cx="50" cy="20" r="5" fill="#fff" fill-opacity=".3"/>
</g>
<g transform="translate(192 82) rotate(12)" filter="url(#wsh)">
<rect x="-72" y="-45" width="144" height="90" rx="13" fill="url(#wgB)"/>
<rect x="-72" y="-45" width="144" height="90" rx="13" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.5"/>
<rect x="-54" y="-27" width="26" height="20" rx="4" fill="#C58B2B"/>
<rect x="-54" y="16" width="62" height="6" rx="3" fill="#fff" fill-opacity=".3"/>
<circle cx="40" cy="20" r="11" fill="#9A9AA3" fill-opacity=".55"/>
<circle cx="52" cy="20" r="11" fill="#C58B2B" fill-opacity=".9"/>
</g>
<g transform="translate(134 172) rotate(-4)" filter="url(#wsh)">
<rect x="-50" y="-66" width="98" height="52" rx="7" transform="rotate(-6)" fill="url(#wgG)"/>
<rect x="-30" y="-72" width="98" height="52" rx="7" transform="rotate(5)" fill="url(#wgG2)"/>
<circle cx="19" cy="-48" r="9" fill="#fff" fill-opacity=".2" transform="rotate(5)"/>
<rect x="-84" y="-40" width="168" height="98" rx="17" fill="url(#wgW)"/>
<rect x="-76" y="-32" width="152" height="82" rx="12" fill="none" stroke="#D9AE6A" stroke-opacity=".45" stroke-width="2" stroke-dasharray="5 5"/>
<rect x="34" y="-12" width="58" height="36" rx="12" fill="url(#wgT)"/>
<circle cx="53" cy="6" r="5.5" fill="#D9AE6A"/>
</g></svg>`;

function renderSkeleton() {
  const sk = c => `<div class="b ${c} sk"><div class="skl w50"></div><div class="skl med"></div><div class="skl w60"></div></div>`;
  $("#stats").innerHTML = ["b-s", "b-s", "b-s", "b-s", "b-chart", "b-profile", "b-gauge", "b-list", "b-wallet"].map(sk).join("");
  $("#alerts").innerHTML = "";
  $("#list").innerHTML = `<div class="skrow"><div class="skl"></div></div><div class="skrow"><div class="skl"></div></div><div class="skrow"><div class="skl"></div></div>`;
}

function renderAll() {
  $("#today").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (!loaded) { renderSkeleton(); if (page === "detail") renderDetail(openId); return; }
  const list = debts.map(d => ({ d, c: calc(d) }));
  const active = list.filter(x => !x.c.done);
  const done = list.filter(x => x.c.done);

  const sisa = active.reduce((a, x) => a + x.c.sisa, 0);
  const fine = active.reduce((a, x) => a + x.c.fine, 0);
  const total = list.reduce((a, x) => a + x.c.total, 0);
  const paid = list.reduce((a, x) => a + x.c.paid, 0);
  const pct = total ? Math.min(paid / total * 100, 100) : 0;
  const lateList = active.filter(x => x.c.maxLate > 0).sort((a, b) => b.c.maxLate - a.c.maxLate);
  const initial = esc(((me && (me.name || me.email)) || "?").trim().charAt(0).toUpperCase());

  const ms = monthly(list);
  const curM = ms[5].v, prevM = ms[4].v;
  const delta = prevM > 0 ? (curM - prevM) / prevM * 100 : null;
  const maxV = Math.max(...ms.map(m => m.v), 1);
  const up = active.filter(x => x.c.next).sort((a, b) => (a.c.next.due || 9e15) - (b.c.next.due || 9e15)).slice(0, 3);
  const tone = c => c.maxLate > 0 ? "bad" : (c.diff !== null && c.diff <= 3 ? "warn" : "ok");
  const chartNote = curM === 0 && prevM === 0 ? "Belum ada pembayaran dalam 2 bulan terakhir." : `Bulan ini kamu bayar ${rp(curM)}${delta === null ? "" : `, ${delta >= 0 ? "naik" : "turun"} ${Math.abs(delta).toFixed(0)}% dari bulan lalu`}.`;
  const left = sisa + fine;

  $("#stats").innerHTML = `
    <div class="b b-s hl"><div class="ico">${ICON_DEBT}</div><div class="tx"><span>Sisa hutang</span><strong>${rp(sisa)}</strong><span class="sm">dari ${active.length} hutang aktif</span></div></div>
    <div class="b b-s${fine > 0 ? " neg" : ""}"><div class="ico red">${ICON_FINE}</div><div class="tx"><span>Denda berjalan</span><strong>${rp(fine)}</strong><span class="sm">${fine > 0 ? "karena telat bayar, belum termasuk sisa hutang" : "tidak ada denda"}</span></div></div>
    <div class="b b-s"><div class="ico gold">${ICON_COIN}</div><div class="tx"><span>Total terbayar</span><strong>${rp(paid)}</strong><span class="sm">dari ${rp(total)} total hutang</span></div></div>
    <div class="b b-s"><div class="ico green">${ICON_CHECK}</div><div class="tx"><span>Hutang lunas</span><strong>${done.length}</strong><span class="sm">dari ${list.length} catatan</span></div></div>
    <div class="b b-chart">
      <div class="b-head"><h3>Pembayaran 6 bulan terakhir</h3></div>
      <p class="mute">${chartNote}</p>
      <div class="bars">${ms.map((m, i) => `<div class="bc${i === 5 ? " cur" : ""}"><span class="bv">${compact(m.v)}</span><div class="bt"><i style="height:${m.v / maxV * 100}%"></i></div><span class="bl">${m.l}</span></div>`).join("")}</div>
    </div>
    <div class="b b-profile">
      ${me && me.photo ? `<img class="avatar" src="${esc(me.photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar av">${initial}</span>`}
      <h3>${esc(me ? me.name || (me.email || "").split("@")[0] : "")}</h3>
      <p class="mute">${esc(me ? me.email : "")}</p>
      <div class="pf"><div><small>Aktif</small><b>${active.length}</b></div><div><small>Lunas</small><b class="ok">${done.length}</b></div><div><small>Telat</small><b class="${lateList.length ? "bad" : ""}">${lateList.length}</b></div></div>
    </div>
    <div class="b b-gauge">
      <div class="b-head"><h3>Progres pelunasan</h3></div>
      ${gaugeSVG(pct)}
      <p class="mute">${total ? `${rp(paid)} terbayar dari ${rp(total)}.` : "Belum ada hutang tercatat."}</p>
      ${total ? `<p class="mute">${left > 0 ? `Tinggal ${rp(left)} lagi${fine > 0 ? `, sudah termasuk denda ${rp(fine)}` : ""}.` : "Semua hutang sudah lunas."}</p>` : ""}
    </div>
    <div class="b b-list">
      <div class="b-head"><h3>Jatuh tempo terdekat</h3></div>
      ${up.length ? up.map(({ d, c }) => `<button class="tr" data-open="${esc(d.id)}"><i class="${tone(c)}"></i><span><b>${esc(d.lender)}</b><small>${c.maxLate > 0 ? `Telat ${c.maxLate} hari` : c.next.due ? (c.diff <= 0 ? "Hari ini" : fmtD(c.next.due)) : "Tanpa tempo"}</small></span><em class="chip ${tone(c)}">${rp(c.next.sisa)}</em></button>`).join("") : `<p class="mute pad">Belum ada tagihan yang akan datang.</p>`}
    </div>
    <div class="b b-wallet dk">
      <div class="wtx"><h3>Semua hutang, satu buku</h3><p class="mute">Catat cicilan, pantau jatuh tempo, dan lunasi satu per satu sampai bersih. Clearlynote bantu kamu tetap tahu mana yang harus dibayar lebih dulu.</p></div>
      ${WALLET_SVG}
    </div>`;
  $("#cAktif").textContent = active.length;
  $("#cLunas").textContent = done.length;
  $("#listTitle").textContent = tab === "aktif" ? "Hutang aktif" : "Sudah lunas";

  const alerts = [];
  active.forEach(({ d, c }) => {
    if (c.maxLate > 0) {
      const crit = c.crit;
      alerts.push({ k: crit ? "bad" : "warn", o: crit ? 0 : 1, id: d.id, t: `${d.lender} telat ${c.maxLate} hari${crit ? `, sudah melewati batas ${c.limit} hari` : ""}${c.fine > 0 ? `. Denda ${rp(c.fine)}` : ""}` });
    } else if (c.diff !== null && c.diff <= 3) {
      alerts.push({ k: "soon", o: 2, id: d.id, t: `${d.lender} jatuh tempo ${c.diff <= 0 ? "hari ini" : c.diff + " hari lagi"}: ${rp(c.next.sisa)}` });
    }
  });
  alerts.sort((a, b) => a.o - b.o);
  $("#alerts").innerHTML = (pending ? `<div class="alert"><i></i>Menyinkronkan ke server...</div>` : "") + alerts.map(a => `<button class="alert ${a.k}" data-open="${esc(a.id)}"><i></i>${esc(a.t)}</button>`).join("");

  let shown = tab === "aktif" ? active : done;
  shown.sort((a, b) => tab === "aktif"
    ? (b.c.maxLate - a.c.maxLate) || ((a.c.next?.due || 9e15) - (b.c.next?.due || 9e15))
    : (b.c.lastPay || "").localeCompare(a.c.lastPay || ""));
  const head = `<div class="lh"><span>Pemberi hutang</span><span>${tab === "aktif" ? "Jatuh tempo" : "Lunas pada"}</span><span>Tagihan</span><span>Sisa</span><span>Terbayar</span><span>Status</span></div>`;
  $("#list").innerHTML = shown.length ? head + shown.map(({ d, c }) => {
    const [st, cls] = statusOf(d, c);
    return `<button class="lr" data-open="${esc(d.id)}">
      <span class="who"><b>${esc(d.lender)}</b><small>${esc(d.source)}${c.multi ? ` · ${c.loans.length} pinjaman` : ""}</small></span>
      <span data-l="${tab === "aktif" ? "Jatuh tempo" : "Lunas pada"}">${c.done ? (c.lastPay ? fmtD(parseD(c.lastPay)) : "-") : c.next && c.next.due ? fmtD(c.next.due) : "Tanpa tempo"}</span>
      <span data-l="Tagihan">${c.done ? rp(c.total) : c.next ? rp(c.next.sisa) : "-"}</span>
      <span class="amt" data-l="Sisa"><b>${rp(c.sisa)}</b>${c.fine > 0 ? `<em>+ denda ${rp(c.fine)}</em>` : ""}</span>
      <span data-l="Terbayar"><div class="bar"><i class="${c.done ? "full" : ""}" style="width:${c.pct}%"></i></div><small>${rp(c.paid)} dari ${rp(c.total)}</small></span>
      <span class="st ${cls}">${st}</span>
    </button>`;
  }).join("") : `<div class="empty"><b>${tab === "aktif" ? "Belum ada hutang aktif" : "Belum ada yang lunas"}</b>${tab === "aktif" ? "Tekan Tambah hutang untuk mulai mencatat." : "Hutang yang sudah lunas akan muncul di sini."}</div>`;

  $("#dlLender").innerHTML = [...new Set(debts.map(d => d.lender))].map(v => `<option value="${esc(v)}">`).join("");

  if (page === "detail") renderDetail(openId);
}

function renderDetail(id) {
  const box = $("#detail");
  const d = debts.find(x => x.id === id);
  if (!d) { box.innerHTML = loaded ? `<div class="empty"><b>Hutang tidak ditemukan</b></div>` : `<div class="skl big"></div><div class="skl big"></div>`; return; }
  const c = calc(d);
  const [st, cls] = statusOf(d, c);
  const pays = [...(d.payments || [])].sort((a, b) => b.date.localeCompare(a.date));
  const pokok = d.type === "bunga" ? c.loans.reduce((a, l) => a + (l.principal || 0), 0) : c.total;
  const bunga = Math.max(c.total - pokok, 0);
  const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  const loanBlock = (l, i) => {
    const n = scheduleOf(l).length;
    const lp = l.principal || l.total || 0;
    const rows = [
      l.takenDate ? row("Tanggal pinjam", fmtD(parseD(l.takenDate))) : "",
      row("Pokok pinjaman", rp(lp)),
      row("Bunga + biaya", rp(Math.max((l.total || 0) - lp, 0))),
      row("Total yang dibayar", rp(l.total)),
      row("Lama cicilan", n + " " + unitOf(l)),
      row("Besar cicilan", esc(schedText(l))),
      row("Jatuh tempo pertama", fmtD(parseD(l.startDate))),
      row("Jatuh tempo terakhir", fmtD(addPeriod(parseD(l.startDate), n - 1, unitOf(l)))),
      row("Denda keterlambatan", esc(fineText(l))),
      row("Peringatan merah", `setelah telat ${l.warnDays || 7} hari`),
      i > 0 && l.note ? row("Catatan", esc(l.note)) : ""
    ].join("");
    const head = c.multi ? `<span class="lhd"><span><b>Pinjaman ${i + 1}</b></span>${i > 0 ? `<span class="lact"><button type="button" class="ibtn" data-editloan="${esc(l.id)}" aria-label="Edit pinjaman ${i + 1}" title="Edit pinjaman">${IC.pencil}</button><button type="button" class="ibtn del" data-delloan="${esc(l.id)}" aria-label="Hapus pinjaman ${i + 1}" title="Hapus pinjaman">${IC.trash}</button></span>` : ""}</span>` : "";
    return `<div class="loan">${head}<div class="dl">${rows}</div></div>`;
  };
  const rules = d.type === "bunga"
    ? c.loans.map(loanBlock).join("")
    : `<div class="loan"><div class="dl">${row("Nominal hutang", rp(d.total))}${row("Janji bayar", d.startDate ? fmtD(parseD(d.startDate)) : "Tidak ditentukan")}${row("Ketentuan", "Tanpa bunga dan denda")}</div></div>`;
  box.innerHTML = `
    <div class="dhead">
      <div><span class="chip src">${esc(d.source)}</span><span class="chip ${cls}">${st}</span><h1 class="ftitle">${esc(d.lender)}</h1></div>
      <div class="dact">
        ${c.done ? "" : `<button class="primary" id="btnPay">${IC.pay}Catat pembayaran</button>`}
        ${d.type === "bunga" && !c.done ? `<button class="ghost" id="btnTopup">${IC.plusc}Pinjam lagi</button>` : ""}
        <button class="ghost" id="btnEdit">${IC.pencil}${c.multi ? "Edit pinjaman 1" : "Edit"}</button>
        <button class="danger" id="btnDel">${IC.trash}Hapus hutang</button>
      </div>
    </div>
    <div class="fcard dsum">
      <div class="kv${d.type === "bunga" ? " k6" : ""}">
        ${d.type === "bunga" ? `<div><small>Pokok pinjaman</small><b>${rp(pokok)}</b></div><div><small>Bunga + biaya</small><b>${rp(bunga)}</b></div>` : ""}
        <div><small>Total tagihan</small><b>${rp(c.total)}</b></div>
        <div><small>Terbayar</small><b>${rp(c.paid)}</b></div>
        <div><small>Sisa</small><b>${rp(c.sisa)}</b></div>
        <div><small>Denda</small><b style="color:${c.fine > 0 ? "var(--red)" : "inherit"}">${rp(c.fine)}</b></div>
      </div>
      <div class="bar"><i class="${c.done ? "full" : ""}" style="width:${c.pct}%"></i></div>
    </div>
    <div class="agrid dgrid">
      <div class="acol">
        <div class="fcard dcard">
          <h2>${d.type === "bunga" ? "Jadwal cicilan" : "Rincian"}</h2>
          ${c.multi ? `<p class="mini" style="margin-bottom:10px">P1, P2, dst. artinya pinjaman ke-1, ke-2. Pembayaran otomatis menutup tagihan yang paling lama telat dulu.</p>` : ""}
          <div class="scroll"><table><thead><tr><th>Cicilan</th><th>Jatuh tempo</th><th>Tagihan</th><th>Dibayar</th><th>Sisa</th><th>Denda</th><th>Status</th></tr></thead><tbody>
            ${c.rows.map(r => `<tr><td>${c.multi ? `P${r.li + 1} · ` : ""}${r.i}</td><td>${fmtD(r.due)}</td><td>${rp(r.amt)}</td><td>${rp(r.paid)}</td><td>${rp(r.sisa)}</td><td>${r.fine > 0 ? rp(r.fine) : "-"}</td><td><span class="chip ${r.status === "lunas" ? "ok" : r.status === "telat" ? "bad" : r.status === "sebagian" ? "warn" : ""}">${r.status === "telat" ? "Telat " + r.late + " hari" : r.status === "lunas" ? "Lunas" : r.status === "sebagian" ? "Sebagian" : "Belum"}</span></td></tr>`).join("")}
          </tbody></table></div>
        </div>
      </div>
      <div class="acol">
        <div class="fcard dcard">
          <h2>${c.multi ? "Pinjaman" : "Detail hutang"}</h2>
          ${rules}
          ${d.note ? `<h2>Catatan</h2><p class="mini">${esc(d.note)}</p>` : ""}
        </div>
        <div class="fcard dcard">
          <h2>Riwayat pembayaran</h2>
          <div class="hist">${pays.length ? pays.map(p => `<div><span><b>${rp(p.amount)}</b><small>${fmtD(parseD(p.date))}${p.note ? " - " + esc(p.note) : ""}</small></span><button type="button" class="ibtn del" data-delpay="${esc(p.id)}" aria-label="Hapus pembayaran" title="Hapus pembayaran">${IC.trash}</button></div>`).join("") : `<p class="mini">Belum ada pembayaran.</p>`}</div>
        </div>
      </div>
    </div>`;
}

function toggleType() {
  const b = $("#fType").value === "bunga";
  $("#boxBunga").classList.toggle("hidden", !b);
  $("#boxBiasa").classList.toggle("hidden", b);
  $("#fTotal").required = b;
  $("#fTenor").required = b;
  $("#fStart").required = b;
  $("#fNominal").required = !b;
  $("#fDebt").classList.toggle("single", !b);
  $("#fSide").classList.toggle("hidden", !b);
}

function fineLabel() {
  const m = $("#fFineMode").value;
  const p = m === "persen";
  $("#lFine").textContent = p ? "Besar denda (% per hari)" : m === "flat" ? "Besar denda tetap per tagihan telat (Rp)" : "Besar denda per hari (Rp)";
  $("#fFine").classList.toggle("money", !p);
  $("#fFine").inputMode = p ? "decimal" : "numeric";
}

function unitLabel() {
  const u = $("#fUnit").value;
  $("#lTenor").textContent = `Lama cicilan (${u})`;
  $("#fTenor").max = UNIT_CAP[u];
}

function fineNum() {
  return $("#fFineMode").value === "persen" ? Number(String($("#fFine").value).replace(",", ".")) || 0 : num("#fFine");
}

function renderSum() {
  const total = [...document.querySelectorAll(".sch")].reduce((a, i) => a + numOf(i), 0);
  const pokok = num("#fPrincipal");
  $("#sum").innerHTML = !total ? "" : `<div><span>Total dibayar</span><b>${rp(total)}</b></div>` + (pokok > 0 ? `<div><span>Pokok pinjaman</span><b>${rp(pokok)}</b></div><div><span>Bunga + biaya</span><b>${rp(Math.max(total - pokok, 0))}</b></div>` : "");
}

function buildSched(preset) {
  const u = $("#fUnit").value;
  const n = Math.max(0, Math.min(UNIT_CAP[u], Math.round(num("#fTenor"))));
  const beda = $("#fMode").value === "beda";
  const cur = [...document.querySelectorAll(".sch")].map(numOf);
  const vals = preset || (beda ? Array.from({ length: n }, (_, i) => cur[i] || 0) : splitEven(num("#fTotal"), n));
  const start = $("#fStart").value ? parseD($("#fStart").value) : null;
  $("#sched").innerHTML = vals.map((v, i) => `<label class="sr"><span>${UNIT_TITLE[u]} ${i + 1}${start ? ", " + fmtD(addPeriod(start, i, u)) : ""}</span><input class="money sch" inputmode="numeric" value="${fmt(v)}" placeholder="0" ${beda ? "" : "readonly"}></label>`).join("");
  $("#fTotal").readOnly = beda;
  if (beda) $("#fTotal").value = fmt(vals.reduce((a, b) => a + b, 0));
  renderSum();
}

function openForm(id, useDraft = true, loan = null) {
  editingId = id || null;
  editingLoan = loan || null;
  draftId = crypto.randomUUID();
  const d = id ? debts.find(x => x.id === id) : null;
  const t = loan && loan !== "new" && d ? (d.topups || []).find(x => x.id === loan) : null;
  const s = loan ? t : d;
  const b = loan ? true : d?.type === "bunga";
  const f = s || d;
  $("#fTitle").textContent = loan === "new" ? `Pinjam lagi di ${d.lender}` : loan ? `Edit pinjaman ke-${(d.topups || []).findIndex(x => x.id === loan) + 2}` : d ? "Edit hutang" : "Tambah hutang";
  $("#fType").value = loan ? "bunga" : d?.type || "bunga";
  $("#fSource").value = d?.source || "Pinjol / aplikasi";
  $("#fLender").value = d?.lender || "";
  $("#fNote").value = s?.note || "";
  $("#fPrincipal").value = b && s ? fmt(s.principal) : "";
  $("#fTotal").value = b && s ? fmt(s.total) : "";
  $("#fTenor").value = b && s ? scheduleOf(s).length : "";
  $("#fMode").value = s?.mode || (s ? "beda" : "sama");
  $("#fUnit").value = b && s ? unitOf(s) : "bulan";
  unitLabel();
  $("#fStart").value = b && s ? s.startDate : "";
  $("#fTaken").value = b ? (s ? s.takenDate || "" : loan === "new" ? isoD(new Date()) : "") : "";
  $("#fFineMode").value = f?.fineMode || "nominal";
  fineLabel();
  $("#fFine").value = b && f ? (f.fineMode === "persen" ? String(f.fineValue ?? "").replace(".", ",") : fmt(f.fineValue)) : "";
  $("#fWarn").value = f?.warnDays || 7;
  $("#fNominal").value = d && !b ? fmt(d.total) : "";
  $("#fDue").value = d && !b ? d.startDate : "";
  $("#fType").disabled = !!d || !!loan;
  $("#fSource").disabled = !!loan;
  $("#fLender").disabled = !!loan;
  toggleType();
  buildSched(b && s ? scheduleOf(s) : null);
  const dr = useDraft ? loadDraft() : null;
  const has = dr && (loan ? (dr.fTotal || dr.fTenor) : (dr.fLender || dr.fTotal || dr.fNominal || dr.fTenor));
  if (has) applyDraft(dr);
  $("#draftNote").classList.toggle("hidden", !has);
  $("#fMsg").classList.add("hidden");
}

const showMsg = t => { const m = $("#fMsg"); m.textContent = t; m.classList.remove("hidden"); m.scrollIntoView({ block: "center" }); };
const DRAFT_IDS = ["fType", "fSource", "fLender", "fNote", "fPrincipal", "fTotal", "fTenor", "fUnit", "fMode", "fStart", "fTaken", "fFineMode", "fFine", "fWarn", "fNominal", "fDue"];
const draftKey = () => `clearly:draft:${uid}:${editingId || "new"}${editingLoan ? ":" + editingLoan : ""}`;
function saveDraft() {
  try {
    const v = {};
    DRAFT_IDS.forEach(i => { v[i] = $("#" + i).value; });
    v.sch = [...document.querySelectorAll(".sch")].map(i => i.value);
    localStorage.setItem(draftKey(), JSON.stringify(v));
  } catch (e) {}
}
function loadDraft() { try { return JSON.parse(localStorage.getItem(draftKey())); } catch (e) { return null; } }
function clearDraft() { try { localStorage.removeItem(draftKey()); } catch (e) {} }
function applyDraft(v) {
  DRAFT_IDS.forEach(i => { if (v[i] !== undefined) $("#" + i).value = v[i]; });
  fineLabel();
  unitLabel();
  toggleType();
  buildSched((v.sch || []).map(s => Number(String(s).replace(/\./g, "")) || 0));
}
let draftTimer;
const queueDraft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 300); };

async function saveDebt(e) {
  e.preventDefault();
  const old = editingId ? debts.find(x => x.id === editingId) : null;
  const loan = editingLoan;
  let data;
  if (loan) {
    if (!old) { showMsg("Hutang induknya tidak ditemukan."); return; }
    if (!$("#fStart").value) { showMsg("Isi tanggal jatuh tempo pertama."); return; }
    const schedule = [...document.querySelectorAll(".sch")].map(numOf);
    if (!schedule.length || schedule.some(v => v <= 0)) { showMsg("Isi nominal cicilan untuk setiap bulan."); return; }
    const total = schedule.reduce((a, b) => a + b, 0);
    const entry = {
      id: loan === "new" ? crypto.randomUUID() : loan,
      takenDate: $("#fTaken").value || "",
      principal: num("#fPrincipal") || total,
      total,
      schedule,
      mode: $("#fMode").value,
      tenor: schedule.length,
      unit: $("#fUnit").value,
      startDate: $("#fStart").value,
      fineMode: $("#fFineMode").value,
      fineValue: fineNum(),
      warnDays: Math.max(1, Math.round(Number($("#fWarn").value) || 7)),
      note: $("#fNote").value.trim()
    };
    const { id: _pid, ...rest } = old;
    const topups = loan === "new" ? [...(old.topups || []), entry] : (old.topups || []).map(x => x.id === loan ? entry : x);
    data = { ...rest, topups };
  } else {
    const type = $("#fType").value;
    if (!$("#fLender").value.trim()) { showMsg("Isi nama aplikasi atau pemberi hutang."); return; }
    data = {
      type,
      source: $("#fSource").value,
      lender: $("#fLender").value.trim(),
      note: $("#fNote").value.trim(),
      payments: old?.payments || [],
      createdAt: old?.createdAt || Date.now()
    };
    if (old?.topups?.length) data.topups = old.topups;
    if (type === "bunga") {
      if (!$("#fStart").value) { showMsg("Isi tanggal jatuh tempo pertama."); return; }
      const schedule = [...document.querySelectorAll(".sch")].map(numOf);
      if (!schedule.length || schedule.some(v => v <= 0)) { showMsg("Isi nominal cicilan untuk setiap bulan."); return; }
      const total = schedule.reduce((a, b) => a + b, 0);
      Object.assign(data, {
        total,
        principal: num("#fPrincipal") || total,
        schedule,
        mode: $("#fMode").value,
        tenor: schedule.length,
      unit: $("#fUnit").value,
        startDate: $("#fStart").value,
        takenDate: $("#fTaken").value || "",
        fineMode: $("#fFineMode").value,
        fineValue: fineNum(),
        warnDays: Math.max(1, Math.round(Number($("#fWarn").value) || 7))
      });
    } else {
      const total = num("#fNominal");
      if (!(total > 0)) { showMsg("Isi nominal hutang."); return; }
      Object.assign(data, { total, principal: total, startDate: $("#fDue").value || "" });
    }
  }
  const id = editingId || draftId || crypto.randomUUID();
  const btns = [...document.querySelectorAll("#fDebt button[type=submit]")];
  btns.forEach(b => { b.disabled = true; b.textContent = "Menyimpan..."; });
  $("#fMsg").classList.add("hidden");
  try {
    const write = setDoc(doc(db, "users", uid, "debts", id), data);
    write.catch(() => {});
    await Promise.race([write, new Promise(r => setTimeout(r, 1200))]);
    saved = true;
    clearDraft();
    location.href = backUrl();
  } catch (err) {
    showMsg("Gagal menyimpan: " + err.message);
    btns.forEach(b => { b.disabled = false; b.textContent = "Simpan"; });
  }
}

function applyPage() {
  const form = page === "tambah" || page === "edit";
  const about = page === "tentang";
  const det = page === "detail";
  $("#pageHome").classList.toggle("hidden", form || about || det);
  $("#pageForm").classList.toggle("hidden", !form);
  $("#pageAbout").classList.toggle("hidden", !about);
  $("#pageDetail").classList.toggle("hidden", !det);
}

function tryRoute() {
  if (page === "home" || page === "tentang" || page === "detail" || routed || !uid) return;
  const q = new URLSearchParams(location.search);
  if (page === "tambah") {
    const tp = q.get("topup");
    if (!tp) { routed = true; openForm(null); return; }
    const d = debts.find(x => x.id === tp);
    if (d && d.type === "bunga") { routed = true; openForm(tp, true, "new"); }
    return;
  }
  const id = q.get("id"), ln = q.get("loan");
  const d = id && debts.find(x => x.id === id);
  if (d && (!ln || (d.topups || []).some(x => x.id === ln))) { routed = true; openForm(id, true, ln || null); }
}

function openPay(id) {
  payingId = id;
  const d = debts.find(x => x.id === id);
  const c = calc(d);
  $("#payInfo").textContent = `${d.lender}. Sisa hutang ${rp(c.sisa)}${c.next ? `, tagihan berikutnya ${rp(c.next.sisa)}` : ""}.${c.multi ? " Pembayaran otomatis menutup tagihan yang paling lama telat dulu, dari pinjaman mana pun." : ""}`;
  $("#pAmount").value = fmt(c.next ? c.next.sisa : 0);
  $("#pDate").value = isoD(new Date());
  $("#pNote").value = "";
  $("#dPay").showModal();
}

function savePay(e) {
  e.preventDefault();
  const d = debts.find(x => x.id === payingId);
  const c = calc(d);
  const amount = Math.min(num("#pAmount"), c.sisa);
  if (!(amount > 0)) return;
  const payments = [...(d.payments || []), { id: crypto.randomUUID(), amount, date: $("#pDate").value, note: $("#pNote").value.trim() }];
  const { id, ...rest } = d;
  setDoc(doc(db, "users", uid, "debts", d.id), { ...rest, payments }).catch(err => alert("Gagal menyimpan: " + err.message));
  $("#dPay").close();
}

async function delPay(pid) {
  const d = debts.find(x => x.id === openId);
  if (!d) return;
  const ok = await ask("Hapus pembayaran ini?", "Riwayat pembayaran ini akan dihapus dan sisa hutang dihitung ulang.", "Hapus", true);
  if (!ok) return;
  const { id, ...rest } = d;
  setDoc(doc(db, "users", uid, "debts", d.id), { ...rest, payments: d.payments.filter(p => p.id !== pid) }).catch(err => alert("Gagal menghapus: " + err.message));
}

async function delDebt() {
  const d = debts.find(x => x.id === openId);
  if (!d) return;
  const ok = await ask(`Hapus hutang ${d.lender}?`, "Seluruh riwayat bayarnya ikut terhapus dan data tidak bisa dikembalikan.", "Hapus hutang", true);
  if (!ok) return;
  const w = deleteDoc(doc(db, "users", uid, "debts", d.id));
  w.catch(err => alert("Gagal menghapus: " + err.message));
  await Promise.race([w.catch(() => {}), new Promise(r => setTimeout(r, 1200))]);
  location.href = homeUrl;
}

async function delLoan(lid) {
  const d = debts.find(x => x.id === openId);
  if (!d) return;
  const ok = await ask("Hapus pinjaman ini?", "Jadwal pinjaman ini dihapus. Pembayaran yang sudah dicatat tetap ada dan dihitung ulang ke tagihan yang tersisa.", "Hapus", true);
  if (!ok) return;
  const { id, ...rest } = d;
  setDoc(doc(db, "users", uid, "debts", d.id), { ...rest, topups: (d.topups || []).filter(x => x.id !== lid) }).catch(err => alert("Gagal menghapus: " + err.message));
}

function goHome() {
  if (page !== "home") { location.href = homeUrl; return; }
  tab = "aktif";
  document.querySelectorAll(".segb").forEach(p => p.classList.toggle("active", p.dataset.tab === "aktif"));
  document.querySelectorAll("dialog[open]").forEach(d => d.close());
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

document.querySelectorAll(".topbar .brand").forEach(b => {
  b.setAttribute("role", "button");
  b.setAttribute("tabindex", "0");
  b.setAttribute("aria-label", "Kembali ke dashboard");
  b.addEventListener("click", goHome);
  b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goHome(); } });
});

const authMsg = t => { const e = $("#loginErr"); e.classList.remove("ok"); e.textContent = t || ""; };
const authOk = t => { const e = $("#loginErr"); e.classList.add("ok"); e.textContent = t; };
const AUTH_ERR = {
  "auth/invalid-credential": "Email atau password salah.",
  "auth/wrong-password": "Email atau password salah.",
  "auth/user-not-found": "Email belum terdaftar. Daftar dulu lewat tab Daftar.",
  "auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
  "auth/weak-password": "Password minimal 6 karakter.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/popup-closed-by-user": "Jendela Google ditutup sebelum selesai.",
  "auth/cancelled-popup-request": "",
  "auth/popup-blocked": "Popup diblokir browser. Izinkan popup lalu coba lagi.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi sebentar lagi.",
  "auth/network-request-failed": "Koneksi bermasalah. Cek internet lalu coba lagi.",
  "auth/operation-not-allowed": "Metode ini belum diaktifkan di Firebase Authentication."
};
const authErr = err => AUTH_ERR[err.code] ?? ("Gagal: " + (err.code || err.message));

function setAuthMode(m) {
  document.querySelectorAll(".tabb").forEach(b => b.classList.toggle("active", b.dataset.auth === m));
  $("#fLogin").classList.toggle("hidden", m !== "login");
  $("#fRegister").classList.toggle("hidden", m !== "register");
  $("#gLabel").textContent = m === "login" ? "Masuk dengan Google" : "Daftar dengan Google";
  $("#loginSub").textContent = m === "login" ? "Masuk untuk membuka catatan hutangmu." : "Buat akun dulu sebelum mulai mencatat.";
  authMsg("");
}

function lock(on) {
  document.querySelectorAll("#login button").forEach(b => { b.disabled = on; });
  if (!on && cooling) $("#btnVResend").disabled = true;
}

const profileRef = id => doc(db, "users", id, "meta", "profile");

async function isRegistered(user) {
  try {
    const s = await Promise.race([getDoc(profileRef(user.uid)), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))]);
    return s.exists();
  } catch (e) {
    return null;
  }
}

async function ensureProfile(user, name) {
  if (await isRegistered(user) === true) return;
  const w = setDoc(profileRef(user.uid), { name: name || user.displayName || "", email: user.email || "", createdAt: Date.now() });
  w.catch(() => {});
  await Promise.race([w, new Promise(r => setTimeout(r, 1500))]);
}

function showApp(u) {
  uid = u.uid;
  me = u;
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  const nm = u.name || (u.email || "").split("@")[0];
  $("#greet").textContent = "Halo, " + nm.split(" ")[0];
  $("#uname").textContent = nm;
  $("#mname").textContent = nm;
  $("#mmail").textContent = u.email || "";
  if (u.photo) {
    $("#uimg").src = u.photo;
    $("#uimg").classList.remove("hidden");
    $("#uav").classList.add("hidden");
  } else {
    $("#uimg").removeAttribute("src");
    $("#uimg").classList.add("hidden");
    $("#uav").textContent = nm.trim().charAt(0).toUpperCase() || "?";
    $("#uav").classList.remove("hidden");
  }
}

function enter(user) {
  if (unsub) { unsub(); unsub = null; }
  const u = { uid: user.uid, name: user.displayName || "", email: user.email || "", photo: user.photoURL || "" };
  const same = uid === u.uid;
  LS.set("clearly:last", u);
  showApp(u);
  authMsg("");
  if (!same) {
    const c = LS.get(cacheKey(u.uid));
    debts = c || [];
    loaded = !!c;
    routed = false;
  }
  renderAll();
  tryRoute();
  unsub = onSnapshot(collection(db, "users", uid, "debts"), { includeMetadataChanges: true }, snap => {
    pending = snap.metadata.hasPendingWrites;
    debts = snap.docs.map(s => ({ id: s.id, ...s.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    loaded = true;
    LS.set(cacheKey(uid), debts);
    if ((page === "edit" || (page === "tambah" && new URLSearchParams(location.search).get("topup"))) && !routed && !snap.metadata.fromCache) {
      const q = new URLSearchParams(location.search);
      const id = page === "edit" ? q.get("id") : q.get("topup");
      const dd = id && debts.find(x => x.id === id);
      const ln = page === "edit" ? q.get("loan") : null;
      if (!dd || (ln && !(dd.topups || []).some(x => x.id === ln))) { location.href = homeUrl; return; }
    }
    if (page === "detail" && !snap.metadata.fromCache && !debts.find(x => x.id === openId)) { location.href = homeUrl; return; }
    renderAll();
    tryRoute();
  }, err => {
    const m = "Gagal memuat data: " + err.message;
    loaded = true;
    renderAll();
    if (page === "tambah" || page === "edit") showMsg(m); else alert(m);
  });
}

document.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.auth) setAuthMode(t.dataset.auth);
  else if (t.dataset.add !== undefined) location.href = base + "tambah/";
  else if (t.dataset.open) location.href = base + "detail/?id=" + encodeURIComponent(t.dataset.open);
  else if (t.dataset.close) $("#" + t.dataset.close).close();
  else if (t.dataset.delpay) delPay(t.dataset.delpay);
  else if (t.dataset.back !== undefined) location.href = backUrl();
  else if (t.dataset.cancel !== undefined) { clearDraft(); saved = true; location.href = backUrl(); }
  else if (t.id === "btnDraftClear") { clearDraft(); openForm(editingId, false, editingLoan); }
  else if (t.dataset.tab) {
    tab = t.dataset.tab;
    if (page !== "home") { location.href = homeUrl + (t.dataset.tab === "lunas" ? "#lunas" : ""); return; }
    document.querySelectorAll(".segb").forEach(p => p.classList.toggle("active", p === t));
    renderAll();
  } else if (t.id === "btnEdit") { location.href = base + "edit/?id=" + encodeURIComponent(openId); }
  else if (t.id === "btnTopup") { location.href = base + "tambah/?topup=" + encodeURIComponent(openId); }
  else if (t.dataset.editloan) { location.href = base + "edit/?id=" + encodeURIComponent(openId) + "&loan=" + encodeURIComponent(t.dataset.editloan); }
  else if (t.dataset.delloan) delLoan(t.dataset.delloan);
  else if (t.id === "btnPay") openPay(openId);
  else if (t.id === "btnDel") delDebt();
});

$("#btnAdd").onclick = () => { location.href = "tambah/"; };
$("#btnAdd").innerHTML = IC.plus + "Tambah hutang";
$("#fType").onchange = toggleType;
$("#fFineMode").onchange = fineLabel;
$("#fDebt").onsubmit = saveDebt;
$("#fPay").onsubmit = savePay;
$("#btnFull").onclick = () => { const d = debts.find(x => x.id === payingId); $("#pAmount").value = fmt(calc(d).sisa); };
$("#dPay").addEventListener("close", () => { payingId = null; });
document.addEventListener("input", e => {
  const el = e.target;
  if (el.classList.contains("money") && !el.readOnly) {
    const dg = el.value.replace(/\D/g, "");
    el.value = dg ? Number(dg).toLocaleString("id-ID") : "";
  }
  if (el.classList.contains("sch") && !el.readOnly) {
    $("#fTotal").value = fmt([...document.querySelectorAll(".sch")].reduce((a, i) => a + numOf(i), 0));
  }
  if (el.id === "fPrincipal" || el.classList.contains("sch")) renderSum();
});
$("#fUnit").onchange = () => { unitLabel(); buildSched(); };
$("#fTenor").oninput = () => buildSched();
$("#fTotal").oninput = () => { if ($("#fMode").value === "sama") buildSched(); };
$("#fMode").onchange = () => buildSched();
$("#fStart").onchange = () => buildSched();
$("#fDebt").addEventListener("input", queueDraft);
$("#fDebt").addEventListener("change", queueDraft);
window.addEventListener("pagehide", () => { if ((page === "tambah" || page === "edit") && uid && !saved && ($("#fTotal").value || $("#fNominal").value || (!editingLoan && $("#fLender").value))) saveDraft(); });
if (location.hash === "#lunas" && page === "home") {
  tab = "lunas";
  document.querySelectorAll(".segb").forEach(p => p.classList.toggle("active", p.dataset.tab === "lunas"));
}
if (page === "detail") openId = new URLSearchParams(location.search).get("id");
applyPage();

$("#fLogin").onsubmit = async e => {
  e.preventDefault();
  authMsg("");
  if (!configured) { authMsg("Isi firebaseConfig di app.js terlebih dahulu."); return; }
  const email = $("#lEmail").value.trim(), pass = $("#lPass").value;
  if (!email || !pass) { authMsg("Isi email dan password."); return; }
  lock(true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    authMsg(authErr(err));
  }
  lock(false);
};

$("#fRegister").onsubmit = async e => {
  e.preventDefault();
  authMsg("");
  if (!configured) { authMsg("Isi firebaseConfig di app.js terlebih dahulu."); return; }
  const name = $("#rName").value.trim(), email = $("#rEmail").value.trim(), pass = $("#rPass").value, pass2 = $("#rPass2").value;
  if (!name) { authMsg("Isi nama kamu."); return; }
  if (!email) { authMsg("Isi email."); return; }
  if (pass.length < 6) { authMsg("Password minimal 6 karakter."); return; }
  if (pass !== pass2) { authMsg("Password dan ulangi password tidak sama."); return; }
  lock(true);
  registering = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await ensureProfile(cred.user, name);
    try { await sendEmailVerification(cred.user); } catch (e) {}
    registering = false;
    showVerify(cred.user);
    startCooldown();
  } catch (err) {
    registering = false;
    authMsg(authErr(err));
    if (auth.currentUser) await signOut(auth).catch(() => {});
  }
  lock(false);
};

$("#btnGoogle").onclick = async () => {
  authMsg("");
  if (!configured) { authMsg("Isi firebaseConfig di app.js terlebih dahulu."); return; }
  const reg = !$("#fRegister").classList.contains("hidden");
  lock(true);
  registering = reg;
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    if (reg) {
      await ensureProfile(cred.user);
      registering = false;
      enter(cred.user);
    }
  } catch (err) {
    registering = false;
    authMsg(authErr(err));
    if (reg && auth.currentUser) await signOut(auth).catch(() => {});
  }
  lock(false);
};

let verifyTimer = null, cooldownTimer = null, cooling = false, checking = false;

function needsVerify(u) {
  return u.providerData.some(p => p.providerId === "password") && !u.emailVerified;
}

async function admit(user) {
  const l = LS.get("clearly:last");
  if (!(l && l.uid === user.uid)) {
    authMsg("Memeriksa akun...");
    const ok = await isRegistered(user);
    if (ok !== true) {
      await signOut(auth).catch(() => {});
      authMsg(ok === false ? "Akun ini belum terdaftar. Daftar dulu lewat tab Daftar." : "Tidak bisa memverifikasi akun. Cek koneksi lalu coba lagi.");
      return;
    }
  }
  enter(user);
}

function showVerify(user) {
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
  $("#authMain").classList.add("hidden");
  $("#verifyBox").classList.remove("hidden");
  $("#vMail").textContent = user.email || "";
  authMsg("");
  clearInterval(verifyTimer);
  verifyTimer = setInterval(() => checkVerified(true), 4000);
}

function hideVerify() {
  clearInterval(verifyTimer);
  verifyTimer = null;
  $("#verifyBox").classList.add("hidden");
  $("#authMain").classList.remove("hidden");
}

async function checkVerified(silent) {
  const u = auth.currentUser;
  if (!u || checking) return;
  checking = true;
  try {
    try { await u.reload(); } catch (e) { if (!silent) authMsg(authErr(e)); return; }
    if (!u.emailVerified) {
      if (!silent) authMsg("Email belum diverifikasi. Klik link di emailmu dulu, lalu coba lagi.");
      return;
    }
    try { await u.getIdToken(true); } catch (e) {}
    hideVerify();
    authMsg("");
    await admit(u);
  } finally {
    checking = false;
  }
}

function startCooldown() {
  const b = $("#btnVResend");
  let s = 60;
  cooling = true;
  b.disabled = true;
  clearInterval(cooldownTimer);
  const tick = () => {
    if (s <= 0) {
      clearInterval(cooldownTimer);
      cooling = false;
      b.disabled = false;
      b.textContent = "Kirim ulang email";
      return;
    }
    b.textContent = `Kirim ulang (${s--})`;
  };
  tick();
  cooldownTimer = setInterval(tick, 1000);
}

async function resendVerify() {
  const u = auth.currentUser;
  if (!u) return;
  try {
    await sendEmailVerification(u);
  } catch (err) {
    authMsg(authErr(err));
    return;
  }
  authOk("Email verifikasi sudah dikirim ulang.");
  startCooldown();
}

$("#btnVDone").onclick = () => checkVerified(false);
$("#btnVResend").onclick = resendVerify;
$("#btnVOut").onclick = async () => {
  hideVerify();
  authMsg("");
  await signOut(auth).catch(() => {});
};
window.addEventListener("focus", () => { if (verifyTimer) checkVerified(true); });

$("#miAbout").href = base + "tentang/";
if (page === "tentang") $("#miAbout").classList.add("cur");
const setMenu = o => { $("#menu").classList.toggle("hidden", !o); $("#btnMenu").setAttribute("aria-expanded", o); };
$("#btnMenu").onclick = () => setMenu($("#menu").classList.contains("hidden"));
document.addEventListener("click", e => { if (!e.target.closest(".me")) setMenu(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

$("#btnLogout").onclick = async () => {
  setMenu(false);
  const ok = await ask("Keluar dari Clearlynote?", "Kamu perlu masuk lagi untuk membuka catatan hutangmu.", "Keluar", true);
  if (!ok) return;
  if (uid) LS.del(cacheKey(uid));
  await signOut(auth);
};

if (configured) {
  const last = LS.get("clearly:last");
  if (last && last.uid) {
    showApp(last);
    const c = LS.get(cacheKey(last.uid));
    debts = c || [];
    loaded = !!c;
    renderAll();
    tryRoute();
  }
  onAuthStateChanged(auth, async user => {
    if (!user) {
      if (unsub) { unsub(); unsub = null; }
      uid = null;
      me = null;
      debts = [];
      loaded = false;
      routed = false;
      pending = false;
      LS.del("clearly:last");
      $("#app").classList.add("hidden");
      $("#login").classList.remove("hidden");
      return;
    }
    if (registering) return;
    if (needsVerify(user)) { showVerify(user); return; }
    await admit(user);
  });
} else {
  $("#login").classList.remove("hidden");
}

setInterval(() => { if (uid && loaded && !document.querySelector("dialog[open]")) renderAll(); }, 60000);