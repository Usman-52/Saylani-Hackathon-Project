
// assets/js/app.js - PRO edition (module)
const API = 'https://fakestoreapi.com/products';
let products = [];
let filtered = [];
const cartKey = 'myshop_cart_global'; // global key so upgrades share same cart
let lastRemoved = null;

/* ===== WISHLIST (Premium) ===== */
const wishlistKey = 'myshop_wishlist_v1';
const WISHLIST_MAX = 50;

export function getWishlist(){
  try { return JSON.parse(localStorage.getItem(wishlistKey) || '[]'); } catch { return []; }
}
function setWishlist(w){ localStorage.setItem(wishlistKey, JSON.stringify(w)); updateWishlistBadge(); }
function updateWishlistBadge(){
  const w = getWishlist();
  // show small dot on cart icon or badge next to cartCount (reuse cartCount)
  const el = document.getElementById('cartCount');
  if (!el) return;
  // small indicator for wishlist count (right after badge)
  let node = document.getElementById('wishlistDot');
  if (!node){
    node = document.createElement('span');
    node.id = 'wishlistDot';
    node.style.marginLeft = '6px';
    node.style.fontSize = '0.8rem';
    node.style.color = '#f97316';
    el.parentNode.appendChild(node);
  }
  node.textContent = '♥' + (w.length>0? w.length:'');
}

/* Toggle wishlist for product id */
function toggleWishlist(product){
  const w = getWishlist();
  const idx = w.findIndex(x=>x.id===product.id);
  if (idx > -1){
    w.splice(idx,1);
    setWishlist(w);
    toast('Removed from wishlist','info');
  } else {
    if (w.length >= WISHLIST_MAX){ toast('Wishlist full','error'); return; }
    w.push({id:product.id, title:product.title, price:product.price, image:product.image});
    setWishlist(w);
    // pulse animation on heart
    toast('Added to wishlist','success');
    pulseWishlistIcon();
  }
  renderMiniCart(); // update any cross indicators
}

/* Pulse the wishlist heart near cart */
function pulseWishlistIcon(){
  const el = document.getElementById('cartCount');
  if (!el) return;
  el.classList.add('cart-glow');
  setTimeout(()=>el.classList.remove('cart-glow'),900);
}

/* Move wishlist item to cart */
export function moveWishlistToCart(id){
  const w = getWishlist();
  const idx = w.findIndex(x=>x.id===id);
  if (idx === -1) return;
  const item = w[idx];
  // get products array to find full details (price etc). fallback to item
  const p = products.find(x=>x.id===item.id) || item;
  addToCart(p, 1);
  // remove from wishlist
  w.splice(idx,1);
  setWishlist(w);
}

/* Recommend alternatives for a wishlist item (simple algorithm: return up to 3 different random items) */
export function recommendAlternatives(id, count=3){
  const others = products.filter(p=>p.id!==id);
  const shuffled = others.sort(()=>0.5-Math.random());
  return shuffled.slice(0,count);
}

/* Check if an item is in cart */
export function isInCart(id){
  const c = getCart();
  return c.some(x=>x.id===id);
}

let appliedPromo = { code: null, discount: 0 };

// DOM refs
const productsEl = document.querySelector('#products');
const loadingEl = document.querySelector('#loadingEl');
const emptyMsgEl = document.querySelector('#emptyMsg');
const priceRange = document.getElementById('priceRange');
const maxPriceLabel = document.getElementById('maxPriceLabel');
const categorySelect = document.getElementById('categorySelect');
const cartCount = document.getElementById('cartCount');
const searchInput = document.getElementById('searchInput');
const toastRoot = document.getElementById('toastRoot');

const miniCart = document.getElementById('miniCart');
const miniCartItems = document.getElementById('miniCartItems');
const miniSubtotal = document.getElementById('miniSubtotal');
const openMiniCartBtn = document.getElementById('openMiniCart');
const closeMiniCartBtn = document.getElementById('closeMiniCart');
const viewCartBtn = document.getElementById('viewCartBtn');
const miniCheckoutBtn = document.getElementById('miniCheckoutBtn');
const scrollTopBtn = document.getElementById('scrollTopBtn');

