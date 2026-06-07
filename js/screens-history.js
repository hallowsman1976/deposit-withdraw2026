/* ===========================================================
   Screens: ประวัติ/สถานะรายการ + รายละเอียดรายการ
   =========================================================== */
SCREENS.historyFilter = 'all';

SCREENS.history = function(){
  const f = SCREENS.historyFilter;
  const list = APP.txns.filter(t=>{
    if(f==='all') return true;
    if(f==='deposit') return t.kind==='deposit';
    if(f==='withdraw') return t.kind==='withdraw';
    if(f==='pending') return ['pending','review','approved'].includes(t.status);
    return true;
  });
  const tabs = [['all','ทั้งหมด'],['withdraw','ถอน'],['deposit','ฝาก'],['pending','กำลังดำเนินการ']];
  return `
  <div class="page">
    <div style="margin-bottom:14px;">
      <h1 class="h-title">ประวัติและสถานะรายการ</h1>
      <p class="h-sub">ติดตามสถานะคำขอฝาก–ถอนของคุณ</p>
    </div>

    <div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px;" id="hisTabs">
      ${tabs.map(t=>`<button class="badge-x ${f===t[0]?'b-review':''}" style="white-space:nowrap;padding:7px 14px;font-size:12.5px;border:1px solid ${f===t[0]?'transparent':'var(--line)'};background:${f===t[0]?'':'#fff'};color:${f===t[0]?'':'var(--ink-2)'};" data-f="${t[0]}">${t[1]}</button>`).join('')}
    </div>

    ${list.length? `<div class="card-x card-pad">${list.map(SCREENS.hisRow).join('')}</div>` :
      `<div class="empty"><i class="bi bi-inbox"></i>ยังไม่มีรายการในหมวดนี้</div>`}
  </div>`;
};

SCREENS.hisRow = function(t){
  const isIn = t.kind==='deposit';
  const sm = APP.statusMeta(t.status);
  return `
  <div class="row-x" data-txn="${t.id}">
    <div class="row-ic ${isIn?'in':'out'}"><i class="bi ${isIn?'bi-arrow-down-left':'bi-arrow-up-right'}"></i></div>
    <div class="row-main">
      <div class="row-t">${isIn?'ฝากเงิน':'ถอนเงิน'} · ${t.acct}</div>
      <div class="row-s">${t.id} · ${t.date}</div>
      <div style="margin-top:5px;"><span class="badge-x ${sm.cls}"><i class="bi ${sm.ic}"></i>${sm.label}</span></div>
    </div>
    <div style="text-align:right;">
      <div class="row-amt ${isIn?'plus':'minus'}">${isIn?'+':'−'}${APP.fmtInt(t.amount)}</div>
      <i class="bi bi-chevron-right" style="color:var(--muted);font-size:13px;"></i>
    </div>
  </div>`;
};

SCREENS.bindHistory = function(){
  $('#hisTabs').on('click','[data-f]', function(){
    SCREENS.historyFilter = $(this).data('f');
    $('#app').html(SCREENS.history()); SCREENS.bindHistory();
  });
  $('#app').on('click','[data-txn]', function(){
    APP.openDetail($(this).data('txn'));
  });
};

