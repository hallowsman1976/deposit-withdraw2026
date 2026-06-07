/* ===========================================================
   Router + init
   =========================================================== */
(function(){
  const $app = $('#app');
  const titles = {
    register:['ผูกบัญชีสมาชิก','สอ.สธ.มุกดาหาร จำกัด', false],
    home:    ['ออมทรัพย์ออนไลน์','สอ.สธ.มุกดาหาร จำกัด', false],
    deposit: ['ฝากเงิน','แจ้งโอนเข้าบัญชี', true],
    withdraw:['ถอนเงินออนไลน์','วงเงินไม่เกิน 50,000 บาท', true],
    history: ['ประวัติรายการ','ฝาก–ถอน', true],
    profile: ['โปรไฟล์สมาชิก','', true],
    detail:  ['รายละเอียดรายการ','', true],
  };

  let current = 'home';
  const tabFor = (s)=> (s==='detail') ? 'history' : s;

  function setHeader(screen){
    const t = titles[screen] || titles.home;
    $('#hdrTitle').contents().filter(function(){return this.nodeType===3;}).first().replaceWith(t[0]);
    // simpler: rebuild title
    $('#hdrTitle').html(t[0]+`<small class="lh-sub">${t[1]}</small>`);
    $('#hdrBack').css('visibility', t[2]?'visible':'hidden');
  }

  function setTab(screen){
    const tab = tabFor(screen);
    $('.tabbar .tab').removeClass('active');
    $(`.tabbar .tab[data-nav="${tab}"]`).addClass('active');
    // hide tabbar on register
    $('#tabbar').css('display', screen==='register'?'none':'flex');
  }

  APP.go = function(screen, opt){
    current = screen;
    let html='';
    switch(screen){
      case 'register': html = SCREENS.register(); break;
      case 'home':     html = SCREENS.home(); break;
      case 'deposit':  html = SCREENS.deposit(); break;
      case 'withdraw': html = SCREENS.withdraw(); break;
      case 'history':  html = SCREENS.history(); break;
      case 'profile':  html = SCREENS.profile(); break;
      case 'detail':   html = SCREENS.detail(opt); break;
    }
    $app.html(html);
    setHeader(screen); setTab(screen);
    $('#appScroll').scrollTop(0);

    // bind per screen
    if(screen==='register') SCREENS.registerBind();
    if(screen==='deposit')  SCREENS.depositBind();
    if(screen==='withdraw') SCREENS.withdrawBind();
    if(screen==='history')  SCREENS.bindHistory();
  };

  APP.openDetail = function(id){ APP.lastDetailFrom = current; APP.go('detail', id); };

  // header back
  $('#hdrBack').on('click', function(){
    if(current==='detail'){ APP.go(APP.lastDetailFrom||'history'); return; }
    if(current==='withdraw' && SCREENS.wd.step>1){
      SCREENS.wd.step--; $('#app').html(SCREENS.withdraw()); SCREENS.withdrawBind(); return;
    }
    APP.go('home');
  });
  $('#hdrClose').on('click', function(){
    UI.swal({title:'ปิดหน้าต่าง?',html:'ต้องการออกจากแอปใช่หรือไม่',icon:'question',showCancelButton:true,confirmButtonText:'ปิด',cancelButtonText:'อยู่ต่อ'});
  });

  // bottom nav + any data-nav
  $(document).on('click','[data-nav]', function(e){
    const s = $(this).data('nav');
    if(s) APP.go(s);
  });

  // detail open from rows
  $(document).on('click','[data-txn]', function(){
    const id = $(this).data('txn');
    if(id) APP.openDetail(id);
  });

  // generic actions -> friendly toast/dialogs
  $(document).on('click','[data-act]', function(){
    const a = $(this).data('act');
    if(a==='logout'){
      UI.swal({title:'ออกจากระบบ?',icon:'warning',showCancelButton:true,confirmButtonText:'ออกจากระบบ',cancelButtonText:'ยกเลิก'}).then(r=>{ if(r.isConfirmed) APP.go('register'); });
    } else if(a==='passbook'){
      UI.swal({title:'สมุดบัญชีอิเล็กทรอนิกส์',html:'ฟีเจอร์นี้อยู่ระหว่างพัฒนา จะแสดงรายการเดินบัญชีย้อนหลังของท่าน',icon:'info',confirmButtonText:'รับทราบ'});
    } else if(a==='contact'){
      UI.swal({title:'ติดต่อสหกรณ์ฯ',html:'โทร. 042-611-xxx<br>ในวันและเวลาราชการ<br>หรือทักผ่าน LINE Official',icon:'info',confirmButtonText:'ปิด'});
    } else if(a==='addbank'){
      UI.toast('info','ฟีเจอร์เพิ่มบัญชีธนาคาร (ตัวอย่าง)');
    } else if(a==='menu'){
      UI.toast('info','เมนูตัวอย่าง');
    }
  });

  // boot — start at register splash to show binding flow
  APP.go('register');
})();