function showLoading(){ loadingEl?.classList.remove('hidden'); }
function hideLoading(){ loadingEl?.classList.add('hidden'); }

export function updateCartBadge(){
  const c = getCart();
  const totalQty = c.reduce((s, it) => s + (it.qty||0), 0);
  const el = document.getElementById('cartCount');
  if (el) { el.textContent = totalQty; el.classList.add('cart-glow'); setTimeout(()=>el.classList.remove('cart-glow'),800); }
}

// localStorage cart helpers
export function getCart(){ try { return JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch { return []; } }
function setCart(c){ localStorage.setItem(cartKey, JSON.stringify(c)); updateCartBadge(); renderMiniCart(); }
function toast(message, type='info', actions=null){ try { window.createToastEx(message, type, actions); } catch { console.log(message); } }

function flyToCart(imgSrc, originEl) {
  const cartIcon = document.getElementById('cartCount');
  if (!cartIcon) return;
  const rectStart = originEl.getBoundingClientRect();
  const rectEnd = cartIcon.getBoundingClientRect();
  const clone = document.createElement('img');
  clone.src = imgSrc;
  clone.style.position = 'fixed';
  clone.style.zIndex = 9999;
  clone.style.left = rectStart.left + 'px';
  clone.style.top = rectStart.top + 'px';
  clone.style.width = rectStart.width + 'px';
  clone.style.height = rectStart.height + 'px';
  clone.style.transition = 'all .7s cubic-bezier(.25,.8,.25,1)';
  document.body.appendChild(clone);
  requestAnimationFrame(() => {
    clone.style.left = rectEnd.left + 'px';
    clone.style.top = rectEnd.top + 'px';
    clone.style.width = '20px';
    clone.style.height = '20px';
    clone.style.opacity = '0.5';
  });
  setTimeout(() => clone.remove(), 800);
}

// add to cart with optional image element for animation
function addToCart(product, qty=1, imgEl=null, options={}){
  const c = getCart();
  const idx = c.findIndex(x => x.id === product.id);
  if (idx > -1) c[idx].qty += qty;
  else c.push({ id: product.id, title: product.title, price: product.price, image: product.image, qty: qty, options: options });
  setCart(c);
  toast('Added to cart', 'success');
  try{ if (imgEl) flyToCart(product.image, imgEl); }catch(e){}
}

// remove item with undo
function removeItem(id){
  let c = getCart();
  const idx = c.findIndex(x=>x.id===id);
  if (idx===-1) return;
  lastRemoved = c[idx];
  c = c.filter(x=>x.id!==id);
  setCart(c);
  toast('Item removed', 'info', [{label:'Undo', action:()=>{ undoRemove(); }}]);
}

function undoRemove(){
  if (!lastRemoved) return;
  const c = getCart();
  c.push(lastRemoved);
  setCart(c);
  toast('Item restored', 'success');
  lastRemoved = null;
}

function changeQty(id, delta){
  const c = getCart();
  const idx = c.findIndex(x=>x.id===id);
  if (idx===-1) return;
  c[idx].qty += delta;
  if (c[idx].qty < 1) c[idx].qty = 1;
  setCart(c);
}

// promo codes: SAVE10 -> 10% off, SAVE20 -> 20%
function applyPromoCode(code){
  if (!code) { appliedPromo = {code:null, discount:0}; toast('Enter a promo code', 'error'); return; }
  const map = { 'SAVE10':10, 'SAVE20':20, 'FREESHIP':0 };
  const upper = code.toUpperCase().trim();
  if (map[upper]===undefined){ toast('Invalid promo code', 'error'); return; }
  appliedPromo = { code: upper, discount: map[upper] };
  toast('Promo applied: ' + upper, 'success');
  renderMiniCart();
  renderCartPage(); // update totals on cart page if open
}

// render mini cart drawer
function renderMiniCart(){
  const c = getCart();
  miniCartItems.innerHTML = '';
  if (!c.length){ miniCartItems.innerHTML = '<p class="text-slate-500">No items in cart.</p>'; miniSubtotal.textContent = '$0.00'; return; }
  for (const it of c){
    const el = document.createElement('div');
    el.className = 'flex items-center gap-3';
    el.innerHTML = `
      <img src="${it.image}" class="w-16 h-16 object-contain" alt="">
      <div class="flex-1">
        <div class="font-semibold text-sm">${escapeHtml(it.title)}</div>
        <div class="text-xs text-slate-500">$${it.price.toFixed(2)} x ${it.qty}</div>
        <div class="text-xs text-slate-400">Size: ${it.options?.size||'-'} • Color: <span style="display:inline-block;width:12px;height:12px;background:${it.options?.color||'#222'};border-radius:2px;border:1px solid rgba(0,0,0,0.15);"></span></div>
      </div>
      <div class="text-sm font-semibold">$${(it.price*it.qty).toFixed(2)}</div>
    `;
    miniCartItems.appendChild(el);
  }
  const subtotal = c.reduce((s,x)=> s + x.price*x.qty, 0);
  const discounted = appliedPromo.discount ? subtotal * (appliedPromo.discount/100) : 0;
  miniSubtotal.textContent = '$' + (subtotal - discounted).toFixed(2);
}

// render products
function renderStars(rate){
  const full = Math.round(rate);
  let html = '';
  for (let i=1;i<=5;i++){
    html += `<span class="star" style="color:${i<=full?'#facc15':'#e5e7eb'}">★</span>`;
  }
  return html;
}

function renderSkeletons(count=8){
  productsEl.innerHTML = '';
  for (let i=0;i<count;i++){
    const s = document.createElement('div');
    s.className = 'bg-white dark:bg-slate-800 p-4 rounded shadow-sm flex flex-col skeleton';
    s.style.minHeight = '260px';
    productsEl.appendChild(s);
  }
}

function renderProducts(list){
  productsEl.innerHTML = '';
  if (!list.length){ emptyMsgEl.classList.remove('hidden'); return; }
  emptyMsgEl.classList.add('hidden');
  for (const p of list){
    const card = document.createElement('article');
    card.className = 'bg-white dark:bg-slate-800 p-4 rounded shadow-sm flex flex-col card-anim tilt relative overflow-hidden reveal reveal-scroll';
    card.innerHTML = `
      <img src="${p.image}" loading="lazy" alt="${escapeHtml(p.title)}" class="card-img mx-auto mb-3 h-44 object-contain"/>
      <div class="price-badge">$${Number(p.price).toFixed(2)}</div>
      <h3 class="text-sm font-semibold line-clamp-2 mt-2">${escapeHtml(p.title)}</h3>
      <div class="text-xs text-slate-500 dark:text-slate-300 mt-1">${escapeHtml(p.category)}</div>
      <div class="mt-auto flex items-center justify-between mt-3">
        <div>
          <div class="font-bold text-sky-600">$${Number(p.price).toFixed(2)}</div>
          <div class="flex items-center gap-1 text-yellow-500 text-sm mt-1">${renderStars(p.rating?.rate||0)} <span class="text-xs text-slate-500 dark:text-slate-300">(${p.rating?.count||0})</span></div>
        </div>
        <div class="flex flex-col gap-2 card-actions">
          <button data-id="${p.id}" class="addBtn text-sm bg-sky-600 text-white px-3 py-1 rounded">Add</button>
          <button data-id="${p.id}" class="viewBtn text-sm border px-3 py-1 rounded text-slate-700 dark:text-white border-slate-300 dark:border-slate-500">Details</button>
        </div>
          <button data-id="${p.id}" class="wishlist-btn text-sm p-1 rounded-full" title="Add to wishlist">♡</button>
        </div>
      </div>
    `;
    productsEl.appendChild(card);
  // set wishlist heart initial state
  const wbtn = card.querySelector('.wishlist-btn');
  if (wbtn) {
    const pid = Number(wbtn.dataset.id);
    const isWish = (typeof getWishlist === 'function') ? getWishlist().some(x=>x.id===pid) : false;
    wbtn.textContent = isWish ? '♥' : '♡';
    if (isWish) wbtn.classList.add('active');
  }

  }

  // stagger reveal
  let delay = 0;
  document.querySelectorAll('.reveal').forEach(el => {
    el.style.animationDelay = delay + 's';
    delay += 0.06;
  });

  // attach listeners
  productsEl.querySelectorAll('.addBtn').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    const p = products.find(x => x.id === id);
    const imgEl = e.currentTarget.closest('article')?.querySelector('img');
    if (p) addToCart(p, 1, imgEl, { size: 'M', color: '#222' });
  }));
  productsEl.querySelectorAll('.viewBtn').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    const p = products.find(x => x.id === id);
    if (p) openDetail(p);
  }));
}

