/* ===========================================================
   Real API client — replaces mock.js
   เชื่อมกับ Code.gs (Google Apps Script web app) ผ่าน fetch POST text/plain
   =========================================================== */
window.APP = window.APP || {};

/* ---------- 1) CONFIG (แก้ตรงนี้หลัง deploy) ---------- */
APP.config = {
  // URL ของ GAS web app deployment (ลงท้าย /exec)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzncfRPHxhmg3IRiLuQAKPLGPrP0qKuzcHgmDRtyjFiYHEDqyG0amRd8sVP1TjgNVkA/exec',
  // LINE LIFF ID จาก LINE Developers Console (LIFF app)
  LIFF_ID: 'REPLACE_WITH_LIFF_ID',
  // ถ้า true → ข้าม LIFF login แล้วใช้ mock token (สำหรับเปิด index.html ตรงๆ ตอน dev)
  DEV_MODE: location.protocol === 'file:' || location.hostname === 'localhost',
};

/* ---------- 2) state ที่ screens-*.js อ่าน ---------- */
APP.member = null;
APP.accounts = [];
APP.bankAccounts = [];
APP.txns = [];
APP.WITHDRAW_LIMIT = 50000;
APP.bank = { name:'ธ.กรุงไทย', branch:'สาขามุกดาหาร', accNo:'420-1-27931-6', accName:'สหกรณ์ออมทรัพย์สาธารณสุขจังหวัดมุกดาหาร จำกัด' };

/* ---------- 3) helpers (เหมือนเดิมจาก mock.js) ---------- */
APP.fmt = function(n){
  return Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
};
APP.fmtInt = function(n){
  return Number(n||0).toLocaleString('th-TH');
};
APP.acctById = function(id){ return APP.accounts.find(a=>a.id===id); };
APP.statusMeta = function(s){
  switch(s){
    case 'pending':  return {cls:'b-pending', ic:'bi-clock-history', label:'รอตรวจสอบ'};
    case 'review':   return {cls:'b-review',  ic:'bi-search',        label:'กำลังตรวจสอบ'};
    case 'approved': return {cls:'b-approved',ic:'bi-patch-check',   label:'อนุมัติแล้ว'};
    case 'done':     return {cls:'b-done',    ic:'bi-check-circle-fill', label:'สำเร็จ'};
    case 'reject':   return {cls:'b-reject',  ic:'bi-x-circle',      label:'ไม่อนุมัติ'};
    default:         return {cls:'b-pending', ic:'bi-clock',         label:s};
  }
};

/* ---------- 4) RPC ---------- */
APP.api = {};

let SESSION_TOKEN = localStorage.getItem('mukcoop_token') || '';

APP.api.rpc = async function(fn, ...args){
  const t0 = performance.now();
  try {
    const res = await fetch(APP.config.GAS_URL, {
      method: 'POST',
      // ห้ามใช้ application/json — จะ trigger CORS preflight ที่ GAS ไม่รองรับ
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn, args, token: SESSION_TOKEN }),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      throw new Error('GAS endpoint ตอบกลับเป็น HTML — ตรวจการตั้งค่า Deploy (Execute as Me / Anyone)');
    }
    const data = JSON.parse(text);
    console.log('← RPC', fn, Math.round(performance.now()-t0)+'ms', data);
    return data;
  } catch (err) {
    console.error('✗ RPC', fn, err);
    return { ok:false, message:'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ' + (err.message||err) };
  }
};

/* ---------- 5) LIFF init + login ---------- */
APP.api.boot = async function(){
  try {
    let idToken;
    if (APP.config.DEV_MODE) {
      console.warn('[boot] DEV_MODE — ข้าม LIFF login');
      idToken = 'dev'; // server จะ reject — fallback ไป mock data
    } else {
      await loadLiffSdk_();
      await liff.init({ liffId: APP.config.LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: location.href });
        return { ok:false, message:'redirecting to LINE login' };
      }
      idToken = liff.getIDToken();
    }

    const r = await APP.api.rpc('login', idToken);
    if (!r.ok) {
      if (APP.config.DEV_MODE) { mockFallback_(); return { ok:true, dev:true }; }
      throw new Error(r.message || 'login failed');
    }
    if (!r.bound) {
      // ยังไม่ผูกบัญชีสมาชิก → ไปหน้า register
      APP.lineProfile = r.lineProfile;
      if (typeof APP.go === 'function') APP.go('register');
      return { ok:true, bound:false };
    }
    SESSION_TOKEN = r.token;
    localStorage.setItem('mukcoop_token', r.token);

    const b = await APP.api.rpc('loadInitialBundle');
    if (!b.ok) throw new Error(b.message);
    applyBundle_(b);
    if (typeof APP.go === 'function') APP.go('home');
    return { ok:true };
  } catch (err) {
    console.error('[boot]', err);
    UI && UI.toast && UI.toast('error','เริ่มระบบไม่สำเร็จ: ' + err.message);
    return { ok:false, message: err.message };
  }
};

