// ไฟล์: Database.gs

// ดึงข้อมูลโปรไฟล์สมาชิกเพื่อไปแสดงในหน้า Dashboard และใช้ส่งคำขอถอน
function getMemberProfile(lineUserId) {
  const user = getCurrentUser(lineUserId);
  if (!user) return null;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Member");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === user.memberId.toString()) {
      return {
        memberId: data[i][0],
        pid: data[i][1],
        fullName: data[i][2],
        phone: data[i][3],
        address: data[i][4],
        savingAccountNo: data[i][5],
        specialSavingAccountNo: data[i][6],
        bankName: data[i][7],
        bankAccountNo: data[i][8],
        bankAccountName: data[i][9],
        status: data[i][10]
      };
    }
  }
  return null;
}

// ดึงรายการจากชีต "Bank" — col A (ธนาคาร) + col B (Address)
function getBankList()    { return _readBankColumn(1); }
function getAddressList() { return _readBankColumn(2); }
function _readBankColumn(col) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Bank");
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues();
  const seen = {};
  const list = [];
  values.forEach(row => {
    const v = (row[0] || '').toString().trim();
    if (v && !seen[v]) { seen[v] = true; list.push(v); }
  });
  return list;
}

// อัปเดตข้อมูลสมาชิกหลังผูกบัญชีสำเร็จ (เบอร์, ที่อยู่, ข้อมูลธนาคาร)
function updateMemberAfterBind(payload) {
  try {
    const lineUserId = payload && payload.lineUserId;
    if (!lineUserId) throw new Error("ไม่พบ lineUserId");

    const user = getCurrentUser(lineUserId);
    if (!user) throw new Error("ไม่พบบัญชีผู้ใช้ — กรุณาผูกบัญชีก่อน");

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1) update Member sheet — หา row ตาม memberId
    const memberSheet = ss.getSheetByName("Member");
    const data = memberSheet.getDataRange().getValues();
    let rowIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if ((data[i][0] || '').toString().trim() === user.memberId.toString()) { rowIdx = i + 1; break; }
    }
    if (rowIdx < 2) throw new Error("ไม่พบข้อมูลสมาชิกในตาราง Member");

    // Member columns (1-based):
    //   4:phone 5:address 8:bankName 9:bankAccountNo 10:bankAccountName
    memberSheet.getRange(rowIdx, 4).setValue(payload.phone || '');
    memberSheet.getRange(rowIdx, 5).setValue(payload.address || '');
    memberSheet.getRange(rowIdx, 8).setValue(payload.bankName || '');
    memberSheet.getRange(rowIdx, 9).setValue(payload.bankAccountNo || '');
    memberSheet.getRange(rowIdx, 10).setValue(payload.bankAccountName || '');

    // 2) update User sheet — sync เบอร์โทรในแถวเดียวกัน (col 5 = phone, 1-based)
    const userSheet = ss.getSheetByName("User");
    const uData = userSheet.getDataRange().getValues();
    for (let i = 1; i < uData.length; i++) {
      if ((uData[i][5] || '').toString() === lineUserId) {
        userSheet.getRange(i + 1, 5).setValue(payload.phone || '');
        break;
      }
    }

    writeAuditLog(lineUserId, "user", "COMPLETE_PROFILE",
      `กรอกข้อมูลเพิ่มหลังผูกบัญชี: ${user.memberId}`);

    return { success: true, message: "บันทึกข้อมูลเรียบร้อย" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ดึงข้อมูลสมาชิกตาม memberId (สำหรับ Admin lookup ขณะบันทึกฝาก)
// คืน 2 เลขบัญชี: savingAccountNo (ออมทรัพย์) + specialSavingAccountNo (พิเศษ)
function getMemberById(memberId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Member");
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const key = (memberId || '').toString().trim();
  if (!key) return null;

  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] || '').toString().trim() === key) {
      return {
        memberId: data[i][0],
        pid: data[i][1],
        fullName: data[i][2],
        phone: data[i][3],
        address: data[i][4],
        savingAccountNo: data[i][5] || '',
        specialSavingAccountNo: data[i][6] || '',
        bankName: data[i][7] || '',
        bankAccountNo: data[i][8] || '',
        bankAccountName: data[i][9] || '',
        status: data[i][10] || ''
      };
    }
  }
  return null;
}

