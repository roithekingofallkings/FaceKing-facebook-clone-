// chat.js — desktop dock + mobile sheet
(function(){
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function pick(arr){ return arr[randInt(0, arr.length-1)]; }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[c])); }
  function timeNow(){
    const d=new Date(); let h=d.getHours(), m=String(d.getMinutes()).padStart(2,'0');
    const ap=h>=12?'PM':'AM'; h=h%12||12; return `${h}:${m} ${ap}`;
  }

  window.ChatDock = {
    init: function(config){
      const me        = config.me;
      const contacts  = config.contacts || {};
      const replies   = config.replies  || { default:['👍','Ok','Haha','Noted','Sure','😂','😄','🙌','👌'] };
      const dockSel   = config.dockSelector || '#chatDock';

      const conversations = {};
      const openWindows   = new Map();
      const dock          = document.querySelector(dockSel);

      const mq = window.matchMedia('(max-width: 640px)');
      let isMobile = mq.matches;
      mq.addEventListener('change', e => isMobile = e.matches);

      function addMessage(slug, from, text){
        (conversations[slug] = conversations[slug] || []).push({ from, text, time: timeNow() });
      }
      function getMessages(slug){ return conversations[slug] || []; }
      function pickReply(slug){
        const pool = (replies[slug]||[]).concat(replies.default||[]);
        return pick(pool.length ? pool : ['OK']);
      }
      function typingDelay(){ return Math.random()<0.25 ? randInt(1200,2000) : randInt(600,1400); }

      /* ===== DESKTOP ===== */
      function renderDesktop(slug){
        const win = openWindows.get(slug); if(!win) return;
        const body = win.querySelector('.chat-body');
        const msgs = getMessages(slug);
        body.innerHTML = msgs.map(m => `
          <div class="msg ${m.from===me.slug?'me':''}">
            <div>${escapeHtml(m.text)}</div>
            <div class="meta">${escapeHtml(m.time)}</div>
          </div>
        `).join('');
        body.scrollTop = body.scrollHeight;
      }
      function showDesktopTyping(slug){
        const win = openWindows.get(slug); if(!win) return;
        const body = win.querySelector('.chat-body');
        body.querySelector('.msg.typing')?.remove();
        const el = document.createElement('div');
        el.className = 'msg typing';
        el.innerHTML = '<span class="muted">typing…</span>';
        body.appendChild(el);
        body.scrollTop = body.scrollHeight;
        setTimeout(()=>{
          el.remove();
          addMessage(slug, slug, pickReply(slug));
          renderDesktop(slug);
        }, typingDelay());
      }
      function sendDesktop(slug){
        const win = openWindows.get(slug); if(!win) return;
        const input = win.querySelector('input');
        const text = (input.value||'').trim();
        if(!text){ input.focus(); return; }
        addMessage(slug, me.slug, text);
        input.value = '';
        renderDesktop(slug);
        setTimeout(()=> showDesktopTyping(slug), 300);
      }
      function openDesktop(slug){
        if (openWindows.has(slug)){
          dock?.appendChild(openWindows.get(slug));
          return;
        }
        const user = contacts[slug]; if(!user) return;
        const win = document.createElement('div');
        win.className = 'chat-win';
        win.setAttribute('data-slug', slug);
        win.innerHTML = `
          <div class="chat-head">
            <div class="title">
              <img src="${user.avatar}" alt="">
              <div class="name">${escapeHtml(user.name)}</div>
            </div>
            <button class="btn-ghost" data-close><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="chat-body"></div>
          <div class="chat-compose">
            <input type="text" placeholder="Aa" />
            <button class="send"><i class="bi bi-send"></i></button>
          </div>
        `;
        dock?.appendChild(win);
        openWindows.set(slug, win);
        renderDesktop(slug);

        const input = win.querySelector('input');
        win.querySelector('.send').addEventListener('click', ()=> sendDesktop(slug));
        input.addEventListener('keydown', e=>{
          if(e.key==='Enter'){ e.preventDefault(); sendDesktop(slug); }
        });
        win.querySelector('[data-close]').addEventListener('click', ()=>{
          win.remove();
          openWindows.delete(slug);
        });
        setTimeout(()=> input.focus(), 0);
      }

      /* ===== MOBILE ===== */
      function ensureOverlay(){
        let ov = document.getElementById('chatOverlay');
        if (!ov){
          ov = document.createElement('div');
          ov.id = 'chatOverlay';
          ov.className = 'chat-mobile-overlay';
          document.body.appendChild(ov);
        }
        return ov;
      }
      function renderMobile(slug){
        const ov = ensureOverlay();
        const body = ov.querySelector('.chat-mobile-body');
        const msgs = getMessages(slug);
        body.innerHTML = msgs.map(m => `
          <div class="chat-mobile-msg ${m.from===me.slug?'me':''}">
            <div>${escapeHtml(m.text)}</div>
            <div class="chat-mobile-meta">${escapeHtml(m.time)}</div>
          </div>
        `).join('');
        body.scrollTop = body.scrollHeight;
      }
      function showMobileTyping(slug){
        const ov = ensureOverlay();
        const body = ov.querySelector('.chat-mobile-body');
        const el = document.createElement('div');
        el.className = 'chat-mobile-msg';
        el.innerHTML = '<span class="muted">typing…</span>';
        body.appendChild(el);
        body.scrollTop = body.scrollHeight;
        setTimeout(()=>{
          el.remove();
          addMessage(slug, slug, pickReply(slug));
          renderMobile(slug);
        }, typingDelay());
      }
      function sendMobile(slug){
        const ov = ensureOverlay();
        const input = ov.querySelector('input');
        const text = (input.value||'').trim();
        if (!text){ input.focus(); return; }
        addMessage(slug, me.slug, text);
        input.value = '';
        renderMobile(slug);
        setTimeout(()=> showMobileTyping(slug), 300);
      }
      function openMobile(slug){
        const u = contacts[slug]; if(!u) return;
        const ov = ensureOverlay();
        ov.innerHTML = `
          <div class="chat-mobile" data-slug="${slug}">
            <div class="chat-mobile-head">
              <div class="title">
                <img src="${u.avatar}" alt="">
                <div class="name">${escapeHtml(u.name)}</div>
              </div>
              <button class="btn-ghost" data-close><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="chat-mobile-body"></div>
            <div class="chat-mobile-compose">
              <input type="text" placeholder="Aa" />
              <button class="send"><i class="bi bi-send"></i></button>
            </div>
          </div>
        `;
        ov.classList.add('show');
        ov.setAttribute('aria-hidden','false');
        document.body.style.overflow = 'hidden';

        renderMobile(slug);

        const input = ov.querySelector('input');
        ov.querySelector('.send').addEventListener('click', ()=> sendMobile(slug));
        input.addEventListener('keydown', e=>{
          if(e.key==='Enter'){ e.preventDefault(); sendMobile(slug); }
        });
        ov.querySelector('[data-close]').addEventListener('click', ()=>{
          ov.classList.remove('show');
          ov.setAttribute('aria-hidden','true');
          document.body.style.overflow = '';
        });
        setTimeout(()=> input.focus(), 0);
      }

      /* public api */
      return {
        open: function(slug){
          if (!slug || !contacts[slug]) return;
          if (isMobile) openMobile(slug);
          else openDesktop(slug);
        },
        close: function(slug){
          // optional
        }
      };
    }
  };
})();
