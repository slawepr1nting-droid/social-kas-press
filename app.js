// 1. PWA Setup
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

// 2. Supabase Setup
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const NOMINAL_IURAN = 20000;

// Utilities
const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Set default dates
document.getElementById('tanggal').valueAsDate = new Date();
document.getElementById('input-bulan-iuran').value = getCurrentMonth();

// 3. Navigation System
function switchTab(tabId) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden-view'));
    // Show active view
    document.getElementById(`view-${tabId}`).classList.remove('hidden-view');
    
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tabId) {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-blue-600');
        } else {
            btn.classList.add('text-gray-400');
            btn.classList.remove('text-blue-600');
        }
    });

    // Load data based on tab
    if(tabId === 'dashboard') loadDashboard();
    if(tabId === 'iuran') loadIuran();
    if(tabId === 'transaksi') loadTransaksi();
    if(tabId === 'anggota') loadAnggota();
}

// ================= FUNGSI DASHBOARD =================
async function loadDashboard() {
    try {
        // Fetch All Iuran
        const { data: iuranData } = await supabaseClient.select('nominal').from('iuran_bulanan');
        const totalIuran = (iuranData || []).reduce((acc, curr) => acc + parseFloat(curr.nominal), 0);

        // Fetch All Kas
        const { data: kasData } = await supabaseClient.select('*').from('kas_sosial');
        let totalKasMasuk = 0;
        let totalKasKeluar = 0;
        
        const currentMonth = getCurrentMonth();
        let iuranBulanIni = 0;
        let kasMasukBulanIni = 0;

        (kasData || []).forEach(k => {
            const nom = parseFloat(k.nominal);
            if(k.jenis === 'masuk') totalKasMasuk += nom;
            else totalKasKeluar += nom;

            if(k.jenis === 'masuk' && k.tanggal.startsWith(currentMonth)) kasMasukBulanIni += nom;
        });

        // Get Iuran specific for this month
        const { data: iuranBulanIniData } = await supabaseClient.select('nominal').from('iuran_bulanan').eq('bulan_tahun', currentMonth);
        iuranBulanIni = (iuranBulanIniData || []).reduce((acc, curr) => acc + parseFloat(curr.nominal), 0);
        
        // Get total members for progress
        const { count: totalAnggota } = await supabaseClient.from('karyawan').select('*', { count: 'exact', head: true });
        
        const totalMasukKeseluruhan = totalIuran + totalKasMasuk;
        const totalSaldo = totalMasukKeseluruhan - totalKasKeluar;

        document.getElementById('dash-total-saldo').innerText = formatRp(totalSaldo);
        document.getElementById('dash-total-masuk').innerText = formatRp(totalMasukKeseluruhan);
        document.getElementById('dash-total-keluar').innerText = formatRp(totalKasKeluar);
        
        document.getElementById('dash-month-name').innerText = currentMonth;
        document.getElementById('dash-iuran-terkumpul').innerText = formatRp(iuranBulanIni);
        document.getElementById('dash-kas-masuk').innerText = formatRp(kasMasukBulanIni);
        document.getElementById('dash-iuran-progress').innerText = `${iuranBulanIniData ? iuranBulanIniData.length : 0} / ${totalAnggota || 0} Anggota`;

    } catch(e) {
        console.error(e);
    }
}

// ================= FUNGSI IURAN (CEKLIS) =================
async function loadIuran() {
    const listEl = document.getElementById('list-iuran');
    const selectedMonth = document.getElementById('input-bulan-iuran').value;
    listEl.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-blue-500"></i> Memuat...</div>';

    try {
        // Ambil data karyawan
        const { data: karyawan, error: errKar } = await supabaseClient.from('karyawan').select('*').order('nama');
        if (errKar) throw errKar;

        // Ambil data iuran di bulan terpilih
        const { data: iuranBulanIni, error: errIuran } = await supabaseClient.from('iuran_bulanan').select('*').eq('bulan_tahun', selectedMonth);
        if (errIuran) throw errIuran;

        // Buat map (set) id karyawan yang sudah bayar
        const sudahBayarMap = {};
        iuranBulanIni.forEach(i => { sudahBayarMap[i.karyawan_id] = i.id; });

        listEl.innerHTML = '';
        if(karyawan.length === 0) {
            listEl.innerHTML = '<div class="text-center text-sm text-gray-500 py-4 bg-white rounded-lg">Belum ada anggota terdaftar.</div>';
        }

        let lunasCount = 0;

        karyawan.forEach(k => {
            const isLunas = !!sudahBayarMap[k.id];
            if(isLunas) lunasCount++;

            const idHtml = `
            <div class="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border ${isLunas ? 'border-green-300 bg-green-50/30' : 'border-gray-100'} transition-all">
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

        document.getElementById('iuran-counter').innerText = `${lunasCount}/${karyawan.length} Lunas`;

    } catch (e) {
        console.error(e);
        listEl.innerHTML = '<div class="text-center text-red-500">Gagal memuat data iuran.</div>';
    }
}

async function toggleIuran(karyawan_id, bulan_tahun, checkboxEl) {
    const isChecked = checkboxEl.checked;
    checkboxEl.disabled = true; // prevent double click
    
    try {
        if(isChecked) {
            await supabaseClient.from('iuran_bulanan').insert([{ karyawan_id, bulan_tahun, nominal: NOMINAL_IURAN }]);
        } else {
            await supabaseClient.from('iuran_bulanan').delete().match({ karyawan_id, bulan_tahun });
        }
        // Update counter silently
        loadIuran(); // Reload view
    } catch(e) {
        alert('Gagal update status iuran');
        checkboxEl.checked = !isChecked; // revert
    } finally {
        checkboxEl.disabled = false;
    }
}

// ================= FUNGSI ANGGOTA =================
async function loadAnggota() {
    const listEl = document.getElementById('list-anggota');
    listEl.innerHTML = '<div class="text-center py-4">Memuat...</div>';
    
    const { data, error } = await supabaseClient.from('karyawan').select('*').order('nama');
    listEl.innerHTML = '';
    
    if(data && data.length > 0) {
        data.forEach((k, index) => {
            listEl.innerHTML += `
            <div class="bg-white p-3 rounded-lg shadow-sm flex items-center border border-gray-100">
                <div class="w-8 h-8 rounded bg-gray-100 text-gray-500 flex items-center justify-center font-bold mr-3">${index+1}</div>
                <div class="font-semibold text-gray-700">${k.nama}</div>
                <button onclick="hapusAnggota(${k.id})" class="ml-auto text-red-400 hover:text-red-600"><i class="fa-solid fa-trash"></i></button>
            </div>`;
        });
    } else {
        listEl.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">Belum ada anggota.</div>';
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
    if(!confirm('Hapus anggota ini? Data iuran terkait juga akan terhapus.')) return;
    await supabaseClient.from('karyawan').delete().eq('id', id);
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
