/* ===========================================================
   Screens: ลงทะเบียน/ผูกบัญชี, หน้าแรก(Dashboard), โปรไฟล์
   =========================================================== */
window.SCREENS = window.SCREENS || {};

/* ---------------- REGISTER / ผูกบัญชี ---------------- */
SCREENS.register = function(){
  return `
  <div class="page">
    <div class="brand-hero">
      ${UI.emblem(true)}
      <div class="bh-name">สหกรณ์ออมทรัพย์<br>สาธารณสุขจังหวัดมุกดาหาร จำกัด</div>
      <div class="bh-sub">ระบบรับฝาก–ถอนเงินออนไลน์ผ่าน LINE</div>
    </div>

    <div class="note info" style="margin:18px 0 16px;">
      <i class="bi bi-shield-lock"></i>
      <div>เชื่อมบัญชี LINE กับสมาชิกภาพของท่านครั้งแรก เพื่อความปลอดภัยในการทำธุรกรรม ข้อมูลถูกเข้ารหัสและใช้เฉพาะการยืนยันตัวตน</div>
    </div>

    <div class="card-x card-pad">
      <div class="field">
        <label>เลขสมาชิก <span class="req">*</span></label>
        <input class="form-control" id="rgMember" inputmode="numeric" placeholder="เช่น 0457">
      </div>
      <div class="field">
        <label>เลขบัตรประชาชน <span class="req">*</span></label>
        <input class="form-control" id="rgCid" inputmode="numeric" placeholder="13 หลัก">
      </div>
      <div class="field" style="margin-bottom:6px;">
        <label>เบอร์โทรศัพท์ <span class="req">*</span></label>
        <input class="form-control" id="rgPhone" inputmode="tel" placeholder="08x-xxx-xxxx">
        <span class="hint">ระบบจะส่งรหัส OTP เพื่อยืนยันตัวตน</span>
      </div>
    </div>

    <div style="margin-top:18px;">
      <button class="btn-pri" id="rgNext"><i class="bi bi-link-45deg"></i> เชื่อมบัญชีสมาชิก</button>
    </div>
    <p style="text-align:center;font-size:11.5px;color:var(--muted);margin-top:14px;line-height:1.5;">
      การเชื่อมบัญชีถือว่าท่านยอมรับ<br><a href="#" style="color:var(--blue-600);font-weight:600;text-decoration:none;">ข้อตกลงการใช้บริการ</a> และ <a href="#" style="color:var(--blue-600);font-weight:600;text-decoration:none;">นโยบายความเป็นส่วนตัว</a>
    </p>
  </div>`;
};

SCREENS.registerBind = function(){
  $('#rgNext').on('click', function(){
    const m=$('#rgMember').val().trim(), c=$('#rgCid').val().trim(), p=$('#rgPhone').val().trim();
    if(!m||!c||!p){ UI.toast('warning','กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    UI.swal({
      title:'ยืนยันรหัส OTP',
      html:`<div style="font-size:13.5px;color:var(--muted);margin-bottom:10px;">ส่งรหัสไปยังเบอร์ <b style="color:var(--ink)">${p}</b></div>
      <div class="otp-row">
        <input maxlength="1" inputmode="numeric" class="otp-i" value="4">
        <input maxlength="1" inputmode="numeric" class="otp-i" value="9">
        <input maxlength="1" inputmode="numeric" class="otp-i" value="1">
        <input maxlength="1" inputmode="numeric" class="otp-i" value="2">
        <input maxlength="1" inputmode="numeric" class="otp-i" value="6">
        <input maxlength="1" inputmode="numeric" class="otp-i" value="8">
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:10px;">อ้างอิง: MK-OTP · ขอรหัสใหม่ใน 04:58</div>`,
      confirmButtonText:'ยืนยัน', showCancelButton:true, cancelButtonText:'ยกเลิก'
    }).then(r=>{
      if(r.isConfirmed){
        UI.swal({
          icon:'success', title:'เชื่อมบัญชีสำเร็จ',
          html:`ยินดีต้อนรับคุณ <b>${APP.member.name}</b><br>เลขสมาชิก ${APP.member.memberId}`,
          confirmButtonText:'เข้าสู่ระบบ'
        }).then(()=>{ APP.go('home'); });
      }
    });
  });
};

