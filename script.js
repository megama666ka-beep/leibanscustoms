async function storageGet(key, shared){
  try{
    const r = await window.storage.get(key, shared);
    return r ? JSON.parse(r.value) : null;
  }catch(e){ return null; }
}
async function storageSet(key, value, shared){
  try{ await window.storage.set(key, JSON.stringify(value), shared); }catch(e){ console.error(e); }
}

/* ================= ghost words ================= */
const ghostWords = ["jeans","jeans","denim","jeans","one of a kind"];
function spawnGhosts(){
  const c = document.getElementById('ghosts');
  c.innerHTML = "";
  for(let i=0;i<8;i++){
    const s = document.createElement('span');
    s.className = 'ghost-word';
    s.textContent = ghostWords[i % ghostWords.length];
    s.style.left = (Math.random()*80+5) + 'vw';
    s.style.top = (Math.random()*85+5) + 'vh';
    s.style.fontSize = (10 + Math.random()*14) + 'px';
    s.style.animationDelay = (Math.random()*9) + 's';
    s.style.animationDuration = (7 + Math.random()*6) + 's';
    c.appendChild(s);
  }
}
spawnGhosts();

/* ================= toast ================= */
let toastTimer;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3600);
}

/* ================= routing ================= */
const pages = ['home','auction','lookbook','contact'];
function currentPage(){
  const h = location.hash.replace('#/','') || 'home';
  return pages.includes(h) ? h : 'home';
}
function renderRoute(){
  const p = currentPage();
  pages.forEach(name=>{
    const el = document.getElementById('page-'+name);
    el.classList.toggle('visible', name===p);
  });
  document.querySelectorAll('.nav-links a').forEach(a=>{
    a.classList.toggle('active', a.dataset.page===p);
  });
  if(p==='auction') renderLots();
  if(p==='lookbook') renderLookbook();
  window.scrollTo({top:0, behavior:'instant'});
}
function navigate(page){
  location.hash = page==='home' ? '' : ('/'+page);
}
window.addEventListener('hashchange', renderRoute);

/* zombie zoom transition -> auction, only meaningful from home */
function goAuctionWithZoom(e){
  e.preventDefault();
  if(currentPage()==='home'){
    const wrap = document.getElementById('zombie-wrap');
    const fadeTarget = document.getElementById('hero-fade-target');
    wrap.classList.add('zoom');
    fadeTarget.classList.add('hero-fadeout');
    setTimeout(()=>{ navigate('auction'); wrap.classList.remove('zoom'); fadeTarget.classList.remove('hero-fadeout'); }, 750);
  } else {
    navigate('auction');
  }
}
document.getElementById('cta-auction').addEventListener('click', goAuctionWithZoom);
document.getElementById('nav-auction').addEventListener('click', goAuctionWithZoom);

/* ================= AUCTION DATA ================= */
const DAY = 24*60*60*1000;
const DEFAULT_ITEMS = [
  { id:'jeans-01', title:'Jeans №01 — "Reclaimed"' },
  { id:'jeans-02', title:'Jeans №02 — "Stitched Ghost"' },
  { id:'jeans-03', title:'Jeans №03 — "Bone Dust"' },
];

async function getItem(id, title){
  let item = await storageGet('auction:'+id, true);
  if(!item){
    item = { id, title, basePrice:15, currentBid:0, currentLeader:null, startTime:Date.now(), bids:[] };
    await storageSet('auction:'+id, item, true);
  }
  return item;
}

function fmtCountdown(ms){
  if(ms<=0) return {text:'Аукцион завершён', ended:true};
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400);
  const h = Math.floor((s%86400)/3600);
  const m = Math.floor((s%3600)/60);
  const sec = s%60;
  const pad = n=>String(n).padStart(2,'0');
  return {text:`${d}д ${pad(h)}:${pad(m)}:${pad(sec)}`, ended:false};
}

let lotsRendered = false;
let countdownTimers = [];

