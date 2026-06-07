/* ===========================================================
   Screen: ถอนเงินออนไลน์ — Wizard 3 ขั้น
   ขั้น 1: บัญชี + จำนวนเงิน (≤ 50,000)
   ขั้น 2: แนบเอกสาร 5 รายการ + ลายเซ็น
   ขั้น 3: ตรวจทาน + ยืนยัน
   =========================================================== */
SCREENS.wd = {
  step:1,
  acct:null,
  amount:'',
  bank:'b1',
  docs:{ idcard:null, passbook:null, bankbook:null },
  sigOwner:null,   // {dataUrl}
  sigRecv:null,
  pads:{}
};

SCREENS.withdraw = function(){
  const st = SCREENS.wd.step;
  return `
  <div class="page" id="wdPage">
    <div class="steps">
      <div class="st ${st>1?'done':''} ${st===1?'active':''}"><div class="dot">${st>1?'<i class="bi bi-check-lg"></i>':'1'}</div><div class="lb">จำนวนเงิน</div></div>
      <div class="bar ${st>1?'done':''}"></div>
      <div class="st ${st>2?'done':''} ${st===2?'active':''}"><div class="dot">${st>2?'<i class="bi bi-check-lg"></i>':'2'}</div><div class="lb">เอกสาร</div></div>
      <div class="bar ${st>2?'done':''}"></div>
      <div class="st ${st===3?'active':''}"><div class="dot">3</div><div class="lb">ยืนยัน</div></div>
    </div>
    <div id="wdBody">${SCREENS.wdStep()}</div>
  </div>`;
};

SCREENS.wdStep = function(){
  const w = SCREENS.wd;
  if(w.step===1) return SCREENS.wdStep1();
  if(w.step===2) return SCREENS.wdStep2();
  return SCREENS.wdStep3();
};

/* ---------- STEP 1 ---------- */
SCREENS.wdStep1 = function(){
  const w = SCREENS.wd;
  return `
  <div style="margin-bottom:14px;">
    <h1 class="h-title">เลือกบัญชีและจำนวนเงิน</h1>
    <p class="h-sub">ถอนออนไลน์ได้สูงสุด ${APP.fmtInt(APP.WITHDRAW_LIMIT)} บาท ต่อรายการ</p>
  </div>

  <div class="sec-label">ถอนจากบัญชี</div>
  ${APP.accounts.map(a=>`
    <div class="opt ${a.kind==='special'?'gold':''} ${w.acct===a.id?'sel':''}" data-pick="${a.id}">
      <div class="opt-ic"><i class="bi ${a.kind==='special'?'bi-gem':'bi-piggy-bank'}"></i></div>
      <div class="opt-main"><div class="opt-t">${a.type}</div><div class="opt-s">${a.no}</div></div>
      <div class="opt-bal">${APP.fmt(a.balance)}<div style="font-size:10px;color:var(--muted);font-weight:400;">คงเหลือ</div></div>
      <div class="opt-radio"></div>
    </div>`).join('')}

  <div class="field" style="margin-top:10px;">
    <label>จำนวนเงินที่ต้องการถอน <span class="req">*</span></label>
    <input class="input-amount" id="wdAmt" inputmode="numeric" placeholder="0.00" value="${w.amount}">
    <div class="amount-cur" id="wdAmtCur">บาท</div>
  </div>
  <div class="chip-row" style="margin-bottom:16px;">
    ${[5000,10000,20000,50000].map(v=>`<button class="chip" data-amt="${v}">${APP.fmtInt(v)}</button>`).join('')}
  </div>

  <div class="sec-label">บัญชีธนาคารรับโอน</div>
  ${APP.bankAccounts.map(b=>`
    <div class="opt ${w.bank===b.id?'sel':''}" data-bank="${b.id}">
      <div class="opt-ic"><i class="bi bi-bank"></i></div>
      <div class="opt-main"><div class="opt-t">${b.bank}</div><div class="opt-s" style="font-family:var(--font)">${b.no}</div></div>
      <div class="opt-radio"></div>
    </div>`).join('')}

  <div class="note" style="margin-top:12px;">
    <i class="bi bi-exclamation-triangle"></i>
    <div>หากต้องการถอนเกิน <b>${APP.fmtInt(APP.WITHDRAW_LIMIT)} บาท</b> กรุณาติดต่อทำรายการที่สำนักงานสหกรณ์ฯ ด้วยตนเอง</div>
  </div>

  <div class="sticky-cta">
    <button class="btn-pri" id="wdNext1">ถัดไป <i class="bi bi-arrow-right"></i></button>
  </div>`;
};

