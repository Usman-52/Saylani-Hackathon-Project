
(function(){
  function createToastEx(message, type='info', actions=null, timeout=3500){
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type==='success'?'success': type==='error'?'error':'info');
    const icon = type==='success'?'✅': type==='error'?'❌':'ℹ️';
    el.innerHTML = `<div class="flex-1 text-sm flex items-center gap-3"><span>${icon}</span><span>${message}</span></div>`;
    if (actions && Array.isArray(actions)) {
      const controls = document.createElement('div');
      controls.className = 'flex gap-2';
      actions.forEach(act=>{
        const btn = document.createElement('button');
        btn.textContent = act.label;
        btn.className = 'px-2 py-1 text-sm rounded border';
        btn.addEventListener('click', ()=>{ act.action(); el.remove(); });
        controls.appendChild(btn);
      });
      el.appendChild(controls);
    }
    root.appendChild(el); el.style.transform='translateX(20px)'; el.style.opacity=0; setTimeout(()=>{ el.style.transition='all .28s ease'; el.style.transform='translateX(0)'; el.style.opacity=1; },10);
    setTimeout(()=>{ el.remove(); }, timeout);
  }
  window.createToastEx = createToastEx;
  window.createToastEx('Welcome to MyShop Pro — items load from FakeStore API','info',null,2200);
})();
