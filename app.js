import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqifOsvrWxaHqvwPlq5OnO8ALoSTqWSm0",
  authDomain: "clearlynote.web.app",
  projectId: "clearly-1ad18",
  appId: "1:608938862760:web:3ee3da2537a9f36b51ba9d"
};

const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

const LANG_KEY = "clearly:lang";
const ACT_KEY = "clearly:activity";
const IDLE_FLAG = "clearly:idleout";
const IDLE_MS = 10 * 60 * 1000;
let lang = LS.get(LANG_KEY) === "id" ? "id" : "en";

const configured = !firebaseConfig.apiKey.startsWith("ISI_");
let auth, db;
if (configured) {
  const fb = initializeApp(firebaseConfig);
  auth = getAuth(fb);
  auth.languageCode = lang;
  db = initializeFirestore(fb, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalAutoDetectLongPolling: true
  });
}

const S = n => (n === 1 ? "" : "s");

const D = {
  "hello": ["Halo", "Hello"],
  "hello.n": ["Halo, {n}", "Hello, {n}"],
  "add": ["Tambah hutang", "Add debt"],
  "cancel": ["Batal", "Cancel"],
  "save": ["Simpan", "Save"],
  "saving": ["Menyimpan...", "Saving..."],
  "back": ["Kembali ke daftar", "Back to list"],
  "back.dash": ["Kembali ke dashboard", "Back to dashboard"],
  "foot": [p => `\u00A9 ${p.y} Clearlynote. Seluruh hak cipta dilindungi.`, p => `\u00A9 ${p.y} Clearlynote. All rights reserved.`],
  "title.form": ["Clearlynote - Catatan Hutang", "Clearlynote - Debt Notes"],
  "title.about": ["Clearlynote - Tentang", "Clearlynote - About"],
  "menu.about": ["Tentang & panduan", "About & guide"],
  "menu.logout": ["Keluar", "Sign out"],
  "lang.label": ["Bahasa", "Language"],
  "home.sub": ["Semua hutangmu dalam satu buku, hanya kamu yang bisa membukanya.", "All your debts in one book, and only you can open it."],
  "tab.active": ["Aktif", "Active"],
  "tab.paid": ["Lunas", "Paid off"],
  "list.active": ["Hutang aktif", "Active debts"],
  "list.paid": ["Sudah lunas", "Paid off"],
  "about.title": ["Tentang Clearlynote", "About Clearlynote"],
  "draft.note": ["Draf terakhir dipulihkan, lanjutkan mengisi.", "Your last draft was restored, keep filling it in."],
  "draft.clear": ["Mulai dari awal", "Start over"],
  "f.type": ["Jenis hutang", "Debt type"],
  "f.type.bunga": ["Berbunga atau berdenda (pinjol, bank, kredit)", "With interest or late fees (online loan, bank, credit)"],
  "f.type.biasa": ["Tanpa bunga dan denda (warung, teman, saudara)", "No interest or late fees (shop tab, friend, family)"],
  "f.source": ["Asal hutang", "Debt source"],
  "f.lender": ["Nama aplikasi atau pemberi hutang", "App or lender name"],
  "f.lender.ph": ["Contoh: Kredivo, Warung Bu Ani", "e.g. Kredivo, Bu Ani's shop"],
  "f.principal": ["Pokok pinjaman (Rp)", "Principal (Rp)"],
  "f.total": ["Total yang harus dibayar (Rp)", "Total to repay (Rp)"],
  "f.unit": ["Jarak antar cicilan", "Installment interval"],
  "f.unit.hari": ["Harian", "Daily"],
  "f.unit.minggu": ["Mingguan", "Weekly"],
  "f.unit.bulan": ["Bulanan", "Monthly"],
  "f.len": [p => `Lama cicilan (${p.u})`, p => `Installment length (${p.u})`],
  "f.mode": ["Besar cicilan", "Installment amount"],
  "f.mode.sama": ["Sama tiap cicilan", "Equal for each installment"],
  "f.mode.beda": ["Beda tiap cicilan", "Different for each installment"],
  "f.taken": ["Tanggal pinjam (opsional)", "Borrowed on (optional)"],
  "f.start": ["Jatuh tempo pertama", "First due date"],
  "f.finemode": ["Denda keterlambatan", "Late fee"],
  "f.finemode.nominal": ["Nominal per hari (Rp)", "Fixed amount per day (Rp)"],
  "f.finemode.persen": ["Persen per hari dari sisa tagihan", "Percent per day of the remaining bill"],
  "f.finemode.flat": ["Nominal tetap per tagihan telat (sekali per tagihan)", "Flat amount per late bill (once per bill)"],
  "f.fine.nominal": ["Besar denda per hari (Rp)", "Late fee per day (Rp)"],
  "f.fine.persen": ["Besar denda (% per hari)", "Late fee (% per day)"],
  "f.fine.flat": ["Besar denda tetap per tagihan telat (Rp)", "Flat late fee per late bill (Rp)"],
  "f.warn": ["Peringatan merah jika telat lebih dari (hari)", "Red alert if late for more than (days)"],
  "f.nominal": ["Nominal hutang (Rp)", "Debt amount (Rp)"],
  "f.due": ["Janji bayar (opsional)", "Promised pay date (optional)"],
  "f.note": ["Catatan (opsional)", "Note (optional)"],
  "f.side": ["Rincian cicilan", "Installment breakdown"],
  "f.side.hint": ["Pilih \"Beda tiap cicilan\" kalau cicilannya nggak rata, misal 700.000, 150.000, 150.000. Total dihitung otomatis dari rincian.", "Choose \"Different for each installment\" if the amounts are uneven, e.g. 700.000, 150.000, 150.000. The total is calculated automatically from the breakdown."],
  "sched.empty": ["Isi lama cicilan dulu, rincian per bulan muncul di sini.", "Enter the installment length first, the breakdown shows up here."],
  "ft.add": ["Tambah hutang", "Add debt"],
  "ft.edit": ["Edit hutang", "Edit debt"],
  "ft.topup": ["Pinjam lagi di {l}", "Borrow again from {l}"],
  "ft.loan": ["Edit pinjaman ke-{n}", "Edit loan #{n}"],
  "sum.total": ["Total dibayar", "Total to repay"],
  "sum.principal": ["Pokok pinjaman", "Principal"],
  "sum.interest": ["Bunga + biaya", "Interest + fees"],
  "m.noparent": ["Hutang induknya tidak ditemukan.", "The parent debt was not found."],
  "m.start": ["Isi tanggal jatuh tempo pertama.", "Enter the first due date."],
  "m.sched": ["Isi nominal cicilan untuk setiap cicilan.", "Enter the amount for every installment."],
  "m.lender": ["Isi nama aplikasi atau pemberi hutang.", "Enter the app or lender name."],
  "m.nominal": ["Isi nominal hutang.", "Enter the debt amount."],
  "m.savefail": ["Gagal menyimpan: ", "Failed to save: "],
  "m.delfail": ["Gagal menghapus: ", "Failed to delete: "],
  "m.loadfail": ["Gagal memuat data: ", "Failed to load data: "],
  "pay.title": ["Catat pembayaran", "Record payment"],
  "pay.amount": ["Jumlah dibayar (Rp)", "Amount paid (Rp)"],
  "pay.hint": ["Boleh kurang dari tagihan. Kalau lebih, sisanya otomatis menutup tagihan berikutnya.", "You can pay less than the bill. If you pay more, the excess automatically covers the next bill."],
  "pay.date": ["Tanggal bayar", "Payment date"],
  "pay.note": ["Catatan (opsional)", "Note (optional)"],
  "pay.full": ["Isi sisa hutang", "Fill remaining debt"],
  "pay.save": ["Simpan pembayaran", "Save payment"],
  "pay.info": [p => `${p.l}. Sisa hutang ${p.s}${p.n ? `, tagihan berikutnya ${p.n}` : ""}.${p.m ? " Pembayaran otomatis menutup tagihan yang paling lama telat dulu, dari pinjaman mana pun." : ""}`, p => `${p.l}. Remaining debt ${p.s}${p.n ? `, next bill ${p.n}` : ""}.${p.m ? " Payments automatically cover the most overdue bill first, from any loan." : ""}`],
  "del": ["Hapus", "Delete"],
  "del.pay.t": ["Hapus pembayaran ini?", "Delete this payment?"],
  "del.pay.x": ["Riwayat pembayaran ini akan dihapus dan sisa hutang dihitung ulang.", "This payment will be removed and the remaining debt recalculated."],
  "del.debt.t": ["Hapus hutang {l}?", "Delete the debt {l}?"],
  "del.debt.x": ["Seluruh riwayat bayarnya ikut terhapus dan data tidak bisa dikembalikan.", "Its whole payment history is deleted too and this can't be undone."],
  "del.debt.y": ["Hapus hutang", "Delete debt"],
  "del.loan.t": ["Hapus pinjaman ini?", "Delete this loan?"],
  "del.loan.x": ["Jadwal pinjaman ini dihapus. Pembayaran yang sudah dicatat tetap ada dan dihitung ulang ke tagihan yang tersisa.", "This loan's schedule is removed. Recorded payments stay and are recalculated against the remaining bills."],
  "out.t": ["Keluar dari Clearlynote?", "Sign out of Clearlynote?"],
  "out.x": ["Kamu perlu masuk lagi untuk membuka catatan hutangmu.", "You'll need to sign in again to open your debt notes."],
  "st.paid": ["Lunas", "Paid off"],
  "st.late": [p => `Telat ${p.n} hari`, p => `${p.n} day${S(p.n)} late`],
  "st.today": ["Jatuh tempo hari ini", "Due today"],
  "st.soon": [p => `H-${p.n}`, p => `Due in ${p.n} day${S(p.n)}`],
  "st.run": ["Berjalan", "In progress"],
  "row.partial": ["Sebagian", "Partial"],
  "row.unpaid": ["Belum", "Unpaid"],
  "fine.persen": ["{v}% per hari dari sisa tagihan", "{v}% per day of the remaining bill"],
  "fine.flat": ["{v} tetap sekali per tagihan yang telat", "{v} flat, once per late bill"],
  "fine.nominal": ["{v} per hari", "{v} per day"],
  "sched.then": ["{a} x {n} {u}, lalu {b} di cicilan terakhir", "{a} x {n} {u}, then {b} on the last installment"],
  "lc.once": ["{v} sekali kena", "{v} charged once"],
  "lc.day": ["{v} per hari", "{v} per day"],
  "when.today": ["hari ini", "today"],
  "when.in": [p => `${p.n} hari lagi`, p => `in ${p.n} day${S(p.n)}`],
  "r.late.plain": ["{b}. Tanpa denda, tapi lebih baik segera dilunasi atau dikabari.", "{b}. No late fee, but it's best to pay it soon or let them know."],
  "r.late.fee": ["{b}{lim}. Denda sekarang {fine}{burn}.", "{b}{lim}. The late fee is now {fine}{burn}."],
  "r.lim": [", sudah lewat batas {n} hari", ", already past the {n}-day limit"],
  "r.burn": [", nambah {v} tiap hari", ", growing by {v} every day"],
  "r.noburn": [", tidak nambah lagi", ", no longer growing"],
  "r.due": ["Jatuh tempo {w}.", "Due {w}."],
  "r.iflate": ["Kalau telat kena denda {t}.", "If it's late, a fee of {t} applies."],
  "r.later": ["Jatuh tempo {d}. Belum mendesak.", "Due {d}. Not urgent yet."],
  "r.unset": ["belum ditentukan", "not set"],
  "p.title": ["Prioritas bayar", "Payment priority"],
  "p.count": [p => `${p.n} hutang aktif`, p => `${p.n} active debt${S(p.n)}`],
  "p.desc": ["Urut dari yang paling perlu dibayar duluan: telat dan denda paling cepat nambah, lalu jatuh tempo terdekat.", "Ordered by what to pay first: overdue bills and fees that grow fastest, then the nearest due dates."],
  "p.budget": ["Dana yang kamu punya (Rp, opsional)", "Funds you have (Rp, optional)"],
  "p.empty": ["Belum ada hutang aktif untuk diprioritaskan.", "No active debts to prioritise yet."],
  "p.need": ["Butuh untuk yang mendesak", "Needed for urgent bills"],
  "p.funds": ["Dana kamu", "Your funds"],
  "p.left": ["Sisa dana", "Funds left"],
  "p.short": ["Kurang", "Shortfall"],
  "p.urgent": ["Yang mendesak sekarang <b>{v}</b> (telat dan jatuh tempo 7 hari ke depan). Isi dana untuk lihat pembagiannya.", "Urgent right now: <b>{v}</b> (overdue and due within 7 days). Enter your funds to see how to split them."],
  "p.none": ["Tidak ada tagihan yang mendesak. Tinggal jaga jatuh tempo berikutnya.", "No urgent bills. Just keep an eye on the next due date."],
  "p.must": ["harus dibayar", "must be paid"],
  "p.nextbill": ["tagihan berikutnya", "next bill"],
  "p.covered": ["Tercover", "Covered"],
  "p.partial": ["Bayar {v} dulu", "Pay {v} first"],
  "p.nocover": ["Belum kebagian", "Not covered yet"],
  "p.less": ["Tampilkan lebih sedikit", "Show less"],
  "p.all": ["Lihat semua {n} hutang", "View all {n} debts"],
  "p.note": ["Urutan ini saran dari data yang kamu catat. Pembayaran otomatis menutup tagihan yang paling lama telat dulu.", "This order is a suggestion based on the data you recorded. Payments automatically cover the most overdue bill first."],
  "s.remaining": ["Sisa hutang", "Remaining debt"],
  "s.fromactive": [p => `dari ${p.n} hutang aktif`, p => `from ${p.n} active debt${S(p.n)}`],
  "s.fine": ["Denda berjalan", "Running late fees"],
  "s.fine.on": ["karena telat bayar, belum termasuk sisa hutang", "from late payments, not included in the remaining debt"],
  "s.fine.off": ["tidak ada denda", "no late fees"],
  "s.paid": ["Total terbayar", "Total paid"],
  "s.paid.of": ["dari {v} total hutang", "of {v} total debt"],
  "s.done": ["Hutang lunas", "Debts paid off"],
  "s.done.of": ["dari {n} catatan", "of {n} records"],
  "c.title": ["Pembayaran 6 bulan terakhir", "Payments in the last 6 months"],
  "c.none": ["Belum ada pembayaran dalam 2 bulan terakhir.", "No payments in the last 2 months."],
  "c.note": [p => `Bulan ini kamu bayar ${p.cur}${p.dir ? `, ${p.dir === "up" ? "naik" : "turun"} ${p.pct}% dari bulan lalu` : ""}.`, p => `This month you paid ${p.cur}${p.dir ? `, ${p.dir} ${p.pct}% from last month` : ""}.`],
  "pf.active": ["Aktif", "Active"],
  "pf.paid": ["Lunas", "Paid off"],
  "pf.late": ["Telat", "Late"],
  "g.title": ["Progres pelunasan", "Repayment progress"],
  "g.of": ["{p} terbayar dari {t}.", "{p} paid of {t}."],
  "g.none": ["Belum ada hutang tercatat.", "No debts recorded yet."],
  "g.left": [p => `Tinggal ${p.l} lagi${p.f ? `, sudah termasuk denda ${p.f}` : ""}.`, p => `${p.l} left to go${p.f ? `, including ${p.f} in late fees` : ""}.`],
  "g.all": ["Semua hutang sudah lunas.", "All debts are paid off."],
  "u.title": ["Jatuh tempo terdekat", "Nearest due dates"],
  "u.today": ["Hari ini", "Today"],
  "u.nodue": ["Tanpa tempo", "No due date"],
  "u.none": ["Belum ada tagihan yang akan datang.", "No upcoming bills."],
  "w.title": ["Semua hutang, satu buku", "All debts, one book"],
  "w.text": ["Catat cicilan, pantau jatuh tempo, dan lunasi satu per satu sampai bersih. Clearlynote bantu kamu tetap tahu mana yang harus dibayar lebih dulu.", "Record installments, track due dates, and pay them off one by one until you're clear. Clearlynote helps you know which one to pay first."],
  "al.late": [p => `${p.l} telat ${p.n} hari${p.crit ? `, sudah melewati batas ${p.lim} hari` : ""}${p.fine ? `. Denda ${p.fine}` : ""}`, p => `${p.l} is ${p.n} day${S(p.n)} late${p.crit ? `, past the ${p.lim}-day limit` : ""}${p.fine ? `. Late fee ${p.fine}` : ""}`],
  "al.soon": ["{l} jatuh tempo {w}: {v}", "{l} is due {w}: {v}"],
  "al.sync": ["Menyinkronkan ke server...", "Syncing to server..."],
  "lh.lender": ["Pemberi hutang", "Lender"],
  "lh.due": ["Jatuh tempo", "Due date"],
  "lh.paidon": ["Lunas pada", "Paid off on"],
  "lh.bill": ["Tagihan", "Bill"],
  "lh.left": ["Sisa", "Remaining"],
  "lh.paid": ["Terbayar", "Paid"],
  "lh.status": ["Status", "Status"],
  "lr.loans": [" · {n} pinjaman", " · {n} loans"],
  "lr.of": ["{a} dari {b}", "{a} of {b}"],
  "lr.fine": ["+ denda {v}", "+ late fee {v}"],
  "e.active": ["Belum ada hutang aktif", "No active debts yet"],
  "e.paid": ["Belum ada yang lunas", "Nothing paid off yet"],
  "e.active.x": ["Tekan Tambah hutang untuk mulai mencatat.", "Press Add debt to start recording."],
  "e.paid.x": ["Hutang yang sudah lunas akan muncul di sini.", "Debts you've paid off will show up here."],
  "d.notfound": ["Hutang tidak ditemukan", "Debt not found"],
  "d.taken": ["Tanggal pinjam", "Borrowed on"],
  "d.principal": ["Pokok pinjaman", "Principal"],
  "d.interest": ["Bunga + biaya", "Interest + fees"],
  "d.totalpay": ["Total yang dibayar", "Total to repay"],
  "d.len": ["Lama cicilan", "Installment length"],
  "d.amount": ["Besar cicilan", "Installment amount"],
  "d.first": ["Jatuh tempo pertama", "First due date"],
  "d.last": ["Jatuh tempo terakhir", "Last due date"],
  "d.fine": ["Denda keterlambatan", "Late fee"],
  "d.alert": ["Peringatan merah", "Red alert"],
  "d.alert.v": ["setelah telat {n} hari", "after {n} days late"],
  "d.note": ["Catatan", "Note"],
  "d.loan": ["Pinjaman {n}", "Loan {n}"],
  "d.loan.edit": ["Edit pinjaman {n}", "Edit loan {n}"],
  "d.loan.del": ["Hapus pinjaman {n}", "Delete loan {n}"],
  "d.loan.edit.t": ["Edit pinjaman", "Edit loan"],
  "d.loan.del.t": ["Hapus pinjaman", "Delete loan"],
  "d.nominal": ["Nominal hutang", "Debt amount"],
  "d.promise": ["Janji bayar", "Promised pay date"],
  "d.unset": ["Tidak ditentukan", "Not set"],
  "d.terms": ["Ketentuan", "Terms"],
  "d.terms.v": ["Tanpa bunga dan denda", "No interest or late fees"],
  "d.pay": ["Catat pembayaran", "Record payment"],
  "d.topup": ["Pinjam lagi", "Borrow again"],
  "d.edit": ["Edit", "Edit"],
  "d.edit1": ["Edit pinjaman 1", "Edit loan 1"],
  "d.delete": ["Hapus hutang", "Delete debt"],
  "d.k.total": ["Total tagihan", "Total bill"],
  "d.k.paid": ["Terbayar", "Paid"],
  "d.k.left": ["Sisa", "Remaining"],
  "d.k.fine": ["Denda", "Late fee"],
  "d.sched": ["Jadwal cicilan", "Installment schedule"],
  "d.details": ["Rincian", "Details"],
  "d.multi": ["P1, P2, dst. artinya pinjaman ke-1, ke-2. Pembayaran otomatis menutup tagihan yang paling lama telat dulu.", "P1, P2, etc. mean loan 1, loan 2. Payments automatically cover the most overdue bill first."],
  "d.th.n": ["Cicilan", "Installment"],
  "d.th.due": ["Jatuh tempo", "Due date"],
  "d.th.bill": ["Tagihan", "Bill"],
  "d.th.paid": ["Dibayar", "Paid"],
  "d.th.left": ["Sisa", "Remaining"],
  "d.th.fine": ["Denda", "Late fee"],
  "d.th.st": ["Status", "Status"],
  "d.loans": ["Pinjaman", "Loans"],
  "d.info": ["Detail hutang", "Debt details"],
  "d.history": ["Riwayat pembayaran", "Payment history"],
  "d.nopay": ["Belum ada pembayaran.", "No payments yet."],
  "d.delpay": ["Hapus pembayaran", "Delete payment"],
  "sub.login": ["Masuk untuk membuka catatan hutangmu.", "Sign in to open your debt notes."],
  "sub.reg": ["Buat akun dulu sebelum mulai mencatat.", "Create an account before you start recording."],
  "tab.login": ["Masuk", "Sign in"],
  "tab.reg": ["Daftar", "Register"],
  "email": ["Email", "Email"],
  "ph.email": ["nama@email.com", "name@email.com"],
  "pass": ["Password", "Password"],
  "ph.pass": ["Password", "Password"],
  "ph.pass.new": ["Min. 6 karakter", "Min. 6 characters"],
  "pass2": ["Ulangi password", "Repeat password"],
  "ph.pass2": ["Ulangi", "Repeat"],
  "name": ["Nama", "Name"],
  "ph.name": ["Nama lengkap", "Full name"],
  "pw.toggle": ["Tampilkan atau sembunyikan password", "Show or hide password"],
  "forgot": ["Lupa password?", "Forgot password?"],
  "signin": ["Masuk", "Sign in"],
  "register": ["Daftar", "Create account"],
  "or": ["atau", "or"],
  "google.login": ["Masuk dengan Google", "Sign in with Google"],
  "google.reg": ["Daftar dengan Google", "Register with Google"],
  "reset.title": ["Reset password", "Reset password"],
  "reset.text": ["Masukkan email akunmu. Kami kirim link untuk membuat password baru.", "Enter your account email. We'll send you a link to set a new password."],
  "reset.send": ["Kirim link reset", "Send reset link"],
  "reset.back": ["Kembali ke halaman masuk", "Back to sign in"],
  "reset.done.t": ["Cek emailmu", "Check your email"],
  "reset.done.x": ["Kalau ada akun untuk <b>{m}</b>, link reset password sudah dikirim. Klik link itu untuk membuat password baru, lalu masuk lagi. Cek folder spam kalau belum masuk.", "If an account exists for <b>{m}</b>, a password reset link has been sent. Click it to set a new password, then sign in again. Check your spam folder if it doesn't show up."],
  "reset.resent": ["Link reset sudah dikirim ulang.", "The reset link was sent again."],
  "reset.other": ["Pakai email lain", "Use a different email"],
  "resend": ["Kirim ulang email", "Resend email"],
  "resend.n": ["Kirim ulang ({s})", "Resend ({s})"],
  "v.title": ["Cek emailmu", "Check your email"],
  "v.text": ["Kami kirim link verifikasi ke <b>{m}</b>. Klik link itu, lalu kembali ke sini. Cek folder spam kalau belum masuk.", "We sent a verification link to <b>{m}</b>. Click it, then come back here. Check your spam folder if it hasn't arrived."],
  "v.done": ["Saya sudah verifikasi", "I've verified"],
  "v.other": ["Pakai akun lain", "Use another account"],
  "v.not": ["Email belum diverifikasi. Klik link di emailmu dulu, lalu coba lagi.", "Your email isn't verified yet. Click the link in your email first, then try again."],
  "v.resent": ["Email verifikasi sudah dikirim ulang.", "Verification email sent again."],
  "e.email.req": ["Isi email kamu.", "Enter your email."],
  "e.email.bad": ["Format email tidak valid.", "Enter a valid email address."],
  "e.pass.req": ["Isi password kamu.", "Enter your password."],
  "e.pass.short": ["Minimal 6 karakter.", "At least 6 characters."],
  "e.pass2.req": ["Ulangi password kamu.", "Repeat your password."],
  "e.pass2.diff": ["Password tidak sama.", "Passwords don't match."],
  "e.name.req": ["Isi nama kamu.", "Enter your name."],
  "a.cfg": ["Isi firebaseConfig di app.js terlebih dahulu.", "Fill in firebaseConfig in app.js first."],
  "a.cred": ["Email atau password salah.", "Incorrect email or password."],
  "a.nouser": ["Email ini belum terdaftar.", "This email isn't registered yet."],
  "a.exists": ["Email ini sudah terdaftar.", "This email is already registered."],
  "a.weak": ["Password terlalu lemah. Pakai minimal 6 karakter.", "That password is too weak. Use at least 6 characters."],
  "a.bademail": ["Format email tidak valid.", "That email address isn't valid."],
  "a.popclosed": ["Jendela Google ditutup sebelum selesai.", "The Google window was closed before finishing."],
  "a.popblocked": ["Popup diblokir browser. Izinkan popup lalu coba lagi.", "The popup was blocked by your browser. Allow popups and try again."],
  "a.many": ["Terlalu banyak percobaan. Coba lagi beberapa saat lagi.", "Too many attempts. Please try again in a little while."],
  "a.network": ["Koneksi bermasalah. Cek internet lalu coba lagi.", "Connection problem. Check your internet and try again."],
  "a.disabled": ["Akun ini dinonaktifkan.", "This account has been disabled."],
  "a.notallowed": ["Metode ini belum diaktifkan di Firebase Authentication.", "This method isn't enabled in Firebase Authentication yet."],
  "a.fail": ["Gagal: {c}", "Failed: {c}"],
  "a.notreg": ["Akun ini belum terdaftar. Daftar dulu sebelum masuk.", "This account isn't registered yet. Register first before signing in."],
  "a.noverify": ["Tidak bisa memverifikasi akun. Cek koneksi lalu coba lagi.", "Couldn't verify your account. Check your connection and try again."],
  "a.checking": ["Memeriksa akun...", "Checking your account..."],
  "act.forgot": ["Lupa password?", "Forgot password?"],
  "act.reg": ["Buat akun", "Create an account"],
  "act.signin": ["Masuk di sini", "Sign in instead"],
  "idle.out": ["Kamu keluar otomatis karena tidak ada aktivitas selama 10 menit.", "You were signed out automatically after 10 minutes of inactivity."]
};