function applyBundle_(b){
  APP.member = b.member && {
    name: b.member.fullName,
    memberId: b.member.memberId,
    citizenId: b.member.citizenId,
    position: b.member.position,
    workplace: b.member.workplace,
    phone: b.member.phone,
    lineConnected: b.member.lineConnected,
  };
  APP.accounts = (b.accounts || []).map(a => ({
    id: a.AccountId,
    type: a.AccountType,
    kind: a.AccountKind,
    no: a.AccountNo,
    balance: Number(a.Balance),
    rate: a.Rate,
    openDate: a.OpenDate,
    withdrawNote: a.AccountKind === 'special' ? 'ถอนออนไลน์ได้ไม่เกิน 50,000 บาท/รายการ' : '',
  }));
  APP.bankAccounts = (b.bankAccounts || []).map(x => ({
    id: x.BankAccountId, bank: x.BankName, no: x.BankAccNo, name: x.AccName,
  }));
  APP.txns = (b.txns || []).map(t => ({
    id: t.TxnId,
    kind: t.Kind,
    acct: t.AccountType,
    amount: Number(t.Amount),
    date: formatThaiDate_(t.CreatedAt),
    time: formatThaiTime_(t.CreatedAt),
    status: t.Status,
    to: t.ToBank ? (t.ToBank + ' ' + t.ToBankNo) : '',
    from: t.Kind === 'deposit' ? 'แจ้งโอน — ' + (APP.bank.name) : '',
    reason: t.RejectReason || '',
  }));
  if (b.config) {
    APP.WITHDRAW_LIMIT = b.config.withdrawLimit;
    if (b.config.bank) APP.bank = b.config.bank;
  }
}

/* ---------- 6) high-level operations (เรียกจาก screens-*.js) ---------- */

// upload ไฟล์เดียว: รับ File หรือ {dataUrl,name,size} (จาก UI.pickFile)
APP.api.uploadFile = async function(fileLike, kind){
  const dataUrl = fileLike.dataUrl || await fileToDataUrl_(fileLike);
  const compressed = /^image\//.test(fileLike.type || '') ? await compressImage_(dataUrl, 1280, 0.85) : dataUrl;
  const name = fileLike.name || (kind + '_' + Date.now());
  const r = await APP.api.rpc('uploadFile', { dataUrl: compressed, kind, filename: name });
  if (!r.ok) throw new Error(r.message);
  return r.fileId;
};

APP.api.createDeposit = async function(payload){
  // payload = { accountId, amount, slip:{dataUrl|File}, transferAt?, note? }
  const slipFileId = await APP.api.uploadFile(payload.slip, 'slip');
  return APP.api.rpc('createDeposit', {
    accountId: payload.accountId,
    amount: payload.amount,
    transferAt: payload.transferAt || new Date().toISOString(),
    slipFileId,
    note: payload.note || '',
  });
};

APP.api.createWithdraw = async function(payload){
  // payload = { accountId, amount, bankAccountId,
  //   docs:{citizenId,passbook,bankPassbook}, signatures:{owner,receiver}, note? }
  const [citizenIdFileId, passbookFileId, bankPassbookFileId, ownerFileId, receiverFileId] = await Promise.all([
    APP.api.uploadFile(payload.docs.citizenId,    'citizen'),
    APP.api.uploadFile(payload.docs.passbook,     'passbook'),
    APP.api.uploadFile(payload.docs.bankPassbook, 'bankbook'),
    APP.api.uploadFile(payload.signatures.owner,    'signature'),
    APP.api.uploadFile(payload.signatures.receiver, 'signature'),
  ]);
  return APP.api.rpc('createWithdraw', {
    accountId: payload.accountId,
    amount: payload.amount,
    bankAccountId: payload.bankAccountId,
    docs: { citizenIdFileId, passbookFileId, bankPassbookFileId },
    signatures: { ownerFileId, receiverFileId },
    note: payload.note || '',
  });
};