// escape html helper
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// product detail modal with sizes/colors
function openDetail(p){
  const dlg = document.createElement('dialog');
  dlg.className = 'w-full max-w-3xl p-0 rounded';
  const sizesArr = ['S','M','L','XL'];
  const colorsArr = ['#222','#e11d48','#1d4ed8','#16a34a'];
  dlg.innerHTML = `
    <div class="p-6 bg-white dark:bg-slate-800 rounded">
      <div class="flex gap-6">
        <img src="${p.image}" class="w-48 h-48 object-contain" alt="">
        <div class="flex-1">
          <h3 class="text-xl font-bold">${escapeHtml(p.title)}</h3>
          <p class="text-sm text-slate-500 mt-1">${escapeHtml(p.category)}</p>
          <p class="mt-4 text-slate-700 dark:text-slate-200">${escapeHtml(p.description)}</p>

          <div class="mt-4 flex items-center gap-4">
            <div>
              <label class='text-xs'>Sizes</label>
              <div class='flex gap-1 mt-1'>
                ${sizesArr.map(s=>`<button class='border px-2 py-1 text-xs rounded sizeBtn'>${s}</button>`).join('')}
              </div>
            </div>
            <div>
              <label class='text-xs'>Colors</label>
              <div class='flex gap-1 mt-1'>
                ${colorsArr.map(c=>`<button class='w-4 h-4 rounded-full border' style='background:${c}'></button>`).join('')}
              </div>
            </div>
          </div>

          <div class="mt-4 flex items-center gap-4">
            <div class="text-2xl font-bold text-sky-600">$${Number(p.price).toFixed(2)}</div>
            <button id="dlgAdd" class="ml-auto bg-sky-600 text-white px-4 py-2 rounded">Add to cart</button>
            <button id="dlgClose" class="ml-2 border px-3 py-1 rounded">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // add listeners for modal size and color selection
  dlg.querySelectorAll('.sizeBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      dlg.querySelectorAll('.sizeBtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  // color swatches - convert buttons to have class color-swatch and selection
  dlg.querySelectorAll('button[style^="background:"]').forEach((btn, idx) => {
    btn.classList.add('color-swatch');
    btn.addEventListener('click', () => {
      dlg.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  document.body.appendChild(dlg);
  dlg.showModal();
  // wire up size and color selection
  const sizeButtons = Array.from(dlg.querySelectorAll('.sizeBtn'));
  sizeButtons.forEach(btn=> btn.addEventListener('click', ()=>{ sizeButtons.forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); }));
  const colorButtons = Array.from(dlg.querySelectorAll('button[style]'));
  colorButtons.forEach(btn=> btn.addEventListener('click', ()=>{ colorButtons.forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); }));

  dlg.querySelector('#dlgClose').onclick = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('#dlgAdd').onclick = () => { const selectedSize = dlg.querySelector('.sizeBtn.selected')?.textContent || 'M'; const selectedColorEl = dlg.querySelector('button.selected[style]'); const selectedColor = selectedColorEl ? selectedColorEl.style.background : '#222'; addToCart(p,1,null,{ size: selectedSize, color: selectedColor }); dlg.close(); dlg.remove(); };
}

// filters & UI
function applyFilters(){
  const max = Number(priceRange.value) || 0;
  const cat = categorySelect.value;
  const q = (searchInput?.value || '').toLowerCase().trim();
  filtered = products.filter(p => {
    if (p.price > max) return false;
    if (cat !== 'all' && p.category !== cat) return false;
    if (q && !(p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))) return false;
    return true;
  });
  renderProducts(filtered);
}

// mini cart drawer controls
openMiniCartBtn?.addEventListener('click', ()=> { miniCart.classList.add('open'); miniCart.style.transform='translateX(0)'; renderMiniCart(); });
closeMiniCartBtn?.addEventListener('click', ()=> { miniCart.classList.remove('open'); miniCart.style.transform='translateX(100%)'; });
viewCartBtn?.addEventListener('click', ()=> { window.location.href='cart.html'; });
miniCheckoutBtn?.addEventListener('click', ()=> { window.location.href='checkout.html'; });

// cart page renderer (used by cart.html)
export function renderCartPage(){
  const container = document.getElementById('cartContainer');
  const totalEl = document.getElementById('totalAmount');
  const promoInput = document.getElementById('promoCode');
  const applyBtn = document.getElementById('applyPromo');
  if (!container) return;
  const c = getCart();
  container.innerHTML = '';
  if (!c.length) { container.innerHTML = '<p class="text-center text-slate-600 py-8">Your cart is empty.</p>'; totalEl.textContent='$0.00'; return; }
  for (const it of c){
    const div = document.createElement('div');
    div.className = 'flex items-center gap-4 border-b py-4';
    div.innerHTML = `
      <img src="${it.image}" class="card-img w-24" alt="">
      <div class="flex-1">
        <div class="font-semibold">${escapeHtml(it.title)}</div>
        <div class="text-sm text-slate-600">$${Number(it.price).toFixed(2)}</div>
      </div>
      <div class="flex items-center gap-2">
        <button data-id="${it.id}" class="decrease px-3 py-1 border rounded">-</button>
        <div class="px-3">${it.qty}</div>
        <button data-id="${it.id}" class="increase px-3 py-1 border rounded">+</button>
      </div>
      <div class="w-28 text-right">$${(it.price*it.qty).toFixed(2)}</div>
      <div><button data-id="${it.id}" class="delete text-sm text-red-600">Delete</button></div>
    `;
    container.appendChild(div);
  }

  // handlers
  container.querySelectorAll('.increase').forEach(b=>b.addEventListener('click', e=>{ changeQty(Number(e.currentTarget.dataset.id), +1); renderCartPage(); }));
  container.querySelectorAll('.decrease').forEach(b=>b.addEventListener('click', e=>{ changeQty(Number(e.currentTarget.dataset.id), -1); renderCartPage(); }));
  container.querySelectorAll('.delete').forEach(b=>b.addEventListener('click', e=>{ removeItem(Number(e.currentTarget.dataset.id)); renderCartPage(); }));

  const subtotal = c.reduce((s,x)=> s + x.price*x.qty, 0);
  const discount = appliedPromo.discount ? subtotal*(appliedPromo.discount/100) : 0;
  totalEl.textContent = '$' + (subtotal - discount).toFixed(2);

  applyBtn?.addEventListener('click', ()=>{ applyPromoCode(promoInput.value); renderCartPage(); });
}

// checkout renderer
function renderCheckoutSummary(){
  const list = document.getElementById('summaryList');
  const grand = document.getElementById('grandTotal');
  const subEl = document.getElementById('subTotal');
  const discEl = document.getElementById('discountAmount');
  const etaEl = document.getElementById('eta');
  if (!list) return;
  const c = getCart();
  list.innerHTML = '';
  if (!c.length) list.innerHTML = '<p class="text-slate-600">No items in cart.</p>';
  for (const it of c){
    const el = document.createElement('div');
    el.className = 'flex items-center gap-3';
    el.innerHTML = `<img src="${it.image}" class="w-12 h-12 object-contain" alt=""><div class="flex-1 text-sm">${escapeHtml(it.title)} <div class="text-slate-500 text-xs">x ${it.qty}</div><div class=\"text-xs text-slate-400\">Size: ${it.options?.size||'-'} • Color: <span style=\"display:inline-block;width:10px;height:10px;background:${it.options?.color||'#222'};border-radius:2px;border:1px solid rgba(0,0,0,0.08);\"></span></div></div><div class="font-semibold">$${(it.qty*it.price).toFixed(2)}</div>`;
    list.appendChild(el);
  }
  const subtotal = c.reduce((s,x)=> s + x.price*x.qty, 0);
  const discount = appliedPromo.discount ? subtotal*(appliedPromo.discount/100) : 0;
  const shipping = subtotal > 100 ? 0 : 5.99; const total = subtotal - discount + shipping;
  subEl.textContent = '$' + subtotal.toFixed(2);
  discEl.textContent = '-$' + discount.toFixed(2);
  grand.textContent = '$' + total.toFixed(2);

  // ETA: current date + 3..7 days
  const now = new Date();
  const min = new Date(now.getTime() + 3*24*60*60*1000);
  const max = new Date(now.getTime() + 7*24*60*60*1000);
  const opts = { month:'short', day:'numeric' };
  etaEl.textContent = min.toLocaleDateString(undefined,opts) + ' - ' + max.toLocaleDateString(undefined,opts); document.getElementById('grandTotal').dataset.order = 'ORD' + Math.floor(Math.random()*900000+100000);
}