// ดึงประวัติคำขอถอนเงินของสมาชิกรายบุคคล
function getWithdrawHistory(memberId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("WithdrawRequest");
  const data = sheet.getDataRange().getValues();
  
  let history = [];
  // วนลูปจากล่างขึ้นบน เพื่อให้รายการล่าสุดอยู่บนสุด
  for (let i = data.length - 1; i >= 1; i--) { 
    if (data[i][2].toString() === memberId.toString()) {
      history.push({
        requestId: data[i][0],
        requestDate: formatThaiDate(data[i][1]),
        accountType: data[i][5],
        amount: formatCurrency(data[i][7]),
        status: data[i][11]
      });
    }
  }
  return history;
}

// ไฟล์: Database.gs (ส่วนที่ 2)

// --- ฝั่ง User ---

// ฟังก์ชันสร้างคำขอถอนเงิน
function createWithdrawRequest(data) {
  try {
    return withLock(() => {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("WithdrawRequest");

      // สร้างเลขที่คำขออัตโนมัติ (สมมติ Column 0 คือ RequestID)
      const requestId = generateRunningId("WDR", "WithdrawRequest", 0);
      const requestDate = new Date();

      // สถานะเริ่มต้น
      const initialStatus = "รอตรวจสอบ";

      sheet.appendRow([
        requestId, requestDate, data.memberId, data.fullName, data.lineUserId,
        data.accountType, data.accountNo, data.amount, data.bankName,
        data.bankAccountNo, data.bankAccountName, initialStatus,
        "", "", "", "", "", requestDate, requestDate
      ]);

      writeAuditLog(data.lineUserId, "user", "CREATE_WITHDRAW", `สร้างคำขอถอนเงิน: ${requestId}`);

      return { success: true, requestId: requestId, message: "บันทึกคำขอถอนเงินสำเร็จ" };
    });
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + error.message };
  }
}


// --- ฝั่ง Admin ---

// ==========================================================
// บันทึกรายการรับฝากเงิน — แยก 2 ชีตตามประเภทบัญชี
//   "ออมทรัพย์"      → ชีต "DepositSaving"
//   "ออมทรัพย์พิเศษ" → ชีต "DepositSpecialSaving"
// columns เหมือนกันทั้ง 2 ชีต:
//   0:depositId 1:depositDate 2:memberId 3:fullName 4:accountType
//   5:accountNo 6:amount 7:depositChannel 8:officerName 9:remark 10:createdAt
// ==========================================================
const DEPOSIT_HEADERS = [
  "depositId","depositDate","memberId","fullName","accountType",
  "accountNo","amount","depositChannel","officerName","remark","createdAt",
  "slipUrl","status","lineUserId"
];

function _depositSheetName(accountType) {
  return (accountType === "ออมทรัพย์พิเศษ") ? "DepositSpecialSaving" : "DepositSaving";
}
function _depositIdPrefix(accountType) {
  return (accountType === "ออมทรัพย์พิเศษ") ? "DPS" : "DEP";
}
function _ensureDepositSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, DEPOSIT_HEADERS.length).setValues([DEPOSIT_HEADERS]).setFontWeight("bold");
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, DEPOSIT_HEADERS.length).setValues([DEPOSIT_HEADERS]).setFontWeight("bold");
  }
  return sh;
}

function createDeposit(data) {
  try {
    return withLock(() => {
      const sheetName = _depositSheetName(data.accountType);
      const prefix = _depositIdPrefix(data.accountType);
      const sheet = _ensureDepositSheet(sheetName);

      const depositId = generateRunningId(prefix, sheetName, 0);
      const depositDate = new Date();

      sheet.appendRow([
        depositId, depositDate, data.memberId, data.fullName,
        data.accountType, data.accountNo || "-", data.amount,
        data.depositChannel, data.officerName, data.remark || "", depositDate,
        data.slipUrl || "", data.status || "บันทึกแล้ว", data.lineUserId || ""
      ]);

      writeAuditLog(data.officerName || data.lineUserId || "system", "admin", "CREATE_DEPOSIT",
        `${sheetName}: ${depositId} (${data.accountType}) ${data.amount} บาท`);

      return { success: true, depositId: depositId, sheet: sheetName, message: "บันทึกรายการฝากสำเร็จ" };
    });
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + error.message };
  }
}

