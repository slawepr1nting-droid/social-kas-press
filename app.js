// 1. Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW terdaftar!', reg.scope))
            .catch(err => console.error('SW gagal terdaftar:', err));
    });
}

// 2. Inisialisasi Supabase menggunakan client dari CDN
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// 3. Fungsi Format Rupiah
const formatRp = (angka) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(angka);
};

// Set default input tanggal ke hari ini
document.getElementById('tanggal').valueAsDate = new Date();

// 4. Fungsi Load Data dari Database
async function loadData() {
    const listEl = document.getElementById('list-transaksi');
    
    try {
        const { data, error } = await supabaseClient
            .from('kas_sosial')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        let total = 0;
        listEl.innerHTML = '';

        if(data.length === 0) {
            listEl.innerHTML = '<div class="text-center text-gray-500 py-6 bg-white rounded-xl shadow-sm">Belum ada transaksi</div>';
        }

        data.forEach(item => {
            const nominal = parseFloat(item.nominal);
            if (item.jenis === 'masuk') total += nominal;
            else total -= nominal;

            const isMasuk = item.jenis === 'masuk';
            const icon = isMasuk ? 'fa-arrow-trend-up text-green-500' : 'fa-arrow-trend-down text-red-500';
            const colorClass = isMasuk ? 'text-green-600' : 'text-red-600';
            const sign = isMasuk ? '+' : '-';

            const itemHtml = `
                <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border-l-4 ${isMasuk ? 'border-green-500' : 'border-red-500'}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${isMasuk ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div>
                            <div class="font-semibold text-gray-800">${item.keterangan}</div>
                            <div class="text-xs text-gray-500 mt-0.5"><i class="fa-regular fa-calendar mr-1"></i> ${item.tanggal}</div>
                        </div>
                    </div>
                    <div class="font-bold ${colorClass}">
                        ${sign}${formatRp(nominal)}
                    </div>
                </div>
            `;
            listEl.innerHTML += itemHtml;
        });

        document.getElementById('total-saldo').innerText = formatRp(total);
    } catch (err) {
        console.error(err);
        if(CONFIG.SUPABASE_URL.includes('ISI_DENGAN')) {
            listEl.innerHTML = `
                <div class="text-center text-red-500 py-6 bg-white rounded-xl shadow-sm border border-red-200">
                    <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i><br>
                    Anda belum memasukkan URL & Key Supabase.<br>Silakan edit file <b>config.js</b>
                </div>`;
        } else {
            alert('Gagal memuat data dari database!');
        }
    }
}

// 5. Menangani Submit Form Kas
document.getElementById('form-kas').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btnSubmit.disabled = true;
    btnSubmit.classList.add('opacity-75');

    const jenis = document.querySelector('input[name="jenis"]:checked').value;
    const tanggal = document.getElementById('tanggal').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    try {
        const { error } = await supabaseClient
            .from('kas_sosial')
            .insert([{ jenis, tanggal, keterangan, nominal }]);

        if (error) throw error;
        
        // Reset form setelah berhasil
        e.target.reset();
        document.getElementById('tanggal').valueAsDate = new Date();
        document.querySelector('input[value="masuk"]').checked = true;
        
        // Refresh data
        loadData();
    } catch (err) {
        console.error(err);
        alert('Gagal menyimpan transaksi. Cek koneksi atau konfigurasi database.');
    } finally {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('opacity-75');
    }
});

// Jalankan load data pertama kali aplikasi dibuka
loadData();