// scroll reveal (intersection observer)
const revealObserver = new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if (e.isIntersecting) e.target.classList.add('visible'); }); },{threshold:0.15});

function observeReveals(){ document.querySelectorAll('.reveal-scroll').forEach(el=> revealObserver.observe(el)); }

// init UI listeners
function initUI(){
  priceRange?.addEventListener('input', ()=>{ maxPriceLabel.textContent = '$' + Number(priceRange.value).toFixed(2); applyFilters(); });
  categorySelect?.addEventListener('change', applyFilters);
  searchInput?.addEventListener('input', ()=>{ setTimeout(applyFilters,120); });
  document.getElementById('resetFilters')?.addEventListener('click', ()=>{ priceRange.value = priceRange.max; searchInput.value=''; categorySelect.value='all'; applyFilters(); });
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('mobileMenuBtn')?.addEventListener('click', ()=>{ toast('Mobile menu placeholder','info'); });

  // scroll to top button
  window.addEventListener('scroll', ()=>{ if (window.scrollY > 300) scrollTopBtn.style.display = 'block'; else scrollTopBtn.style.display = 'none'; });
  scrollTopBtn?.addEventListener('click', ()=> window.scrollTo({top:0,behavior:'smooth'}));
}

// theme
function getTheme(){ return localStorage.getItem('theme') || 'light'; }
function applyTheme(t){ const root = document.documentElement; if (t === 'dark'){ root.classList.add('dark'); document.body.setAttribute('data-theme','dark'); } else { root.classList.remove('dark'); document.body.setAttribute('data-theme','light'); } const icon = document.getElementById('themeIcon'); if (icon) icon.innerHTML = t === 'dark' ? '<path stroke-width="1.5" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>' : '<path stroke-width="1.5" d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'; }
function toggleTheme(){ const t = getTheme() === 'dark' ? 'light' : 'dark'; localStorage.setItem('theme', t); applyTheme(t); }