// ==========================================================
//  User-initiated deposit (ผู้ใช้ยื่นฝากเองพร้อมสลิป)
//  - upload สลิปเข้า Drive folder ชื่อ depositId
//  - บันทึกแถวพร้อม slipUrl + status="รอตรวจสอบ"
// ==========================================================
function createUserDeposit(data) {
  try {
    if (!data.memberId) throw new Error("ไม่พบรหัสสมาชิก");
    if (!data.amount || Number(data.amount) <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
    if (!data.slipBase64) throw new Error("กรุณาแนบสลิปการโอน");

    return withLock(() => {
      const sheetName = _depositSheetName(data.accountType);
      const prefix = _depositIdPrefix(data.accountType);
      const sheet = _ensureDepositSheet(sheetName);
      const depositId = generateRunningId(prefix, sheetName, 0);

      // อัปโหลดสลิปเข้า Drive
      const parentFolder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
      let depositFolders = parentFolder.getFoldersByName(depositId);
      const folder = depositFolders.hasNext() ? depositFolders.next() : parentFolder.createFolder(depositId);

      const split = data.slipBase64.split(',');
      const b64 = split.length > 1 ? split[1] : split[0];
      const blob = Utilities.newBlob(
        Utilities.base64Decode(b64),
        data.slipMimeType || "image/jpeg",
        data.slipFileName || `${depositId}_slip.jpg`
      );
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const slipUrl = file.getUrl();

      const depositDate = new Date();
      sheet.appendRow([
        depositId, depositDate, data.memberId, data.fullName,
        data.accountType, data.accountNo || "-", Number(data.amount),
        data.depositChannel || "โอนเงิน", "User (LIFF)", data.remark || "", depositDate,
        slipUrl, "รอตรวจสอบ", data.lineUserId || ""
      ]);

      writeAuditLog(data.lineUserId || data.memberId, "user", "USER_DEPOSIT",
        `${sheetName}: ${depositId} (${data.accountType}) ${data.amount} บาท`);

      return { success: true, depositId: depositId, sheet: sheetName, slipUrl: slipUrl };
    });
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + error.message };
  }
}

// ===== Admin: deposit management =====
// ดึงคำขอฝากทั้งหมดจาก 2 ชีต (สำหรับ Admin จัดการ)
function getAllDepositRequests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ["DepositSaving", "DepositSpecialSaving"];
  let combined = [];

  sheets.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, DEPOSIT_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      combined.push({
        sheet: name,
        row: i + 2, // 1-based row index ในชีตจริง
        _ts: data[i][1] instanceof Date ? data[i][1].getTime() : 0,
        depositId: data[i][0],
        depositDate: formatThaiDate(data[i][1]),
        memberId: data[i][2],
        fullName: data[i][3],
        accountType: data[i][4],
        accountNo: data[i][5],
        amount: data[i][6],
        depositChannel: data[i][7],
        officerName: data[i][8],
        remark: data[i][9],
        slipUrl: data[i][11] || '',
        status: data[i][12] || 'บันทึกแล้ว',
        lineUserId: data[i][13] || ''
      });
    }
  });

  combined.sort((a, b) => b._ts - a._ts);
  return combined.map(r => { delete r._ts; return r; });
}