/* ---------- STEP 2 ---------- */
SCREENS.docRow = function(num, key, title, sub, file){
  const done = !!file;
  return `
  <div class="doc ${done?'done':''}" data-doc="${key}">
    <div class="doc-num">${done?'<i class="bi bi-check-lg"></i>':num}</div>
    <div class="doc-ic">${done&&file.dataUrl?`<img src="${file.dataUrl}">`:`<i class="bi bi-${done?'check2':'camera'}"></i>`}</div>
    <div class="doc-main">
      <div class="doc-t">${title}</div>
      <div class="doc-s">${done?'แนบแล้ว · '+(file.name||UI.kb(file.size||0)):sub}</div>
    </div>
    <div class="doc-act">${done?'เปลี่ยน':'<i class="bi bi-paperclip"></i> แนบ'}</div>
  </div>`;
};

SCREENS.sigRow = function(num, key, title, file){
  const done = !!file;
  return `
  <div class="doc ${done?'done':''}" style="align-items:flex-start;">
    <div class="doc-num">${done?'<i class="bi bi-check-lg"></i>':num}</div>
    <div class="doc-ic">${done&&file.dataUrl?`<img src="${file.dataUrl}">`:'<i class="bi bi-pen"></i>'}</div>
    <div class="doc-main">
      <div class="doc-t">${title}</div>
      <div class="doc-s">${done?'ลงลายมือชื่อแล้ว':'เซ็นบนหน้าจอ หรืออัปโหลดรูปลายเซ็น'}</div>
      <button class="badge-x b-review" style="border:0;margin-top:7px;" data-sign="${key}"><i class="bi bi-pencil-square"></i> ${done?'เซ็นใหม่':'ลงลายมือชื่อ'}</button>
    </div>
  </div>`;
};

SCREENS.wdStep2 = function(){
  const w = SCREENS.wd;
  return `
  <div style="margin-bottom:14px;">
    <h1 class="h-title">แนบเอกสารประกอบ</h1>
    <p class="h-sub">ถ่ายให้ชัดเจน เห็นข้อมูลครบถ้วน เพื่อความรวดเร็วในการอนุมัติ</p>
  </div>

  <div class="sec-label">สำเนาเอกสาร <span style="font-weight:400;color:var(--muted);font-family:var(--font);">3 รายการ</span></div>
  ${SCREENS.docRow(1,'idcard','สำเนาบัตรประชาชน','พร้อมรับรองสำเนาถูกต้อง', w.docs.idcard)}
  ${SCREENS.docRow(2,'passbook','สมุดบัญชีออมทรัพย์','หน้าที่มีเลขบัญชีและชื่อเจ้าของ', w.docs.passbook)}
  ${SCREENS.docRow(3,'bankbook','สมุดบัญชีธนาคารรับโอน','หน้าที่มีเลขบัญชีปลายทาง', w.docs.bankbook)}

  <div class="sec-label" style="margin-top:18px;">ลายมือชื่อ <span style="font-weight:400;color:var(--muted);font-family:var(--font);">2 รายการ</span></div>
  ${SCREENS.sigRow(4,'owner','ลายมือชื่อเจ้าของบัญชี', w.sigOwner)}
  ${SCREENS.sigRow(5,'recv','ลายมือชื่อผู้รับเงิน', w.sigRecv)}

  <div class="note info" style="margin-top:12px;">
    <i class="bi bi-shield-check"></i>
    <div>เอกสารทั้งหมดถูกเข้ารหัสและใช้เพื่อตรวจสอบรายการถอนเท่านั้น</div>
  </div>

  <div class="sticky-cta">
    <div class="btn-row">
      <button class="btn-ghost" id="wdBack2"><i class="bi bi-arrow-left"></i> ย้อนกลับ</button>
      <button class="btn-pri" id="wdNext2">ตรวจทาน <i class="bi bi-arrow-right"></i></button>
    </div>
  </div>`;
};

