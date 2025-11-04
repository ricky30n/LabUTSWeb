// === Shared Helpers & Bootstrapping ===
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function greet() {
  const now = new Date();
  const hour = now.getHours();
  let s = "pagi";
  if (hour >= 11 && hour < 15) s = "siang";
  else if (hour >= 15 && hour < 18) s = "sore";
  else if (hour >= 18 || hour < 4) s = "malam";

  const user = JSON.parse(localStorage.getItem("activeUser") || "null");
  const nama = user ? user.nama : "Pengunjung";
  const el = $("#greeting");
  if (el) el.innerHTML = `Selamat ${s}, <strong>${nama}</strong>!`;
}

function requireLogin() {
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");
  if (!user) window.location.href = "index.html";
}

function rupiahToNumber(str) {
  if (typeof str === "number") return str;
  return parseInt(String(str).replace(/[^\d]/g, "")) || 0;
}
function numberToRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

// === LOGIN PAGE ===
function initLogin() {
  const form = $("#loginForm");
  const forgotModal = $("#modalForgot");
  const registerModal = $("#modalRegister");
  const backdropForgot = $("#backdropForgot");
  const backdropRegister = $("#backdropRegister");

  if (!form) return;

  $("#btnForgot")?.addEventListener("click", () => {
    backdropForgot.classList.add("show");
  });
  $("#btnRegister")?.addEventListener("click", () => {
    backdropRegister.classList.add("show");
  });
  $$(".close-modal").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.target.closest(".modal-backdrop").classList.remove("show");
    })
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const user = (window.dataPengguna || []).find(
      (u) => u.email === email && u.password === password
    );
    if (!user) {
      alert("Email/password yang anda masukkan salah");
      return;
    }
    localStorage.setItem("activeUser", JSON.stringify(user));
    window.location.href = "dashboard.html";
  });
}

// === DASHBOARD ===
function initDashboard() {
  requireLogin();
  greet();
  $("#logout")?.addEventListener("click", () => {
    localStorage.removeItem("activeUser");
    window.location.href = "index.html";
  });
}

// === STOK / KATALOG ===
function renderTableKatalog(rows) {
  const tb = $("#tbodyKatalog");
  if (!tb) return;
  tb.innerHTML = "";
  rows.forEach((buku, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><img class="cover" src="${buku.cover}" alt="cover" width="60"></td>
      <td>${buku.kodeBarang}</td>
      <td>${buku.namaBarang}<div class="small">${buku.jenisBarang} • Edisi ${buku.edisi}</div></td>
      <td>${buku.stok}</td>
      <td>${buku.harga}</td>
    `;
    tb.appendChild(tr);
  });
}

function initStok() {
  requireLogin();
  greet();
  const data =
    JSON.parse(localStorage.getItem("katalog")) || window.dataKatalogBuku || [];
  renderTableKatalog(data);

  $("#q")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = data.filter((i) =>
      Object.values(i).join(" ").toLowerCase().includes(term)
    );
    renderTableKatalog(filtered);
  });

  $("#formAdd")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const buku = {
      kodeBarang: $("#kode").value.trim(),
      namaBarang: $("#nama").value.trim(),
      jenisBarang: $("#jenis").value.trim(),
      edisi: $("#edisi").value.trim(),
      stok: parseInt($("#stok").value) || 0,
      harga: $("#harga").value.trim(),
      cover: $("#cover").value.trim() || "img/pengantar_komunikasi.jpg",
    };
    data.push(buku);
    renderTableKatalog(data);
    e.target.reset();
  });

  $("#saveLocal")?.addEventListener("click", () => {
    localStorage.setItem("katalog", JSON.stringify(data));
    alert("Perubahan stok disimpan di Local Storage browser.");
  });
}

// === CHECKOUT ===
function buildItemOptions() {
  return (
    JSON.parse(localStorage.getItem("katalog")) ||
    window.dataKatalogBuku ||
    []
  )
    .map(
      (b) =>
        `<option value="${b.kodeBarang}" data-harga="${rupiahToNumber(
          b.harga
        )}">${b.namaBarang} (${b.kodeBarang})</option>`
    )
    .join("");
}