// อัปเดตสถานะคำขอฝาก
// payload: { sheet, row, depositId, status, comment, officerName }
function updateDepositStatus(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(payload.sheet);
    if (!sh) throw new Error("ไม่พบชีต: " + payload.sheet);
    if (!payload.row || payload.row < 2) throw new Error("แถวไม่ถูกต้อง");

    // column 13 = status (1-based), column 10 = remark
    sh.getRange(payload.row, 13).setValue(payload.status || '');
    if (payload.comment) {
      const cur = (sh.getRange(payload.row, 10).getValue() || '').toString();
      const stamp = `[${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")}] ${payload.officerName || 'admin'}: ${payload.comment}`;
      sh.getRange(payload.row, 10).setValue(cur ? cur + '\n' + stamp : stamp);
    }

    writeAuditLog(payload.officerName || "Admin (Web)", "admin", "UPDATE_DEPOSIT_STATUS",
      `${payload.depositId} → ${payload.status}`);

    return { success: true, message: "อัปเดตสถานะเรียบร้อย" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ดึงประวัติฝากของสมาชิกคนเดียว — รวมทั้ง 2 ชีต (ออมทรัพย์ + พิเศษ) เรียงล่าสุดบน
function getMemberDeposits(payload) {
  const memberId = (payload && payload.memberId || '').toString().trim();
  const limit = (payload && payload.limit) || 100;
  if (!memberId) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ["DepositSaving", "DepositSpecialSaving"];
  let combined = [];

  sheets.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, DEPOSIT_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      if ((data[i][2] || '').toString().trim() === memberId) {
        combined.push({
          depositId: data[i][0],
          _ts: data[i][1] instanceof Date ? data[i][1].getTime() : 0,
          depositDate: formatThaiDate(data[i][1]),
          accountType: data[i][4],
          accountNo: data[i][5],
          amount: data[i][6],
          depositChannel: data[i][7],
          officerName: data[i][8],
          remark: data[i][9],
          slipUrl: data[i][11] || '',
          status: data[i][12] || 'บันทึกแล้ว'
        });
      }
    }
  });

  // sort desc by timestamp
  combined.sort((a, b) => b._ts - a._ts);
  combined = combined.slice(0, limit).map(r => { delete r._ts; return r; });
  return combined;
}

// ดึงประวัติรายการฝากตามประเภทบัญชี (ล่าสุดอยู่บน)
function getDepositHistory(payload) {
  const accountType = (payload && payload.accountType) || "ออมทรัพย์";
  const limit = (payload && payload.limit) || 50;
  const sheet = _ensureDepositSheet(_depositSheetName(accountType));

  if (sheet.getLastRow() < 2) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, DEPOSIT_HEADERS.length).getValues();
  const result = [];
  for (let i = data.length - 1; i >= 0 && result.length < limit; i--) {
    result.push({
      depositId: data[i][0],
      depositDate: formatThaiDate(data[i][1]),
      memberId: data[i][2],
      fullName: data[i][3],
      accountType: data[i][4],
      accountNo: data[i][5],
      amount: data[i][6],
      depositChannel: data[i][7],
      officerName: data[i][8],
      remark: data[i][9]
    });
  }
  return result;
}

// ดึงรายการคำขอถอนเงินทั้งหมดสำหรับ Admin Dashboard
function getAllWithdrawRequests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("WithdrawRequest");
  const data = sheet.getDataRange().getValues();
  
  let requests = [];
  // วนลูปจากล่างขึ้นบน
  for (let i = data.length - 1; i >= 1; i--) {
    requests.push({
      requestId: data[i][0],
      requestDate: formatThaiDate(data[i][1]),
      memberId: data[i][2],
      fullName: data[i][3],
      accountType: data[i][5],
      amount: data[i][7],
      status: data[i][11],
      row: i + 1 // เก็บเลขแถวไว้ใช้อัปเดตข้อมูล
    });
  }
  return requests;
}