APP.api.refreshTxns = async function(){
  const r = await APP.api.rpc('listTxns', { limit: 50 });
  if (r.ok) { applyBundle_({ txns: r.txns, bankAccounts:[], accounts:[], member: APP.member, config:null });
    // ^ applyBundle_ จะ overwrite arrays อื่น — ทำเฉพาะ txns:
  }
  return r;
};
// override: refresh เฉพาะ txns ไม่กระทบ accounts
APP.api.refreshTxns = async function(){
  const r = await APP.api.rpc('listTxns', { limit: 50 });
  if (r.ok) {
    APP.txns = (r.txns || []).map(t => ({
      id: t.TxnId, kind: t.Kind, acct: t.AccountType, amount: Number(t.Amount),
      date: formatThaiDate_(t.CreatedAt), time: formatThaiTime_(t.CreatedAt),
      status: t.Status,
      to: t.ToBank ? (t.ToBank + ' ' + t.ToBankNo) : '',
      from: t.Kind === 'deposit' ? 'แจ้งโอน — ' + APP.bank.name : '',
      reason: t.RejectReason || '',
    }));
  }
  return r;
};

APP.api.logout = function(){
  localStorage.removeItem('mukcoop_token');
  SESSION_TOKEN = '';
  if (!APP.config.DEV_MODE && window.liff && liff.isLoggedIn()) liff.logout();
  location.reload();
};

/* ---------- 7) utils ---------- */
function loadLiffSdk_(){
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve();
    const s = document.createElement('script');
    s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    s.onload = resolve; s.onerror = () => reject(new Error('โหลด LIFF SDK ไม่สำเร็จ'));
    document.head.appendChild(s);
  });
}

function fileToDataUrl_(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function compressImage_(dataUrl, maxWidth, quality){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function formatThaiDate_(iso){
  if (!iso) return '';
  const d = new Date(iso);
  const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return String(d.getDate()).padStart(2,'0') + ' ' + m[d.getMonth()] + ' ' + (d.getFullYear()+543);
}
function formatThaiTime_(iso){
  if (!iso) return '';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

/* ---------- 8) dev fallback ถ้าเปิด file:// แล้วยังไม่ deploy ---------- */
function mockFallback_(){
  console.warn('[boot] ใช้ข้อมูล mock — เพราะ DEV_MODE และยังไม่ได้ deploy backend');
  APP.member = { name:'สมหญิง ใจดีมีออม', memberId:'0457', citizenId:'1-4998-00xxx-xx-x',
    position:'พยาบาลวิชาชีพชำนาญการ', workplace:'รพ.สต.บ้านโพนทราย', phone:'08x-xxx-4521', lineConnected:true };
  APP.accounts = [
    { id:'sav', type:'ออมทรัพย์', kind:'normal', no:'021-3-04571-9', balance:128450.75, rate:'2.50', openDate:'12 มี.ค. 2562' },
    { id:'spc', type:'ออมทรัพย์พิเศษ', kind:'special', no:'021-5-00982-3', balance:642300.00, rate:'3.00', openDate:'08 ม.ค. 2564', withdrawNote:'ถอนออนไลน์ได้ไม่เกิน 50,000 บาท/รายการ' },
  ];
  APP.bankAccounts = [
    { id:'b1', bank:'ธ.กรุงไทย', no:'678-x-xxxx21-4', name:'สมหญิง ใจดีมีออม' },
    { id:'b2', bank:'ธ.ออมสิน',  no:'020-x-xxxx88-0', name:'สมหญิง ใจดีมีออม' },
  ];
  APP.txns = [
    { id:'W2406-0182', kind:'withdraw', acct:'ออมทรัพย์พิเศษ', amount:30000, date:'05 มิ.ย. 2569', time:'09:14', status:'review',  to:'ธ.กรุงไทย 678-x-xxxx21-4' },
    { id:'D2406-1041', kind:'deposit',  acct:'ออมทรัพย์',     amount:5000,  date:'03 มิ.ย. 2569', time:'15:02', status:'approved',from:'แจ้งโอน — ธ.กรุงไทย' },
    { id:'W2405-0177', kind:'withdraw', acct:'ออมทรัพย์',     amount:12000, date:'28 พ.ค. 2569', time:'11:40', status:'done',    to:'ธ.ออมสิน 020-x-xxxx88-0' },
    { id:'D2405-0992', kind:'deposit',  acct:'ออมทรัพย์พิเศษ', amount:50000, date:'21 พ.ค. 2569', time:'08:55', status:'done',    from:'แจ้งโอน — ธ.ออมสิน' },
    { id:'W2405-0150', kind:'withdraw', acct:'ออมทรัพย์',     amount:8000,  date:'14 พ.ค. 2569', time:'16:20', status:'reject',  to:'ธ.กรุงไทย 678-x-xxxx21-4', reason:'สำเนาสมุดบัญชีไม่ชัดเจน' },
  ];
}

/* ---------- 9) auto-boot หลังโหลด jQuery / app.js ---------- */
$(function(){
  // ให้ app.js ทำงานก่อน (มันจะ render 'register' ทันที), แล้ว boot async จะ replace ด้วย 'home'
  setTimeout(() => APP.api.boot(), 0);
});