// fetch & init
async function init(){
  initUI();
  applyTheme(getTheme());
  updateCartBadge();
  renderSkeletons(8);
  showLoading();
  try{
    const r = await fetch(API);
    if (!r.ok) throw new Error('Failed to fetch');
    products = await r.json();
    // Futuristic Fashion names (20)
    const customNames = ["NeoWeave Hoodie","ChronoSteel Watch","Luxora Sapphire Ring","VoltEdge Backpack","AeroCore Shoes","NovaPulse Headphones","StormWire Jacket","CarbonQuartz Wallet","ShadowByte Laptop","TitanGear Toolset","HyperLink Bracelet","OmegaWeave Bag","SilverStorm Pendant","PlasmaDrive SSD","IonMist Perfume","QuantumGaze Sunglasses","HyperSight Camera","PyroFlare Tee","NeonStar Sneakers","AstraGlow Candle"];
    products = products.map((p,i)=> ({...p, title: customNames[i] || p.title}));
    const maxPrice = Math.ceil(Math.max(...products.map(p=>p.price)));
    priceRange.max = maxPrice;
    priceRange.value = maxPrice;
    maxPriceLabel.textContent = '$' + Number(priceRange.value).toFixed(2);
    const cats = Array.from(new Set(products.map(p => p.category)));
    for (const c of cats){ const opt = document.createElement('option'); opt.value = c; opt.textContent = c; categorySelect.appendChild(opt); }
    filtered = [...products];
    renderProducts(filtered);
    observeReveals();
    // simulate small price drop to notify wishlist users
    setTimeout(simulatePriceDrop, 1200);
  }catch(err){
    console.error(err);
    emptyMsgEl.textContent = 'Failed to load products.';
    emptyMsgEl.classList.remove('hidden');
  }finally{
    hideLoading();
  }
}

