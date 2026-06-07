/* ===========================================================
   Screen: ฝากเงิน (แจ้งโอนเข้าบัญชี + แนบสลิป)
   =========================================================== */
SCREENS.depositState = { acct:null, amount:'', slip:null, bank:'b1' };

SCREENS.deposit = function(){
  const s = SCREENS.depositState;
  return `
  <div class="page" id="depPage">
    <div style="margin-bottom:16px;">
      <div class="eyebrow">แจ้งโอนเงิน</div>
      <h1 class="h-title">ฝากเงินออมทรัพย์</h1>
      <p class="h-sub">โอนเงินเข้าบัญชีสหกรณ์ฯ แล้วแจ้งรายการพร้อมแนบสลิป เจ้าหน้าที่จะตรวจสอบและบันทึกยอดให้</p>
    </div>

    <!-- บัญชีปลายทางสหกรณ์ -->
    <div class="note ok" style="margin-bottom:18px;">
      <i class="bi bi-bank2"></i>
      <div>
        <b>โอนเข้าบัญชีสหกรณ์ฯ</b><br>
        ธ.กรุงไทย สาขามุกดาหาร · เลขที่ <b>420-1-27931-6</b><br>
        ชื่อบัญชี: สหกรณ์ออมทรัพย์สาธารณสุขจังหวัดมุกดาหาร จำกัด
        <button class="badge-x b-approved" style="margin-top:7px;border:0;" data-act="copyacc"><i class="bi bi-clipboard"></i> คัดลอกเลขบัญชี</button>
      </div>
    </div>

    <div class="sec-label">เลือกบัญชีปลายทางที่ต้องการฝาก</div>
    ${APP.accounts.map(a=>`
      <div class="opt ${a.kind==='special'?'gold':''} ${s.acct===a.id?'sel':''}" data-pick="${a.id}">
        <div class="opt-ic"><i class="bi ${a.kind==='special'?'bi-gem':'bi-piggy-bank'}"></i></div>
        <div class="opt-main">
          <div class="opt-t">${a.type}</div>
          <div class="opt-s">${a.no}</div>
        </div>
        <div class="opt-bal">${APP.fmt(a.balance)}<div style="font-size:10px;color:var(--muted);font-weight:400;">คงเหลือ</div></div>
        <div class="opt-radio"></div>
      </div>`).join('')}

    <div class="field" style="margin-top:8px;">
      <label>จำนวนเงินที่โอน <span class="req">*</span></label>
      <input class="input-amount" id="depAmt" inputmode="numeric" placeholder="0.00" value="${s.amount}">
      <div class="amount-cur">บาท</div>
    </div>
    <div class="chip-row" style="margin-bottom:18px;">
      ${[500,1000,2000,5000].map(v=>`<button class="chip" data-amt="${v}">+${APP.fmtInt(v)}</button>`).join('')}
    </div>

    <div class="field">
      <label>วันที่–เวลาที่โอน <span class="req">*</span></label>
      <input class="form-control" type="text" id="depDate" value="06 มิ.ย. 2569 · 09:30 น." readonly>
    </div>

    <div class="sec-label" style="margin-top:6px;">แนบสลิปการโอนเงิน <span class="req" style="color:var(--danger)">*</span></div>
    <div class="doc ${s.slip?'done':''}" id="depSlip" data-act="slip">
      <div class="doc-ic">${s.slip?`<img src="${s.slip.dataUrl}">`:'<i class="bi bi-receipt"></i>'}</div>
      <div class="doc-main">
        <div class="doc-t">${s.slip?s.slip.name:'หลักฐานการโอนเงิน'}</div>
        <div class="doc-s">${s.slip?'แนบแล้ว · '+UI.kb(s.slip.size):'ถ่ายรูป หรือเลือกจากคลังภาพ'}</div>
      </div>
      <div class="doc-act">${s.slip?'เปลี่ยน':'<i class="bi bi-camera"></i> แนบ'}</div>
    </div>

    <div class="field" style="margin-top:8px;">
      <label>หมายเหตุ (ถ้ามี)</label>
      <textarea class="form-control" id="depNote" rows="2" placeholder="เช่น ฝากประจำเดือน มิถุนายน"></textarea>
    </div>

    <div class="sticky-cta">
      <button class="btn-pri" id="depSubmit"><i class="bi bi-send-check"></i> ส่งแจ้งฝากเงิน</button>
    </div>
  </div>`;
};