const tr = (k, p = {}) => {
  const e = D[k];
  if (!e) return k;
  const v = e[lang === "id" ? 0 : 1];
  return typeof v === "function" ? v(p) : v.replace(/\{(\w+)\}/g, (_, x) => p[x] ?? "");
};

const SRC_EN = {
  "Pinjol / aplikasi": "Online loan / app",
  "Bank / leasing": "Bank / leasing",
  "Warung / toko": "Shop / store",
  "Teman": "Friend",
  "Saudara": "Family",
  "Orang terdekat": "Close person",
  "Lainnya": "Other"
};
const srcName = v => (lang === "id" ? v : SRC_EN[v] || v);
const UNIT_EN = { hari: "day", minggu: "week", bulan: "month" };
const UNIT_TITLE = { id: { hari: "Hari", minggu: "Minggu", bulan: "Bulan" }, en: { hari: "Day", minggu: "Week", bulan: "Month" } };
const unitName = (u, n = 2) => (lang === "id" ? u : UNIT_EN[u] + S(n));
const MONTHS = {
  id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
};
const locale = () => (lang === "id" ? "id-ID" : "en-GB");

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const page = document.body.dataset.page || "home";
const base = document.body.dataset.base || "";
const homeUrl = base || "./";
const DAY = 864e5;
const cacheKey = id => `clearly:debts:${id}`;
const numOf = el => Number(String(el.value).replace(/\./g, "")) || 0;
const num = s => numOf($(s));
const fmt = n => n ? Math.round(n).toLocaleString("id-ID") : "";
const splitEven = (t, n) => { if (!n) return []; const b = Math.floor(t / n); return Array.from({ length: n }, (_, i) => i === n - 1 ? t - b * (n - 1) : b); };
const scheduleOf = d => d.schedule || Array.from({ length: d.tenor }, (_, i) => i === d.tenor - 1 ? Math.max(d.total - d.installment * (d.tenor - 1), 0) : d.installment);
const schedText = d => {
  const s = scheduleOf(d), f = s[0], head = s.slice(0, -1), u = unitOf(d);
  if (s.every(v => v === f)) return `${rp(f)} x ${s.length} ${unitName(u, s.length)}`;
  if (head.length > 1 && head.every(v => v === f)) return tr("sched.then", { a: rp(f), n: head.length, u: unitName(u, head.length), b: rp(s[s.length - 1]) });
  return s.map(rp).join(", ");
};
const rp = n => "Rp" + Math.round(n || 0).toLocaleString("id-ID");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const parseD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const isoD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtD = d => d ? d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }) : "-";
const addMonths = (d, n) => {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
};
const unitOf = l => (l && l.unit) || "bulan";
const UNIT_CAP = { hari: 365, minggu: 104, bulan: 60 };
const addPeriod = (d, n, u) => u === "hari" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) : u === "minggu" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7) : addMonths(d, n);
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