async function renderLots(){
  const wrap = document.getElementById('lots');
  wrap.innerHTML = '';
  countdownTimers.forEach(t=>clearInterval(t));
  countdownTimers = [];

  for(const def of DEFAULT_ITEMS){
    const item = await getItem(def.id, def.title);
    const endTime = item.startTime + 3*DAY;
    const nextBid = item.currentBid > 0 ? item.currentBid : item.basePrice;

    const card = document.createElement('div');
    card.className = 'lot-card';
    card.innerHTML = `
      <div class="lot-photo">
        <div class="watermark">JEANS</div>
        <div class="emoji">&#128110;</div>
      </div>
      <div class="lot-body">
        <div class="lot-title">${item.title}</div>
        <div class="lot-row">
          <span class="label">${item.currentBid>0 ? 'Текущая ставка' : 'Стартовая цена'}</span>
          <span class="lot-price">${item.currentBid>0 ? item.currentBid : item.basePrice}€</span>
        </div>
        <div class="lot-row">
          <span class="label">Лидирует</span>
          <span>${item.currentLeader ? item.currentLeader : '&mdash; пока никто'}</span>
        </div>
        <div class="lot-row">
          <span class="label">До закрытия</span>
          <span class="countdown" data-end="${endTime}">&hellip;</span>
        </div>

        <div class="leaderboard">
          <div class="leaderboard-title">Лидерборд</div>
          <div class="lb-list"></div>
        </div>

        <div class="bid-form">
          <input type="text" class="bid-name" placeholder="Ваше имя / ник">
          <input type="number" class="bid-amount" placeholder="Ставка, €" min="${nextBid+1}">
          <button class="btn-bid">Bid</button>
        </div>
        <div class="confirm-box">
          <div class="confirm-text"></div>
          <div class="confirm-actions">
            <button class="btn-tiny confirm">Подтвердить и оплатить депозит</button>
            <button class="btn-tiny cancel">Отмена</button>
          </div>
        </div>
        <div class="bid-msg"></div>
      </div>
    `;
    wrap.appendChild(card);

    // leaderboard
    const lbList = card.querySelector('.lb-list');
    renderLeaderboard(lbList, item.bids);

    // countdown
    const cdEl = card.querySelector('.countdown');
    const tick = ()=>{
      const {text, ended} = fmtCountdown(endTime - Date.now());
      cdEl.textContent = text;
      cdEl.classList.toggle('ended', ended);
    };
    tick();
    countdownTimers.push(setInterval(tick, 1000));

    // bidding
    setupBidForm(card, item, def);
  }
}