/* ---------- STEP 3 ---------- */
SCREENS.wdStep3 = function(){
  const w = SCREENS.wd;
  const a = APP.acctById(w.acct);
  const b = APP.bankAccounts.find(x=>x.id===w.bank);
  const amt = parseFloat((w.amount||'').replace(/,/g,''))||0;
  const fee = 0;
  const docThumb = (f,lbl)=>`
    <div style="text-align:center;">
      <div style="width:100%;aspect-ratio:1;border-radius:11px;overflow:hidden;border:1px solid var(--line);background:var(--blue-50);display:flex;align-items:center;justify-content:center;">
        ${f&&f.dataUrl?`<img src="${f.dataUrl}" style="width:100%;height:100%;object-fit:cover;">`:'<i class="bi bi-image" style="color:#b7c0cd;font-size:22px;"></i>'}
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:5px;line-height:1.3;">${lbl}</div>
    </div>`;
  return `
  <div style="margin-bottom:14px;">
    <h1 class="h-title">ตรวจทานก่อนยืนยัน</h1>
    <p class="h-sub">โปรดตรวจสอบความถูกต้องของรายการถอนเงิน</p>
  </div>

  <div class="card-x card-pad" style="margin-bottom:14px;">
    <div class="kv"><span class="k">ถอนจากบัญชี</span><span class="v">${a?a.type:'-'}</span></div>
    <div class="kv"><span class="k">เลขที่บัญชี</span><span class="v" style="font-family:var(--font-head)">${a?a.no:'-'}</span></div>
    <div class="divider" style="margin:6px 0;"></div>
    <div class="kv big"><span class="k">จำนวนเงินที่ถอน</span><span class="v">${APP.fmt(amt)} บาท</span></div>
    <div class="kv"><span class="k">ค่าธรรมเนียม</span><span class="v">${fee?APP.fmt(fee):'ไม่มี'}</span></div>
    <div class="divider" style="margin:6px 0;"></div>
    <div class="kv"><span class="k">โอนเข้าบัญชี</span><span class="v">${b?b.bank:'-'}</span></div>
    <div class="kv"><span class="k">เลขที่รับโอน</span><span class="v" style="font-family:var(--font-head)">${b?b.no:'-'}</span></div>
    <div class="kv"><span class="k">ชื่อบัญชี</span><span class="v">${b?b.name:'-'}</span></div>
  </div>

  <div class="sec-label">เอกสารแนบ (5 รายการ)</div>
  <div class="card-x card-pad" style="margin-bottom:14px;">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${docThumb(w.docs.idcard,'บัตรประชาชน')}
      ${docThumb(w.docs.passbook,'สมุดออมทรัพย์')}
      ${docThumb(w.docs.bankbook,'สมุดรับโอน')}
      ${docThumb(w.sigOwner,'ลายเซ็นเจ้าของ')}
      ${docThumb(w.sigRecv,'ลายเซ็นผู้รับเงิน')}
    </div>
  </div>

  <label class="card-x card-pad" style="display:flex;gap:11px;align-items:flex-start;margin-bottom:8px;cursor:pointer;">
    <input type="checkbox" id="wdAgree" style="width:20px;height:20px;margin-top:2px;accent-color:var(--blue-700);flex:0 0 20px;">
    <span style="font-size:13px;color:var(--ink-2);line-height:1.5;">ข้าพเจ้าขอรับรองว่าข้อมูลและเอกสารข้างต้นเป็นความจริงทุกประการ และยินยอมให้สหกรณ์ฯ ดำเนินการถอนเงินตามรายการนี้</span>
  </label>

  <div class="sticky-cta">
    <div class="btn-row">
      <button class="btn-ghost" id="wdBack3"><i class="bi bi-arrow-left"></i> ย้อนกลับ</button>
      <button class="btn-pri" id="wdSubmit" disabled><i class="bi bi-shield-lock"></i> ยืนยันถอนเงิน</button>
    </div>
  </div>`;
};