/* ---------------- HOME / DASHBOARD ---------------- */
SCREENS.home = function(){
  const total = APP.accounts.reduce((s,a)=>s+a.balance,0);
  const recent = APP.txns.slice(0,3);
  return `
  <div class="page">
    <!-- member strip -->
    <div class="acct-card" style="background:linear-gradient(135deg,var(--blue-900),var(--blue-700));margin-bottom:16px;">
      <div class="member-strip">
        ${UI.emblem(false)}
        <div style="flex:1;min-width:0;">
          <div class="ms-name">${APP.member.name}</div>
          <div class="ms-id">สมาชิกเลขที่ ${APP.member.memberId} · ${APP.member.workplace}</div>
        </div>
        <i class="bi bi-patch-check-fill" style="color:var(--gold);font-size:20px;" title="ยืนยันตัวตนแล้ว"></i>
      </div>
      <div class="ac-bal-label">ยอดเงินฝากรวมทั้งหมด</div>
      <div class="ac-bal">${APP.fmt(total)}<span class="cur">บาท</span></div>
    </div>

    <!-- quick actions -->
    <div class="qa-grid" style="margin-bottom:20px;">
      <button class="qa" data-nav="deposit"><span class="qa-ic"><i class="bi bi-arrow-down-circle"></i></span>ฝากเงิน</button>
      <button class="qa gold" data-nav="withdraw"><span class="qa-ic"><i class="bi bi-arrow-up-circle"></i></span>ถอนเงิน</button>
      <button class="qa" data-nav="history"><span class="qa-ic"><i class="bi bi-clock-history"></i></span>ประวัติ</button>
      <button class="qa" data-act="passbook"><span class="qa-ic"><i class="bi bi-journal-text"></i></span>สมุดบัญชี</button>
    </div>

    <!-- accounts -->
    <div class="sec-label">บัญชีเงินฝากของฉัน</div>
    ${APP.accounts.map(a=>SCREENS.acctCard(a)).join('')}

    <!-- recent -->
    <div class="sec-label" style="margin-top:22px;">รายการล่าสุด <span class="more" data-nav="history">ดูทั้งหมด ›</span></div>
    <div class="card-x card-pad">
      ${recent.map(SCREENS.txnRow).join('')}
    </div>

    <div class="note info" style="margin-top:18px;">
      <i class="bi bi-info-circle"></i>
      <div>ถอนออนไลน์ได้สูงสุด <b>${APP.fmtInt(APP.WITHDRAW_LIMIT)} บาท</b> ต่อรายการ หากเกินวงเงิน กรุณาติดต่อทำธุรกรรมที่สำนักงานสหกรณ์ฯ ด้วยตนเอง</div>
    </div>
  </div>`;
};

SCREENS.acctCard = function(a){
  const gold = a.kind==='special';
  return `
  <div class="acct-card ${gold?'gold':''}" data-acct="${a.id}" style="margin-bottom:12px;">
    <div class="ac-top">
      <div class="ac-type"><i class="bi ${gold?'bi-gem':'bi-piggy-bank'}"></i> ${a.type}</div>
      <div class="ac-chip">ดอกเบี้ย ${a.rate}%</div>
    </div>
    <div class="ac-no">${a.no}</div>
    <div class="ac-bal-label">ยอดเงินคงเหลือ</div>
    <div class="ac-bal">${APP.fmt(a.balance)}<span class="cur">บาท</span></div>
    <div class="ac-foot">
      <span><i class="bi bi-calendar3"></i> เปิดบัญชี ${a.openDate}</span>
      <span style="font-weight:600;">รายละเอียด ›</span>
    </div>
  </div>`;
};

