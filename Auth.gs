// ไฟล์: Auth.gs

// ตรวจสอบว่า LINE User ID นี้เป็นสมาชิกในระบบหรือไม่
function getCurrentUser(lineUserId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("User");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Index 5: LineUserID, Index 7: Status
    if (data[i][5] === lineUserId && data[i][7] === 'active') { 
      return {
        userId: data[i][0],
        memberId: data[i][1],
        pid: data[i][2],
        fullName: data[i][3],
        phone: data[i][4],
        lineUserId: data[i][5],
        role: data[i][6]
      };
    }
  }
  return null; // ไม่พบผู้ใช้งาน หรือบัญชีถูกระงับ
}

// ตรวจสอบสิทธิ์แอดมิน — ใช้ป้องกัน action ฝั่งแอดมินทุกตัวใน doPost
// โยน Error เมื่อไม่ผ่าน เพื่อให้ doPost จับและตอบกลับเป็น { success:false, message } ให้อัตโนมัติ
function requireAdmin(lineUserId) {
  if (!lineUserId) throw new Error("ไม่พบข้อมูลผู้เข้าใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
  const user = getCurrentUser(lineUserId);
  if (!user || user.role !== "admin") {
    throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (เฉพาะแอดมินเท่านั้น)");
  }
  return user;
}

// ฟังก์ชันผูกบัญชี LINE กับข้อมูลสมาชิก
function bindMember(lineUserId, memberId, pid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ตรวจสอบข้อมูลใน Sheet Member ว่าถูกต้องตรงกันไหม
  const memberSheet = ss.getSheetByName("Member");
  const memberData = memberSheet.getDataRange().getValues();
  let memberFound = null;
  
  for (let i = 1; i < memberData.length; i++) {
    // Index 0: MemberID, Index 1: PID
    if (memberData[i][0].toString() === memberId.toString() && memberData[i][1].toString() === pid.toString()) {
      memberFound = memberData[i];
      break;
    }
  }
  
  if (!memberFound) {
    return { success: false, message: "ไม่พบข้อมูลสมาชิก หรือรหัสบัตรประชาชนไม่ถูกต้อง" };
  }

  // ล็อกช่วงเช็คซ้ำ + บันทึก เพื่อกัน race condition เวลากดผูกบัญชีพร้อมกันหลายครั้งเร็ว ๆ
  // (ไม่งั้นสองคำขออาจเช็คไม่เจอ "ผูกไปแล้ว" พร้อมกัน แล้วผูก memberId เดียวกับ 2 LineUserID ได้)
  try {
    return withLock(() => {
      // 2. ตรวจสอบว่าเคยถูกผูกบัญชีไปแล้วหรือไม่ใน Sheet User
      const userSheet = ss.getSheetByName("User");
      const userData = userSheet.getDataRange().getValues();

      for (let i = 1; i < userData.length; i++) {
        if (userData[i][1].toString() === memberId.toString()) {
          return { success: false, message: "หมายเลขสมาชิกนี้ถูกผูกบัญชีไปแล้ว" };
        }
      }

      // 3. บันทึกการผูกบัญชีลงใน Sheet User
      const userId = Utilities.getUuid();
      const fullName = memberFound[2];
      const phone = memberFound[3];

      userSheet.appendRow([userId, memberId, pid, fullName, phone, lineUserId, "user", "active", new Date()]);

      // 4. บันทึก Audit Log
      writeAuditLog(userId, "user", "BIND_ACCOUNT", `ผูกบัญชี LINE สำเร็จ: ${memberId}`);

      return { success: true, message: "ผูกบัญชีสำเร็จเรียบร้อยแล้ว!" };
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
}