// expose helpers globally
window.getCart = getCart; window.setCart = setCart; window.updateCartBadge = updateCartBadge; window.applyPromoCode = applyPromoCode; window.renderCartPage = renderCartPage; window.loadCartPage = renderCartPage; window.renderCheckoutSummary = renderCheckoutSummary; window.recommendAlternatives = recommendAlternatives; window.moveWishlistToCart = moveWishlistToCart; window.isInCart = isInCart;

init();


// Simple confetti animation (small)
function confettiBurst(){
  const count = 40;
  for (let i=0;i<count;i++){
    const d = document.createElement('div');
    d.style.position='fixed';
    d.style.zIndex=9999;
    d.style.left = (window.innerWidth/2 + (Math.random()-0.5)*200) + 'px';
    d.style.top = (window.innerHeight/2 + (Math.random()-0.5)*20) + 'px';
    d.style.width = '8px';
    d.style.height = '12px';
    d.style.background = ['#06b6d4','#f97316','#f43f5e','#a78bfa'][Math.floor(Math.random()*4)];
    d.style.opacity = 1;
    d.style.borderRadius='2px';
    d.style.transform = 'translateY(0) rotate('+ (Math.random()*360) +'deg)';
    d.style.transition = 'all 1.2s cubic-bezier(.2,.9,.2,1)';
    document.body.appendChild(d);
    requestAnimationFrame(()=> {
      d.style.left = (window.innerWidth/2 + (Math.random()-0.5)*600) + 'px';
      d.style.top = (window.innerHeight + 200) + 'px';
      d.style.opacity = 0;
      d.style.transform = 'translateY(0) rotate(' + (Math.random()*720) + 'deg)';
    });
    setTimeout(()=> d.remove(), 1400);
  }
}

// Price drop simulation (checks once per session)
function simulatePriceDrop(){
  try{
    const w = getWishlist();
    if (!w.length) return;
    // randomly pick one wishlist item to 'drop' price by 5-15%
    const pick = w[Math.floor(Math.random()*w.length)];
    if (!pick) return;
    const p = products.find(x=>x.id===pick.id);
    if (!p) return;
    const dropPercent = Math.floor(5 + Math.random()*10);
    const newPrice = +(p.price * (1 - dropPercent/100)).toFixed(2);
    // notify user
    createToastEx && createToastEx(`Price drop: ${p.title} is now $${newPrice} (-${dropPercent}%)`,'success', [{label:'View', action: ()=> openDetail(p)}], 7000);
  }catch(e){}
}