let uid = null, me = null, debts = [], tab = "aktif", editingId = null, editingLoan = null, payingId = null, openId = null, unsub = null, draftId = null, saved = false, loaded = false, routed = false, pending = false, registering = false;
let authMode = "login", view = "main", msg = null, verifyMail = "", resetMail = "", verifyTimer = null, firstAuth = true, idling = false, lastAct = 0, lastWrite = 0;
const cool = { v: { t: null, on: false }, r: { t: null, on: false } };

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

const EYE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;

const pwField = (id, ac, ph) => `<div class="pwrap"><input id="${id}" type="password" autocomplete="${ac}" data-i18n="${ph}" data-m="ph"><button type="button" class="eye" data-eye="${id}" aria-pressed="false" data-i18n="pw.toggle" data-m="aria">${EYE_SVG}</button></div>`;
const fld = (label, id, errId, inner) => `<label for="${id}" data-i18n="${label}"></label>${inner}<p class="ferr" id="${errId}" data-for="${id}"></p>`;

const LOGIN_HTML = `<div class="login-card">
  <div class="lsw" role="group" data-i18n="lang.label" data-m="aria"><button type="button" class="lbtn" data-lang="en">EN</button><button type="button" class="lbtn" data-lang="id">ID</button></div>
  ${GIRL_SVG}
  <div class="lhead"><img class="logo" src="/logo_clearlynote.svg" alt="" width="34" height="34"><h1>Clearly<b>note</b></h1></div>
  <p id="loginSub"></p>
  <div id="loginErr" class="amsg hidden" role="alert"><i></i><div class="amb"><span id="amText"></span><span id="amActs" class="amacts"></span></div></div>
  <div id="authMain">
    <div class="tabs">
      <button type="button" class="tabb active" data-auth="login" data-i18n="tab.login"></button>
      <button type="button" class="tabb" data-auth="register" data-i18n="tab.reg"></button>
    </div>
    <form id="fLogin" novalidate>
      ${fld("email", "lEmail", "eLEmail", `<input id="lEmail" type="email" autocomplete="email" data-i18n="ph.email" data-m="ph">`)}
      ${fld("pass", "lPass", "eLPass", pwField("lPass", "current-password", "ph.pass"))}
      <div class="frow"><button type="button" class="link" id="btnForgot" data-i18n="forgot"></button></div>
      <button type="submit" class="primary wide" data-i18n="signin"></button>
    </form>
    <form id="fRegister" class="hidden" novalidate>
      ${fld("name", "rName", "eRName", `<input id="rName" type="text" autocomplete="name" maxlength="60" data-i18n="ph.name" data-m="ph">`)}
      ${fld("email", "rEmail", "eREmail", `<input id="rEmail" type="email" autocomplete="email" data-i18n="ph.email" data-m="ph">`)}
      <div class="two">
        <div>${fld("pass", "rPass", "eRPass", pwField("rPass", "new-password", "ph.pass.new"))}</div>
        <div>${fld("pass2", "rPass2", "eRPass2", pwField("rPass2", "new-password", "ph.pass2"))}</div>
      </div>
      <button type="submit" class="primary wide" data-i18n="register"></button>
    </form>
    <div class="or"><span data-i18n="or"></span></div>
    <button type="button" class="gbtn" id="btnGoogle">${GOOGLE_SVG}<span id="gLabel"></span></button>
  </div>
  <div id="resetBox" class="hidden">
    <div id="resetForm">
      <h2 class="vt" data-i18n="reset.title"></h2>
      <p class="vp" data-i18n="reset.text"></p>
      <form id="fReset" novalidate>
        ${fld("email", "xEmail", "eXEmail", `<input id="xEmail" type="email" autocomplete="email" data-i18n="ph.email" data-m="ph">`)}
        <button type="submit" class="primary wide" data-i18n="reset.send"></button>
      </form>
    </div>
    <div id="resetDone" class="hidden">
      <h2 class="vt" data-i18n="reset.done.t"></h2>
      <p class="vp" id="rText"></p>
      <button type="button" class="ghost wide" id="btnRResend" data-i18n="resend"></button>
      <button type="button" class="link vlink" id="btnROther" data-i18n="reset.other"></button>
    </div>
    <button type="button" class="link vlink" id="btnRBack" data-i18n="reset.back"></button>
  </div>
  <div id="verifyBox" class="hidden">
    <h2 class="vt" data-i18n="v.title"></h2>
    <p class="vp" id="vText"></p>
    <button type="button" class="primary wide" id="btnVDone" data-i18n="v.done"></button>
    <button type="button" class="ghost wide" id="btnVResend" data-i18n="resend"></button>
    <button type="button" class="link vlink" id="btnVOut" data-i18n="v.other"></button>
  </div>
</div>`;

document.body.insertAdjacentHTML("beforeend", `<dialog id="dConfirm"><div class="dlg"><h2 id="cTitle"></h2><p id="cText" class="mini"></p><div class="actions"><button type="button" class="ghost" id="cNo" data-i18n="cancel"></button><button type="button" class="primary" id="cYes"></button></div></div></dialog>`);
$("#login").innerHTML = LOGIN_HTML;
const foot = document.createElement("footer");
foot.className = "foot";
foot.dataset.i18n = "foot";
$("#app").appendChild(foot);
const langSw = document.createElement("div");
langSw.className = "lsw";
langSw.setAttribute("role", "group");
langSw.dataset.i18n = "lang.label";
langSw.dataset.m = "aria";
langSw.innerHTML = `<button type="button" class="lbtn" data-lang="en">EN</button><button type="button" class="lbtn" data-lang="id">ID</button>`;
$(".topbar .me").prepend(langSw);

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

const fineText = l => l.fineMode === "persen" ? tr("fine.persen", { v: l.fineValue }) : l.fineMode === "flat" ? tr("fine.flat", { v: rp(l.fineValue) }) : tr("fine.nominal", { v: rp(l.fineValue) });
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
  if (c.done) return [tr("st.paid"), "ok"];
  if (c.maxLate > 0) return [tr("st.late", { n: c.maxLate }), c.crit ? "bad" : "warn"];
  if (c.diff !== null && c.diff <= 3) return [c.diff <= 0 ? tr("st.today") : tr("st.soon", { n: c.diff }), "warn"];
  return [tr("st.run"), ""];
}

