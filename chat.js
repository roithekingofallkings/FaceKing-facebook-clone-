// chat.js — shared chat dock for index.html & profile.html
(function(){
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function pick(arr){ return arr[randInt(0, arr.length-1)]; }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[c])); }
  function timeNow(){
    const d=new Date(); let h=d.getHours(), m=String(d.getMinutes()).padStart(2,'0');
    const ap=h>=12?'PM':'AM'; h=h%12||12; return `${h}:${m} ${ap}`;
  }

  function createAPI(config){
    const me        = config.me;                       // {slug, name, avatar}
    const contacts  = config.contacts || {};           // {slug: {name, avatar, presence}}
    const replies   = config.replies  || { default:['👍','Ok','Haha','Noted','Sure','😂','😄','🙌','👌'] };
    const dockSel   = config.dockSelector || '#chatDock';

    const conversations = {};                          // demo in-memory store
    const openWindows   = new Map();
    const dock          = document.querySelector(dockSel);

    function pickReply(slug){
      const pool = (replies[slug]||[]).concat(replies.default||[]);
      return pick(pool.length ? pool : ['OK']);
    }
    function typingDelay(){ return Math.random()<0.2 ? randInt(1200,2200) : randInt(600,1800); }

    function renderMessages(slug){
      const win = openWindows.get(slug); if(!win) return;
      const body = win.querySelector('.chat-body');
      const msgs = conversations[slug] || [];
      body.innerHTML = msgs.map(m => `
        <div class="msg ${m.from===me.slug?'me':''}">
          <div>${escapeHtml(m.text)}</div>
          <div class="meta">${escapeHtml(m.time)}</div>
        </div>
      `).join('');
      body.scrollTop = body.scrollHeight;
    }

    function showTyping(slug){
      const win = openWindows.get(slug); if(!win) return;
      const body = win.querySelector('.chat-body');
      body.querySelector('.msg.typing')?.remove();

      const typing = document.createElement('div');
      typing.className = 'msg typing';
      typing.innerHTML = '<span class="muted">typing…</span>';
      body.appendChild(typing);
      body.scrollTop = body.scrollHeight;

      setTimeout(()=>{
        typing.remove();
        const burstCount = Math.random()<0.25 ? 2 : 1;
        for (let i=0;i<burstCount;i++){
          (conversations[slug] = conversations[slug] || []).push({
            from: slug, text: pickReply(slug), time: timeNow()
          });
        }
        renderMessages(slug);
      }, typingDelay());
    }

    function sendFromWindow(slug){
      const win = openWindows.get(slug); if(!win) return;
      const input = win.querySelector('input');
      const text = (input?.value || '').trim();
      if (!text) { input?.focus(); return; }
      (conversations[slug] = conversations[slug]||[]).push({ from: me.slug, text, time: timeNow() });
      if (input) input.value='';
      renderMessages(slug);
      setTimeout(()=> showTyping(slug), 300);
    }

    function closeChat(slug){
      const win = openWindows.get(slug);
      if (!win) return;
      win.remove();
      openWindows.delete(slug);
    }

    function openChat(slug){
      if (!slug || !contacts[slug]) return;
      if (openWindows.has(slug)) { dock?.appendChild(openWindows.get(slug)); return; }

      const user = contacts[slug];
      const win = document.createElement('div');
      win.className = 'chat-win';
      win.setAttribute('data-slug', slug);
      win.innerHTML = `
        <div class="chat-head">
          <div class="title">
            <img src="${user.avatar}" alt="">
            <div class="name" title="${escapeHtml(user.name)}">${escapeHtml(user.name)}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-ghost" data-close title="Close"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>
        <div class="chat-body"></div>
        <div class="chat-compose">
          <input type="text" placeholder="Aa" />
          <button class="send" title="Send"><i class="bi bi-send"></i></button>
        </div>
      `;
      dock?.appendChild(win);
      openWindows.set(slug, win);
      renderMessages(slug);

      const input = win.querySelector('input');
      setTimeout(()=> input?.focus(), 0);
      win.querySelector('[data-close]')?.addEventListener('click', ()=> closeChat(slug));
      win.querySelector('.send')?.addEventListener('click', ()=> sendFromWindow(slug));
      input?.addEventListener('keydown', (e)=>{
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendFromWindow(slug); }
      });
    }

    return { open: openChat, close: closeChat };
  }

  window.ChatDock = { init: createAPI };
})();
