/* ===========================================================
   Shared UI helpers — emblem, SweetAlert theme, signature pad, uploads
   =========================================================== */
window.UI = window.UI || {};

/* brand logo (โลโก้จริง สอ.สธ.มุกดาหาร) */
UI.emblem = function(big){
  return `<img class="brand-logo ${big?'lg':''}" src="assets/logo.png" alt="ตราสหกรณ์ออมทรัพย์สาธารณสุขจังหวัดมุกดาหาร จำกัด">`;
};

/* SweetAlert2 themed wrapper */
UI.swal = function(opts){
  return Swal.fire(Object.assign({
    buttonsStyling:false,
    customClass:{
      popup:'mk-swal',
      confirmButton:'mk-swal-confirm',
      cancelButton:'mk-swal-cancel',
      title:'mk-swal-title',
      htmlContainer:'mk-swal-html'
    }
  }, opts));
};

UI.toast = function(icon, title){
  return Swal.fire({
    toast:true, position:'top', icon, title,
    showConfirmButton:false, timer:1900, timerProgressBar:true,
    customClass:{popup:'mk-toast'}
  });
};

/* inject swal styles once */
(function(){
  const css = `
  .mk-swal{border-radius:22px!important;font-family:var(--font)!important;padding:22px 20px 20px!important;width:330px!important;}
  .mk-swal-title{font-family:var(--font-head)!important;font-weight:600!important;font-size:19px!important;color:var(--ink)!important;}
  .mk-swal-html{font-size:14px!important;color:var(--ink-2)!important;}
  .mk-swal-confirm{font-family:var(--font-head)!important;font-weight:600!important;white-space:nowrap!important;background:linear-gradient(180deg,var(--blue-600),var(--blue-700))!important;color:#fff!important;border:0!important;border-radius:13px!important;padding:12px 20px!important;font-size:15px!important;box-shadow:0 8px 18px rgba(19,74,132,.28)!important;margin:0 5px!important;}
  .mk-swal-cancel{font-family:var(--font-head)!important;font-weight:600!important;white-space:nowrap!important;background:#fff!important;color:var(--ink-2)!important;border:1.5px solid var(--line)!important;border-radius:13px!important;padding:12px 20px!important;font-size:15px!important;margin:0 5px!important;}
  .mk-toast{border-radius:14px!important;font-family:var(--font)!important;font-size:13.5px!important;}
  .swal2-container{padding:12px!important;}
  `;
  const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
})();

/* file -> dataURL, with image preview support */
UI.pickFile = function(accept, cb){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept = accept || 'image/*';
  inp.onchange = function(){
    const f = inp.files[0]; if(!f){ return; }
    const r = new FileReader();
    r.onload = e => cb({name:f.name, size:f.size, dataUrl:e.target.result, isImage:/^image\//.test(f.type)});
    r.readAsDataURL(f);
  };
  inp.click();
};
UI.kb = function(bytes){ return bytes>1048576 ? (bytes/1048576).toFixed(1)+' MB' : Math.max(1,Math.round(bytes/1024))+' KB'; };

/* ---------- Signature pad ---------- */
UI.SignaturePad = function(canvas){
  const ctx = canvas.getContext('2d');
  let drawing=false, has=false, last=null;
  function resize(){
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    canvas.width = r.width*dpr; canvas.height = r.height*dpr;
    ctx.scale(dpr,dpr);
    ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#16202F';
  }
  function pos(e){
    const r=canvas.getBoundingClientRect();
    const t = e.touches? e.touches[0] : e;
    return {x:t.clientX-r.left, y:t.clientY-r.top};
  }
  function start(e){ e.preventDefault(); drawing=true; last=pos(e); }
  function move(e){
    if(!drawing) return; e.preventDefault();
    const p=pos(e);
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke();
    last=p; if(!has){ has=true; canvas.dispatchEvent(new Event('sig-start')); }
  }
  function end(){ drawing=false; }
  canvas.addEventListener('mousedown',start); canvas.addEventListener('mousemove',move);
  window.addEventListener('mouseup',end);
  canvas.addEventListener('touchstart',start,{passive:false});
  canvas.addEventListener('touchmove',move,{passive:false});
  canvas.addEventListener('touchend',end);
  setTimeout(resize,30);
  return {
    clear(){ ctx.clearRect(0,0,canvas.width,canvas.height); has=false; canvas.dispatchEvent(new Event('sig-clear')); },
    isEmpty(){ return !has; },
    dataUrl(){ return canvas.toDataURL('image/png'); },
    resize
  };
};
