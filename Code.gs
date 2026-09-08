// ไฟล์: Code.gs
//https://script.google.com/macros/s/AKfycby0tUwAVVnC3VOp-Y3WD97MPsPo7ZncQQ1gcgcVK-iEJ5uUnp3uYQFbmv2JeHxaLSnF/exec
//2008999774-wjOvv4FM
// 2008999774-HRjPFn6u //admin
//https://hallowsman1976.github.io/deposit-withdraw2026/

// URL หน้า LIFF ของสมาชิกที่โฮสต์แยกนอก Apps Script (GitHub Pages)
// เหตุผล: HtmlService ของ Apps Script บังคับ serve ผ่าน sandboxed iframe เสมอ (แก้ไม่ได้)
// ซึ่งชนกับ iOS WebView ที่ LINE ใช้เปิด LIFF app ทำให้ liff.init() ค้าง/ล้มเหลว
// จึงต้อง redirect ผู้ใช้ที่หลุดมาที่ URL ของ Apps Script โดยตรงไปหน้าที่โฮสต์นอกแทน
const MEMBER_LIFF_URL = "https://hallowsman1976.github.io/deposit-withdraw2026/";

// ฟังก์ชันเริ่มต้นเมื่อมีคนเข้า Web App
function doGet(e) {
  // รับ Parameter จาก URL เช่น ?page=admin
  const page = e.parameter.page || "index";

  if (page === "admin") {
    const template = HtmlService.createTemplateFromFile("admin");
    // ส่งค่า Web App URL เข้าไปใน HTML
    template.WEBAPP_URL = ScriptApp.getService().getUrl();

    return template.evaluate()
      .setTitle("Mukcoop Saving Online")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // หน้าสมาชิก (LIFF) — ไม่ serve ผ่าน HtmlService โดยตรง ให้ redirect ไปหน้าที่โฮสต์แยกแทน
  // คงพารามิเตอร์เดิมไว้ทั้งหมด (ยกเว้น page) เผื่อมี liff.state หรือค่าอื่นติดมากับลิงก์
  const query = Object.keys(e.parameter)
    .filter(k => k !== "page")
    .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(e.parameter[k]))
    .join("&");
  const redirectUrl = MEMBER_LIFF_URL + (query ? "?" + query : "");

  return HtmlService.createHtmlOutput(
    `<script>top.location.replace(${JSON.stringify(redirectUrl)});</script>` +
    `กำลังนำท่านไปยังหน้าเข้าสู่ระบบ... หากไม่ถูกนำไปอัตโนมัติ ` +
    `<a href="${redirectUrl}" target="_top">คลิกที่นี่</a>`
  );
}

// ฟังก์ชันสำหรับดึงไฟล์ HTML/CSS/JS มาแทรกในไฟล์หลัก
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Action ที่อนุญาตเฉพาะแอดมิน (role === 'admin') เท่านั้น — payload ต้องแนบ adminLineUserId มาด้วยเสมอ
const ADMIN_ACTIONS = new Set([
  "getMemberById",
  "getAllDepositRequests",
  "updateDepositStatus",
  "getAllWithdrawRequests",
  "updateWithdrawStatus",
  "importMembers",
  "createDeposit"
]);

// ===== JSON API endpoint =====
// Frontend เรียก: fetch(URL?action=xxx, {method:'POST', body: JSON.stringify(payload)})
// ทุก response คืน { success: boolean, data?: any, message?: string }
function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  let payload = {};
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return _json({ success: false, message: "Invalid JSON payload: " + err.message });
  }

  try {
    // ตรวจสิทธิ์แอดมินก่อนทำงานทุกครั้ง สำหรับ action ที่มีผลต่อข้อมูลการเงิน/สมาชิกทั้งระบบ
    let adminUser = null;
    if (ADMIN_ACTIONS.has(action)) {
      adminUser = requireAdmin(payload.adminLineUserId);
    }

    let data;
    switch (action) {
      case "checkAdmin": {
        const user = requireAdmin(payload.adminLineUserId);
        return _json({ success: true, data: { fullName: user.fullName, memberId: user.memberId } });
      }

      case "getMemberProfile":
        data = getMemberProfile(payload.lineUserId);
        return _json({ success: true, data: data });

      case "getMemberById":
        data = getMemberById(payload.memberId);
        return _json({ success: true, data: data });

      case "getBankList":
        data = getBankList();
        return _json({ success: true, data: data });

      case "getAddressList":
        data = getAddressList();
        return _json({ success: true, data: data });

      case "updateMemberAfterBind": {
        const r = updateMemberAfterBind(payload);
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { message: r.message } });
      }

      case "bindMember": {
        const r = bindMember(payload.lineUserId, payload.memberId, payload.pid);
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { message: r.message } });
      }

      case "getWithdrawHistory":
        data = getWithdrawHistory(payload.memberId);
        return _json({ success: true, data: data });

      case "getMemberDeposits":
        data = getMemberDeposits(payload);
        return _json({ success: true, data: data });

      case "getAllDepositRequests":
        data = getAllDepositRequests();
        return _json({ success: true, data: data });

      case "updateDepositStatus": {
        payload.officerName = adminUser.fullName; // ใช้ชื่อจากบัญชีที่ยืนยันสิทธิ์แล้วเสมอ ไม่เชื่อค่าที่ client ส่งมา
        const r = updateDepositStatus(payload);
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { message: r.message } });
      }

      case "createWithdrawRequest": {
        const r = createWithdrawRequest(payload);
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { requestId: r.requestId, message: r.message } });
      }

      case "uploadWithdrawFile": {
        const r = uploadWithdrawFile(
          payload.base64Data, payload.fileName, payload.mimeType,
          payload.requestId, payload.fileType, payload.memberId
        );
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { fileUrl: r.fileUrl } });
      }

      case "getAllWithdrawRequests":
        data = getAllWithdrawRequests();
        return _json({ success: true, data: data });

      case "updateWithdrawStatus": {
        const r = updateWithdrawStatus(
          payload.row, payload.requestId, payload.status,
          payload.comment, adminUser.fullName,
          payload.transferDate, payload.transferSlipUrl
        );
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { message: r.message } });
      }

      case "importMembers": {
        payload.adminFullName = adminUser.fullName;
        const r = importMembers(payload);
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: {
          inserted: r.inserted, updated: r.updated, skipped: r.skipped, errors: r.errors
        }});
      }

      case "createDeposit": {
        payload.officerName = adminUser.fullName;
        const r = createDeposit(payload);
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { depositId: r.depositId, sheet: r.sheet, message: r.message } });
      }

      case "createUserDeposit": {
        const r = createUserDeposit(payload);
        if (!r.success) return _json({ success: false, message: r.message });
        return _json({ success: true, data: { depositId: r.depositId, sheet: r.sheet, slipUrl: r.slipUrl } });
      }

      case "getDepositHistory":
        data = getDepositHistory(payload);
        return _json({ success: true, data: data });

      default:
        return _json({ success: false, message: "Unknown action: " + action });
    }
  } catch (err) {
    return _json({ success: false, message: err.message || String(err) });
  }
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}