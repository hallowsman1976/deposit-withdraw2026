// ไฟล์: Utility.gs

// รันฟังก์ชันภายใต้ Script Lock — ใช้ครอบช่วง "อ่านค่าล่าสุดแล้วเขียนต่อท้าย" (เช่น สร้างเลขที่
// รายการ + appendRow) เพื่อกัน race condition เวลามีคำขอเข้ามาพร้อมกันพอดี ไม่งั้นสองคำขออาจ
// อ่านเจอเลขที่/สถานะเดิมพร้อมกันแล้วเขียนซ้ำกันได้
function withLock(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // รอคิวสูงสุด 10 วินาที
  } catch (e) {
    throw new Error("ระบบกำลังประมวลผลคำขออื่นอยู่ กรุณาลองใหม่อีกครั้ง");
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ฟังก์ชันสร้างเลขที่รายการอัตโนมัติ เช่น WDR-256906-0001
function generateRunningId(prefix, sheetName, idColumnIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  let maxId = 0;
  const today = new Date();
  const year = today.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const datePrefix = `${prefix}-${year}${month}-`; 
  
  // วนลูปหา ID ล่าสุดในเดือนปัจจุบัน
  for (let i = 1; i < data.length; i++) {
    const currentId = data[i][idColumnIndex];
    if (currentId && currentId.toString().startsWith(datePrefix)) {
      const parts = currentId.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (num > maxId) maxId = num;
      }
    }
  }
  
  const nextId = String(maxId + 1).padStart(4, '0');
  return datePrefix + nextId;
}

// ฟังก์ชันสำหรับแปลงวันที่เป็นรูปแบบไทย (dd/MM/yyyy พ.ศ.)
function formatThaiDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

// ฟังก์ชันสำหรับจัดรูปแบบจำนวนเงิน
function formatCurrency(amount) {
  if (isNaN(amount)) return "0.00";
  return parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ฟังก์ชันบันทึกการกระทำต่างๆ ลงใน Audit Log
function writeAuditLog(userId, role, action, detail, ip = "", device = "") {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("AuditLog");
  const logId = Utilities.getUuid();
  const dateTime = new Date();
  
  sheet.appendRow([logId, dateTime, userId, role, action, detail, ip, device]);
}