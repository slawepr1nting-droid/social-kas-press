// 1. PWA Setup dgn Auto-Update
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js');
    });
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

// 2. Supabase Setup
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const NOMINAL_IURAN = 20000;

// Variabel Global
let dashboardUnpaidMembers = [];
let dashboardPaidMembers = [];
window.globalKasData = [];
window.customDataMap = {}; 

const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const getCurrentYear = () => new Date().getFullYear();

// Setup Fungsi Share ke View Baru
function shareLink() {
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
    const shareUrl = `${baseUrl}/share.html`;
    
    // Copy ke clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert(`Link Laporan berhasil disalin!\n\nSilakan Paste dan kirim ke anggota:\n${shareUrl}`);
    }).catch(err => {
        prompt("Copy link laporan ini:", shareUrl);
    });
}

function isTargetMember(member, monthStr) {
    const customStatus = (window.customDataMap && window.customDataMap[monthStr]) ? window.customDataMap[monthStr][member.id] : null;
    if (customStatus === 'exclude') return false;
    if (customStatus === 'include') return true;
    
    if (!member.created_at) return true;
    const createdMonth = member.created_at.substring(0, 7);
    if (monthStr < createdMonth) return false;
    if (member.is_active === false && member.nonaktif_bulan && monthStr >= member.nonaktif_bulan) {
        return false; 
    }
    return true; 
}

document.getElementById('tanggal').valueAsDate = new Date();
document.getElementById('input-bulan-iuran').value = getCurrentMonth();
document.getElementById('dash-input-bulan').value = getCurrentMonth();

const selectTahunDash = document.getElementById('dash-input-tahun');
const cYear = getCurrentYear();
for(let y = cYear - 1; y <= cYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.text = y;
    if(y === cYear) opt.selected = true;
    selectTahunDash.appendChild(opt);
}

function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden-view'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden-view');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tabId) {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-blue-600');
        } else {
            btn.classList.add('text-gray-400');
            btn.classList.remove('text-blue-600');
        }
    });

    if(tabId === 'dashboard') loadDashboard();
    if(tabId === 'iuran') loadIuran();
    if(tabId === 'transaksi') loadTransaksi();
    if(tabId === 'anggota') loadAnggota();
}

let globalIuranData = [];
let globalAllMembers = [];