function monthly(list) {
  const now = new Date();
  const ms = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, l: MONTHS[lang][d.getMonth()], v: 0 };
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

const compact = n => {
  if (lang === "id") return n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + "jt" : n >= 1e3 ? Math.round(n / 1e3) + "rb" : String(Math.round(n || 0));
  return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(Math.round(n || 0));
};

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
  prioEl().innerHTML = "";
  $("#list").innerHTML = `<div class="skrow"><div class="skl"></div></div><div class="skrow"><div class="skl"></div></div><div class="skrow"><div class="skl"></div></div>`;
}

const PRIO_KEY = id => `clearly:budget:${id}`;
let budget = 0;

const lateCost = (l, sisa) => l.fineMode === "persen" ? { day: sisa * (l.fineValue || 0) / 100, once: 0 } : l.fineMode === "flat" ? { day: 0, once: l.fineValue || 0 } : { day: l.fineValue || 0, once: 0 };
const lateCostText = k => k.once > 0 ? tr("lc.once", { v: rp(k.once) }) : k.day > 0 ? tr("lc.day", { v: rp(k.day) }) : "";

function prioOf(list) {
  const today = startOfToday();
  const items = list.filter(x => !x.c.done).map(({ d, c }) => {
    const bunga = d.type === "bunga";
    const lateRows = c.rows.filter(r => r.sisa > 0 && r.late > 0);
    const soonRows = c.rows.filter(r => r.sisa > 0 && !r.late && r.due && Math.round((r.due - today) / DAY) <= 7);
    const burn = bunga ? lateRows.reduce((a, r) => a + lateCost(r.loan, r.sisa).day, 0) : 0;
    const risk = bunga ? soonRows.reduce((a, r) => { const k = lateCost(r.loan, r.sisa); return { day: a.day + k.day, once: a.once + k.once }; }, { day: 0, once: 0 }) : { day: 0, once: 0 };
    const must = [...lateRows, ...soonRows].reduce((a, r) => a + r.sisa, 0);
    const tier = bunga && c.crit ? 0 : lateRows.length ? (bunga ? 1 : 2) : soonRows.length ? (bunga ? 3 : 4) : 5;
    return { d, c, bunga, burn, risk, must, tier, rest: must === 0 && c.next ? c.next.sisa : 0, alloc: 0, extra: 0 };
  });
  items.sort((a, b) => a.tier - b.tier || b.burn - a.burn || b.c.maxLate - a.c.maxLate || (a.c.next?.due || 9e15) - (b.c.next?.due || 9e15) || a.c.sisa - b.c.sisa);
  let left = budget;
  items.forEach(it => { it.alloc = Math.min(it.must, left); left -= it.alloc; });
  items.forEach(it => { it.extra = Math.min(it.rest, left); left -= it.extra; });
  return { items, left };
}

function reasonOf(it) {
  const { c } = it;
  if (it.tier <= 2) {
    const base = tr("st.late", { n: c.maxLate });
    if (!it.bunga) return tr("r.late.plain", { b: base });
    return tr("r.late.fee", {
      b: base,
      lim: it.tier === 0 ? tr("r.lim", { n: c.limit }) : "",
      fine: rp(c.fine),
      burn: it.burn > 0 ? tr("r.burn", { v: rp(it.burn) }) : tr("r.noburn")
    });
  }
  if (it.tier <= 4) {
    const when = c.diff <= 0 ? tr("when.today") : tr("when.in", { n: c.diff });
    const t = lateCostText(it.risk);
    return tr("r.due", { w: when }) + (it.bunga && t ? " " + tr("r.iflate", { t }) : "");
  }
  return tr("r.later", { d: c.next && c.next.due ? fmtD(c.next.due) : tr("r.unset") });
}

let prioOpen = false;
const PRIO_TOP = 3;
const LIST_TOP = 5;
const listOpen = { aktif: false, lunas: false };

function prioBody(p) {
  const { items, left } = p;
  if (!items.length) return `<p class="mute pad">${tr("p.empty")}</p>`;
  const urgent = items.reduce((a, x) => a + x.must, 0);
  const sum = budget > 0
    ? `<div class="psum ${budget >= urgent ? "" : "bad"}"><span>${tr("p.need")}<b>${rp(urgent)}</b></span><span>${tr("p.funds")}<b>${rp(budget)}</b></span><span>${budget >= urgent ? tr("p.left") : tr("p.short")}<b>${rp(budget >= urgent ? left : urgent - budget)}</b></span></div>`
    : urgent > 0
      ? `<p class="pinfo">${tr("p.urgent", { v: rp(urgent) })}</p>`
      : `<p class="pinfo">${tr("p.none")}</p>`;
  const shown = prioOpen ? items : items.slice(0, PRIO_TOP);
  const rows = shown.map((it, i) => {
    const tone = it.tier <= 1 ? "bad" : it.tier <= 4 ? "warn" : "ok";
    const act = it.must > 0 ? `<b>${rp(it.must)}</b><small>${tr("p.must")}</small>` : it.rest > 0 ? `<b>${rp(it.rest)}</b><small>${tr("p.nextbill")}</small>` : "";
    let cover = "";
    if (budget > 0) {
      const w = it.must > 0 ? it.must : it.rest;
      const a = it.must > 0 ? it.alloc : it.extra;
      if (w > 0) cover = a >= w ? `<em class="chip ok">${tr("p.covered")}</em>` : a > 0 ? `<em class="chip warn">${tr("p.partial", { v: rp(a) })}</em>` : `<em class="chip bad">${tr("p.nocover")}</em>`;
    }
    return `<button type="button" class="pr ${tone}" data-open="${esc(it.d.id)}"><span class="pn">${i + 1}</span><span class="pw"><b>${esc(it.d.lender)}</b><small>${esc(reasonOf(it))}</small></span><span class="pa">${act}${cover}</span></button>`;
  }).join("");
  const more = items.length > PRIO_TOP
    ? `<button type="button" class="pmore" data-prioall>${prioOpen ? tr("p.less") : tr("p.all", { n: items.length })}</button>`
    : "";
  const note = prioOpen ? `<p class="pnote">${tr("p.note")}</p>` : "";
  return `${sum}<div class="plist">${rows}</div>${more}${note}`;
}

function prioHTML(list) {
  const p = prioOf(list);
  return `<div class="b b-prio">
      <div class="phead">
        <div class="ptitle">
          <div class="b-head"><h3>${tr("p.title")}</h3><span class="chip">${tr("p.count", { n: p.items.length })}</span></div>
          <p class="mute">${tr("p.desc")}</p>
        </div>
        <div class="bud"><label for="budget">${tr("p.budget")}</label><input id="budget" class="money" type="text" inputmode="numeric" placeholder="0" value="${fmt(budget)}"></div>
      </div>
      <div id="prioBody">${prioBody(p)}</div>
    </div>`;
}

function prioEl() {
  let el = $("#prio");
  if (!el) {
    el = document.createElement("section");
    el.id = "prio";
    el.className = "prio";
    $("#stats").after(el);
  }
  return el;
}

function renderPrioBody() {
  const box = $("#prioBody");
  if (box) box.innerHTML = prioBody(prioOf(debts.map(d => ({ d, c: calc(d) }))));
}

function setBudget(v) {
  budget = v;
  if (uid) LS.set(PRIO_KEY(uid), v);
  renderPrioBody();
}

function renderAll() {
  $("#today").textContent = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
  const chartNote = curM === 0 && prevM === 0 ? tr("c.none") : tr("c.note", { cur: rp(curM), dir: delta === null ? "" : delta >= 0 ? "up" : "down", pct: delta === null ? 0 : Math.abs(delta).toFixed(0) });
  const left = sisa + fine;

  $("#stats").innerHTML = `
    <div class="b b-s hl"><div class="ico">${ICON_DEBT}</div><div class="tx"><span>${tr("s.remaining")}</span><strong>${rp(sisa)}</strong><span class="sm">${tr("s.fromactive", { n: active.length })}</span></div></div>
    <div class="b b-s${fine > 0 ? " neg" : ""}"><div class="ico red">${ICON_FINE}</div><div class="tx"><span>${tr("s.fine")}</span><strong>${rp(fine)}</strong><span class="sm">${fine > 0 ? tr("s.fine.on") : tr("s.fine.off")}</span></div></div>
    <div class="b b-s"><div class="ico gold">${ICON_COIN}</div><div class="tx"><span>${tr("s.paid")}</span><strong>${rp(paid)}</strong><span class="sm">${tr("s.paid.of", { v: rp(total) })}</span></div></div>
    <div class="b b-s"><div class="ico green">${ICON_CHECK}</div><div class="tx"><span>${tr("s.done")}</span><strong>${done.length}</strong><span class="sm">${tr("s.done.of", { n: list.length })}</span></div></div>
    <div class="b b-chart">
      <div class="b-head"><h3>${tr("c.title")}</h3></div>
      <p class="mute">${chartNote}</p>
      <div class="bars">${ms.map((m, i) => `<div class="bc${i === 5 ? " cur" : ""}"><span class="bv">${compact(m.v)}</span><div class="bt"><i style="height:${m.v / maxV * 100}%"></i></div><span class="bl">${m.l}</span></div>`).join("")}</div>
    </div>
    <div class="b b-profile">
      ${me && me.photo ? `<img class="avatar" src="${esc(me.photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar av">${initial}</span>`}
      <h3>${esc(me ? me.name || (me.email || "").split("@")[0] : "")}</h3>
      <p class="mute">${esc(me ? me.email : "")}</p>
      <div class="pf"><div><small>${tr("pf.active")}</small><b>${active.length}</b></div><div><small>${tr("pf.paid")}</small><b class="ok">${done.length}</b></div><div><small>${tr("pf.late")}</small><b class="${lateList.length ? "bad" : ""}">${lateList.length}</b></div></div>
    </div>
    <div class="b b-gauge">
      <div class="b-head"><h3>${tr("g.title")}</h3></div>
      ${gaugeSVG(pct)}
      <p class="mute">${total ? tr("g.of", { p: rp(paid), t: rp(total) }) : tr("g.none")}</p>
      ${total ? `<p class="mute">${left > 0 ? tr("g.left", { l: rp(left), f: fine > 0 ? rp(fine) : "" }) : tr("g.all")}</p>` : ""}
    </div>
    <div class="b b-list">
      <div class="b-head"><h3>${tr("u.title")}</h3></div>
      ${up.length ? up.map(({ d, c }) => `<button class="tr" data-open="${esc(d.id)}"><i class="${tone(c)}"></i><span><b>${esc(d.lender)}</b><small>${c.maxLate > 0 ? tr("st.late", { n: c.maxLate }) : c.next.due ? (c.diff <= 0 ? tr("u.today") : fmtD(c.next.due)) : tr("u.nodue")}</small></span><em class="chip ${tone(c)}">${rp(c.next.sisa)}</em></button>`).join("") : `<p class="mute pad">${tr("u.none")}</p>`}
    </div>
    <div class="b b-wallet dk">
      <div class="wtx"><h3>${tr("w.title")}</h3><p class="mute">${tr("w.text")}</p></div>
      ${WALLET_SVG}
    </div>`;
  if (document.activeElement?.id === "budget") renderPrioBody();
  else prioEl().innerHTML = prioHTML(list);
  $("#cAktif").textContent = active.length;
  $("#cLunas").textContent = done.length;
  $("#listTitle").textContent = tab === "aktif" ? tr("list.active") : tr("list.paid");

  const alerts = [];
  active.forEach(({ d, c }) => {
    if (c.maxLate > 0) {
      const crit = c.crit;
      alerts.push({ k: crit ? "bad" : "warn", o: crit ? 0 : 1, id: d.id, t: tr("al.late", { l: d.lender, n: c.maxLate, crit, lim: c.limit, fine: c.fine > 0 ? rp(c.fine) : "" }) });
    } else if (c.diff !== null && c.diff <= 3) {
      alerts.push({ k: "soon", o: 2, id: d.id, t: tr("al.soon", { l: d.lender, w: c.diff <= 0 ? tr("when.today") : tr("when.in", { n: c.diff }), v: rp(c.next.sisa) }) });
    }
  });
  alerts.sort((a, b) => a.o - b.o);
  $("#alerts").innerHTML = (pending ? `<div class="alert"><i></i>${tr("al.sync")}</div>` : "") + alerts.map(a => `<button class="alert ${a.k}" data-open="${esc(a.id)}"><i></i>${esc(a.t)}</button>`).join("");

  let shown = tab === "aktif" ? active : done;
  shown.sort((a, b) => tab === "aktif"
    ? (b.c.maxLate - a.c.maxLate) || ((a.c.next?.due || 9e15) - (b.c.next?.due || 9e15))
    : (b.c.lastPay || "").localeCompare(a.c.lastPay || ""));
  const dueLabel = tab === "aktif" ? tr("lh.due") : tr("lh.paidon");
  const head = `<div class="lh"><span>${tr("lh.lender")}</span><span>${dueLabel}</span><span>${tr("lh.bill")}</span><span>${tr("lh.left")}</span><span>${tr("lh.paid")}</span><span>${tr("lh.status")}</span></div>`;
  const open = listOpen[tab];
  const rowsShown = open ? shown : shown.slice(0, LIST_TOP);
  $("#list").innerHTML = shown.length ? head + rowsShown.map(({ d, c }) => {
    const [st, cls] = statusOf(d, c);
    return `<button class="lr" data-open="${esc(d.id)}">
      <span class="who"><b>${esc(d.lender)}</b><small>${esc(srcName(d.source))}${c.multi ? tr("lr.loans", { n: c.loans.length }) : ""}</small></span>
      <span data-l="${dueLabel}">${c.done ? (c.lastPay ? fmtD(parseD(c.lastPay)) : "-") : c.next && c.next.due ? fmtD(c.next.due) : tr("u.nodue")}</span>
      <span data-l="${tr("lh.bill")}">${c.done ? rp(c.total) : c.next ? rp(c.next.sisa) : "-"}</span>
      <span class="amt" data-l="${tr("lh.left")}"><b>${rp(c.sisa)}</b>${c.fine > 0 ? `<em>${tr("lr.fine", { v: rp(c.fine) })}</em>` : ""}</span>
      <span data-l="${tr("lh.paid")}"><div class="bar"><i class="${c.done ? "full" : ""}" style="width:${c.pct}%"></i></div><small>${tr("lr.of", { a: rp(c.paid), b: rp(c.total) })}</small></span>
      <span class="st ${cls}">${st}</span>
    </button>`;
  }).join("") + (shown.length > LIST_TOP ? `<button type="button" class="lmore" data-listall>${open ? tr("p.less") : tr("p.all", { n: shown.length })}</button>` : "") : `<div class="empty"><b>${tab === "aktif" ? tr("e.active") : tr("e.paid")}</b>${tab === "aktif" ? tr("e.active.x") : tr("e.paid.x")}</div>`;

  $("#dlLender").innerHTML = [...new Set(debts.map(d => d.lender))].map(v => `<option value="${esc(v)}">`).join("");

  if (page === "detail") renderDetail(openId);
}