function recalcTotal() {
  let total = 0;
  $$("#tCart tbody tr").forEach((tr) => {
    const qty = parseInt($(".qty", tr).value) || 0;
    const harga = parseInt($(".harga", tr).dataset.value);
    const sub = qty * harga;
    $(".sub", tr).textContent = numberToRupiah(sub);
    total += sub;
  });
  $("#grandTotal").textContent = numberToRupiah(total);
}

function addCartRow() {
  const tbody = $("#tCart tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <select class="itemSel">${buildItemOptions()}</select>
    </td>
    <td class="harga" data-value="0">Rp 0</td>
    <td><input class="qty" type="number" min="1" value="1" style="width:90px"></td>
    <td class="sub">Rp 0</td>
    <td><button class="btn danger btnDel" type="button">Hapus</button></td>
  `;
  tbody.appendChild(tr);

  const sel = $(".itemSel", tr);
  const hargaCell = $(".harga", tr);
  sel.addEventListener("change", () => {
    const opt = sel.options[sel.selectedIndex];
    const h = parseInt(opt.dataset.harga);
    hargaCell.dataset.value = h;
    hargaCell.textContent = numberToRupiah(h);
    recalcTotal();
  });
  $(".qty", tr).addEventListener("input", recalcTotal);
  $(".btnDel", tr).addEventListener("click", () => {
    tr.remove();
    recalcTotal();
  });
  sel.dispatchEvent(new Event("change"));
}

function initCheckout() {
  requireLogin();
  greet();
  $("#addItem")?.addEventListener("click", addCartRow);
  addCartRow();

  $("#formOrder")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = $("#inNama").value.trim();
    const email = $("#inEmail").value.trim();
    const bayar = $("#inBayar").value;
    if (!nama || !email || $$("#tCart tbody tr").length === 0) {
      alert("Mohon lengkapi data dan minimal 1 item.");
      return;
    }
    alert("Pemesanan berhasil dibuat! (simulasi front-end)");
    e.target.reset();
    $("#tCart tbody").innerHTML = "";
    addCartRow();
    recalcTotal();
  });
}

// === TRACKING ===
function statusToPercent(status, perjalananLen) {
  const base = {
    Dikirim: 35,
    "Dalam Perjalanan": 65,
    Selesai: 100,
    "Selesai Antar": 100,
  };
  if (base[status]) return base[status];
  if (perjalananLen >= 4) return 70;
  if (perjalananLen >= 2) return 40;
  return 20;
}

function initTracking() {
  requireLogin();
  greet();
  $("#formTrack")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nomor = $("#nomorDO").value.trim();
    const data = (window.dataTracking || {})[nomor];
    const out = $("#hasil");
    if (!data) {
      out.innerHTML = `<div class="card">Data untuk DO <b>${nomor}</b> tidak ditemukan.</div>`;
      return;
    }

    const percent = statusToPercent(data.status, data.perjalanan?.length || 0);
    const perjalananHTML = (data.perjalanan || [])
      .map(
        (p) =>
          `<tr><td>${p.waktu}</td><td>${p.keterangan}</td></tr>`
      )
      .join("");
    out.innerHTML = `
      <div class="card">
        <div class="row">
          <div class="col">
            <h2>Informasi Pemesan</h2>
            <p><b>Nama:</b> ${data.nama}</p>
            <p><b>Status:</b> ${data.status}</p>
            <div class="progress"><div class="bar" style="width:${percent}%"></div></div>
          </div>
          <div class="col">
            <h2>Detail Ekspedisi</h2>
            <p><b>Ekspedisi:</b> ${data.ekspedisi}</p>
            <p><b>Tanggal Kirim:</b> ${data.tanggalKirim}</p>
            <p><b>Jenis Paket:</b> ${data.paket}</p>
            <p><b>Total Pembayaran:</b> ${data.total}</p>
          </div>
        </div>
        <hr/>
        <h2>Riwayat Perjalanan</h2>
        <table>
          <thead><tr><th>Waktu</th><th>Keterangan</th></tr></thead>
          <tbody>${perjalananHTML}</tbody>
        </table>
      </div>
    `;
  });
}

// === Boot by body[data-page] ===
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login") initLogin();
  if (page === "dashboard") initDashboard();
  if (page === "stok") initStok();
  if (page === "checkout") initCheckout();
  if (page === "tracking") initTracking();
});