SCREENS.depositBind = function(){
  const s = SCREENS.depositState;

  $('#depPage').on('click','[data-pick]', function(){
    s.acct = $(this).data('pick');
    $('#depPage .opt').removeClass('sel');
    $(this).addClass('sel');
  });

  $('#depPage').on('click','[data-amt]', function(){
    const cur = parseFloat(($('#depAmt').val()||'').replace(/,/g,''))||0;
    const v = cur + Number($(this).data('amt'));
    s.amount = String(v);
    $('#depAmt').val(APP.fmtInt(v));
  });
  $('#depAmt').on('input', function(){ s.amount = $(this).val(); });

  $('#depPage').on('click','[data-act="copyacc"]', function(){
    const acc='420-1-27931-6';
    if(navigator.clipboard){ navigator.clipboard.writeText(acc).catch(()=>{}); }
    UI.toast('success','คัดลอกเลขบัญชี '+acc+' แล้ว');
  });

  $('#depPage').on('click','#depSlip', function(){
    UI.pickFile('image/*', f=>{
      s.slip = f;
      $('#app').html(SCREENS.deposit()); SCREENS.depositBind();
      UI.toast('success','แนบสลิปเรียบร้อย');
    });
  });

  $('#depSubmit').on('click', function(){
    const amt = parseFloat((s.amount||'').replace(/,/g,''))||0;
    if(!s.acct){ UI.toast('warning','กรุณาเลือกบัญชีที่ต้องการฝาก'); return; }
    if(amt<=0){ UI.toast('warning','กรุณาระบุจำนวนเงิน'); return; }
    if(!s.slip){ UI.toast('warning','กรุณาแนบสลิปการโอนเงิน'); return; }
    const a = APP.acctById(s.acct);
    UI.swal({
      title:'ยืนยันการแจ้งฝากเงิน',
      html:`<div style="text-align:left;font-size:14px;">
        <div class="kv"><span class="k">บัญชีปลายทาง</span><span class="v">${a.type}</span></div>
        <div class="kv big"><span class="k">จำนวนเงิน</span><span class="v">${APP.fmt(amt)} บาท</span></div>
        <div class="kv"><span class="k">สลิป</span><span class="v">แนบแล้ว ✓</span></div>
      </div>`,
      showCancelButton:true, confirmButtonText:'ยืนยันส่ง', cancelButtonText:'แก้ไข'
    }).then(r=>{
      if(r.isConfirmed){
        UI.swal({title:'กำลังส่งคำขอ...',html:'อัปโหลดสลิปและบันทึกรายการ',didOpen:()=>Swal.showLoading(),showConfirmButton:false,allowOutsideClick:false});
        (async ()=>{
          try {
            const res = await APP.api.createDeposit({
              accountId: s.acct,
              amount: amt,
              slip: s.slip,
              note: $('#depNote').val() || '',
            });
            if (!res.ok) throw new Error(res.message || 'ไม่สามารถส่งคำขอได้');
            await APP.api.refreshTxns();
            UI.swal({
              icon:'success', title:'ส่งแจ้งฝากเงินแล้ว',
              html:`เลขที่รายการ <b>${res.txnId}</b><br>เจ้าหน้าที่จะตรวจสอบและบันทึกยอดภายในวันทำการ ระบบจะแจ้งผลผ่าน LINE`,
              confirmButtonText:'ดูสถานะรายการ'
            }).then(()=>{
              SCREENS.depositState = { acct:null, amount:'', slip:null, bank:'b1' };
              APP.go('history');
            });
          } catch (err) {
            UI.swal({icon:'error', title:'ส่งคำขอไม่สำเร็จ', html:err.message, confirmButtonText:'ปิด'});
          }
        })();
      }
    });
  });
};