function renderDetail(id) {
  const box = $("#detail");
  const d = debts.find(x => x.id === id);
  if (!d) { box.innerHTML = loaded ? `<div class="empty"><b>${tr("d.notfound")}</b></div>` : `<div class="skl big"></div><div class="skl big"></div>`; return; }
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
      l.takenDate ? row(tr("d.taken"), fmtD(parseD(l.takenDate))) : "",
      row(tr("d.principal"), rp(lp)),
      row(tr("d.interest"), rp(Math.max((l.total || 0) - lp, 0))),
      row(tr("d.totalpay"), rp(l.total)),
      row(tr("d.len"), `${n} ${unitName(unitOf(l), n)}`),
      row(tr("d.amount"), esc(schedText(l))),
      row(tr("d.first"), fmtD(parseD(l.startDate))),
      row(tr("d.last"), fmtD(addPeriod(parseD(l.startDate), n - 1, unitOf(l)))),
      row(tr("d.fine"), esc(fineText(l))),
      row(tr("d.alert"), tr("d.alert.v", { n: l.warnDays || 7 })),
      i > 0 && l.note ? row(tr("d.note"), esc(l.note)) : ""
    ].join("");
    const head = c.multi ? `<span class="lhd"><span><b>${tr("d.loan", { n: i + 1 })}</b></span>${i > 0 ? `<span class="lact"><button type="button" class="ibtn" data-editloan="${esc(l.id)}" aria-label="${tr("d.loan.edit", { n: i + 1 })}" title="${tr("d.loan.edit.t")}">${IC.pencil}</button><button type="button" class="ibtn del" data-delloan="${esc(l.id)}" aria-label="${tr("d.loan.del", { n: i + 1 })}" title="${tr("d.loan.del.t")}">${IC.trash}</button></span>` : ""}</span>` : "";
    return `<div class="loan">${head}<div class="dl">${rows}</div></div>`;
  };
  const rules = d.type === "bunga"
    ? c.loans.map(loanBlock).join("")
    : `<div class="loan"><div class="dl">${row(tr("d.nominal"), rp(d.total))}${row(tr("d.promise"), d.startDate ? fmtD(parseD(d.startDate)) : tr("d.unset"))}${row(tr("d.terms"), tr("d.terms.v"))}</div></div>`;
  const rowStatus = r => r.status === "telat" ? tr("st.late", { n: r.late }) : r.status === "lunas" ? tr("st.paid") : r.status === "sebagian" ? tr("row.partial") : tr("row.unpaid");
  box.innerHTML = `
    <div class="dhead">
      <div><span class="chip src">${esc(srcName(d.source))}</span><span class="chip ${cls}">${st}</span><h1 class="ftitle">${esc(d.lender)}</h1></div>
      <div class="dact">
        ${c.done ? "" : `<button class="primary" id="btnPay">${IC.pay}${tr("d.pay")}</button>`}
        ${d.type === "bunga" && !c.done ? `<button class="ghost" id="btnTopup">${IC.plusc}${tr("d.topup")}</button>` : ""}
        <button class="ghost" id="btnEdit">${IC.pencil}${c.multi ? tr("d.edit1") : tr("d.edit")}</button>
        <button class="danger" id="btnDel">${IC.trash}${tr("d.delete")}</button>
      </div>
    </div>
    <div class="fcard dsum">
      <div class="kv${d.type === "bunga" ? " k6" : ""}">
        ${d.type === "bunga" ? `<div><small>${tr("d.principal")}</small><b>${rp(pokok)}</b></div><div><small>${tr("d.interest")}</small><b>${rp(bunga)}</b></div>` : ""}
        <div><small>${tr("d.k.total")}</small><b>${rp(c.total)}</b></div>
        <div><small>${tr("d.k.paid")}</small><b>${rp(c.paid)}</b></div>
        <div><small>${tr("d.k.left")}</small><b>${rp(c.sisa)}</b></div>
        <div><small>${tr("d.k.fine")}</small><b style="color:${c.fine > 0 ? "var(--red)" : "inherit"}">${rp(c.fine)}</b></div>
      </div>
      <div class="bar"><i class="${c.done ? "full" : ""}" style="width:${c.pct}%"></i></div>
    </div>
    <div class="agrid dgrid">
      <div class="acol">
        <div class="fcard dcard">
          <h2>${d.type === "bunga" ? tr("d.sched") : tr("d.details")}</h2>
          ${c.multi ? `<p class="mini" style="margin-bottom:10px">${tr("d.multi")}</p>` : ""}
          <div class="scroll"><table><thead><tr><th>${tr("d.th.n")}</th><th>${tr("d.th.due")}</th><th>${tr("d.th.bill")}</th><th>${tr("d.th.paid")}</th><th>${tr("d.th.left")}</th><th>${tr("d.th.fine")}</th><th>${tr("d.th.st")}</th></tr></thead><tbody>
            ${c.rows.map(r => `<tr><td>${c.multi ? `P${r.li + 1} · ` : ""}${r.i}</td><td>${fmtD(r.due)}</td><td>${rp(r.amt)}</td><td>${rp(r.paid)}</td><td>${rp(r.sisa)}</td><td>${r.fine > 0 ? rp(r.fine) : "-"}</td><td><span class="chip ${r.status === "lunas" ? "ok" : r.status === "telat" ? "bad" : r.status === "sebagian" ? "warn" : ""}">${rowStatus(r)}</span></td></tr>`).join("")}
          </tbody></table></div>
        </div>
      </div>
      <div class="acol">
        <div class="fcard dcard">
          <h2>${c.multi ? tr("d.loans") : tr("d.info")}</h2>
          ${rules}
          ${d.note ? `<h2>${tr("d.note")}</h2><p class="mini">${esc(d.note)}</p>` : ""}
        </div>
        <div class="fcard dcard">
          <h2>${tr("d.history")}</h2>
          <div class="hist">${pays.length ? pays.map(p => `<div><span><b>${rp(p.amount)}</b><small>${fmtD(parseD(p.date))}${p.note ? " - " + esc(p.note) : ""}</small></span><button type="button" class="ibtn del" data-delpay="${esc(p.id)}" aria-label="${tr("d.delpay")}" title="${tr("d.delpay")}">${IC.trash}</button></div>`).join("") : `<p class="mini">${tr("d.nopay")}</p>`}</div>
        </div>
      </div>
    </div>`;
}