// ================= FUNGSI DASHBOARD =================
async function loadDashboard() {
    try {
        const selectedDashMonth = document.getElementById('dash-input-bulan').value;
        const [year, monthStrNum] = selectedDashMonth.split('-');
        
        const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const mIdx = parseInt(monthStrNum) - 1;
        document.getElementById('title-summary').innerHTML = `<i class="fa-solid fa-chart-pie text-blue-500 mr-2"></i>Summary (${namaBulan[mIdx]} ${year})`;

        const { data: allMembers } = await supabaseClient.from('karyawan').select('*').order('nama');
        const { data: iuranData } = await supabaseClient.from('iuran_bulanan').select('*');
        const { data: kasData } = await supabaseClient.from('kas_sosial').select('*');
        const { data: customData } = await supabaseClient.from('peserta_iuran_custom').select('*');

        globalAllMembers = allMembers || [];
        globalIuranData = iuranData || [];

        window.customDataMap = {};
        (customData || []).forEach(c => {
            if(!window.customDataMap[c.bulan_tahun]) window.customDataMap[c.bulan_tahun] = {};
            window.customDataMap[c.bulan_tahun][c.karyawan_id] = c.status;
        });

        window.globalKasData = kasData || [];

        const totalIuran = (iuranData || []).reduce((acc, curr) => acc + parseFloat(curr.nominal), 0);
        let totalKasMasuk = 0;
        let totalKasKeluar = 0;
        let pengeluaranBulanIni = 0;

        window.globalKasData.forEach(k => {
            const nom = parseFloat(k.nominal);
            if(k.jenis === 'masuk') {
                totalKasMasuk += nom;
            } else {
                totalKasKeluar += nom;
                if(k.tanggal.startsWith(selectedDashMonth)) pengeluaranBulanIni += nom; 
            }
        });

        const iuranBulanIniData = (iuranData || []).filter(i => i.bulan_tahun === selectedDashMonth);
        const iuranBulanIniTotal = iuranBulanIniData.reduce((acc, curr) => acc + parseFloat(curr.nominal), 0);
        
        const paidMemberIds = new Set(iuranBulanIniData.map(i => i.karyawan_id));
        
        const targetMembersBulanIni = globalAllMembers.filter(m => isTargetMember(m, selectedDashMonth) || paidMemberIds.has(m.id));

        dashboardPaidMembers = targetMembersBulanIni.filter(m => paidMemberIds.has(m.id));
        dashboardUnpaidMembers = targetMembersBulanIni.filter(m => !paidMemberIds.has(m.id));
        
        const lunasCount = dashboardPaidMembers.length;
        const belumLunasCount = dashboardUnpaidMembers.length;
        
        const totalMasukKeseluruhan = totalIuran + totalKasMasuk;
        const totalSaldo = totalMasukKeseluruhan - totalKasKeluar;

        document.getElementById('dash-total-saldo').innerText = formatRp(totalSaldo);
        document.getElementById('dash-total-masuk').innerText = formatRp(totalMasukKeseluruhan);
        document.getElementById('dash-total-keluar').innerText = formatRp(totalKasKeluar);
        
        document.getElementById('dash-iuran-terkumpul').innerText = formatRp(iuranBulanIniTotal);
        document.getElementById('dash-pengeluaran-bulan').innerText = formatRp(pengeluaranBulanIni);
        
        document.getElementById('dash-lunas-count').innerText = `${lunasCount} Lunas`;
        document.getElementById('dash-belum-lunas-count').innerText = `${belumLunasCount} Belum`;
        
        document.getElementById('count-belum').innerText = belumLunasCount;
        document.getElementById('count-lunas').innerText = lunasCount;

        renderRekapTahunan();

    } catch(e) {
        console.error(e);
    }
}

function renderRekapTahunan() {
    const selectedYear = document.getElementById('dash-input-tahun').value;
    
    const rekapKiriEl = document.getElementById('rekap-kiri');
    const rekapKananEl = document.getElementById('rekap-kanan');
    rekapKiriEl.innerHTML = '';
    rekapKananEl.innerHTML = '';
    
    const namaBulanSingkat = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const realCurrentMonthStr = getCurrentMonth();

    for (let m = 1; m <= 12; m++) {
        const blnString = String(m).padStart(2, '0');
        const blnKey = `${selectedYear}-${blnString}`;
        
        const dataBulanIni = globalIuranData.filter(i => i.bulan_tahun === blnKey);
        const nominalBulanIni = dataBulanIni.reduce((acc, curr) => acc + parseFloat(curr.nominal), 0);
        
        const paidIds = new Set(dataBulanIni.map(i => i.karyawan_id));
        const bulanPaidCount = paidIds.size;
        
        let targetAnggotaBulan = 0;
        globalAllMembers.forEach(mem => {
            if(isTargetMember(mem, blnKey) || paidIds.has(mem.id)) {
                targetAnggotaBulan++;
            }
        });
        
        const isFuture = blnKey > realCurrentMonthStr;
        const isLunas = targetAnggotaBulan > 0 && bulanPaidCount >= targetAnggotaBulan;
        
        let statusBadge = '';
        let opacityClass = 'bg-white';
        let borderClass = 'border-gray-200';
        
        if (isFuture) {
            statusBadge = `<span class="text-[9px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">--</span>`;
            opacityClass = 'bg-gray-50 opacity-60';
        } else if (targetAnggotaBulan === 0) {
            statusBadge = `<span class="text-[9px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Kosong</span>`;
            opacityClass = 'bg-gray-50 opacity-60';
        } else if (isLunas) {
            statusBadge = `<span class="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded"><i class="fa-solid fa-check mr-0.5"></i>Lunas</span>`;
            borderClass = 'border-green-200';
        } else {
            statusBadge = `<span class="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Belum</span>`;
            borderClass = 'border-red-200';
        }

        const singkatanBulan = namaBulanSingkat[m-1];
        
        const rowHtml = `
        <div class="p-2 border ${borderClass} rounded-lg flex flex-col justify-center ${opacityClass} transition-colors">
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-gray-700 text-[11px] uppercase">${singkatanBulan}</span>
                ${statusBadge}
            </div>
            <div class="font-bold text-blue-600 text-xs">${formatRp(nominalBulanIni)}</div>
            <div class="text-[9px] text-gray-500 font-medium mt-0.5">${bulanPaidCount}/${targetAnggotaBulan} Lunas</div>
        </div>`;
        
        if (m <= 6) {
            rekapKiriEl.innerHTML += rowHtml;
        } else {
            rekapKananEl.innerHTML += rowHtml;
        }
    }
}

