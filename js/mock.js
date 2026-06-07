/* ===========================================================
   Mock data + helpers  (จำลองข้อมูล — ทีม dev เชื่อม Google Sheets ภายหลัง)
   =========================================================== */
window.APP = window.APP || {};

APP.member = {
  name: "สมหญิง ใจดีมีออม",
  memberId: "0457",
  citizenId: "1-4998-00xxx-xx-x",
  position: "พยาบาลวิชาชีพชำนาญการ",
  workplace: "รพ.สต.บ้านโพนทราย",
  phone: "08x-xxx-4521",
  lineConnected: true,
};

APP.accounts = [
  {
    id: "sav",
    type: "ออมทรัพย์",
    kind: "normal",
    no: "021-3-04571-9",
    balance: 128450.75,
    rate: "2.50",
    openDate: "12 มี.ค. 2562",
  },
  {
    id: "spc",
    type: "ออมทรัพย์พิเศษ",
    kind: "special",
    no: "021-5-00982-3",
    balance: 642300.00,
    rate: "3.00",
    openDate: "08 ม.ค. 2564",
    withdrawNote: "ถอนออนไลน์ได้ไม่เกิน 50,000 บาท/รายการ",
  },
];

APP.bankAccounts = [
  { id:"b1", bank:"ธ.กรุงไทย", no:"678-x-xxxx21-4", name:"สมหญิง ใจดีมีออม" },
  { id:"b2", bank:"ธ.ออมสิน", no:"020-x-xxxx88-0", name:"สมหญิง ใจดีมีออม" },
];

APP.WITHDRAW_LIMIT = 50000;

// transaction list (newest first)
APP.txns = [
  { id:"W2406-0182", kind:"withdraw", acct:"ออมทรัพย์พิเศษ", amount:30000, date:"05 มิ.ย. 2569", time:"09:14", status:"review", to:"ธ.กรุงไทย 678-x-xxxx21-4" },
  { id:"D2406-1041", kind:"deposit", acct:"ออมทรัพย์", amount:5000, date:"03 มิ.ย. 2569", time:"15:02", status:"approved", from:"แจ้งโอน — ธ.กรุงไทย" },
  { id:"W2405-0177", kind:"withdraw", acct:"ออมทรัพย์", amount:12000, date:"28 พ.ค. 2569", time:"11:40", status:"done", to:"ธ.ออมสิน 020-x-xxxx88-0" },
  { id:"D2405-0992", kind:"deposit", acct:"ออมทรัพย์พิเศษ", amount:50000, date:"21 พ.ค. 2569", time:"08:55", status:"done", from:"แจ้งโอน — ธ.ออมสิน" },
  { id:"W2405-0150", kind:"withdraw", acct:"ออมทรัพย์", amount:8000, date:"14 พ.ค. 2569", time:"16:20", status:"reject", to:"ธ.กรุงไทย 678-x-xxxx21-4", reason:"สำเนาสมุดบัญชีไม่ชัดเจน" },
];

/* ---------- helpers ---------- */
APP.fmt = function(n){
  return Number(n).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
};
APP.fmtInt = function(n){
  return Number(n).toLocaleString("th-TH");
};
APP.acctById = function(id){ return APP.accounts.find(a=>a.id===id); };

APP.statusMeta = function(s){
  switch(s){
    case "pending":  return {cls:"b-pending", ic:"bi-clock-history", label:"รอตรวจสอบ"};
    case "review":   return {cls:"b-review",  ic:"bi-search",        label:"กำลังตรวจสอบ"};
    case "approved": return {cls:"b-approved",ic:"bi-patch-check",   label:"อนุมัติแล้ว"};
    case "done":     return {cls:"b-done",    ic:"bi-check-circle-fill", label:"สำเร็จ"};
    case "reject":   return {cls:"b-reject",  ic:"bi-x-circle",      label:"ไม่อนุมัติ"};
    default:         return {cls:"b-pending", ic:"bi-clock",         label:s};
  }
};