/* ---------- BIND ---------- */
SCREENS.withdrawBind = function(){
  const w = SCREENS.wd;
  const $p = $('#wdPage');
  const rerenderBody = ()=>{ $('#wdBody').html(SCREENS.wdStep()); };

  // step1: pick account
  $p.on('click','[data-pick]', function(){
    w.acct = $(this).data('pick');
    $p.find('[data-pick]').removeClass('sel'); $(this).addClass('sel');
  });
  $p.on('click','[data-bank]', function(){
    w.bank = $(this).data('bank');
    $p.find('[data-bank]').removeClass('sel'); $(this).addClass('sel');
  });
  $p.on('click','[data-amt]', function(){
    const v = Number($(this).data('amt'));
    w.amount = String(v);
    $('#wdAmt').val(APP.fmtInt(v));
    SCREENS.wdCheckAmt();
  });
  $p.on('input','#wdAmt', function(){ w.amount=$(this).val(); SCREENS.wdCheckAmt(); });

  $p.on('click','#wdNext1', function(){
    const amt = parseFloat((w.amount||'').replace(/,/g,''))||0;
    const a = APP.acctById(w.acct);
    if(!w.acct){ UI.toast('warning','กรุณาเลือกบัญชีที่ต้องการถอน'); return; }
    if(amt<=0){ UI.toast('warning','กรุณาระบุจำนวนเงิน'); return; }
    if(amt>APP.WITHDRAW_LIMIT){
      UI.swal({icon:'error',title:'เกินวงเงินถอนออนไลน์',html:`ถอนออนไลน์ได้ไม่เกิน <b>${APP.fmtInt(APP.WITHDRAW_LIMIT)} บาท</b> ต่อรายการ<br>กรุณาติดต่อสำนักงานสหกรณ์ฯ`,confirmButtonText:'รับทราบ'});
      return;
    }
    if(amt>a.balance){ UI.toast('warning','ยอดเงินคงเหลือไม่เพียงพอ'); return; }
    if(!w.bank){ UI.toast('warning','กรุณาเลือกบัญชีธนาคารรับโอน'); return; }
    w.step=2; $('#app').html(SCREENS.withdraw()); SCREENS.withdrawBind();
    $('#appScroll').scrollTop(0);
  });

  // step2: docs
  $p.on('click','[data-doc]', function(){
    const key = $(this).data('doc');
    UI.pickFile('image/*', f=>{ w.docs[key]=f; rerenderBody(); UI.toast('success','แนบเอกสารเรียบร้อย'); });
  });
  // step2: signatures
  $p.on('click','[data-sign]', function(){
    SCREENS.openSignature($(this).data('sign'), rerenderBody);
  });
  $p.on('click','#wdBack2', function(){ w.step=1; $('#app').html(SCREENS.withdraw()); SCREENS.withdrawBind(); });
  $p.on('click','#wdNext2', function(){
    const d=w.docs;
    if(!d.idcard||!d.passbook||!d.bankbook){ UI.toast('warning','กรุณาแนบสำเนาเอกสารให้ครบ 3 รายการ'); return; }
    if(!w.sigOwner){ UI.toast('warning','กรุณาลงลายมือชื่อเจ้าของบัญชี'); return; }
    if(!w.sigRecv){ UI.toast('warning','กรุณาลงลายมือชื่อผู้รับเงิน'); return; }
    w.step=3; $('#app').html(SCREENS.withdraw()); SCREENS.withdrawBind();
    $('#appScroll').scrollTop(0);
  });

  // step3
  $p.on('change','#wdAgree', function(){ $('#wdSubmit').prop('disabled', !this.checked); });
  $p.on('click','#wdBack3', function(){ w.step=2; $('#app').html(SCREENS.withdraw()); SCREENS.withdrawBind(); });
  $p.on('click','#wdSubmit', function(){
    const amt = parseFloat((w.amount||'').replace(/,/g,''))||0;
    UI.swal({
      title:'ยืนยันการถอนเงิน',
      html:`ถอน <b style="color:var(--blue-800);font-size:18px;">${APP.fmt(amt)} บาท</b><br>โอนเข้า ${APP.bankAccounts.find(b=>b.id===w.bank).bank}`,
      icon:'question', showCancelButton:true, confirmButtonText:'ยืนยัน', cancelButtonText:'ตรวจทานอีกครั้ง'
    }).then(r=>{
      if(r.isConfirmed){
        UI.swal({title:'กำลังส่งคำขอ...',html:'อัปโหลดเอกสาร 5 รายการและบันทึกคำขอ',didOpen:()=>Swal.showLoading(),showConfirmButton:false,allowOutsideClick:false});
        (async ()=>{
          try {
            const res = await APP.api.createWithdraw({
              accountId: w.acct,
              amount: amt,
              bankAccountId: w.bank,
              docs: {
                citizenId:    w.docs.idcard,
                passbook:     w.docs.passbook,
                bankPassbook: w.docs.bankbook,
              },
              signatures: { owner: w.sigOwner, receiver: w.sigRecv },
            });
            if (!res.ok) throw new Error(res.message || 'ไม่สามารถส่งคำขอได้');
            await APP.api.refreshTxns();
            UI.swal({
              icon:'success', title:'ส่งคำขอถอนเงินสำเร็จ',
              html:`เลขที่คำขอ <b>${res.txnId}</b><br>สถานะ: กำลังตรวจสอบ<br><span style="font-size:12.5px;color:var(--muted)">เจ้าหน้าที่จะตรวจสอบและโอนเงินภายใน 1–2 วันทำการ แจ้งผลผ่าน LINE</span>`,
              confirmButtonText:'ติดตามสถานะ'
            }).then(()=>{
              SCREENS.wd = {step:1,acct:null,amount:'',bank:'b1',docs:{idcard:null,passbook:null,bankbook:null},sigOwner:null,sigRecv:null,pads:{}};
              APP.go('history');
            });
          } catch (err) {
            UI.swal({icon:'error', title:'ส่งคำขอไม่สำเร็จ', html:err.message, confirmButtonText:'ปิด'});
          }
        })();
      }
    });
  });

  if(w.step===1) SCREENS.wdCheckAmt();
};