// ================= FUNGSI MODAL =================
function showUnpaidModal() {
    const selectedDashMonth = document.getElementById('dash-input-bulan').value;
    document.getElementById('modal-subtitle').innerText = 'Bulan: ' + selectedDashMonth;
    switchModalTab('belum'); 
    document.getElementById('modal-belum-lunas').classList.remove('hidden');
}
function closeUnpaidModal() {
    document.getElementById('modal-belum-lunas').classList.add('hidden');
}
function showPengeluaranModal() {
    const selectedDashMonth = document.getElementById('dash-input-bulan').value;
    document.getElementById('modal-pengeluaran-subtitle').innerText = 'Bulan: ' + selectedDashMonth;
    const listEl = document.getElementById('list-pengeluaran-content');
    listEl.innerHTML = '';
    const dataBulanIni = (window.globalKasData || []).filter(k => k.jenis === 'keluar' && k.tanggal.startsWith(selectedDashMonth));
    if(dataBulanIni.length === 0) {
        listEl.innerHTML = '<div class="text-center text-gray-500 py-8">Tidak ada pengeluaran bulan ini.</div>';
    } else {
        dataBulanIni.forEach(k => {
            listEl.innerHTML += `
            <div class="bg-white p-3 rounded-lg shadow-sm mb-2 flex justify-between items-center border-l-4 border-red-400">
                <div>
                    <div class="font-semibold text-gray-700 text-sm">${k.keterangan}</div>
                    <div class="text-[10px] text-gray-500">${k.tanggal}</div>
                </div>
                <div class="font-bold text-red-600 text-sm">- ${formatRp(k.nominal)}</div>
            </div>`;
        });
    }
    document.getElementById('modal-pengeluaran').classList.remove('hidden');
}
function closePengeluaranModal() {
    document.getElementById('modal-pengeluaran').classList.add('hidden');
}