/* ---------- DETAIL ---------- */
SCREENS.detail = function(id){
  const t = APP.txns.find(x=>x.id===id) || APP.txns[0];
  const isIn = t.kind==='deposit';
  const sm = APP.statusMeta(t.status);

  // build timeline by status
  const steps = isIn
    ? [['ส่งแจ้งฝากเงิน','done'],['เจ้าหน้าที่ตรวจสอบสลิป', t.status==='done'||t.status==='approved'?'done':'now'],['บันทึกยอดเข้าบัญชี', t.status==='done'?'done':(t.status==='approved'?'now':'')]]
    : [['ส่งคำขอถอนเงิน','done'],
       ['ตรวจสอบเอกสาร', ['review'].includes(t.status)?'now':(t.status==='reject'?'done':'done')],
       [t.status==='reject'?'ไม่อนุมัติ':'อนุมัติคำขอ', t.status==='reject'?'now':(t.status==='done'?'done':(t.status==='review'?'':'now'))],
       ['โอนเงินเข้าบัญชี', t.status==='done'?'done':'']];

  return `
  <div class="page">
    <div style="text-align:center;padding:6px 0 16px;">
      <div class="row-ic ${isIn?'in':'out'}" style="width:62px;height:62px;border-radius:18px;font-size:28px;margin:0 auto 12px;">
        <i class="bi ${isIn?'bi-arrow-down-left':'bi-arrow-up-right'}"></i>
      </div>
      <div style="font-size:13px;color:var(--muted);">${isIn?'ฝากเงิน':'ถอนเงิน'} · ${t.acct}</div>
      <div style="font-family:var(--font-head);font-weight:700;font-size:32px;color:var(--ink);margin:2px 0;">${isIn?'+':'−'} ${APP.fmt(t.amount)}<span style="font-size:15px;font-weight:500;color:var(--muted);"> บาท</span></div>
      <span class="badge-x ${sm.cls}"><i class="bi ${sm.ic}"></i>${sm.label}</span>
    </div>

    ${t.status==='reject' ? `<div class="note" style="background:var(--danger-bg);border-color:#f0cfcb;color:var(--danger);margin-bottom:14px;"><i class="bi bi-exclamation-octagon"></i><div><b>เหตุผล:</b> ${t.reason||'-'}<br>กรุณาแก้ไขและส่งคำขอใหม่อีกครั้ง</div></div>`:''}

    <div class="card-x card-pad" style="margin-bottom:14px;">
      <div class="kv"><span class="k">เลขที่รายการ</span><span class="v">${t.id}</span></div>
      <div class="kv"><span class="k">วันที่ทำรายการ</span><span class="v">${t.date} ${t.time} น.</span></div>
      <div class="kv"><span class="k">บัญชี</span><span class="v">${t.acct}</span></div>
      ${t.to?`<div class="kv"><span class="k">โอนเข้า</span><span class="v" style="font-size:13px;">${t.to}</span></div>`:''}
      ${t.from?`<div class="kv"><span class="k">ที่มา</span><span class="v" style="font-size:13px;">${t.from}</span></div>`:''}
    </div>

    <div class="sec-label">สถานะการดำเนินการ</div>
    <div class="card-x card-pad" style="margin-bottom:14px;">
      <div class="tl">
        ${steps.filter(s=>s[1]).map(s=>`
          <div class="tl-i ${s[1]==='done'?'ok':(s[1]==='now'?'now':'')}">
            <div class="tl-dot"></div>
            <div><div class="tl-t">${s[0]}</div><div class="tl-s">${s[1]==='done'?'เสร็จสิ้น':(s[1]==='now'?'กำลังดำเนินการ':'รอดำเนินการ')}</div></div>
          </div>`).join('')}
      </div>
    </div>

    ${t.kind==='withdraw' ? `
    <div class="sec-label">เอกสารแนบ</div>
    <div class="card-x card-pad" style="margin-bottom:14px;">
      ${['สำเนาบัตรประชาชน','สมุดบัญชีออมทรัพย์','สมุดบัญชีธนาคารรับโอน','ลายมือชื่อเจ้าของบัญชี','ลายมือชื่อผู้รับเงิน'].map((d,i)=>`
        <div class="row-x"><div class="row-ic" style="background:var(--blue-100);color:var(--blue-700);"><i class="bi bi-file-earmark-check"></i></div><div class="row-main"><div class="row-t" style="font-size:13.5px;">${d}</div></div><i class="bi bi-eye" style="color:var(--blue-600);"></i></div>`).join('')}
    </div>`:''}

    ${t.status==='reject'
      ? `<button class="btn-pri" data-nav="withdraw"><i class="bi bi-arrow-repeat"></i> ทำรายการใหม่</button>`
      : `<button class="btn-ghost" data-act="contact"><i class="bi bi-headset"></i> ติดต่อเจ้าหน้าที่</button>`}
  </div>`;
};