SCREENS.wdCheckAmt = function(){
  const w = SCREENS.wd;
  const amt = parseFloat(($('#wdAmt').val()||'').replace(/,/g,''))||0;
  const $cur = $('#wdAmtCur');
  if(amt>APP.WITHDRAW_LIMIT){
    $cur.html('<span style="color:var(--danger);font-weight:600;">เกินวงเงิน '+APP.fmtInt(APP.WITHDRAW_LIMIT)+' บาท</span>');
    $('#wdAmt').css('border-color','var(--danger)');
  } else {
    $cur.text('บาท'); $('#wdAmt').css('border-color','');
  }
};

/* ---------- Signature modal ---------- */
SCREENS.openSignature = function(which, onDone){
  const title = which==='owner' ? 'ลายมือชื่อเจ้าของบัญชี' : 'ลายมือชื่อผู้รับเงิน';
  UI.swal({
    title:title,
    width:340,
    html:`
      <div class="sig-tabs" id="sigTabs">
        <button class="active" data-t="draw"><i class="bi bi-pen"></i> เซ็นบนหน้าจอ</button>
        <button data-t="upload"><i class="bi bi-upload"></i> อัปโหลดรูป</button>
      </div>
      <div id="sigDraw">
        <div class="sig-box">
          <canvas id="sigCanvas"></canvas>
          <div class="sig-guide"></div>
          <div class="sig-ph" id="sigPh">เซ็นที่นี่</div>
          <button type="button" class="sig-clear" id="sigClear">ล้าง</button>
        </div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:8px;">ใช้นิ้วหรือสไตลัสเซ็นลายมือชื่อในกรอบ</div>
      </div>
      <div id="sigUpload" style="display:none;">
        <button type="button" class="btn-ghost" id="sigPick"><i class="bi bi-image"></i> เลือกรูปลายเซ็น</button>
        <div id="sigPreview" style="margin-top:10px;"></div>
      </div>`,
    showCancelButton:true, confirmButtonText:'บันทึกลายเซ็น', cancelButtonText:'ยกเลิก',
    didOpen:()=>{
      const canvas = document.getElementById('sigCanvas');
      const pad = UI.SignaturePad(canvas);
      SCREENS._activePad = {pad, mode:'draw', uploaded:null};
      canvas.addEventListener('sig-start', ()=>{ const p=document.getElementById('sigPh'); if(p) p.style.display='none'; });
      document.getElementById('sigClear').addEventListener('click', ()=>{ pad.clear(); const p=document.getElementById('sigPh'); if(p) p.style.display='flex'; });
      document.getElementById('sigTabs').addEventListener('click', e=>{
        const btn=e.target.closest('button'); if(!btn) return;
        document.querySelectorAll('#sigTabs button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const t=btn.dataset.t;
        SCREENS._activePad.mode=t;
        document.getElementById('sigDraw').style.display = t==='draw'?'block':'none';
        document.getElementById('sigUpload').style.display = t==='upload'?'block':'none';
        if(t==='draw') setTimeout(()=>pad.resize(),20);
      });
      document.getElementById('sigPick').addEventListener('click', ()=>{
        UI.pickFile('image/*', f=>{
          SCREENS._activePad.uploaded=f;
          document.getElementById('sigPreview').innerHTML =
            `<div class="doc done"><div class="doc-ic"><img src="${f.dataUrl}"></div><div class="doc-main"><div class="doc-t">${f.name}</div><div class="doc-s">พร้อมใช้งาน</div></div></div>`;
        });
      });
    },
    preConfirm:()=>{
      const ap = SCREENS._activePad;
      if(ap.mode==='draw'){
        if(ap.pad.isEmpty()){ Swal.showValidationMessage('กรุณาเซ็นลายมือชื่อ'); return false; }
        return {dataUrl:ap.pad.dataUrl(), name:'ลายเซ็น (เขียน)'};
      } else {
        if(!ap.uploaded){ Swal.showValidationMessage('กรุณาเลือกรูปลายเซ็น'); return false; }
        return ap.uploaded;
      }
    }
  }).then(r=>{
    if(r.isConfirmed && r.value){
      if(which==='owner') SCREENS.wd.sigOwner=r.value; else SCREENS.wd.sigRecv=r.value;
      onDone(); UI.toast('success','บันทึกลายมือชื่อแล้ว');
    }
  });
};