function switchModalTab(tabType) {
    const btnBelum = document.getElementById('tab-belum');
    const btnLunas = document.getElementById('tab-lunas');
    const listEl = document.getElementById('list-modal-content');
    listEl.innerHTML = '';

    if (tabType === 'belum') {
        btnBelum.className = "flex-1 py-3 text-red-600 border-b-2 border-red-600 text-center transition-colors";
        btnLunas.className = "flex-1 py-3 text-gray-400 border-b-2 border-transparent hover:text-gray-600 text-center transition-colors";
        
        if (dashboardUnpaidMembers.length === 0) {
            listEl.innerHTML = '<div class="text-center text-gray-500 py-8"><i class="fa-solid fa-face-laugh-beam text-4xl text-green-400 mb-3 block"></i>Hebat! Semua anggota sudah lunas.</div>';
        } else {
            dashboardUnpaidMembers.forEach((m, i) => {
                listEl.innerHTML += `
                <div class="bg-white p-3 rounded-lg shadow-sm mb-2 flex items-center gap-3 border-l-4 border-red-400">
                    <div class="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">${i + 1}</div>
                    <div class="font-semibold text-gray-700">${m.nama}</div>
                </div>`;
            });
        }
    } else {
        btnLunas.className = "flex-1 py-3 text-green-600 border-b-2 border-green-600 text-center transition-colors";
        btnBelum.className = "flex-1 py-3 text-gray-400 border-b-2 border-transparent hover:text-gray-600 text-center transition-colors";

        if (dashboardPaidMembers.length === 0) {
            listEl.innerHTML = '<div class="text-center text-gray-500 py-8"><i class="fa-solid fa-face-frown-open text-4xl text-gray-300 mb-3 block"></i>Belum ada yang lunas.</div>';
        } else {
            dashboardPaidMembers.forEach((m, i) => {
                listEl.innerHTML += `
                <div class="bg-white p-3 rounded-lg shadow-sm mb-2 flex items-center gap-3 border-l-4 border-green-400">
                    <div class="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold text-xs">${i + 1}</div>
                    <div class="font-semibold text-gray-700">${m.nama}</div>
                </div>`;
            });
        }
    }
}

async function showAturPesertaModal() {
    const selectedMonth = document.getElementById('input-bulan-iuran').value;
    document.getElementById('modal-atur-peserta-subtitle').innerText = 'Bulan: ' + selectedMonth;
    document.getElementById('modal-atur-peserta').classList.remove('hidden');
    renderAturPesertaList();
}

function closeAturPesertaModal() {
    document.getElementById('modal-atur-peserta').classList.add('hidden');
}

async function renderAturPesertaList() {
    const listEl = document.getElementById('list-atur-peserta-content');
    listEl.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-blue-500"></i> Memuat Master Data...</div>';
    
    const selectedMonth = document.getElementById('input-bulan-iuran').value;
    const { data: allMembers } = await supabaseClient.from('karyawan').select('*').order('nama');
    
    listEl.innerHTML = '';
    
    allMembers.forEach(m => {
        const isParticipating = isTargetMember(m, selectedMonth);
        listEl.innerHTML += `
        <div class="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center border border-gray-100">
            <div class="font-semibold text-gray-700 text-sm">${m.nama}</div>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" ${isParticipating ? 'checked' : ''} onchange="togglePesertaCustom(${m.id}, '${selectedMonth}', this)">
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
        </div>`;
    });
}

async function togglePesertaCustom(karyawan_id, bulan_tahun, checkboxEl) {
    const isChecked = checkboxEl.checked;
    checkboxEl.disabled = true;
    const newStatus = isChecked ? 'include' : 'exclude';
    
    try {
        const { error } = await supabaseClient.from('peserta_iuran_custom').upsert([
            { bulan_tahun: bulan_tahun, karyawan_id: karyawan_id, status: newStatus }
        ], { onConflict: 'bulan_tahun,karyawan_id' }); 
        
        if(error) throw error;
        
        if(!window.customDataMap[bulan_tahun]) window.customDataMap[bulan_tahun] = {};
        window.customDataMap[bulan_tahun][karyawan_id] = newStatus;
        
        loadIuran();
    } catch(e) {
        alert('Gagal update status peserta iuran bulan ini.');
        checkboxEl.checked = !isChecked;
    } finally {
        checkboxEl.disabled = false;
    }
}