SCREENS.txnRow = function(t){
  const isIn = t.kind==='deposit';
  const sm = APP.statusMeta(t.status);
  return `
  <div class="row-x" data-txn="${t.id}">
    <div class="row-ic ${isIn?'in':'out'}"><i class="bi ${isIn?'bi-arrow-down-left':'bi-arrow-up-right'}"></i></div>
    <div class="row-main">
      <div class="row-t">${isIn?'ฝากเงิน':'ถอนเงิน'} · ${t.acct}</div>
      <div class="row-s">${t.date} ${t.time} น. · <span class="badge-x ${sm.cls}" style="padding:1px 7px;"><i class="bi ${sm.ic}"></i>${sm.label}</span></div>
    </div>
    <div class="row-amt ${isIn?'plus':'minus'}">${isIn?'+':'−'}${APP.fmtInt(t.amount)}</div>
  </div>`;
};

/* ---------------- PROFILE ---------------- */
SCREENS.profile = function(){
  const m = APP.member;
  const rows = [
    ['ชื่อ–สกุล', m.name],
    ['เลขสมาชิก', m.memberId],
    ['เลขบัตรประชาชน', m.citizenId],
    ['ตำแหน่ง', m.position],
    ['สังกัด', m.workplace],
    ['เบอร์โทรศัพท์', m.phone],
  ];
  return `
  <div class="page">
    <div style="text-align:center;padding:8px 0 18px;">
      ${UI.emblem(true)}
      <div style="font-family:var(--font-head);font-weight:600;font-size:19px;margin-top:12px;">${m.name}</div>
      <div style="font-size:13px;color:var(--muted);">สมาชิกเลขที่ ${m.memberId}</div>
      <div class="badge-x b-approved" style="margin-top:8px;"><i class="bi bi-patch-check-fill"></i> เชื่อม LINE และยืนยันตัวตนแล้ว</div>
    </div>

    <div class="sec-label">ข้อมูลสมาชิก</div>
    <div class="card-x card-pad" style="margin-bottom:18px;">
      ${rows.map(r=>`<div class="kv"><span class="k">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('<div class="divider" style="margin:4px 0;"></div>')}
    </div>

    <div class="sec-label">บัญชีธนาคารสำหรับรับโอน</div>
    <div class="card-x card-pad" style="margin-bottom:18px;">
      ${APP.bankAccounts.map(b=>`
        <div class="row-x">
          <div class="row-ic out"><i class="bi bi-bank"></i></div>
          <div class="row-main"><div class="row-t">${b.bank}</div><div class="row-s">${b.no}</div></div>
          <i class="bi bi-three-dots-vertical" style="color:var(--muted);"></i>
        </div>`).join('')}
      <button class="btn-ghost" style="margin-top:10px;" data-act="addbank"><i class="bi bi-plus-circle"></i> เพิ่มบัญชีธนาคาร</button>
    </div>

    <div class="card-x" style="overflow:hidden;">
      ${[['bi-bell','การแจ้งเตือน'],['bi-shield-lock','ความปลอดภัยและ PIN'],['bi-question-circle','ศูนย์ช่วยเหลือ'],['bi-telephone','ติดต่อสหกรณ์ฯ']].map((r,i)=>`
        <button class="row-x" data-act="menu" style="width:100%;background:none;border:0;text-align:left;${i?'':''}">
          <div class="row-ic" style="background:var(--blue-100);color:var(--blue-700);"><i class="bi ${r[0]}"></i></div>
          <div class="row-main"><div class="row-t">${r[1]}</div></div>
          <i class="bi bi-chevron-right" style="color:var(--muted);"></i>
        </button>`).join('')}
    </div>

    <button class="btn-ghost" style="margin-top:18px;color:var(--danger);border-color:#f0d7d4;" data-act="logout"><i class="bi bi-box-arrow-right"></i> ออกจากระบบ</button>
    <p style="text-align:center;font-size:11px;color:var(--muted);margin-top:16px;">เวอร์ชัน 1.0.0 · สอ.สธ.มุกดาหาร จำกัด</p>
  </div>`;
};