const ABOUT = {
  id: `
        <div class="acol">
          <div class="fcard">
            <h2>Apa itu Clearlynote</h2>
            <p>Clearlynote adalah buku catatan hutang pribadi. Kamu bisa mencatat hutang dari pinjol, bank, warung, sampai teman, lalu memantau cicilan, jatuh tempo, denda, dan berapa lagi yang harus dilunasi.</p>
          </div>
          <div class="fcard">
            <h2>Cara pakai</h2>
            <ol>
              <li>Tekan <b>Tambah hutang</b>, pilih jenisnya, lalu isi pemberi hutang, total, lama cicilan, dan jatuh tempo pertama.</li>
              <li>Tiap kali bayar, buka hutangnya lalu tekan <b>Catat pembayaran</b>.</li>
              <li>Pantau dashboard. Hutang yang sudah dibayar penuh pindah ke tab <b>Lunas</b>.</li>
            </ol>
          </div>
          <div class="fcard">
            <h2>Arti angka di dashboard</h2>
            <ul>
              <li><b>Sisa hutang.</b> Total yang belum dibayar dari semua hutang aktif, tanpa denda.</li>
              <li><b>Denda berjalan.</b> Denda keterlambatan yang sedang berjalan, terpisah dari sisa hutang.</li>
              <li><b>Total terbayar.</b> Jumlah semua pembayaran yang sudah kamu catat.</li>
              <li><b>Hutang lunas.</b> Jumlah hutang yang sudah dibayar penuh.</li>
              <li><b>Progres pelunasan.</b> Persentase total terbayar dibanding total semua hutang. "Tinggal ... lagi" sudah termasuk denda.</li>
              <li><b>Aktif, Lunas, Telat.</b> Jumlah hutang di tiap kondisi.</li>
            </ul>
          </div>
        </div>
        <div class="acol">
          <div class="fcard">
            <h2>Cara hitung cicilan dan denda</h2>
            <ul>
              <li><b>Jenis hutang.</b> "Berbunga atau berdenda" punya jadwal cicilan (harian, mingguan, atau bulanan) dan denda. "Tanpa bunga dan denda" hanya satu nominal dengan janji bayar yang boleh dikosongkan.</li>
              <li><b>Jatuh tempo.</b> Jatuh tempo cicilan berikutnya mengikuti tanggal jatuh tempo pertama, sesuai jarak yang kamu pilih: harian, mingguan, atau bulanan. Untuk bayar sekali saja, isi lama cicilan 1.</li>
              <li><b>Pembayaran.</b> Boleh dibayar kurang dari tagihan. Kalau lebih, kelebihannya otomatis menutup tagihan berikutnya.</li>
              <li><b>Pinjam lagi.</b> Kalau kamu pinjam lagi di aplikasi yang sama saat yang lama masih jalan, buka hutangnya lalu tekan <b>Pinjam lagi</b>. Pinjaman baru punya jadwal cicilan dan denda sendiri, tapi masuk ke satu catatan. Pembayaran otomatis menutup tagihan yang paling lama telat dulu, dari pinjaman mana pun.</li>
              <li><b>Telat.</b> Dihitung mulai sehari setelah tanggal jatuh tempo. Di hari jatuh tempo itu sendiri belum dianggap telat.</li>
              <li><b>Denda.</b> Besarnya sesuai yang kamu isi: nominal per hari, persen per hari dari sisa tagihan, atau nominal tetap yang dikenakan sekali untuk setiap tagihan yang telat (berapa pun lamanya telat). Denda dihitung dari kondisi hari ini. Kalau tagihannya sudah dibayar, denda untuk tagihan itu tidak dihitung lagi dan tidak tersimpan sebagai riwayat.</li>
              <li><b>Peringatan merah.</b> Muncul kalau telatnya lebih lama dari batas hari yang kamu atur. Sebelum itu peringatannya kuning.</li>
            </ul>
          </div>
          <div class="fcard">
            <h2>Data kamu</h2>
            <p>Catatan disimpan per akun dan dibuka lewat login. Kalau kamu keluar, kamu perlu masuk lagi untuk membuka catatan hutangmu. Demi keamanan, kamu juga keluar otomatis kalau tidak ada aktivitas selama 10 menit.</p>
          </div>
        </div>
      `,
  en: `
        <div class="acol">
          <div class="fcard">
            <h2>What is Clearlynote</h2>
            <p>Clearlynote is a personal debt notebook. You can record debts from online lenders, banks, shops, even friends, then track installments, due dates, late fees, and how much is left to pay off.</p>
          </div>
          <div class="fcard">
            <h2>How to use it</h2>
            <ol>
              <li>Press <b>Add debt</b>, choose the type, then fill in the lender, total, installment length, and first due date.</li>
              <li>Each time you pay, open the debt and press <b>Record payment</b>.</li>
              <li>Keep an eye on the dashboard. Debts that are fully paid move to the <b>Paid off</b> tab.</li>
            </ol>
          </div>
          <div class="fcard">
            <h2>What the dashboard numbers mean</h2>
            <ul>
              <li><b>Remaining debt.</b> The total still unpaid across all active debts, excluding late fees.</li>
              <li><b>Running late fees.</b> Late fees currently accruing, kept separate from the remaining debt.</li>
              <li><b>Total paid.</b> The sum of all payments you have recorded.</li>
              <li><b>Debts paid off.</b> The number of debts that have been paid in full.</li>
              <li><b>Repayment progress.</b> Total paid as a percentage of all debts combined. "Left to go" already includes late fees.</li>
              <li><b>Active, Paid off, Late.</b> The number of debts in each state.</li>
            </ul>
          </div>
        </div>
        <div class="acol">
          <div class="fcard">
            <h2>How installments and late fees are calculated</h2>
            <ul>
              <li><b>Debt type.</b> "With interest or late fees" has an installment schedule (daily, weekly, or monthly) and late fees. "No interest or late fees" is a single amount with an optional promised pay date.</li>
              <li><b>Due dates.</b> The next installment's due date follows the first due date, at the interval you choose: daily, weekly, or monthly. For a single payment, set the installment length to 1.</li>
              <li><b>Payments.</b> You can pay less than the bill. If you pay more, the excess automatically covers the next bill.</li>
              <li><b>Borrow again.</b> If you borrow again from the same lender while the old debt is still running, open the debt and press <b>Borrow again</b>. The new loan has its own installment schedule and late fees but sits in the same record. Payments automatically cover the most overdue bill first, from any loan.</li>
              <li><b>Late.</b> Counted from the day after the due date. On the due date itself it isn't late yet.</li>
              <li><b>Late fees.</b> As you set them: a fixed amount per day, a percent per day of the remaining bill, or a flat amount charged once for each late bill (however long it is late). Fees are calculated as of today. Once a bill is paid, its fee stops counting and is not kept as history.</li>
              <li><b>Red alert.</b> Shows up when a bill is late for longer than the number of days you set. Before that the alert is yellow.</li>
            </ul>
          </div>
          <div class="fcard">
            <h2>Your data</h2>
            <p>Notes are stored per account and opened through sign-in. If you sign out, you need to sign in again to open your debt notes. For your safety, you are also signed out automatically after 10 minutes without activity.</p>
          </div>
        </div>
      `
};
const aboutHTML = () => ABOUT[lang];

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
  $("#lFine").textContent = tr("f.fine." + m);
  $("#fFine").classList.toggle("money", !p);
  $("#fFine").inputMode = p ? "decimal" : "numeric";
}

function unitLabel() {
  const u = $("#fUnit").value;
  $("#lTenor").textContent = tr("f.len", { u: unitName(u, 2) });
  $("#fTenor").max = UNIT_CAP[u];
}

function fineNum() {
  return $("#fFineMode").value === "persen" ? Number(String($("#fFine").value).replace(",", ".")) || 0 : num("#fFine");
}

function renderSum() {
  const total = $$(".sch").reduce((a, i) => a + numOf(i), 0);
  const pokok = num("#fPrincipal");
  $("#sum").innerHTML = !total ? "" : `<div><span>${tr("sum.total")}</span><b>${rp(total)}</b></div>` + (pokok > 0 ? `<div><span>${tr("sum.principal")}</span><b>${rp(pokok)}</b></div><div><span>${tr("sum.interest")}</span><b>${rp(Math.max(total - pokok, 0))}</b></div>` : "");
}

function buildSched(preset) {
  const u = $("#fUnit").value;
  const n = Math.max(0, Math.min(UNIT_CAP[u], Math.round(num("#fTenor"))));
  const beda = $("#fMode").value === "beda";
  const cur = $$(".sch").map(numOf);
  const vals = preset || (beda ? Array.from({ length: n }, (_, i) => cur[i] || 0) : splitEven(num("#fTotal"), n));
  const start = $("#fStart").value ? parseD($("#fStart").value) : null;
  $("#sched").innerHTML = vals.map((v, i) => `<label class="sr"><span>${UNIT_TITLE[lang][u]} ${i + 1}${start ? ", " + fmtD(addPeriod(start, i, u)) : ""}</span><input class="money sch" inputmode="numeric" value="${fmt(v)}" placeholder="0" ${beda ? "" : "readonly"}></label>`).join("");
  $("#fTotal").readOnly = beda;
  if (beda) $("#fTotal").value = fmt(vals.reduce((a, b) => a + b, 0));
  renderSum();
}

function formTitle() {
  const d = editingId ? debts.find(x => x.id === editingId) : null;
  $("#fTitle").textContent = editingLoan === "new" && d ? tr("ft.topup", { l: d.lender }) : editingLoan && d ? tr("ft.loan", { n: (d.topups || []).findIndex(x => x.id === editingLoan) + 2 }) : d ? tr("ft.edit") : tr("ft.add");
}