// ================= FUNGSI IURAN (CEKLIS) =================
async function loadIuran() {
    const listEl = document.getElementById('list-iuran');
    const selectedMonth = document.getElementById('input-bulan-iuran').value;
    listEl.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-blue-500"></i> Memuat...</div>';

    try {
        const { data: allMembers, error: errKar } = await supabaseClient.from('karyawan').select('*').order('nama');
        if (errKar) throw errKar;

        const { data: customData } = await supabaseClient.from('peserta_iuran_custom').select('*').eq('bulan_tahun', selectedMonth);
        
        if(!window.customDataMap) window.customDataMap = {};
        window.customDataMap[selectedMonth] = {};
        (customData || []).forEach(c => {
            window.customDataMap[selectedMonth][c.karyawan_id] = c.status;
        });

        const { data: iuranBulanIni, error: errIuran } = await supabaseClient.from('iuran_bulanan').select('*').eq('bulan_tahun', selectedMonth);
        if (errIuran) throw errIuran;

        const sudahBayarMap = {};
        iuranBulanIni.forEach(i => { sudahBayarMap[i.karyawan_id] = i.id; });

        const targetMembers = (allMembers || []).filter(m => isTargetMember(m, selectedMonth) || sudahBayarMap[m.id]);

        window.lunasCountGlobal = 0;
        window.totalAnggotaGlobal = targetMembers.length;

        listEl.innerHTML = '';
        if(targetMembers.length === 0) {
            listEl.innerHTML = '<div class="text-center text-sm text-gray-500 py-4 bg-white rounded-lg">Tidak ada anggota wajib iuran bulan ini.<br><small>Gunakan tombol Atur Peserta di atas.</small></div>';
        }

        targetMembers.forEach(k => {
            const isLunas = !!sudahBayarMap[k.id];
            if(isLunas) window.lunasCountGlobal++;

            const bgClass = isLunas ? 'border-green-300 bg-green-50/30' : 'border-gray-100 bg-white';
            
            const idHtml = `
            <div id="card-iuran-${k.id}" class="p-3 rounded-xl shadow-sm flex justify-between items-center border ${bgClass} transition-all duration-300">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        ${k.nama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="font-bold text-gray-800">${k.nama}</div>
                        <div class="text-xs text-gray-500">Iuran: Rp 20.000</div>
                    </div>
                </div>
                <div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" ${isLunas ? 'checked' : ''} onchange="toggleIuran(${k.id}, '${selectedMonth}', this)">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                </div>
            </div>`;
            listEl.innerHTML += idHtml;
        });

        document.getElementById('iuran-counter').innerText = `${window.lunasCountGlobal}/${window.totalAnggotaGlobal} Lunas`;

    } catch (e) {
        console.error(e);
        listEl.innerHTML = '<div class="text-center text-red-500 py-4">Gagal memuat data iuran.</div>';
    }
}

async function toggleIuran(karyawan_id, bulan_tahun, checkboxEl) {
    const isChecked = checkboxEl.checked;
    checkboxEl.disabled = true; 
    const card = document.getElementById(`card-iuran-${karyawan_id}`);

    try {
        if(isChecked) {
            await supabaseClient.from('iuran_bulanan').insert([{ karyawan_id, bulan_tahun, nominal: NOMINAL_IURAN }]);
            card.classList.add('border-green-300', 'bg-green-50/30');
            card.classList.remove('border-gray-100', 'bg-white');
            window.lunasCountGlobal++;
        } else {
            await supabaseClient.from('iuran_bulanan').delete().match({ karyawan_id, bulan_tahun });
            card.classList.remove('border-green-300', 'bg-green-50/30');
            card.classList.add('border-gray-100', 'bg-white');
            window.lunasCountGlobal--;
        }
        document.getElementById('iuran-counter').innerText = `${window.lunasCountGlobal}/${window.totalAnggotaGlobal} Lunas`;
    } catch(e) {
        alert('Gagal update status iuran. Periksa koneksi.');
        checkboxEl.checked = !isChecked; 
    } finally {
        checkboxEl.disabled = false;
    }
}

