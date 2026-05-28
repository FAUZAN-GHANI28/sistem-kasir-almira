
  // --- KONFIGURASI SUPABASE ---
  const supabaseUrl = 'https://jqpjqngxbgmtaaqgsbnf.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcGpxbmd4YmdtdGFhcWdzYm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTM0NTgsImV4cCI6MjA5NTM4OTQ1OH0.6zKUc3bvey7cmHWNpz2pebhg4Rz6mFjQiTksrcFH4og';
  const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

  let currentUser = null;

  // --- REALTIME SETUP ---
  let realtimeChannel = null;
  function setupRealtime() {
    if (realtimeChannel) return; // Prevent multiple subscriptions
    let debounceTimer;
    realtimeChannel = supabaseClient.channel('public:master_barang')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_barang' }, payload => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // Refresh products and UI silently
          if (typeof loadProductsTable === 'function' && document.getElementById('product-table-body')) {
             loadProductsTable();
          }
          if (typeof initCashier === 'function' && document.getElementById('pos-product-grid')) {
             // We just need to refresh posProducts, not the whole cashier logic
             loadProductsData().then(data => {
               posProducts = data;
               renderPosProducts(posProducts);
             });
          }
        }, 500);
      })
      .subscribe();
  }

  // --- LOGIKA AUTENTIKASI ---
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
      currentUser = session.user;
      document.getElementById('auth-container').classList.add('hidden');
      document.getElementById('main-app-container').classList.remove('hidden');
      setupRealtime();
    } else {
      currentUser = null;
      document.getElementById('auth-container').classList.remove('hidden');
      document.getElementById('main-app-container').classList.add('hidden');
      if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    }
  });

  async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Memproses...';
    btn.disabled = true;

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Login berhasil!', 'success');
      // Session otomatis tertangkap di onAuthStateChange
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
  }

  async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Memproses...';
    btn.disabled = true;

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Pendaftaran berhasil! Silakan login.', 'success');
      switchAuthView('login');
      document.getElementById('login-email').value = email;
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-forgot');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Mengirim...';
    btn.disabled = true;

    const email = document.getElementById('forgot-email').value;

    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Tautan reset kata sandi telah dikirim ke email Anda.', 'success');
      switchAuthView('login');
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
  }

  async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Berhasil keluar.', 'success');
    }
  }

  // --- CUSTOM CONFIRM MODAL ---
  function showConfirm(title, message, isDanger) {
    if (isDanger === undefined) isDanger = true;
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const content = document.getElementById('confirm-content');
      const btnOk = document.getElementById('btn-confirm-ok');
      const btnCancel = document.getElementById('btn-confirm-cancel');
      const iconWrap = document.getElementById('confirm-icon-wrapper');
      const icon = document.getElementById('confirm-icon');
      
      document.getElementById('confirm-title').innerText = title;
      document.getElementById('confirm-message').innerText = message;
      
      if (isDanger) {
         btnOk.className = "flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition shadow-lg shadow-red-500/30";
         btnOk.innerText = "Hapus";
         iconWrap.className = "w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4";
         icon.className = "ri-error-warning-line text-3xl";
      } else {
         btnOk.className = "flex-1 px-4 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/30";
         btnOk.innerText = "Ya, Lanjutkan";
         iconWrap.className = "w-16 h-16 bg-blue-100 text-primary rounded-full flex items-center justify-center mb-4";
         icon.className = "ri-question-line text-3xl";
      }
      
      modal.classList.remove('hidden');
      setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
      
      const cleanup = () => {
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); }, 300);
        btnOk.onclick = null;
        btnCancel.onclick = null;
      };
      
      btnOk.onclick = () => { cleanup(); resolve(true); };
      btnCancel.onclick = () => { cleanup(); resolve(false); };
    });
  }

  // --- STATE APLIKASI ---
  const AppState = { products: [], cart: [], settings: { SATUAN: ['Pcs', 'Kg', 'Liter', 'Pack', 'Renteng', 'Butir', 'Gram'] } };

  async function loadGlobalSettings() {
    try {
      const { data, error } = await supabaseClient.from('setting').select('*').eq('id', 1).single();
      if(data) {
        AppState.settings = { ...AppState.settings, ...data };
      }
    } catch(err) {
      console.error(err);
    }
    
    if(!AppState.settings.nama_toko) AppState.settings.nama_toko = 'Almira POS';
    
    const titleEl = document.querySelector('header h1');
    if(titleEl) titleEl.innerText = AppState.settings.nama_toko;
  }

  function loadPage(page) {
    
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    const targetPage = document.getElementById('page-' + page);
    if(targetPage) { targetPage.classList.remove('hidden'); }
    
    // updateActiveMenu implementation
    document.querySelectorAll('.sidebar-menu, .bottom-menu').forEach(el => {
        el.classList.remove('text-primary', 'bg-primary/10');
        el.classList.add('text-slate-400');
    });
    
    const activeSidebar = document.getElementById('menu-' + page);
    if (activeSidebar) {
        activeSidebar.classList.remove('text-slate-400');
        activeSidebar.classList.add('text-primary', 'bg-primary/10');
    }
    
    const activeBottom = document.getElementById('bottom-menu-' + page);
    if (activeBottom) {
        activeBottom.classList.remove('text-slate-400');
        activeBottom.classList.add('text-primary');
    }

    if(page === 'dashboard' && typeof loadDashboardData === 'function') loadDashboardData();
    if(page === 'product' && typeof loadProductsTable === 'function') loadProductsTable();
    if(page === 'report' && typeof loadReportLogic === 'function') loadReportLogic();
    if(page === 'cashier' && typeof initCashier === 'function') initCashier();

    
    // Load settings if not loaded yet
    if(!AppState.settings.NAMA_TOKO) loadGlobalSettings();
  }

  function initPageLogic(page) {
    if (page === 'dashboard') loadDashboardData();
    if (page === 'product') loadProductsTable();
    if (page === 'cashier') initCashier();
    if (page === 'report') loadReportLogic();
  }

  window.checkAndInitDB = async function() {
    showToast('Menyinkronkan data dengan database...', 'info');
    try {
      await loadGlobalSettings();
      const activeMenu = document.querySelector('.sidebar-menu.text-primary');
      if (activeMenu) {
         const page = activeMenu.id.replace('menu-', '');
         initPageLogic(page);
      } else {
         window.location.reload();
      }
      setTimeout(() => showToast('Sinkronisasi selesai!', 'success'), 1000);
    } catch(err) {
      showToast('Gagal sinkronisasi: ' + err.message, 'error');
    }
  };

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const texts = document.querySelectorAll('.sidebar-text');
    
    if (sidebar.classList.contains('w-64')) {
      sidebar.classList.remove('w-64');
      sidebar.classList.add('w-20');
      texts.forEach(el => el.classList.add('hidden'));
    } else {
      sidebar.classList.remove('w-20');
      sidebar.classList.add('w-64');
      texts.forEach(el => el.classList.remove('hidden'));
    }
  }

  function showLoading() {}
  function hideLoading() {}

  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colorClass = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    toast.className = `flex items-center text-white px-4 py-3 rounded shadow-lg mb-3 ${colorClass} toast-enter`;
    toast.innerHTML = `<i class="ri-${type === 'success' ? 'checkbox-circle-line' : 'error-warning-line'} text-xl mr-2"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-enter-active'); }, 10);
    setTimeout(() => {
      toast.classList.remove('toast-enter-active');
      toast.classList.add('toast-leave-active');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  }
  
  function formatNumberOnly(val) {
    if(!val) return '';
    return parseInt(val).toLocaleString('id-ID');
  }

  function formatInputNumber(element) {
    let cursorPosition = element.selectionStart;
    let originalLength = element.value.length;
    
    let val = element.value.replace(/[^0-9]/g, '');
    if(val) {
      element.value = parseInt(val, 10).toLocaleString('id-ID');
    } else {
      element.value = '';
    }
    
    let newLength = element.value.length;
    cursorPosition = cursorPosition + (newLength - originalLength);
    element.setSelectionRange(cursorPosition, cursorPosition);
  }
  
  function formatDate(dateStr) {
      if(!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // --- DASHBOARD LOGIC ---
  let salesChartInstance = null;

  let isDashBalanceVisible = true;
  let currentDashSummary = { sales: 0, profit: 0, orders: 0 };
  
  function toggleDashBalanceVisibility(e) {
    if(e) e.stopPropagation();
    isDashBalanceVisible = !isDashBalanceVisible;
    const eyeIcon = document.getElementById('dash-eye-icon');
    const eyeText = document.getElementById('dash-eye-text');
    
    if (eyeIcon) {
      if (isDashBalanceVisible) {
        eyeIcon.className = 'ri-eye-line';
        if(eyeText) eyeText.innerText = 'Sembunyikan';
      } else {
        eyeIcon.className = 'ri-eye-off-line';
        if(eyeText) eyeText.innerText = 'Tampilkan';
      }
    }
    updateDashSummaryCardsUI();
  }
  
  function updateDashSummaryCardsUI() {
    const elSales = document.getElementById('dash-today-sales');
    const elProfit = document.getElementById('dash-today-profit');
    const elOrders = document.getElementById('dash-today-orders');
    
    if(elSales && elProfit) {
      if (isDashBalanceVisible) {
        elSales.innerText = formatRupiah(currentDashSummary.sales);
        elProfit.innerText = formatRupiah(currentDashSummary.profit);
      } else {
        elSales.innerText = 'Rp •••••••';
        elProfit.innerText = 'Rp •••••••';
      }
    }
    if(elOrders) {
       elOrders.innerText = currentDashSummary.orders;
    }
  }

  async function loadDashboardData() {
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const { data: salesData, error: salesErr } = await supabaseClient.from('penjualan')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(1000);
      if (salesErr) throw salesErr;
      
      const { data: detailData } = await supabaseClient.from('detail_penjualan').select('*');
      const { data: productData } = await supabaseClient.from('master_barang').select('*');
      
      const costMap = {};
      if (productData) {
         productData.forEach(p => costMap[p.id_produk] = p.harga_beli || 0);
      }
      
      const profitMap = {}; 
      if (detailData) {
         detailData.forEach(d => {
            const hBeli = costMap[d.id_produk] || 0;
            const hJual = d.harga || 0;
            const profit = (hJual - hBeli) * d.qty;
            if (!profitMap[d.id_jual]) profitMap[d.id_jual] = 0;
            profitMap[d.id_jual] += profit;
         });
      }

      let todaySales = 0;
      let todayProfit = 0;
      let todayOrders = 0;
      
      const last7Days = [];
      for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push({
           dateStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
           label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,
           sales: 0,
           profit: 0
        });
      }

      const recentSales = salesData
        .sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal))
        .slice(0, 5)
        .map(r => ({
           ID_JUAL: r.id_jual,
           TANGGAL: r.tanggal,
           METODE: r.metode_pembayaran,
           TOTAL: r.total
        }));
        
      salesData.forEach(sale => {
         if (sale.status_transaksi === 'REFUNDED') return; // Abaikan refund
         const saleDate = new Date(sale.tanggal);
         const dateStr = `${saleDate.getFullYear()}-${String(saleDate.getMonth()+1).padStart(2,'0')}-${String(saleDate.getDate()).padStart(2,'0')}`;
         const saleProfit = profitMap[sale.id_jual] || 0;
         
         if (saleDate >= today) {
            todaySales += sale.total;
            todayProfit += saleProfit;
            todayOrders++;
         }
         
         const chartDay = last7Days.find(d => d.dateStr === dateStr);
         if (chartDay) {
            chartDay.sales += sale.total;
            chartDay.profit += saleProfit;
         }
      });
      
      const stockData = productData ? productData.filter(p => p.stock <= (p.batas_stok != null ? p.batas_stok : 4) && p.kode_barang !== 'MANUAL') : [];
      const lowStockProducts = stockData.map(p => ({
         NAMA_PRODUK: p.nama_barang,
         BARCODE: p.barcode,
         ID_PRODUK: p.id_produk,
         STOK: p.stock
      }));

      currentDashSummary.sales = todaySales;
      currentDashSummary.profit = todayProfit;
      currentDashSummary.orders = todayOrders;
      updateDashSummaryCardsUI();
      
      const ctx = document.getElementById('sales-chart');
      if (ctx && typeof Chart !== 'undefined') {
        if(salesChartInstance) salesChartInstance.destroy();
        salesChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: last7Days.map(d => d.label),
            datasets: [
              {
                label: 'Pendapatan',
                data: last7Days.map(d => d.sales),
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              },
              {
                label: 'Laba Bersih',
                data: last7Days.map(d => d.profit),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
              tooltip: {
                callbacks: {
                  label: function(context) { return context.dataset.label + ': ' + formatRupiah(context.parsed.y); }
                }
              }
            },
            scales: {
              y: { beginAtZero: true, ticks: { callback: function(value) { 
                if (value >= 1000000) return 'Rp ' + (value/1000000).toFixed(1).replace(/\.0$/, '') + 'M';
                if (value >= 1000) return 'Rp ' + (value/1000).toFixed(1).replace(/\.0$/, '') + 'k';
                return 'Rp ' + value; 
              } } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      const txTbody = document.getElementById('dash-recent-tx');
      if (txTbody) {
        txTbody.innerHTML = '';
        if (recentSales.length === 0) {
          txTbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400">Belum ada transaksi</td></tr>`;
        } else {
          recentSales.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-50 hover:bg-slate-50 transition';
            tr.innerHTML = `<td class="p-4 font-mono text-slate-500">#${r.ID_JUAL}</td><td class="p-4 text-slate-600">${formatDate(r.TANGGAL)}</td><td class="p-4 text-center"><span class="px-2 py-1 rounded text-xs font-bold ${r.METODE==='QRIS'?'bg-purple-100 text-purple-600':'bg-green-100 text-green-600'}">${r.METODE || 'CASH'}</span></td><td class="p-4 text-right font-bold text-slate-800">${formatRupiah(r.TOTAL)}</td>`;
            txTbody.appendChild(tr);
          });
        }
      }
      
      const stockList = document.getElementById('dash-low-stock-list');
      if (stockList) {
        stockList.innerHTML = '';
        if (lowStockProducts.length === 0) {
          stockList.innerHTML = `<div class="p-8 flex-1 flex items-center justify-center text-slate-400">Semua stok aman</div>`;
        } else {
          lowStockProducts.forEach(p => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition";
            div.innerHTML = `<div><p class="font-medium text-slate-800">${p.NAMA_PRODUK}</p></div><div class="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-bold">Sisa ${p.STOK}</div>`;
            stockList.appendChild(div);
          });
        }
      }
    } catch(err) {
      showToast('Gagal memuat dashboard: ' + err.message, 'error');
      const tx = document.getElementById('dash-recent-tx');
      if(tx) tx.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-400">Gagal memuat data</td></tr>`;
      const sl = document.getElementById('dash-low-stock-list');
      if(sl) sl.innerHTML = `<div class="p-8 text-center text-red-400">Gagal memuat data</div>`;
    }
  }
  async function loadProductsData() {
    const { data, error } = await supabaseClient.from('master_barang').select('*').neq('kode_barang', 'MANUAL');
    if (error) {
       showToast(error.message, 'error');
       return [];
    }
    const result = data.map(p => ({
       ID_PRODUK: p.id_produk,
       NAMA_PRODUK: p.nama_barang,
       BARCODE: p.barcode,
       HARGA_BELI: p.harga_beli,
       HARGA_JUAL: p.harga_jual,
       STOK: p.stock,
       SATUAN: p.satuan,
       KATEGORI: p.kategori,
       KODE_BARANG: p.kode_barang,
       BATAS_STOK: p.batas_stok
    }));
    AppState.products = result;
    return result;
  }

  let productList = [];
  async function loadProductsTable() {
    productList = await loadProductsData();
    renderProducts(productList);
    
    const searchInput = document.getElementById('search-product');
    // Replace old listener to avoid duplicate bindings, or simply clone it
    const newSearch = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearch, searchInput);
    
    newSearch.addEventListener('input', (e) => {
      const keyword = e.target.value.toLowerCase();
      const filtered = productList.filter(p => (p.NAMA_PRODUK && p.NAMA_PRODUK.toLowerCase().includes(keyword)) || (p.BARCODE && p.BARCODE.toLowerCase().includes(keyword)) || (p.KODE_BARANG && p.KODE_BARANG.toLowerCase().includes(keyword)));
      renderProducts(filtered);
    });
  }

  function renderProducts(data) {
    const tbody = document.getElementById('product-table-body');
    if(data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">Tidak ada data produk</td></tr>`;
      return;
    }
    
    const fragment = document.createDocumentFragment();
    data.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition duration-150 cursor-pointer';
      tr.onclick = () => editProduct(p.ID_PRODUK);
      tr.innerHTML = `
        <td class="px-6 py-4 hidden md:table-cell"><span class="font-mono text-xs bg-slate-100 px-2.5 py-1.5 rounded-md text-slate-600">${p.BARCODE || p.ID_PRODUK}</span></td>
        <td class="px-6 py-4 font-bold text-slate-800">${p.NAMA_PRODUK}</td>
        <td class="px-6 py-4 text-right text-slate-500">${formatRupiah(p.HARGA_BELI || 0)}</td>
        <td class="px-6 py-4 text-right font-bold text-slate-800">${formatRupiah(p.HARGA_JUAL || 0)}</td>
        <td class="px-6 py-4 text-center"><span class="${p.STOK < 5 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} px-3 py-1 rounded-full text-xs font-bold shadow-sm">${p.STOK || 0} ${p.SATUAN || 'Pcs'}</span></td>
        <td class="px-6 py-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <button onclick="event.stopPropagation(); editProduct('${p.ID_PRODUK}')" class="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition" title="Edit">
              <i class="ri-edit-2-line text-lg"></i>
            </button>
            <button onclick="event.stopPropagation(); deleteProductAction('${p.ID_PRODUK}')" class="p-2 text-red-500 hover:bg-red-100 rounded-lg transition" title="Hapus">
              <i class="ri-delete-bin-line text-lg"></i>
            </button>
          </div>
        </td>
      `;
      fragment.appendChild(tr);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  function editProduct(id) {
    const p = productList.find(x => x.ID_PRODUK === id);
    if(p) openProductModal(p);
  }

  async function deleteProductAction(id) {
    const isOk = await showConfirm('Hapus Produk', 'Apakah Anda yakin ingin menghapus produk ini?\nData yang terhapus tidak bisa dikembalikan.');
    if(!isOk) return;
    
    const { error } = await supabaseClient.from('master_barang').delete().eq('id_produk', id);
    if(error) {
      showToast(error.message, 'error');
    } else {
      showToast('Produk berhasil dihapus!');
      loadProductsTable(); 
    }
  }

  // --- CASHIER LOGIC ---
  let posProducts = []; let cart = []; let paymentMethod = 'CASH';

  async function initCashier() {
    posProducts = await loadProductsData();
    renderPosProducts(posProducts);
    renderCart();
    
    document.getElementById('pos-search').addEventListener('input', (e) => {
      const keyword = e.target.value.toLowerCase();
      const dropdown = document.getElementById('search-dropdown');
      dropdown.innerHTML = '';
      
      if (keyword.length < 2) {
        dropdown.classList.add('hidden');
        renderPosProducts(posProducts);
        return;
      }
      
      const filtered = posProducts.filter(p => (p.NAMA_PRODUK && p.NAMA_PRODUK.toLowerCase().includes(keyword)) || (p.BARCODE && p.BARCODE.toLowerCase().includes(keyword)));
      const top10 = filtered.slice(0, 10);
      
      if (top10.length > 0) {
        dropdown.classList.remove('hidden');
        top10.forEach(p => {
          const item = document.createElement('div');
          item.className = "px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-b-0 flex justify-between items-center";
          item.innerHTML = `<div class="font-medium text-slate-800">${p.NAMA_PRODUK}</div><div class="text-primary font-bold text-sm">${formatRupiah(p.HARGA_JUAL)}</div>`;
          item.onclick = () => {
            addToCart(p);
            e.target.value = '';
            dropdown.classList.add('hidden');
            e.target.focus();
            renderPosProducts(posProducts);
          };
          dropdown.appendChild(item);
        });
      } else {
        dropdown.classList.remove('hidden');
        dropdown.innerHTML = `<div class="px-4 py-3 text-slate-500 text-sm">Tidak ditemukan...</div>`;
      }
      
      // Update grid as well based on search
      renderPosProducts(filtered);
    });

    document.addEventListener('click', (e) => {
      const searchInput = document.getElementById('pos-search');
      const dropdown = document.getElementById('search-dropdown');
      if (searchInput && dropdown && e.target !== searchInput && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  function renderPosProducts(data) {
    const grid = document.getElementById('pos-product-grid');
    const fragment = document.createDocumentFragment();
    
    data.forEach(p => {
      const card = document.createElement('div');
      card.className = "bg-white p-3 lg:p-4 lg:rounded-2xl cursor-pointer hover:bg-slate-50 lg:hover:shadow-soft lg:hover:-translate-y-1 transition-all duration-300 flex items-center justify-between lg:border lg:border-slate-100 group";
      card.onclick = () => addToCart(p);
      
      const initial = p.NAMA_PRODUK.substring(0, 2).toUpperCase();
      
      card.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-slate-100 group-hover:bg-primary/10 text-slate-500 group-hover:text-primary font-bold rounded flex items-center justify-center shrink-0 transition-colors text-sm">
            ${initial}
          </div>
          <div class="flex flex-col">
            <span class="font-bold text-slate-700 text-sm lg:text-base">${p.NAMA_PRODUK}</span>
            <span class="text-[10px] lg:text-xs text-slate-400 mt-0.5">Stok: ${p.STOK || 0} ${p.SATUAN || 'Pcs'}</span>
          </div>
        </div>
        <div class="font-medium text-slate-600 text-sm lg:text-base">
          ${formatRupiah(p.HARGA_JUAL)}
        </div>
      `;
      fragment.appendChild(card);
    });
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  function addToCart(product) {
    if (navigator.vibrate) navigator.vibrate(50);
    const existing = cart.find(item => item.ID_PRODUK === product.ID_PRODUK);
    if (existing) existing.qty += 1; else cart.push({ ...product, qty: 1 });
    renderCart();
  }

  function updateQty(id, delta) {
    const item = cart.find(i => i.ID_PRODUK === id);
    if(item) { 
      item.qty = parseFloat((item.qty + delta).toFixed(2)); 
      if(item.qty <= 0) cart = cart.filter(i => i.ID_PRODUK !== id); 
      renderCart(); 
    }
  }

  async function promptEditQty(id, currentQty) {
    const item = cart.find(i => i.ID_PRODUK === id);
    if (!item) return;
    
    const modalId = 'qty-modal-' + id;
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 opacity-0 transition-opacity duration-300";
    
    modal.innerHTML = `
      <div class="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden scale-95 transition-transform duration-300" id="qty-content-${id}">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 class="font-bold text-slate-800 text-lg">Ubah Jumlah</h3>
          <button id="close-${id}" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-500 transition-colors">
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>
        <div class="p-5">
          <p class="text-sm font-medium text-slate-500 mb-3 text-center">Masukkan jumlah baru untuk <br/><span class="text-primary font-bold text-base">${item.NAMA_PRODUK}</span></p>
          <input type="number" step="any" id="qty-input-${id}" class="w-full text-center text-4xl font-black text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner" value="${currentQty}">
          <p class="text-xs text-slate-400 mt-2 text-center">Contoh pecahan: <b class="text-slate-600">0.25</b> atau <b class="text-slate-600">1.5</b></p>
          
          <button id="save-${id}" class="w-full mt-5 py-3.5 bg-primary hover:bg-[#005bb5] text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(0,102,204,0.3)]">
            Simpan Perubahan
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      document.getElementById('qty-content-'+id).classList.remove('scale-95');
      const inputEl = document.getElementById('qty-input-'+id);
      inputEl.focus();
      inputEl.select();
    }, 10);
    
    const closeModalFn = () => {
      modal.classList.add('opacity-0');
      document.getElementById('qty-content-'+id).classList.add('scale-95');
      setTimeout(() => modal.remove(), 300);
    };
    
    document.getElementById('close-'+id).onclick = closeModalFn;
    
    document.getElementById('save-'+id).onclick = () => {
      const inputVal = document.getElementById('qty-input-'+id).value;
      const newQty = parseFloat(inputVal.replace(',', '.'));
      
      if (!isNaN(newQty) && newQty > 0) {
        item.qty = newQty;
        renderCart();
        closeModalFn();
      } else if (newQty === 0) {
        cart = cart.filter(i => i.ID_PRODUK !== id);
        renderCart();
        closeModalFn();
      } else {
        showToast('Angka tidak valid!', 'error');
      }
    };
    
    document.getElementById('qty-input-'+id).addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        document.getElementById('save-'+id).click();
      }
    });
  }

  function clearCart() { cart = []; renderCart(); }

  function renderCart() {
    const container = document.getElementById('cart-items'); 
    const emptyMsg = document.getElementById('empty-cart-msg'); 
    const btnCheckout = document.getElementById('btn-checkout');
    
    container.innerHTML = ''; 
    let total = 0;
    
    if (cart.length === 0) {
      emptyMsg.classList.remove('hidden'); 
      container.classList.add('hidden');
      btnCheckout.disabled = true;
      document.getElementById('cart-subtotal').innerText = 'Rp 0'; 
      document.getElementById('cart-total').innerText = 'Rp 0'; 
      const cashSection = document.getElementById('cash-payment-section');
      if (cashSection) cashSection.classList.add('hidden');
      
      const mobileContainer = document.getElementById('mobile-cart-bar-container');
      if(mobileContainer) {
        mobileContainer.classList.add('hidden');
      }
      
      calculateKembalian();
      return;
    }
    
    emptyMsg.classList.add('hidden'); 
    container.classList.remove('hidden');
    btnCheckout.disabled = false;
    
    const cashSection = document.getElementById('cash-payment-section');
    if (cashSection && paymentMethod === 'CASH') {
      cashSection.classList.remove('hidden');
    }
    
    const fragment = document.createDocumentFragment();
    
    cart.forEach(item => {
      const subtotal = item.HARGA_JUAL * item.qty; total += subtotal;
      const div = document.createElement('div'); 
      div.className = "flex justify-between items-center p-3 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group";
      div.innerHTML = `
        <div class="flex-1 pr-3">
          <div class="font-bold text-slate-800 text-sm leading-tight mb-1">${item.NAMA_PRODUK}</div>
          <div class="text-primary font-bold text-sm">${formatRupiah(item.HARGA_JUAL)} <span class="text-xs text-slate-400 font-normal">/ ${item.SATUAN || 'pcs'}</span></div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <div class="font-black text-slate-800">${formatRupiah(subtotal)}</div>
          <div class="flex items-center gap-1 bg-slate-100/80 rounded-lg p-1 border border-slate-200/50">
            <button onclick="updateQty('${item.ID_PRODUK}', -1)" class="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-red-500 hover:bg-red-50 transition-colors"><i class="ri-subtract-line"></i></button>
            <input type="text" inputmode="decimal" class="w-10 text-center font-bold text-sm bg-transparent border-none focus:ring-0 text-slate-800" value="${item.qty}" onclick="promptEditQty('${item.ID_PRODUK}', ${item.qty})" readonly>
            <button onclick="updateQty('${item.ID_PRODUK}', 1)" class="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"><i class="ri-add-line"></i></button>
          </div>
        </div>
      `;
      fragment.appendChild(div);
    });
    
    container.appendChild(fragment);
    document.getElementById('cart-subtotal').innerText = formatRupiah(total); 
    document.getElementById('cart-total').innerText = formatRupiah(total);
    
    // Update Mobile Cart Bar
    const mobileContainer = document.getElementById('mobile-cart-bar-container');
    if(mobileContainer) {
      mobileContainer.classList.remove('hidden');
      const countEl = document.getElementById('mobile-cart-count');
      const totalEl = document.getElementById('mobile-cart-total-bar');
      if(countEl) countEl.innerText = cart.length;
      if(totalEl) totalEl.innerText = formatRupiah(total);
    }
    
    calculateKembalian();
  }

  function toggleMobileCart() {
    const sidebar = document.getElementById('cart-sidebar');
    if(sidebar.classList.contains('translate-y-full')) {
      sidebar.classList.remove('translate-y-full');
    } else {
      sidebar.classList.add('translate-y-full');
    }
  }

  function setPaymentMethod(method) {
    paymentMethod = method;
    document.getElementById('btn-pay-cash').className = method === 'CASH' ? 'py-3 border-2 border-primary bg-primary/10 text-primary font-bold rounded-xl transition-all shadow-sm' : 'py-3 border-2 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50 font-bold rounded-xl transition-all';
    document.getElementById('btn-pay-qris').className = method === 'QRIS' ? 'py-3 border-2 border-primary bg-primary/10 text-primary font-bold rounded-xl transition-all shadow-sm' : 'py-3 border-2 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50 font-bold rounded-xl transition-all';
    
    const cashSection = document.getElementById('cash-payment-section');
    if (cashSection) {
      if (method === 'CASH' && cart.length > 0) {
        cashSection.classList.remove('hidden');
      } else {
        cashSection.classList.add('hidden');
      }
    }
  }

  function calculateKembalian() {
    const inputField = document.getElementById('input-uang-diterima');
    const changeText = document.getElementById('text-kembalian');
    if (!inputField || !changeText) return;
    
    formatInputNumber(inputField);
    
    let total = cart.reduce((sum, item) => sum + (item.HARGA_JUAL * item.qty), 0);
    let bayar = parseInt(inputField.value.replace(/\./g, '')) || 0;
    
    if (bayar < total) {
      changeText.innerText = 'Uang Kurang';
      changeText.classList.remove('text-green-600');
      changeText.classList.add('text-red-500');
    } else {
      changeText.innerText = formatRupiah(bayar - total);
      changeText.classList.remove('text-red-500');
      changeText.classList.add('text-green-600');
    }
  }

  function generateDynamicQRIS(qrisString, amount) {
    if (!qrisString || qrisString.length < 10) return qrisString;
    let baseString = qrisString.substring(0, qrisString.length - 4);
    baseString = baseString.replace("010211", "010212");
    if (baseString.endsWith("6304")) baseString = baseString.substring(0, baseString.length - 4);
    
    let amountStr = amount.toString();
    let amountLength = amountStr.length.toString().padStart(2, '0');
    let amountTag = "54" + amountLength + amountStr;
    
    let parts = baseString.split("5802ID");
    if (parts.length === 2) {
       baseString = parts[0] + amountTag + "5802ID" + parts[1];
    } else {
       baseString += amountTag;
    }
    
    baseString += "6304";
    let crc = 0xFFFF;
    for (let i = 0; i < baseString.length; i++) {
        crc ^= baseString.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
        crc &= 0xFFFF;
    }
    
    let crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
    return baseString + crcHex;
  }

  function openQrisModal(total) {
    const modal = document.getElementById('qris-modal');
    if (!modal) return showToast('QRIS belum dikonfigurasi!', 'error');
    
    const staticString = AppState.settings.qris_string || "00020101021126610014COM.GO-JEK.WWW01189360091436874232490210G6874232490303UMI51440014ID.CO.QRIS.WWW0215ID10243652024220303UMI5204721053033605802ID5920KITA SHOE WASH, WEDI6006KLATEN61055746162070703A0163043607";
    const dynamicString = generateDynamicQRIS(staticString, total);
    
    const canvas = document.getElementById('qris-canvas');
    if(canvas) {
      QRCode.toCanvas(canvas, dynamicString, {
        width: 250,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }, function (error) {
        if (error) console.error("Error generating QR:", error);
      });
    }

    document.getElementById('qris-amount').innerText = formatRupiah(total);
    const content = document.getElementById('qris-content');
    modal.classList.remove('hidden');
    setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
  }

  function closeQrisModal() {
    const modal = document.getElementById('qris-modal');
    const content = document.getElementById('qris-content');
    if (!modal) return;
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
  }

  function confirmQrisPayment() {
    closeQrisModal();
    executeCheckout();
  }

  window.processCheckout = function() {
    if(navigator.vibrate) navigator.vibrate(50);
    if(cart.length === 0) return;
    let total = cart.reduce((sum, item) => sum + (item.HARGA_JUAL * item.qty), 0);
    if(paymentMethod === 'QRIS') {
      openQrisModal(total);
    } else {
      executeCheckout();
    }
  }

  async function executeCheckout() {
    let total = cart.reduce((sum, item) => sum + (item.HARGA_JUAL * item.qty), 0);
    let bayar = total;
    let kembalian = 0;
    
    if (paymentMethod === 'CASH') {
      const inputBayar = document.getElementById('input-uang-diterima').value.replace(/\./g, '');
      bayar = parseInt(inputBayar) || 0;
      if (bayar < total) {
        showToast('Uang diterima kurang dari total pembayaran!', 'error');
        return;
      }
      kembalian = bayar - total;
    }
    const btn = document.getElementById('btn-checkout');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Memproses...';
    
    try {
      // 1. Insert ke tabel penjualan
      const { data: jualData, error: errJual } = await supabaseClient.from('penjualan')
        .insert({ 
           total: total, 
           bayar: bayar, 
           kembalian: kembalian, 
           metode: paymentMethod,
           status_transaksi: 'SUCCESS'
        })
        .select('id_jual').single();
        
      if (errJual) throw errJual;
      
      const idJual = jualData.id_jual;
      
      // 2. Insert ke detail_penjualan
      const detailPayload = cart.map(item => ({
        id_jual: idJual,
        id_produk: (item.KODE_BARANG === 'MANUAL') ? null : item.ID_PRODUK,
        qty: item.qty,
        harga: item.HARGA_JUAL,
        subtotal: item.HARGA_JUAL * item.qty
      }));
      
      const { error: errDetail } = await supabaseClient.from('detail_penjualan').insert(detailPayload);
      if (errDetail) throw errDetail;
      
      // 3. Update stok di Supabase
      for (let item of cart) {
        if (item.KODE_BARANG !== 'MANUAL' && item.ID_PRODUK) {
          const { data: currentStock } = await supabaseClient.from('master_barang').select('stock').eq('id_produk', item.ID_PRODUK).single();
          if (currentStock) {
             await supabaseClient.from('master_barang').update({ stock: currentStock.stock - item.qty }).eq('id_produk', item.ID_PRODUK);
          }
        }
      }
      
      btn.disabled = false;
      btn.innerHTML = 'BAYAR SEKARANG';
      showToast('Transaksi Berhasil!'); 
      
      openReceiptModal(idJual, new Date(), paymentMethod, bayar, kembalian, total, [...cart]);
      
      clearCart(); 
      
      const cartSidebar = document.getElementById('cart-sidebar');
      if(cartSidebar) cartSidebar.classList.add('translate-y-full');
      
      // Re-fetch products
      posProducts = await loadProductsData();
      renderPosProducts(posProducts);
      
    } catch (error) {
      btn.disabled = false;
      btn.innerHTML = 'BAYAR SEKARANG';
      showToast('Gagal memproses transaksi: ' + error.message, 'error');
    }
  }

  // --- REPORT LOGIC ---
  let allReportData = [];
  let isBalanceVisible = true;
  let currentReportSummary = { sales: 0, cogs: 0, profit: 0 };
  
  function toggleBalanceVisibility() {
    isBalanceVisible = !isBalanceVisible;
    const eyeIcon = document.getElementById('eye-icon');
    const eyeText = document.getElementById('eye-text');
    
    if (isBalanceVisible) {
      eyeIcon.className = 'ri-eye-line';
      eyeText.innerText = 'Sembunyikan';
    } else {
      eyeIcon.className = 'ri-eye-off-line';
      eyeText.innerText = 'Tampilkan';
    }
    updateSummaryCardsUI();
  }
  
  function updateSummaryCardsUI() {
    // Selalu set angka aslinya, karena kita akan menyembunyikan kontainernkatanya
    document.getElementById('summary-sales').innerText = formatRupiah(currentReportSummary.sales);
    document.getElementById('summary-cogs').innerText = formatRupiah(currentReportSummary.cogs);
    document.getElementById('summary-profit').innerText = formatRupiah(currentReportSummary.profit);
    
    const wrapper = document.getElementById('summary-cards-wrapper');
    if (wrapper) {
      if (isBalanceVisible) {
        wrapper.classList.remove('summary-collapsed');
      } else {
        wrapper.classList.add('summary-collapsed');
      }
    }
  }
  
  async function loadReportLogic() {
     const { data: sales, error } = await supabaseClient.from('penjualan')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(1000);
        
     if (error) {
       showToast('Gagal memuat laporan: ' + error.message, 'error');
       renderReport([]);
       return;
     }
     
     // Fetch detail transaksi secara terpisah untuk menghindari error Foreign Key Supabase
     let allDetails = [];
     const salesIds = sales.map(s => s.id_jual);
     if (salesIds.length > 0) {
        const { data: details } = await supabaseClient
          .from('detail_penjualan')
          .select('id_jual, id_produk, qty, harga, subtotal')
          .in('id_jual', salesIds);
        if (details) allDetails = details;
     }

     allReportData = sales.map(r => {
        const rDetails = allDetails.filter(d => d.id_jual === r.id_jual);
        return {
          TANGGAL: r.tanggal,
          ID_JUAL: r.id_jual,
          METODE: r.metode || r.metode_pembayaran,
          TOTAL: r.total,
          BAYAR: r.bayar,
          KEMBALIAN: r.kembalian,
          STATUS: r.status_transaksi || 'SUCCESS',
          DETAILS: rDetails
        };
     });
     
     renderReport(allReportData);
  }

  function applyReportFilter() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const searchInput = document.getElementById('report-search');
    const keyword = searchInput ? searchInput.value.toLowerCase() : '';
    
    if(!start && !end && !keyword) {
      renderReport(allReportData);
      return;
    }
    
    const filtered = allReportData.filter(r => {
      const d = new Date(r.TANGGAL);
      let isValidDate = true;
      if (start) {
        const sDate = new Date(start);
        sDate.setHours(0,0,0,0);
        if (d < sDate) isValidDate = false;
      }
      if (end) {
        const eDate = new Date(end);
        eDate.setHours(23,59,59,999);
        if (d > eDate) isValidDate = false;
      }
      
      let isValidSearch = true;
      if (keyword) {
         const idMatch = String(r.ID_JUAL).toLowerCase().includes(keyword);
         const metodeMatch = String(r.METODE || '').toLowerCase().includes(keyword);
         
         let itemMatch = false;
         if (r.DETAILS && r.DETAILS.length > 0) {
            itemMatch = r.DETAILS.some(detail => {
               const product = AppState.products ? AppState.products.find(p => String(p.ID_PRODUK) === String(detail.id_produk)) : null;
               const namaProduk = product ? product.NAMA_PRODUK.toLowerCase() : (detail.id_produk ? 'barang terhapus' : 'transaksi manual');
               return namaProduk.includes(keyword);
            });
         }
         isValidSearch = idMatch || metodeMatch || itemMatch;
      }
      
      return isValidDate && isValidSearch;
    });
    
    renderReport(filtered);
  }

  function renderReport(data) {
    const tbody = document.getElementById('report-table-body');
    tbody.innerHTML = '';
    
    // --- Kalkulasi Ringkasan Keuangan ---
    let totalPenjualan = 0;
    let totalModal = 0;
    
    if(data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">Belum ada riwayat transaksi</td></tr>`;
      currentReportSummary = { sales: 0, cogs: 0, profit: 0 };
      updateSummaryCardsUI();
      return;
    }
    
    data.forEach(r => {
      // Hanya hitung jika status transaksi SUCCESS
      if (r.STATUS === 'SUCCESS' || r.STATUS === undefined) {
         totalPenjualan += r.TOTAL;
         if (r.DETAILS) {
           r.DETAILS.forEach(d => {
              const p = AppState.products.find(x => String(x.ID_PRODUK) === String(d.id_produk));
              const hBeli = p ? (p.HARGA_BELI || 0) : 0;
              totalModal += (hBeli * d.qty);
           });
         }
      }
      
      let itemListText = '';
      if (r.DETAILS && r.DETAILS.length > 0) {
        const itemNames = r.DETAILS.map(d => {
          if(!d.id_produk) return 'Transaksi Manual';
          const p = AppState.products.find(x => String(x.ID_PRODUK) === String(d.id_produk));
          return p ? p.NAMA_PRODUK : 'Produk Dihapus';
        });
        
        if (itemNames.length <= 2) {
          itemListText = itemNames.join(', ');
        } else {
          itemListText = itemNames.slice(0, 2).join(', ') + ` (+${itemNames.length - 2} lainnya)`;
        }
      } else {
        itemListText = `#${r.ID_JUAL}`;
      }

      const isRefunded = r.STATUS === 'REFUNDED';
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-50 hover:bg-slate-50 hover:shadow-sm cursor-pointer transition';
      tr.onclick = () => openTransactionDetail(r.ID_JUAL);
      tr.innerHTML = `
        <td class="p-4 ${isRefunded ? 'line-through text-slate-400' : ''}">${formatDate(r.TANGGAL)}</td>
        <td class="p-4 ${isRefunded ? 'line-through text-slate-400' : 'font-bold text-slate-700'}">${itemListText}</td>
        <td class="p-4 text-center">
           ${isRefunded ? '<span class="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-600">REFUNDED</span>' : `<span class="px-2 py-1 rounded text-xs font-bold ${r.METODE==='QRIS'?'bg-purple-100 text-purple-600':'bg-green-100 text-green-600'}">${r.METODE || 'CASH'}</span>`}
        </td>
        <td class="p-4 text-right font-bold ${isRefunded ? 'line-through text-slate-400' : 'text-slate-800'}">${formatRupiah(r.TOTAL)}</td>
      `;
      tbody.appendChild(tr);
    });
    
    // Update UI Ringkasan Keuangan
    currentReportSummary.sales = totalPenjualan;
    currentReportSummary.cogs = totalModal;
    currentReportSummary.profit = totalPenjualan - totalModal;
    updateSummaryCardsUI();
  }

  function openTransactionDetail(idJual) {
    const trx = allReportData.find(x => x.ID_JUAL === idJual);
    if (!trx) return;

    const modal = document.getElementById('global-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.innerText = `Detail Transaksi #${idJual}`;
    
    let itemsHtml = '';
    if (trx.DETAILS && trx.DETAILS.length > 0) {
      itemsHtml = trx.DETAILS.map(d => {
        let name = 'Transaksi Manual';
        if (d.id_produk) {
           const p = AppState.products.find(x => String(x.ID_PRODUK) === String(d.id_produk));
           name = p ? p.NAMA_PRODUK : 'Produk Dihapus';
        }
        return `
          <div class="flex justify-between items-center text-sm mb-2 border-b border-slate-50 pb-2">
             <div class="flex flex-col">
                <span class="font-bold text-slate-700">${name}</span>
                <span class="text-slate-400 text-xs">${d.qty} x ${formatRupiah(d.harga)}</span>
             </div>
             <span class="font-bold text-slate-800">${formatRupiah(d.subtotal)}</span>
          </div>
        `;
      }).join('');
    } else {
      itemsHtml = '<p class="text-center text-slate-400 text-sm py-4">Tidak ada detail barang.</p>';
    }

    body.innerHTML = `
      <div class="flex flex-col gap-4">
         <div class="bg-slate-50 p-4 rounded-xl">
            <div class="text-xs text-slate-400 mb-1">Tanggal Transaksi</div>
            <div class="font-bold text-slate-700">${formatDate(trx.TANGGAL)}</div>
            <div class="mt-3 text-xs text-slate-400 mb-1">Metode Pembayaran</div>
            <div class="font-bold ${trx.METODE==='QRIS'?'text-purple-600':'text-green-600'}">${trx.METODE || 'CASH'}</div>
         </div>
         
         <div class="border border-slate-100 rounded-xl p-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daftar Barang</h3>
            ${itemsHtml}
            
            <div class="mt-4 pt-4 border-t border-slate-200">
               <div class="flex justify-between items-center mb-1">
                  <span class="text-slate-500 font-medium">Total Belanja</span>
                  <span class="font-bold text-lg text-slate-800">${formatRupiah(trx.TOTAL)}</span>
               </div>
               <div class="flex justify-between items-center mb-1">
                  <span class="text-slate-500 text-sm">Nominal Bayar</span>
                  <span class="font-medium text-slate-700">${formatRupiah(trx.BAYAR || 0)}</span>
               </div>
               <div class="flex justify-between items-center">
                  <span class="text-slate-500 text-sm">Kembalian</span>
                  <span class="font-bold ${trx.KEMBALIAN > 0 ? 'text-green-600' : 'text-slate-700'}">${formatRupiah(trx.KEMBALIAN || 0)}</span>
               </div>
            </div>
         </div>
         
         <div class="grid grid-cols-2 gap-3 mt-4">
            <button onclick="reprintReceipt(${trx.ID_JUAL})" class="bg-primary/10 hover:bg-primary/20 text-primary py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
               <i class="ri-printer-line text-xl"></i> Cetak Struk
            </button>
            ${trx.STATUS === 'REFUNDED' ? `
              <div class="bg-slate-100 text-slate-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                 <i class="ri-forbid-line text-xl"></i> Direfund
              </div>
            ` : `
              <button onclick="refundTransaction(${trx.ID_JUAL}); document.getElementById('global-modal').classList.add('hidden');" class="bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                 <i class="ri-refund-2-line text-xl"></i> Refund
              </button>
            `}
         </div>
      </div>
    `;
    
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
  }
  
  async function refundTransaction(idJual) {
    const isOk = await showConfirm('Refund Transaksi', `Refund Transaksi #${idJual}?\nStok barang akan dikembalikan ke gudang, dan pendapatan hari ini akan dikurangi. Data struk akan tetap ada sebagai riwayat pembatalan.`, true);
    if(!isOk) return;
    
    showToast('Memproses refund & pengembalian stok...', 'info');
    
    try {
      // 1. Ambil detail transaksi untuk mengembalikan stok
      const { data: details, error: errFetch } = await supabaseClient
        .from('detail_penjualan')
        .select('id_produk, qty')
        .eq('id_jual', idJual);
        
      if (errFetch) throw errFetch;
      
      // 2. Kembalikan stok (satu per satu)
      if (details && details.length > 0) {
        for (let item of details) {
          if (item.id_produk) { // Abaikan jika transaksi manual
            const { data: currentStock } = await supabaseClient
              .from('master_barang')
              .select('stock')
              .eq('id_produk', item.id_produk)
              .single();
              
            if (currentStock) {
              await supabaseClient
                .from('master_barang')
                .update({ stock: currentStock.stock + item.qty })
                .eq('id_produk', item.id_produk);
            }
          }
        }
      }
      
      // 3. Update status transaksi menjadi REFUNDED (bukan dihapus)
      const { data: updatedRow, error: errRefund } = await supabaseClient
        .from('penjualan')
        .update({ status_transaksi: 'REFUNDED' })
        .eq('id_jual', idJual)
        .select();
        
      if (errRefund) throw errRefund;
      
      if (!updatedRow || updatedRow.length === 0) {
        throw new Error("Supabase menolak update! Anda harus mengizinkan akses UPDATE di menu 'Row Level Security' (RLS) pada tabel penjualan. Atau tambahkan kolom 'status_transaksi' tipe text.");
      }
      
      showToast(`Transaksi #${idJual} berhasil di-refund & stok dikembalikan!`, 'success');
      loadReportLogic(); // Refresh tabel laporan
      
      // Paksa refresh data Dashboard & Kasir jika di-load nanti
      AppState.products = [];
      
    } catch(err) {
      showToast('Gagal memproses refund: ' + err.message, 'error');
    }
  }

  // --- MODAL LOGIC ---
  function openProductModal(product = null) {
    const modal = document.getElementById('global-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const content = document.getElementById('modal-content');
    
    title.innerText = product ? "Edit Produk" : "Tambah Produk Baru";
    
    body.innerHTML = `
      <form id="product-form" onsubmit="submitProduct(event, '${product ? product.ID_PRODUK : ''}')" class="space-y-5">
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1.5">Nama Produk</label>
          <input type="text" id="form-nama" value="${product ? product.NAMA_PRODUK : ''}" required class="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 shadow-sm">
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1.5">Barcode / Kode</label>
          <input type="text" id="form-barcode" value="${product ? product.BARCODE : ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 shadow-sm font-mono">
        </div>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Harga Beli</label>
            <input type="tel" inputmode="numeric" id="form-beli" value="${formatNumberOnly(product ? product.HARGA_BELI : '')}" oninput="formatInputNumber(this)" class="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 shadow-sm font-bold">
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Harga Jual</label>
            <input type="tel" inputmode="numeric" id="form-jual" value="${formatNumberOnly(product ? product.HARGA_JUAL : '')}" oninput="formatInputNumber(this)" required class="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 shadow-sm font-bold">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Stok Awal</label>
            <input type="number" step="any" id="form-stok" value="${product ? product.STOK : '0'}" required class="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 shadow-sm font-bold">
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Satuan</label>
            <select id="form-satuan" required class="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 shadow-sm font-bold appearance-none">
              ${AppState.settings.SATUAN.map(s => `<option value="${s}" ${product && product.SATUAN === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1.5">Batas Stok Peringatan (Opsional)</label>
          <input type="number" step="any" id="form-batas-stok" placeholder="Contoh: 3" value="${product && product.BATAS_STOK != null ? product.BATAS_STOK : ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 shadow-sm font-bold">
          <p class="text-xs text-slate-500 mt-1">Kosongkan untuk menggunakan peringatan standar (sisa &lt; 5)</p>
        </div>
        <div class="pt-2 flex gap-3">
          <button type="button" onclick="closeModal()" class="flex-1 py-3 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 font-bold rounded-xl transition-all shadow-sm">Batal</button>
          <button type="submit" id="btn-save-product" class="flex-1 py-3 bg-primary hover:bg-[#005bb5] text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(0,102,204,0.3)]">Simpan</button>
        </div>
      </form>
    `;
    
    modal.classList.remove('hidden');
    setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
  }

  function closeModal() {
    const modal = document.getElementById('global-modal');
    const content = document.getElementById('modal-content');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
  }

  async function submitProduct(e, id) {
    e.preventDefault();
    
    const nama_barang = document.getElementById('form-nama').value;
    const satuan = document.getElementById('form-satuan').value;
    
    if (!id) {
       const isExist = AppState.products.find(p => 
          p.NAMA_PRODUK.toLowerCase() === nama_barang.trim().toLowerCase() && 
          p.SATUAN === satuan
       );
       
       if (isExist) {
          showToast(`Produk '${nama_barang} (${satuan})' sudah ada! Dialihkan ke mode Edit...`, 'info');
          closeModal();
          setTimeout(() => {
             openProductModal(isExist);
          }, 400);
          return;
       }
    }
    
    const btn = document.getElementById('btn-save-product');
    btn.disabled = true;
    btn.innerHTML = 'Menyimpan...';
    const batasVal = document.getElementById('form-batas-stok').value;
    
    const payload = {
      nama_barang: nama_barang,
      barcode: document.getElementById('form-barcode').value,
      harga_beli: parseInt(document.getElementById('form-beli').value.replace(/\./g, '')) || 0,
      harga_jual: parseInt(document.getElementById('form-jual').value.replace(/\./g, '')) || 0,
      stock: parseFloat(document.getElementById('form-stok').value) || 0,
      satuan: satuan,
      kategori: 'Umum',
      batas_stok: batasVal === '' ? null : parseFloat(batasVal)
    };
    
    if (id) {
      payload.id_produk = id;
    } else {
      payload.kode_barang = 'PRD-' + new Date().getTime().toString().slice(-6);
    }
    
    const { error } = await supabaseClient.from('master_barang').upsert(payload);
    
    closeModal();
    if(error) {
      showToast(error.message, 'error');
    } else {
      showToast('Produk berhasil disimpan!');
      loadProductsTable(); 
    }
  }

  // --- KASIR MODE (MANUAL / KATALOG) ---
  let manualInput = "0";

  function switchKasirMode(mode) {
    const tabManual = document.getElementById('tab-manual');
    const tabKatalog = document.getElementById('tab-katalog');
    const modeManual = document.getElementById('mode-manual');
    const modeKatalog = document.getElementById('mode-katalog');

    if (mode === 'manual') {
      tabManual.className = "flex-1 py-3 flex items-center justify-center gap-2 text-primary bg-primary/5 font-bold transition-all border-b-2 border-primary";
      tabKatalog.className = "flex-1 py-3 flex items-center justify-center gap-2 text-slate-500 hover:bg-slate-50 font-medium transition-all border-b-2 border-transparent";
      modeManual.classList.remove('hidden');
      modeKatalog.classList.add('hidden');
    } else {
      tabKatalog.className = "flex-1 py-3 flex items-center justify-center gap-2 text-primary bg-primary/5 font-bold transition-all border-b-2 border-primary";
      tabManual.className = "flex-1 py-3 flex items-center justify-center gap-2 text-slate-500 hover:bg-slate-50 font-medium transition-all border-b-2 border-transparent";
      modeKatalog.classList.remove('hidden');
      modeManual.classList.add('hidden');
    }
  }

  function updateManualDisplay() {
    const display = document.getElementById('manual-display');
    if(display) {
      if(manualInput === "" || manualInput === "0") {
        display.innerText = "Rp 0";
        display.classList.add('text-slate-300');
        display.classList.remove('text-slate-800');
      } else {
        display.innerText = formatRupiah(parseInt(manualInput));
        display.classList.remove('text-slate-300');
        display.classList.add('text-slate-800');
      }
    }
  }

  function numpadPress(val) {
    if (val === 'C') {
      manualInput = "0";
    } else if (val === 'backspace') {
      if (manualInput.length > 1) {
        manualInput = manualInput.slice(0, -1);
      } else {
        manualInput = "0";
      }
    } else {
      if (manualInput === "0" && val !== "000") {
        manualInput = val;
      } else if (manualInput !== "0") {
        // limit length to prevent overflow
        if(manualInput.length < 12) manualInput += val;
      }
    }
    updateManualDisplay();
  }

  function addManualToCart() {
    const amount = parseInt(manualInput);
    if (!amount || amount <= 0) {
      showToast('Masukkan nominal lebih dari Rp 0', 'error');
      return;
    }
    const nameInput = document.getElementById('manual-name-input');
    const customName = nameInput && nameInput.value.trim() !== '' ? nameInput.value.trim() : 'Transaksi Manual';
    
    const product = {
      ID_PRODUK: 'MANUAL_' + Date.now(),
      NAMA_PRODUK: customName,
      KODE_BARANG: 'MANUAL',
      HARGA_JUAL: amount,
      qty: 1
    };
    addToCart(product);
    showToast('Berhasil ditambahkan ke keranjang', 'success');
    manualInput = "0";
    if(nameInput) nameInput.value = '';
    updateManualDisplay();
  }

  // --- STRUK PEMBELANJAAN LOGIC ---
  let lastReceiptData = null;
  
  function openReceiptModal(idJual, tanggal, metode, bayar, kembalian, total, items) {
    lastReceiptData = { idJual, tanggal, metode, bayar, kembalian, total, items };
    
    const elId = document.getElementById('receipt-id');
    if(elId) elId.innerText = '#' + idJual;
    
    document.getElementById('receipt-toko-name').innerText = AppState.settings.nama_toko || 'ALMIRA POS';
    document.getElementById('receipt-toko-alamat').innerText = AppState.settings.alamat || 'Toko / Warung Kelontong';
    
    const pesanEl = document.getElementById('receipt-pesan');
    if(pesanEl) pesanEl.innerHTML = AppState.settings.pesan_struk || 'TERIMA KASIH<br>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.';
    
    // Format tanggal
    let d;
    if (typeof tanggal === 'string') d = new Date(tanggal);
    else d = tanggal;
    
    const elDate = document.getElementById('receipt-date');
    if(elDate) elDate.innerText = formatDate(d) + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    
    const elMethod = document.getElementById('receipt-method');
    if(elMethod) elMethod.innerText = metode || 'CASH';
    document.getElementById('receipt-total').innerText = formatRupiah(total);
    document.getElementById('receipt-bayar').innerText = formatRupiah(bayar);
    document.getElementById('receipt-kembali').innerText = formatRupiah(kembalian);
    
    const itemsContainer = document.getElementById('receipt-items');
    itemsContainer.innerHTML = '';
    items.forEach(item => {
      const name = item.NAMA_PRODUK || (item.master_barang ? item.master_barang.nama_barang : 'Transaksi Manual');
      const price = item.HARGA_JUAL || item.harga;
      const sub = item.qty * price;
      
      const tr1 = document.createElement('tr');
      tr1.innerHTML = `<td colspan="2" class="pb-1">${name}</td>`;
      const tr2 = document.createElement('tr');
      tr2.innerHTML = `<td class="pb-2 text-slate-500">${item.qty} x ${formatNumberOnly(price)}</td><td class="pb-2 text-right">${formatNumberOnly(sub)}</td>`;
      
      itemsContainer.appendChild(tr1);
      itemsContainer.appendChild(tr2);
    });
    
    const modal = document.getElementById('receipt-modal');
    const content = document.getElementById('receipt-content');
    modal.classList.remove('hidden');
    setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
  }

  function closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    const content = document.getElementById('receipt-content');
    if (!modal) return;
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
  }

  function buildEscPosData(data) {
     const encoder = new TextEncoder();
     let bytes = [];
     
     const add = (arr) => { for(let b of arr) bytes.push(b); };
     const addText = (text) => { add(encoder.encode(text)); };
     const addLine = (text) => { addText(text + '\n'); };
     
     // Initialize
     add([0x1B, 0x40]); 
     
     // Header (Center align)
     add([0x1B, 0x61, 1]); 
     addLine(AppState.settings.nama_toko || 'ALMIRA POS');
     addLine(AppState.settings.alamat || 'Toko Kelontong');
     addLine('--------------------------------');
     
     // Body (Left align)
     add([0x1B, 0x61, 0]); 
     let d;
     if (typeof data.tanggal === 'string') d = new Date(data.tanggal);
     else d = data.tanggal;
     addLine(`Tgl  : ${formatDate(d)}`);
     addLine(`Trx  : #${data.idJual}`);
     addLine(`Metode: ${data.metode}`);
     addLine('--------------------------------');
     
     data.items.forEach(item => {
        let name = item.NAMA_PRODUK || (item.master_barang ? item.master_barang.nama_barang : 'Transaksi Manual');
        if (name.length > 31) name = name.substring(0, 31);
        addLine(name);
        
        const price = item.HARGA_JUAL || item.harga;
        const sub = item.qty * price;
        const line2 = `${item.qty} x ${formatNumberOnly(price)}`;
        const line2Right = `Rp${formatNumberOnly(sub)}`;
        
        let spaces = 31 - line2.length - line2Right.length;
        if (spaces < 1) spaces = 1;
        addLine(line2 + ' '.repeat(spaces) + line2Right);
     });
     
     addLine('-------------------------------');
     
     const totalStr = formatNumberOnly(data.total);
     addLine('TOTAL   : Rp ' + ' '.repeat(16 - totalStr.length) + totalStr);
     const bayarStr = formatNumberOnly(data.bayar);
     addLine('DIBAYAR : Rp ' + ' '.repeat(16 - bayarStr.length) + bayarStr);
     const kembalian = data.kembalian || 0;
     const kembaliStr = formatNumberOnly(kembalian);
     addLine('KEMBALI : Rp ' + ' '.repeat(16 - kembaliStr.length) + kembaliStr);
     
     addLine('');
     
     // Footer (Center)
     add([0x1B, 0x61, 1]);
     let pesan = AppState.settings.pesan_struk || 'Terima Kasih';
     pesan = pesan.replace(/<br>/g, '\\n');
     addLine(pesan);
     
     // Feed paper & Cut
     add([0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x10]);
     
     return new Uint8Array(bytes);
  }

  async function printReceipt() {
    let bluetoothSuccess = false;
    
    if (navigator.bluetooth && lastReceiptData) {
       try {
         showToast('Mencari Bluetooth Printer...', 'info');
         const device = await navigator.bluetooth.requestDevice({
           acceptAllDevices: true,
           optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
         });
         
         showToast('Menghubungkan ke ' + device.name + '...', 'info');
         const server = await device.gatt.connect();
         
         let service, characteristic;
         const servicesToTry = ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'];
         const charsToTry = ['00002af1-0000-1000-8000-00805f9b34fb', '49535343-8841-43f4-a8d4-ecbe34729bb3', 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'];
         
         for(let i=0; i<servicesToTry.length; i++) {
            try {
               service = await server.getPrimaryService(servicesToTry[i]);
               characteristic = await service.getCharacteristic(charsToTry[i]);
               if (characteristic) break;
            } catch(e) {}
         }
         
         if (!characteristic) throw new Error("Gagal menemukan layanan ESC/POS di printer ini");
         
         const escposData = buildEscPosData(lastReceiptData);
         
         // Chunking data biner untuk mencegah BLE crash
         const chunkSize = 256;
         for (let i = 0; i < escposData.length; i += chunkSize) {
           const chunk = escposData.slice(i, i + chunkSize);
           await characteristic.writeValue(chunk);
         }
         
         showToast('Cetak Selesai!', 'success');
         device.gatt.disconnect();
         bluetoothSuccess = true;
         
       } catch(e) {
         console.error('Bluetooth error:', e);
         alert('GAGAL BLUETOOTH:\\n\\n' + e.message + '\\n\\nPastikan GPS/Lokasi menyala, dan printer sudah di-Pairing di pengaturan Bluetooth HP Anda.');
       }
    } else {
       alert('Browser Anda tidak mendukung Web Bluetooth, atau diblokir.');
    }
  }

  async function reprintReceipt(idJual) {
    const trx = allReportData.find(r => r.ID_JUAL === idJual);
    if (!trx) return;
    
    try {
      showToast('Memuat data struk...', 'info');
      const { data, error } = await supabaseClient
        .from('detail_penjualan')
        .select('*')
        .eq('id_jual', idJual);
        
      if (error) throw error;
      
      if (!AppState.products || AppState.products.length === 0) {
        await loadProductsData();
      }
      
      const detailWithNames = data.map(d => {
        const product = AppState.products.find(p => String(p.ID_PRODUK) === String(d.id_produk));
        return {
          ...d,
          NAMA_PRODUK: product ? product.NAMA_PRODUK : (d.id_produk ? 'Barang Terhapus' : 'Transaksi Manual')
        };
      });
      
      openReceiptModal(idJual, trx.TANGGAL, trx.METODE, trx.BAYAR, trx.KEMBALIAN, trx.TOTAL, detailWithNames);
    } catch (e) {
      showToast('Gagal memuat struk: ' + e.message, 'error');
    }
  }

  // --- PWA INSTALLATION LOGIC ---
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    console.log(`'beforeinstallprompt' event was fired. Ready to be wrapped by PWABuilder.`);
  });