function openForm(id, useDraft = true, loan = null) {
  editingId = id || null;
  editingLoan = loan || null;
  draftId = crypto.randomUUID();
  const d = id ? debts.find(x => x.id === id) : null;
  const tp = loan && loan !== "new" && d ? (d.topups || []).find(x => x.id === loan) : null;
  const s = loan ? tp : d;
  const b = loan ? true : d?.type === "bunga";
  const f = s || d;
  formTitle();
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

const showMsg = m => { const el = $("#fMsg"); el.textContent = m; el.classList.remove("hidden"); el.scrollIntoView({ block: "center" }); };
const DRAFT_IDS = ["fType", "fSource", "fLender", "fNote", "fPrincipal", "fTotal", "fTenor", "fUnit", "fMode", "fStart", "fTaken", "fFineMode", "fFine", "fWarn", "fNominal", "fDue"];
const draftKey = () => `clearly:draft:${uid}:${editingId || "new"}${editingLoan ? ":" + editingLoan : ""}`;
function saveDraft() {
  try {
    const v = {};
    DRAFT_IDS.forEach(i => { v[i] = $("#" + i).value; });
    v.sch = $$(".sch").map(i => i.value);
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
const formDirty = () => (page === "tambah" || page === "edit") && uid && !saved && ($("#fTotal").value || $("#fNominal").value || (!editingLoan && $("#fLender").value));

async function saveDebt(e) {
  e.preventDefault();
  const old = editingId ? debts.find(x => x.id === editingId) : null;
  const loan = editingLoan;
  let data;
  if (loan) {
    if (!old) { showMsg(tr("m.noparent")); return; }
    if (!$("#fStart").value) { showMsg(tr("m.start")); return; }
    const schedule = $$(".sch").map(numOf);
    if (!schedule.length || schedule.some(v => v <= 0)) { showMsg(tr("m.sched")); return; }
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
    if (!$("#fLender").value.trim()) { showMsg(tr("m.lender")); return; }
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
      if (!$("#fStart").value) { showMsg(tr("m.start")); return; }
      const schedule = $$(".sch").map(numOf);
      if (!schedule.length || schedule.some(v => v <= 0)) { showMsg(tr("m.sched")); return; }
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
      if (!(total > 0)) { showMsg(tr("m.nominal")); return; }
      Object.assign(data, { total, principal: total, startDate: $("#fDue").value || "" });
    }
  }
  const id = editingId || draftId || crypto.randomUUID();
  const btns = $$("#fDebt button[type=submit]");
  btns.forEach(b => { b.disabled = true; b.textContent = tr("saving"); });
  $("#fMsg").classList.add("hidden");
  try {
    const write = setDoc(doc(db, "users", uid, "debts", id), data);
    write.catch(() => {});
    await Promise.race([write, new Promise(r => setTimeout(r, 1200))]);
    saved = true;
    clearDraft();
    location.href = backUrl();
  } catch (err) {
    showMsg(tr("m.savefail") + err.message);
    btns.forEach(b => { b.disabled = false; b.textContent = tr("save"); });
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
  $("#payInfo").textContent = tr("pay.info", { l: d.lender, s: rp(c.sisa), n: c.next ? rp(c.next.sisa) : "", m: c.multi });
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
  setDoc(doc(db, "users", uid, "debts", d.id), { ...rest, payments }).catch(err => alert(tr("m.savefail") + err.message));
  $("#dPay").close();
}

async function delPay(pid) {
  const d = debts.find(x => x.id === openId);
  if (!d) return;
  const ok = await ask(tr("del.pay.t"), tr("del.pay.x"), tr("del"), true);
  if (!ok) return;
  const { id, ...rest } = d;
  setDoc(doc(db, "users", uid, "debts", d.id), { ...rest, payments: d.payments.filter(p => p.id !== pid) }).catch(err => alert(tr("m.delfail") + err.message));
}

async function delDebt() {
  const d = debts.find(x => x.id === openId);
  if (!d) return;
  const ok = await ask(tr("del.debt.t", { l: d.lender }), tr("del.debt.x"), tr("del.debt.y"), true);
  if (!ok) return;
  const w = deleteDoc(doc(db, "users", uid, "debts", d.id));
  w.catch(err => alert(tr("m.delfail") + err.message));
  await Promise.race([w.catch(() => {}), new Promise(r => setTimeout(r, 1200))]);
  location.href = homeUrl;
}

async function delLoan(lid) {
  const d = debts.find(x => x.id === openId);
  if (!d) return;
  const ok = await ask(tr("del.loan.t"), tr("del.loan.x"), tr("del"), true);
  if (!ok) return;
  const { id, ...rest } = d;
  setDoc(doc(db, "users", uid, "debts", d.id), { ...rest, topups: (d.topups || []).filter(x => x.id !== lid) }).catch(err => alert(tr("m.delfail") + err.message));
}

function goHome() {
  if (page !== "home") { location.href = homeUrl; return; }
  tab = "aktif";
  $$(".segb").forEach(p => p.classList.toggle("active", p.dataset.tab === "aktif"));
  $$("dialog[open]").forEach(d => d.close());
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

const STATIC = [
  ["#miAbout", "menu.about", "tail"],
  ["#btnLogout", "menu.logout", "tail"],
  [".head .sub", "home.sub"],
  ['.segb[data-tab="aktif"]', "tab.active", "head"],
  ['.segb[data-tab="lunas"]', "tab.paid", "head"],
  [".back", "back", "tail"],
  ["#pageAbout .ftitle", "about.title"],
  ["#draftNote span", "draft.note"],
  ["#btnDraftClear", "draft.clear"],
  ['#fDebt label[for="fType"]', "f.type"],
  ['#fType option[value="bunga"]', "f.type.bunga"],
  ['#fType option[value="biasa"]', "f.type.biasa"],
  ['#fDebt label[for="fSource"]', "f.source"],
  ['#fDebt label[for="fLender"]', "f.lender"],
  ["#fLender", "f.lender.ph", "ph"],
  ['#fDebt label[for="fPrincipal"]', "f.principal"],
  ['#fDebt label[for="fTotal"]', "f.total"],
  ['#fDebt label[for="fUnit"]', "f.unit"],
  ['#fUnit option[value="hari"]', "f.unit.hari"],
  ['#fUnit option[value="minggu"]', "f.unit.minggu"],
  ['#fUnit option[value="bulan"]', "f.unit.bulan"],
  ['#fDebt label[for="fMode"]', "f.mode"],
  ['#fMode option[value="sama"]', "f.mode.sama"],
  ['#fMode option[value="beda"]', "f.mode.beda"],
  ['#fDebt label[for="fTaken"]', "f.taken"],
  ['#fDebt label[for="fStart"]', "f.start"],
  ['#fDebt label[for="fFineMode"]', "f.finemode"],
  ['#fFineMode option[value="nominal"]', "f.finemode.nominal"],
  ['#fFineMode option[value="persen"]', "f.finemode.persen"],
  ['#fFineMode option[value="flat"]', "f.finemode.flat"],
  ['#fDebt label[for="fWarn"]', "f.warn"],
  ['#fDebt label[for="fNominal"]', "f.nominal"],
  ['#fDebt label[for="fDue"]', "f.due"],
  ['#fDebt label[for="fNote"]', "f.note"],
  ["#fDebt [data-cancel]", "cancel"],
  ['#fDebt button[type="submit"]', "save"],
  [".sidetitle", "f.side"],
  ["#fSide .hint", "f.side.hint"],
  ["#fPay h2", "pay.title"],
  ['#fPay label[for="pAmount"]', "pay.amount"],
  ["#fPay .hint", "pay.hint"],
  ['#fPay label[for="pDate"]', "pay.date"],
  ['#fPay label[for="pNote"]', "pay.note"],
  ["#btnFull", "pay.full"],
  ["#fPay [data-close]", "cancel"],
  ['#fPay button[type="submit"]', "pay.save"]
];
STATIC.forEach(([sel, key, m]) => $$(sel).forEach(el => { el.dataset.i18n = key; if (m) el.dataset.m = m; }));

function setNode(el, v, first) {
  const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
  const n = first ? nodes[0] : nodes[nodes.length - 1];
  if (n) n.textContent = v;
  else el.insertBefore(document.createTextNode(v), first ? el.firstChild : null);
}

function renderUser() {
  if (!me) { $("#greet").textContent = tr("hello"); return; }
  const nm = me.name || (me.email || "").split("@")[0];
  $("#greet").textContent = tr("hello.n", { n: nm.split(" ")[0] });
  $("#uname").textContent = nm;
  $("#mname").textContent = nm;
  $("#mmail").textContent = me.email || "";
  if (me.photo) {
    $("#uimg").src = me.photo;
    $("#uimg").classList.remove("hidden");
    $("#uav").classList.add("hidden");
  } else {
    $("#uimg").removeAttribute("src");
    $("#uimg").classList.add("hidden");
    $("#uav").textContent = nm.trim().charAt(0).toUpperCase() || "?";
    $("#uav").classList.remove("hidden");
  }
}

function renderMsg() {
  const box = $("#loginErr");
  if (!msg) { box.className = "amsg hidden"; return; }
  box.className = "amsg " + msg.type;
  $("#amText").textContent = tr(msg.key, msg.p);
  $("#amActs").innerHTML = (msg.acts || []).map(a => `<button type="button" class="alink" data-act="${a}">${esc(tr("act." + a))}</button>`).join("");
}
const setMsg = (type, key, p = {}, acts = []) => { msg = { type, key, p, acts }; renderMsg(); };
const clearMsg = () => { msg = null; renderMsg(); };

function applyDynamic() {
  $("#loginSub").textContent = tr(authMode === "login" ? "sub.login" : "sub.reg");
  $("#gLabel").textContent = tr(authMode === "login" ? "google.login" : "google.reg");
  $("#btnAdd").innerHTML = IC.plus + tr("add");
  $("#pageAbout .agrid").innerHTML = aboutHTML();
  $("#sched").dataset.empty = tr("sched.empty");
  $$("#fSource option").forEach(o => { o.textContent = srcName(o.value); });
  $("#vText").innerHTML = tr("v.text", { m: esc(verifyMail) });
  $("#rText").innerHTML = tr("reset.done.x", { m: esc(resetMail) });
  $$(".ferr[data-k]").forEach(e => { e.textContent = tr(e.dataset.k); });
  $$(".brand").forEach(b => b.setAttribute("aria-label", tr("back.dash")));
  $$(".lbtn").forEach(b => { const on = b.dataset.lang === lang; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  renderMsg();
  renderUser();
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.title = page === "tentang" ? tr("title.about") : page === "tambah" || page === "edit" ? tr("title.form") : "Clearlynote";
  $$("[data-i18n]").forEach(el => {
    const v = tr(el.dataset.i18n, { y: new Date().getFullYear() });
    const m = el.dataset.m;
    if (m === "ph") el.placeholder = v;
    else if (m === "aria") el.setAttribute("aria-label", v);
    else if (m === "head") setNode(el, v, true);
    else if (m === "tail") setNode(el, v, false);
    else el.textContent = v;
  });
  applyDynamic();
}

function setLang(l) {
  if (l === lang) return;
  lang = l;
  LS.set(LANG_KEY, l);
  if (auth) auth.languageCode = l;
  applyI18n();
  if (uid) renderAll();
  if ((page === "tambah" || page === "edit") && routed) {
    formTitle();
    fineLabel();
    unitLabel();
    buildSched();
  }
}

const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const fieldErr = (errId, key) => {
  const e = $("#" + errId);
  e.dataset.k = key;
  e.textContent = tr(key);
  const inp = $("#" + e.dataset.for);
  inp.setAttribute("aria-invalid", "true");
  return inp;
};
const clearField = inputId => {
  const inp = $("#" + inputId);
  if (inp) inp.removeAttribute("aria-invalid");
  const e = document.querySelector(`.ferr[data-for="${inputId}"]`);
  if (e) { e.textContent = ""; delete e.dataset.k; }
};
const clearFields = sel => $$(sel + " .ferr").forEach(e => clearField(e.dataset.for));
const emailCheck = (errId, v) => !v ? fieldErr(errId, "e.email.req") : !validEmail(v) ? fieldErr(errId, "e.email.bad") : null;

const AUTH_ERR = {
  "auth/invalid-credential": ["a.cred", "err", ["forgot", "reg"]],
  "auth/invalid-login-credentials": ["a.cred", "err", ["forgot", "reg"]],
  "auth/wrong-password": ["a.cred", "err", ["forgot", "reg"]],
  "auth/user-not-found": ["a.nouser", "err", ["reg"]],
  "auth/email-already-in-use": ["a.exists", "err", ["signin", "forgot"]],
  "auth/weak-password": ["a.weak", "err", []],
  "auth/invalid-email": ["a.bademail", "err", []],
  "auth/popup-closed-by-user": ["a.popclosed", "info", []],
  "auth/popup-blocked": ["a.popblocked", "err", []],
  "auth/too-many-requests": ["a.many", "err", []],
  "auth/network-request-failed": ["a.network", "err", []],
  "auth/user-disabled": ["a.disabled", "err", []],
  "auth/operation-not-allowed": ["a.notallowed", "err", []],
  "auth/cancelled-popup-request": null
};

function showAuthErr(err) {
  const m = AUTH_ERR[err.code];
  if (m === null) { clearMsg(); return; }
  if (m) setMsg(m[1], m[0], {}, m[2]);
  else setMsg("err", "a.fail", { c: err.code || err.message });
}

function setView(v) {
  const ids = { main: "authMain", reset: "resetBox", verify: "verifyBox" };
  Object.entries(ids).forEach(([k, id]) => $("#" + id).classList.toggle("hidden", k !== v));
  if (v !== "verify") { clearInterval(verifyTimer); verifyTimer = null; }
  view = v;
}

function setAuthMode(m) {
  authMode = m;
  const src = m === "register" ? "#lEmail" : "#rEmail";
  const dst = m === "register" ? "#rEmail" : "#lEmail";
  if (!$(dst).value) $(dst).value = $(src).value;
  $$(".tabb").forEach(b => b.classList.toggle("active", b.dataset.auth === m));
  $("#fLogin").classList.toggle("hidden", m !== "login");
  $("#fRegister").classList.toggle("hidden", m !== "register");
  $("#gLabel").textContent = tr(m === "login" ? "google.login" : "google.reg");
  $("#loginSub").textContent = tr(m === "login" ? "sub.login" : "sub.reg");
  clearFields("#authMain");
  clearMsg();
  if (view !== "main") setView("main");
}

function setResetStep(s) {
  $("#resetForm").classList.toggle("hidden", s !== "form");
  $("#resetDone").classList.toggle("hidden", s !== "done");
}

function openReset() {
  $("#xEmail").value = $("#lEmail").value.trim() || $("#rEmail").value.trim();
  clearFields("#resetBox");
  clearMsg();
  setResetStep("form");
  setView("reset");
  $("#xEmail").focus();
}

const ACT_FN = {
  forgot: openReset,
  reg: () => setAuthMode("register"),
  signin: () => setAuthMode("login")
};

function lock(on) {
  if (on) LS.del(IDLE_FLAG);
  $$("#login button:not(.lbtn)").forEach(b => { b.disabled = on; });
  if (!on) {
    if (cool.v.on) $("#btnVResend").disabled = true;
    if (cool.r.on) $("#btnRResend").disabled = true;
  }
}

function startCool(k, sel) {
  const c = cool[k], b = $(sel);
  let s = 60;
  c.on = true;
  b.disabled = true;
  clearInterval(c.t);
  const tick = () => {
    if (s <= 0) {
      clearInterval(c.t);
      c.on = false;
      b.disabled = false;
      b.textContent = tr("resend");
      return;
    }
    b.textContent = tr("resend.n", { s: s-- });
  };
  tick();
  c.t = setInterval(tick, 1000);
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
  budget = LS.get(PRIO_KEY(uid)) || 0;
  me = u;
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  renderUser();
}

const idleExpired = () => {
  const a = Number(LS.get(ACT_KEY)) || 0;
  return a > 0 && Date.now() - Math.max(a, lastAct) > IDLE_MS;
};

function markActive() {
  const n = Date.now();
  lastAct = n;
  if (n - lastWrite > 3000) { lastWrite = n; LS.set(ACT_KEY, n); }
}

function enter(user) {
  if (unsub) { unsub(); unsub = null; }
  const u = { uid: user.uid, name: user.displayName || "", email: user.email || "", photo: user.photoURL || "" };
  const same = uid === u.uid;
  LS.set("clearly:last", u);
  LS.del(IDLE_FLAG);
  lastWrite = 0;
  markActive();
  showApp(u);
  clearMsg();
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
    const m = tr("m.loadfail") + err.message;
    loaded = true;
    renderAll();
    if (page === "tambah" || page === "edit") showMsg(m); else alert(m);
  });
}

async function admit(user) {
  const l = LS.get("clearly:last");
  if (!(l && l.uid === user.uid)) {
    setMsg("info", "a.checking");
    const ok = await isRegistered(user);
    if (ok !== true) {
      await signOut(auth).catch(() => {});
      if (ok === false) setMsg("err", "a.notreg", {}, ["reg"]);
      else setMsg("err", "a.noverify");
      return;
    }
  }
  enter(user);
}

function needsVerify(u) {
  return u.providerData.some(p => p.providerId === "password") && !u.emailVerified;
}

function showVerify(user) {
  verifyMail = user.email || "";
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
  setView("verify");
  $("#vText").innerHTML = tr("v.text", { m: esc(verifyMail) });
  clearMsg();
  verifyTimer = setInterval(() => checkVerified(true), 4000);
}

let checking = false;
async function checkVerified(silent) {
  const u = auth.currentUser;
  if (!u || checking) return;
  checking = true;
  try {
    try { await u.reload(); } catch (e) { if (!silent) showAuthErr(e); return; }
    if (!u.emailVerified) {
      if (!silent) setMsg("info", "v.not");
      return;
    }
    try { await u.getIdToken(true); } catch (e) {}
    setView("main");
    clearMsg();
    await admit(u);
  } finally {
    checking = false;
  }
}

async function resendVerify() {
  const u = auth.currentUser;
  if (!u) return;
  try {
    await sendEmailVerification(u);
  } catch (err) {
    showAuthErr(err);
    return;
  }
  setMsg("ok", "v.resent");
  startCool("v", "#btnVResend");
}

async function sendReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (err) {
    if (err.code === "auth/user-not-found") return true;
    showAuthErr(err);
    return false;
  }
}

async function logoutIdle() {
  if (idling || !uid) return;
  idling = true;
  if (formDirty()) saveDraft();
  const prev = uid;
  LS.set(IDLE_FLAG, Date.now());
  $$("dialog[open]").forEach(d => d.close());
  setMenu(false);
  try { await signOut(auth); } catch (e) {}
  LS.del(cacheKey(prev));
  idling = false;
}

const checkIdle = () => { if (uid && idleExpired()) logoutIdle(); };
const onActivity = () => {
  if (!uid) return;
  if (idleExpired()) { logoutIdle(); return; }
  markActive();
};

const setMenu = o => { $("#menu").classList.toggle("hidden", !o); $("#btnMenu").setAttribute("aria-expanded", o); };

document.querySelectorAll(".topbar .brand").forEach(b => {
  b.setAttribute("role", "button");
  b.setAttribute("tabindex", "0");
  b.addEventListener("click", goHome);
  b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goHome(); } });
});