// ================= FUNGSI MASTER ANGGOTA =================
async function loadAnggota() {
    const listEl = document.getElementById('list-anggota');
    listEl.innerHTML = '<div class="text-center py-4">Memuat...</div>';
    
    const { data, error } = await supabaseClient.from('karyawan').select('*').eq('is_active', true).order('nama');
    listEl.innerHTML = '';
    
    if(data && data.length > 0) {
        data.forEach((k, index) => {
            listEl.innerHTML += `
            <div class="bg-white p-3 rounded-lg shadow-sm flex items-center border border-gray-100">
                <div class="w-8 h-8 rounded bg-gray-100 text-gray-500 flex items-center justify-center font-bold mr-3">${index+1}</div>
                <div class="font-semibold text-gray-700">${k.nama}</div>
                <button onclick="hapusAnggota(${k.id})" class="ml-auto text-red-400 hover:text-red-600" title="Non-aktifkan Anggota (Tidak dihapus dari history)"><i class="fa-solid fa-user-minus"></i></button>
            </div>`;
        });
    } else {
        listEl.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">Belum ada master anggota.</div>';
    }
}

document.getElementById('form-anggota').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('nama-anggota');
    const nama = input.value;
    input.disabled = true;
    try {
        await supabaseClient.from('karyawan').insert([{ nama }]);
        input.value = '';
        loadAnggota();
    } catch(err) {
        alert('Gagal menambah anggota');
    } finally {
        input.disabled = false;
    }
});

async function hapusAnggota(id) {
    if(!confirm('Keluarkan anggota ini dari master data? (Catatan: Riwayat iuran bulan lalu tetap aman)')) return;
    const currMonth = getCurrentMonth();
    await supabaseClient.from('karyawan').update({ is_active: false, nonaktif_bulan: currMonth }).eq('id', id);
    loadAnggota();
}

// ================= FUNGSI TRANSAKSI KAS =================
async function loadTransaksi() {
    const listEl = document.getElementById('list-transaksi');
    listEl.innerHTML = '...';
    const { data, error } = await supabaseClient.from('kas_sosial').select('*').order('tanggal', { ascending: false });
    listEl.innerHTML = '';
    
    if(data && data.length > 0) {
        data.forEach(item => {
            const isMasuk = item.jenis === 'masuk';
            const icon = isMasuk ? 'fa-arrow-trend-up text-green-500' : 'fa-arrow-trend-down text-red-500';
            const sign = isMasuk ? '+' : '-';
            const color = isMasuk ? 'text-green-600' : 'text-red-600';
            listEl.innerHTML += `
            <div class="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border-l-4 ${isMasuk ? 'border-green-500' : 'border-red-500'}">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${isMasuk ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center"><i class="fa-solid ${icon}"></i></div>
                    <div>
                        <div class="font-semibold text-gray-800 text-sm">${item.keterangan}</div>
                        <div class="text-[10px] text-gray-500">${item.tanggal}</div>
                    </div>
                </div>
                <div class="font-bold text-sm ${color}">${sign}${formatRp(item.nominal)}</div>
                <button onclick="hapusTransaksi(${item.id})" class="ml-2 text-gray-300 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
        });
    }
}

document.getElementById('form-kas').addEventListener('submit', async (e) => {
    e.preventDefault();
    const jenis = document.querySelector('input[name="jenis"]:checked').value;
    const tanggal = document.getElementById('tanggal').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;
    try {
        await supabaseClient.from('kas_sosial').insert([{ jenis, tanggal, keterangan, nominal }]);
        e.target.reset();
        document.getElementById('tanggal').valueAsDate = new Date();
        loadTransaksi();
    } catch (err) {
        alert('Gagal menyimpan transaksi');
    }
});

async function hapusTransaksi(id) {
    if(confirm('Hapus histori transaksi ini?')) {
        await supabaseClient.from('kas_sosial').delete().eq('id', id);
        loadTransaksi();
    }
}

// Inisialisasi awal
switchTab('dashboard');