// ==========================================================
//  Import Members (XLSX/CSV) → เขียนลงชีต "Member"
// ==========================================================
// payload = { rows: [{memberId, pid, fullName, ...}, ...], mode: 'upsert'|'append'|'replace' }
// Member sheet columns (0-based):
//   0:memberId 1:pid 2:fullName 3:phone 4:address
//   5:savingAccountNo 6:specialSavingAccountNo
//   7:bankName 8:bankAccountNo 9:bankAccountName 10:status
function importMembers(payload) {
  const rows = (payload && payload.rows) || [];
  const mode = (payload && payload.mode) || 'upsert';

  if (!rows.length) {
    return { success: false, message: "ไม่มีข้อมูลที่จะนำเข้า" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Member");
  if (!sheet) sheet = ss.insertSheet("Member");

  const HEADERS = [
    "memberId","pid","fullName","phone","address",
    "savingAccountNo","specialSavingAccountNo",
    "bankName","bankAccountNo","bankAccountName","status"
  ];

  // ใส่ header ถ้าชีตยังว่าง
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  }

  // โหมด replace: ลบข้อมูลเดิมทั้งหมด (เก็บแถว header ไว้)
  if (mode === 'replace' && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  // โหลด memberId เดิม → row index (สำหรับ upsert)
  const existing = {}; // memberId(string) -> rowIndex (1-based)
  if (mode === 'upsert' && sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      const k = (ids[i][0] || '').toString().trim();
      if (k) existing[k] = i + 2;
    }
  }

  let inserted = 0, updated = 0, skipped = 0;
  const errors = [];
  const appendBuffer = [];

  rows.forEach((r, idx) => {
    try {
      const memberId = (r.memberId || '').toString().trim();
      const pid = (r.pid || '').toString().trim();
      if (!memberId || !pid) { skipped++; return; }

      const rowArr = HEADERS.map(h => (r[h] !== undefined && r[h] !== null) ? r[h].toString() : '');
      // default status ถ้าว่าง
      const statusIdx = HEADERS.indexOf('status');
      if (!rowArr[statusIdx]) rowArr[statusIdx] = 'active';

      if (mode === 'upsert' && existing[memberId]) {
        sheet.getRange(existing[memberId], 1, 1, HEADERS.length).setValues([rowArr]);
        updated++;
      } else {
        appendBuffer.push(rowArr);
        inserted++;
      }
    } catch (e) {
      errors.push(`แถว ${idx + 2}: ${e.message}`);
    }
  });

  // batch append (เร็วกว่า appendRow ทีละแถวมาก)
  if (appendBuffer.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, appendBuffer.length, HEADERS.length).setValues(appendBuffer);
  }

  // audit log
  const actor = (payload && payload.adminFullName) || "Admin (Web)";
  try { writeAuditLog(actor, "admin", "IMPORT_MEMBERS",
        `mode=${mode} inserted=${inserted} updated=${updated} skipped=${skipped}`); } catch(e){}

  return {
    success: true,
    inserted: inserted,
    updated: updated,
    skipped: skipped,
    errors: errors
  };
}

// อัปเดตสถานะคำขอถอนเงิน (ใช้ได้ทั้ง อนุมัติ, ไม่อนุมัติ, โอนเงินแล้ว, เอกสารไม่ครบ)
function updateWithdrawStatus(row, requestId, status, comment, officerName, transferDate = "", transferSlipUrl = "") {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("WithdrawRequest");
    const timestamp = new Date();
    
    // อัปเดต Status (Col L = 12)
    sheet.getRange(row, 12).setValue(status);
    
    // ถ้ามี Comment (Col M = 13)
    if (comment) sheet.getRange(row, 13).setValue(comment);
    
    // ถ้าเป็นการอนุมัติ (Col N = 14, O = 15)
    if (status === "อนุมัติแล้ว" || status === "ไม่อนุมัติ") {
      sheet.getRange(row, 14).setValue(officerName);
      sheet.getRange(row, 15).setValue(timestamp);
    }
    
    // ถ้าเป็นการโอนเงิน (Col P = 16, Q = 17)
    if (status === "โอนเงินแล้ว") {
      sheet.getRange(row, 16).setValue(transferDate || timestamp);
      if (transferSlipUrl) sheet.getRange(row, 17).setValue(transferSlipUrl);
    }
    
    // อัปเดต UpdatedAt (Col S = 19)
    sheet.getRange(row, 19).setValue(timestamp);
    
    writeAuditLog(officerName, "admin", "UPDATE_STATUS", `เปลี่ยนสถานะ ${requestId} เป็น ${status}`);
    
    return { success: true, message: "อัปเดตสถานะเรียบร้อย" };
  } catch (error) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + error.message };
  }
}