document.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.lang) setLang(b.dataset.lang);
  else if (b.dataset.act) ACT_FN[b.dataset.act]();
  else if (b.dataset.eye) {
    const inp = $("#" + b.dataset.eye);
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.setAttribute("aria-pressed", show);
  }
  else if (b.dataset.auth) setAuthMode(b.dataset.auth);
  else if (b.dataset.listall !== undefined) { listOpen[tab] = !listOpen[tab]; renderAll(); }
  else if (b.dataset.prioall !== undefined) { prioOpen = !prioOpen; renderPrioBody(); }
  else if (b.dataset.add !== undefined) location.href = base + "tambah/";
  else if (b.dataset.open) location.href = base + "detail/?id=" + encodeURIComponent(b.dataset.open);
  else if (b.dataset.close) $("#" + b.dataset.close).close();
  else if (b.dataset.delpay) delPay(b.dataset.delpay);
  else if (b.dataset.back !== undefined) location.href = backUrl();
  else if (b.dataset.cancel !== undefined) { clearDraft(); saved = true; location.href = backUrl(); }
  else if (b.id === "btnDraftClear") { clearDraft(); openForm(editingId, false, editingLoan); }
  else if (b.dataset.tab) {
    tab = b.dataset.tab;
    if (page !== "home") { location.href = homeUrl + (b.dataset.tab === "lunas" ? "#lunas" : ""); return; }
    $$(".segb").forEach(p => p.classList.toggle("active", p === b));
    renderAll();
  } else if (b.id === "btnEdit") { location.href = base + "edit/?id=" + encodeURIComponent(openId); }
  else if (b.id === "btnTopup") { location.href = base + "tambah/?topup=" + encodeURIComponent(openId); }
  else if (b.dataset.editloan) { location.href = base + "edit/?id=" + encodeURIComponent(openId) + "&loan=" + encodeURIComponent(b.dataset.editloan); }
  else if (b.dataset.delloan) delLoan(b.dataset.delloan);
  else if (b.id === "btnPay") openPay(openId);
  else if (b.id === "btnDel") delDebt();
});

$("#btnAdd").onclick = () => { location.href = "tambah/"; };
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
    $("#fTotal").value = fmt($$(".sch").reduce((a, i) => a + numOf(i), 0));
  }
  if (el.id === "budget") setBudget(numOf(el));
  if (el.id === "fPrincipal" || el.classList.contains("sch")) renderSum();
  if (el.id && el.closest("#login")) clearField(el.id);
});
$("#fUnit").onchange = () => { unitLabel(); buildSched(); };
$("#fTenor").oninput = () => buildSched();
$("#fTotal").oninput = () => { if ($("#fMode").value === "sama") buildSched(); };
$("#fMode").onchange = () => buildSched();
$("#fStart").onchange = () => buildSched();
$("#fDebt").addEventListener("input", queueDraft);
$("#fDebt").addEventListener("change", queueDraft);
window.addEventListener("pagehide", () => { if (formDirty()) saveDraft(); });
if (location.hash === "#lunas" && page === "home") {
  tab = "lunas";
  $$(".segb").forEach(p => p.classList.toggle("active", p.dataset.tab === "lunas"));
}
if (page === "detail") openId = new URLSearchParams(location.search).get("id");
applyPage();

$("#fLogin").onsubmit = async e => {
  e.preventDefault();
  clearMsg();
  clearFields("#fLogin");
  if (!configured) { setMsg("err", "a.cfg"); return; }
  const email = $("#lEmail").value.trim(), pass = $("#lPass").value;
  const bad = [emailCheck("eLEmail", email), !pass ? fieldErr("eLPass", "e.pass.req") : null].filter(Boolean);
  if (bad.length) { bad[0].focus(); return; }
  lock(true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    showAuthErr(err);
  }
  lock(false);
};

$("#fRegister").onsubmit = async e => {
  e.preventDefault();
  clearMsg();
  clearFields("#fRegister");
  if (!configured) { setMsg("err", "a.cfg"); return; }
  const name = $("#rName").value.trim(), email = $("#rEmail").value.trim(), pass = $("#rPass").value, pass2 = $("#rPass2").value;
  const bad = [
    !name ? fieldErr("eRName", "e.name.req") : null,
    emailCheck("eREmail", email),
    !pass ? fieldErr("eRPass", "e.pass.req") : pass.length < 6 ? fieldErr("eRPass", "e.pass.short") : null,
    !pass2 ? fieldErr("eRPass2", "e.pass2.req") : pass && pass !== pass2 ? fieldErr("eRPass2", "e.pass2.diff") : null
  ].filter(Boolean);
  if (bad.length) { bad[0].focus(); return; }
  lock(true);
  registering = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await ensureProfile(cred.user, name);
    try { await sendEmailVerification(cred.user); } catch (e) {}
    registering = false;
    showVerify(cred.user);
    startCool("v", "#btnVResend");
  } catch (err) {
    registering = false;
    showAuthErr(err);
    if (auth.currentUser) await signOut(auth).catch(() => {});
  }
  lock(false);
};

$("#fReset").onsubmit = async e => {
  e.preventDefault();
  clearMsg();
  clearFields("#fReset");
  if (!configured) { setMsg("err", "a.cfg"); return; }
  const email = $("#xEmail").value.trim();
  const bad = emailCheck("eXEmail", email);
  if (bad) { bad.focus(); return; }
  lock(true);
  const ok = await sendReset(email);
  lock(false);
  if (!ok) return;
  resetMail = email;
  $("#rText").innerHTML = tr("reset.done.x", { m: esc(resetMail) });
  setResetStep("done");
  startCool("r", "#btnRResend");
};

$("#btnRResend").onclick = async () => {
  lock(true);
  const ok = await sendReset(resetMail);
  lock(false);
  if (!ok) return;
  setMsg("ok", "reset.resent");
  startCool("r", "#btnRResend");
};
$("#btnROther").onclick = () => { clearMsg(); setResetStep("form"); $("#xEmail").focus(); };
$("#btnRBack").onclick = () => { clearMsg(); setView("main"); };
$("#btnForgot").onclick = openReset;

$("#btnGoogle").onclick = async () => {
  clearMsg();
  if (!configured) { setMsg("err", "a.cfg"); return; }
  const reg = authMode === "register";
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
    showAuthErr(err);
    if (reg && auth.currentUser) await signOut(auth).catch(() => {});
  }
  lock(false);
};

$("#btnVDone").onclick = () => checkVerified(false);
$("#btnVResend").onclick = resendVerify;
$("#btnVOut").onclick = async () => {
  setView("main");
  clearMsg();
  await signOut(auth).catch(() => {});
};
window.addEventListener("focus", () => { if (verifyTimer) checkVerified(true); });

$("#miAbout").href = base + "tentang/";
if (page === "tentang") $("#miAbout").classList.add("cur");
$("#btnMenu").onclick = () => setMenu($("#menu").classList.contains("hidden"));
document.addEventListener("click", e => { if (!e.target.closest(".me")) setMenu(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

$("#btnLogout").onclick = async () => {
  setMenu(false);
  const ok = await ask(tr("out.t"), tr("out.x"), tr("menu.logout"), true);
  if (!ok) return;
  LS.del(IDLE_FLAG);
  const prev = uid;
  await signOut(auth);
  if (prev) LS.del(cacheKey(prev));
};

["pointerdown", "mousedown", "mousemove", "keydown", "wheel", "scroll", "touchstart", "click", "input"].forEach(ev => window.addEventListener(ev, onActivity, { passive: true, capture: true }));
document.addEventListener("visibilitychange", checkIdle);
window.addEventListener("focus", checkIdle);
window.addEventListener("pageshow", checkIdle);
setInterval(checkIdle, 10000);

applyI18n();

if (configured) {
  const last = LS.get("clearly:last");
  if (last && last.uid) {
    if (idleExpired()) {
      LS.set(IDLE_FLAG, Date.now());
      LS.del("clearly:last");
    } else {
      showApp(last);
      const c = LS.get(cacheKey(last.uid));
      debts = c || [];
      loaded = !!c;
      renderAll();
      tryRoute();
    }
  }
  onAuthStateChanged(auth, async user => {
    const first = firstAuth;
    firstAuth = false;
    if (!user) {
      const prev = uid;
      if (unsub) { unsub(); unsub = null; }
      uid = null;
      me = null;
      debts = [];
      loaded = false;
      routed = false;
      pending = false;
      if (prev) LS.del(cacheKey(prev));
      LS.del("clearly:last");
      if (view === "verify") setView("main");
      $("#app").classList.add("hidden");
      $("#login").classList.remove("hidden");
      const f = Number(LS.get(IDLE_FLAG)) || 0;
      if (f && Date.now() - f < 30 * 60 * 1000 && !msg) setMsg("info", "idle.out");
      return;
    }
    if (registering) return;
    if (first && idleExpired()) {
      LS.set(IDLE_FLAG, Date.now());
      LS.del("clearly:last");
      await signOut(auth).catch(() => {});
      return;
    }
    if (needsVerify(user)) { showVerify(user); return; }
    await admit(user);
  });
} else {
  $("#login").classList.remove("hidden");
}

setInterval(() => { if (uid && loaded && !document.querySelector("dialog[open]") && document.activeElement?.id !== "budget") renderAll(); }, 60000);