function renderLeaderboard(container, bids){
  const sorted = [...bids].sort((a,b)=>b.amount-a.amount).slice(0,5);
  if(sorted.length===0){
    container.innerHTML = '<div class="lb-empty">Ставок пока нет — будьте первым</div>';
    return;
  }
  container.innerHTML = sorted.map((b,i)=>`
    <div class="lb-row ${i===0?'top':''}">
      <span>${i+1}. ${escapeHtml(b.name)}</span>
      <span>${b.amount}€</span>
    </div>
  `).join('');
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function setupBidForm(card, item, def){
  const nameInput = card.querySelector('.bid-name');
  const amountInput = card.querySelector('.bid-amount');
  const btn = card.querySelector('.btn-bid');
  const msg = card.querySelector('.bid-msg');
  const confirmBox = card.querySelector('.confirm-box');
  const confirmText = card.querySelector('.confirm-text');
  const confirmBtn = card.querySelector('.confirm');
  const cancelBtn = card.querySelector('.cancel');

  let pending = null;

  btn.addEventListener('click', ()=>{
    msg.textContent = '';
    msg.className = 'bid-msg';
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const floor = item.currentBid > 0 ? item.currentBid : item.basePrice - 1;

    if(!name){ msg.textContent = 'Введите имя или ник.'; msg.classList.add('err'); return; }
    if(!amount || isNaN(amount)){ msg.textContent = 'Введите сумму ставки.'; msg.classList.add('err'); return; }
    if(amount <= floor){ msg.textContent = `Ставка должна быть выше ${floor}€.`; msg.classList.add('err'); return; }

    const deposit = Math.round(amount * 0.10 * 100) / 100;
    pending = {name, amount, deposit};
    confirmText.innerHTML = `Ставка <b>${amount}€</b>. К оплате депозит <b>10%</b>: <b>${deposit}€</b>.<br>Это прототип — реального списания не произойдёт.`;
    confirmBox.classList.add('show');
  });

  cancelBtn.addEventListener('click', ()=>{
    confirmBox.classList.remove('show');
    pending = null;
  });

  confirmBtn.addEventListener('click', async ()=>{
    if(!pending) return;
    const prevLeader = item.currentLeader;
    const prevBid = item.currentBid;

    item.bids.push({name: pending.name, amount: pending.amount, time: Date.now()});
    item.currentBid = pending.amount;
    item.currentLeader = pending.name;
    await storageSet('auction:'+def.id, item, true);

    confirmBox.classList.remove('show');
    msg.textContent = `Ставка ${pending.amount}€ принята — вы лидируете.`;
    msg.className = 'bid-msg ok';
    nameInput.value = ''; amountInput.value = '';

    renderLeaderboard(card.querySelector('.lb-list'), item.bids);
    card.querySelector('.lot-row .lot-price').textContent = item.currentBid + '€';
    card.querySelectorAll('.lot-row span')[3] && (card.querySelectorAll('.lot-row')[1].querySelector('span:last-child').textContent = item.currentLeader);
    amountInput.min = item.currentBid + 1;

    if(prevLeader && prevLeader !== pending.name){
      const prevDeposit = Math.round(prevBid * 0.10 * 100) / 100;
      toast(`Ставка ${prevLeader} перебита — депозит ${prevDeposit}€ возвращён (прототип).`);
    } else {
      toast('Ставка принята.');
    }
    pending = null;
  });
}

/* ================= LOOKBOOK ================= */
async function renderLookbook(){
  const el = document.getElementById('lookbook-content');
  const history = await storageGet('lookbook-history', true) || [];
  if(history.length === 0){
    el.innerHTML = `
      <div class="empty-state">
        <span class="big">Архив пока пуст</span>
        История прошлых аукционов появится здесь после первых продаж.<br>
        Нажмите «+ Добавить запись» ниже, чтобы внести завершённый лот вручную.
      </div>
    `;
    return;
  }
  const rows = [...history].sort((a,b)=>b.addedAt-a.addedAt).map(h=>`
    <tr>
      <td>${escapeHtml(h.name)}</td>
      <td>${escapeHtml(h.price)}€</td>
      <td>${escapeHtml(h.date)}</td>
    </tr>
  `).join('');
  el.innerHTML = `
    <table class="lb-table">
      <thead><tr><th>Лот</th><th>Финальная цена</th><th>Дата продажи</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

document.getElementById('admin-toggle').addEventListener('click', ()=>{
  document.getElementById('admin-panel').classList.toggle('show');
});
document.getElementById('al-submit').addEventListener('click', async ()=>{
  const name = document.getElementById('al-name').value.trim();
  const price = document.getElementById('al-price').value.trim();
  const date = document.getElementById('al-date').value.trim();
  if(!name || !price || !date){ toast('Заполните все поля: название, цена, дата.'); return; }
  const history = await storageGet('lookbook-history', true) || [];
  history.push({name, price, date, addedAt: Date.now()});
  await storageSet('lookbook-history', history, true);
  document.getElementById('al-name').value = '';
  document.getElementById('al-price').value = '';
  document.getElementById('al-date').value = '';
  toast('Запись добавлена в архив.');
  renderLookbook();
});

/* ================= init ================= */
renderRoute();