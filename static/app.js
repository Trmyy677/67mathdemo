const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let me=null, selectedDeck=null, reviewCard=null, reviewSchedule={}, reviewBusy=false, testItems=[],testIndex=0,exItems=[],exIndex=0,chatHistory=[];

async function api(url,opt={}){const r=await fetch(url,{credentials:'include',...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||d.message||'Request failed');return d}
function toast(t){const x=$('#toast');x.textContent=t;x.style.display='block';clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.style.display='none',2600)}
function go(page){const target=$('#'+page);if(!target)return;const changed=!target.classList.contains('active');$$('.page').forEach(x=>x.classList.toggle('active',x.id===page));$$('.navbar nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===page));if(changed)window.scrollTo({top:0,behavior:'smooth'});if(page==='account')loadAccount();if(page==='vocab'&&me?.logged_in)loadDecks()}
$$('[data-page]').forEach(b=>b.onclick=e=>{e.preventDefault();go(b.dataset.page)});

/* ---------- Auth modal ---------- */
function openAuth(tab='login'){const modal=$('#authModal');$('#authMsg').textContent='';modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');switchAuth(tab);setTimeout(()=>$(tab==='login'?'#loginUser':'#regUser')?.focus(),80)}
function closeAuth(){$('#authModal').classList.add('hidden');$('#authModal').setAttribute('aria-hidden','true')}
function switchAuth(tab){$$('[data-auth]').forEach(b=>b.classList.toggle('active',b.dataset.auth===tab));$('#loginForm').classList.toggle('hidden',tab!=='login');$('#registerForm').classList.toggle('hidden',tab!=='register');$('#authTitle').textContent=tab==='login'?'Welcome back':'Create your 67Math account'}
$('#accountBtn').onclick=()=>{go('account');if(!me?.logged_in)openAuth('login')};
$('#accountLogin').onclick=()=>{if(me?.logged_in){$$('[data-atab]').forEach(x=>x.classList.toggle('active',x.dataset.atab==='profile'));$$('.apanel').forEach(x=>x.classList.toggle('active',x.id==='account-profile'))}else openAuth('login')};
$('#openAuthVocab').onclick=()=>me?.logged_in?go('account'):openAuth('login');
$('#logoutBtn').onclick=async()=>{try{await api('/api/logout',{method:'POST'});me={logged_in:false};selectedDeck=null;toast('Logged out');await loadMe();go('home')}catch(e){toast(e.message)}};
$('#closeAuth').onclick=closeAuth;$('.backdrop').onclick=closeAuth;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#authModal').classList.contains('hidden'))closeAuth()});
$$('[data-auth]').forEach(b=>b.onclick=()=>switchAuth(b.dataset.auth));
$('#loginForm').onsubmit=async e=>{e.preventDefault();await submitAuth('/api/login','#loginForm','#loginUser','#loginPass')};
$('#registerForm').onsubmit=async e=>{e.preventDefault();await submitAuth('/api/register','#registerForm','#regUser','#regPass')};
async function submitAuth(endpoint,formSel,userSel,passSel){$('#authMsg').textContent='';const btn=$(formSel+' .auth-submit');btn.disabled=true;btn.textContent=endpoint.includes('register')?'Creating…':'Signing in…';try{const d=await api(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$(userSel).value.trim(),password:$(passSel).value})});closeAuth();toast(d.message||'Success');await loadMe();go('account')}catch(e){$('#authMsg').textContent=e.message;$('#authMsg').style.color='var(--pink)'}finally{btn.disabled=false;btn.textContent=endpoint.includes('register')?'Create account':'Login'}}

/* ---------- Account ---------- */
async function loadMe(){try{me=await api('/api/me');updateAccountUI();if(me.logged_in){$('#fullName').value=me.full_name||'';$('#dob').value=me.dob||'';renderProfile();await loadDecks();await heartbeat()}else{$('#decks').innerHTML='<div class="empty">🔒 Login to create and sync decks.</div>';$('#dashboard').innerHTML='<div class="card"><h3>🔒 Login required</h3><p class="muted">Create an account to sync vocabulary, exercises and activity.</p><button class="primary" onclick="openAuth(\'login\')">Login / Register</button></div>'}}catch(e){console.error(e);me={logged_in:false};updateAccountUI()}}
function updateAccountUI(){const logged=!!me?.logged_in;$('#accountStatus').textContent=logged?`Signed in as @${me.username}`:'Not logged in';$('#accountLogin').textContent=logged?`👤 @${me.username}`:'🔐 Login / Register';$('#logoutBtn').classList.toggle('hidden',!logged);$('#openAuthVocab').textContent=logged?'👤 Account':'🔐 Login / Register';renderAccountSummary()}
function renderAccountSummary(){if(!me?.logged_in){$('#accountSummary').innerHTML='';return}const avatar=me.profile_pic?`<img src="${me.profile_pic}" alt="profile">`:'👤';$('#accountSummary').innerHTML=`<div class="account-summary-card"><div class="account-summary-avatar">${avatar}</div><div class="account-summary-main"><b>${esc(me.full_name||me.username)}</b><p>@${esc(me.username)} · ${me.full_name?'Profile complete':'Add your name and photo in Profile'}</p></div><div class="summary-actions"><button class="ghost" onclick="go('account')">View record</button></div></div>`}
function renderProfile(){if(!me?.logged_in)return;$('#profilePreview').innerHTML=me.profile_pic?`<img class="profile-img" src="${me.profile_pic}" alt="Profile picture"><div>@${esc(me.username)}</div>`:`<div class="profile-placeholder">👤</div><div>@${esc(me.username)}</div>`;renderAccountSummary()}
$('#saveProfile').onclick=async()=>{try{const fd=new FormData();fd.append('full_name',$('#fullName').value);fd.append('dob',$('#dob').value);if($('#profilePicture').files[0])fd.append('picture',$('#profilePicture').files[0]);me=await api('/api/profile',{method:'POST',body:fd});renderProfile();toast('Profile saved');loadAccount()}catch(e){$('#profileMsg').textContent=e.message}}

/* ---------- Vocabulary ---------- */
const vocabCats=['Algebra','Geometry','Calculus','Algorithms','Probability & Statistics','Oxyz'];
$$('[data-vocab-cat]').forEach(b=>b.onclick=async()=>{const name=b.dataset.vocabCat;$$('[data-vocab-cat]').forEach(x=>x.classList.toggle('active',x===b));if(!me?.logged_in)return openAuth('login');await loadDecks();const d=await api('/api/decks');const found=d.decks.find(x=>x.name.toLowerCase()===name.toLowerCase());if(found){selectedDeck=found.id;updateDeckUI(found);await loadDecks()}else toast(`Deck ${name} is not available yet.`);});
async function loadDecks(){if(!me?.logged_in)return;try{const d=await api('/api/decks');$('#decks').innerHTML=d.decks.map(x=>`<button class="deck-btn ${x.id===selectedDeck?'primary':''}" data-id="${x.id}" data-name="${esc(x.name)}">${esc(x.name)}</button>`).join('')||'<div class="empty">No decks yet.</div>';$$('.deck-btn').forEach(b=>b.onclick=()=>{selectedDeck=+b.dataset.id;const found=d.decks.find(x=>x.id===selectedDeck);updateDeckUI(found);loadDecks()});if(!selectedDeck&&d.decks.length){const preferred=d.decks.find(x=>x.name==='Algebra')||d.decks[0];selectedDeck=preferred.id}const selected=d.decks.find(x=>x.id===selectedDeck);if(selected)updateDeckUI(selected);await loadCards()}catch(e){toast(e.message)}}
function updateDeckUI(deck){if(!deck)return;$('#currentDeckTitle').textContent=deck.name;$('#currentDeckDesc').textContent=deck.description||'Custom vocabulary deck';const active=$$('.deck-btn').find(b=>+b.dataset.id===deck.id);$$('.deck-btn').forEach(b=>b.classList.toggle('primary',b===active))}
async function loadCards(){if(!selectedDeck){$('#cardList').innerHTML='<div class="empty">Select a deck.</div>';return}try{const d=await api('/api/decks/'+selectedDeck+'/cards');$('#deckCount').textContent=`${d.cards.length} card${d.cards.length===1?'':'s'}`;$('#cardList').innerHTML=d.cards.map(c=>`<div class="card-row"><b>${esc(c.word)}</b> ${c.tags?`<span class="tag">${esc(c.tags)}</span>`:''}<div>${esc(c.meaning||'')}</div><div class="pron">${esc(c.pronunciation||'')}</div><div class="example">${esc(c.example||'')}</div><small class="muted">Due ${c.due_date} · ${c.repetitions} reviews</small></div>`).join('')||'<div class="empty">No cards yet. Add your first word above.</div>'}catch(e){toast(e.message)}}
$('#createDeck').onclick=async()=>{try{await api('/api/decks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('#deckName').value,description:$('#deckDesc').value})});$('#deckName').value='';$('#deckDesc').value='';toast('Deck created');await loadDecks()}catch(e){$('#deckMsg').textContent=e.message}}
$('#addCard').onclick=async()=>{try{if(!selectedDeck)return openAuth();await api('/api/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deck_id:selectedDeck,word:$('#word').value,meaning:$('#meaning').value,pronunciation:$('#pron').value,example:$('#example').value,notes:$('#notes').value,tags:$('#tags').value})});toast('Card added');['word','meaning','pron','example','notes','tags'].forEach(id=>$('#'+id).value='');await loadCards()}catch(e){toast(e.message)}};
$$('[data-vtab]').forEach(b=>b.onclick=async()=>{const t=b.dataset.vtab;$$('[data-vtab]').forEach(x=>x.classList.toggle('active',x===b));$$('.vpanel').forEach(x=>x.classList.toggle('active',x.id==='v-'+t));if(t==='review')await loadReview();if(t==='progress')await loadAccount()});
async function loadReview(){if(!me?.logged_in)return openAuth('login');try{const d=await api('/api/review'+(selectedDeck?`?deck_id=${selectedDeck}`:''));reviewCard=d.card;reviewSchedule=d.schedule||{};renderFlash()}catch(e){toast(e.message)}}
function speak(w){if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(w);u.lang='en-US';u.rate=.78;speechSynthesis.cancel();speechSynthesis.speak(u)}}
function scheduleText(r){const x=reviewSchedule[r];if(!x)return '';return `${x.interval_days} day${x.interval_days===1?'':'s'}`;}
function formatDue(iso){if(!iso)return '';const d=new Date(iso+'T00:00:00');return d.toLocaleDateString(document.documentElement.lang==='vi'?'vi-VN':'en-US',{day:'2-digit',month:'2-digit'});}
function renderRatingButtons(){ $$('[data-rating]').forEach(b=>{const r=b.dataset.rating,x=reviewSchedule[r];const fallback={Again:1,Hard:2,Good:4,Easy:7}[r];const days=x?.interval_days||fallback;b.innerHTML=`<span class="rating-name">${r==='Easy'&&document.documentElement.lang==='vi'?'Dễ':r}</span><small>${days} ${days===1?'day':'days'}${x?.due_date?` · ${formatDue(x.due_date)}`:''}</small>`;b.classList.remove('is-loading')}); }
function renderFlash(){if(!reviewCard){$('#flash').innerHTML='<div class="flashcard"><div class="front"><div class="bigword">🎉</div><p>No cards due today.</p></div></div>';renderRatingButtons();return}$('#flash').innerHTML=`<div class="flashcard" id="flashcard"><div class="front"><div class="tiny">FLASHCARD · CLICK TO FLIP</div><div class="bigword">${esc(reviewCard.word)}</div><div class="pron">${esc(reviewCard.pronunciation||'')}</div><button id="speakCard">Listen</button><p class="muted">Click the card to reveal the meaning</p></div><div class="back"><div class="tiny">MEANING</div><h2>${esc(reviewCard.meaning||'')}</h2><p class="example">${esc(reviewCard.example||'')}</p><p class="muted">${esc(reviewCard.notes||'')}</p></div></div>`;$('#flashcard').onclick=e=>{if(e.target.closest('button'))return;$('#flashcard').classList.toggle('flipped')};$('#speakCard').onclick=e=>{e.stopPropagation();speak(reviewCard.word)};renderRatingButtons()}
$$('[data-rating]').forEach(b=>b.onclick=async()=>{if(!reviewCard||reviewBusy)return;reviewBusy=true;const rating=b.dataset.rating;$$('[data-rating]').forEach(x=>{x.disabled=true;x.classList.toggle('is-loading',x===b)});$('#reviewMsg').textContent='Updating your next review…';try{const d=await api('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({card_id:reviewCard.id,rating,deck_id:selectedDeck})});$('#reviewMsg').textContent=d.message;reviewCard=d.card;reviewSchedule=d.schedule||{};renderFlash();if(!reviewCard)await loadReview()}catch(e){toast(e.message);renderRatingButtons()}finally{reviewBusy=false;$$('[data-rating]').forEach(x=>x.disabled=false)}});
$('#startTest').onclick=async()=>{try{if(!me?.logged_in)return openAuth();const d=await api('/api/test/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deck_id:selectedDeck,count:+$('#testCount').value})});testItems=d.items;testIndex=0;renderTest()}catch(e){toast(e.message)}};
function renderTest(feedback=''){if(!testItems.length)return;const q=testItems[testIndex];$('#testBox').innerHTML=`<div class="test-question"><b>${testIndex+1}/${testItems.length}</b> — Choose the English word for: <strong>${esc(q.meaning)}</strong></div>${q.options.map(o=>`<button class="option" data-option="${esc(o)}">${esc(o)}</button>`).join('')}<div id="testFeedback" class="feedback">${feedback}</div>`;$$('.option').forEach(b=>b.onclick=async()=>{const ans=b.dataset.option;const d=await api('/api/test/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:q,answer:ans})});$$('.option').forEach(x=>x.disabled=true);$('#testFeedback').textContent=d.correct?'✅ Correct!':`❌ Correct answer: ${d.correct_answer}`;setTimeout(()=>{testIndex++;if(testIndex<testItems.length)renderTest();else $('#testFeedback').textContent+=' 🎉 Test complete!'},520)})}

/* ---------- Exercise categories ---------- */
const exerciseGroups={
  Algebra:['Linear Equation','Quadratic Function'],
  Geometry:['Geometry','Coordinate Geometry'],
  Calculus:['Derivative','Function Optimization','Integral'],
  Algorithms:['Algorithms','Sequences'],
  Probability:['Statistics','Probability'],
  Oxyz:['Oxyz']
};
let currentExerciseCategory='Algebra';
$$('[data-excat]').forEach(b=>b.onclick=()=>selectExerciseCategory(b.dataset.excat));
function selectExerciseCategory(cat){currentExerciseCategory=cat;$$('[data-excat]').forEach(x=>x.classList.toggle('active',x.dataset.excat===cat));$('#exerciseCategoryTitle').textContent=cat==='Probability'?'Probability & Statistics':cat;const topics=exerciseGroups[cat]||[];$('#topic').innerHTML=topics.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}
$('#generate').onclick=async()=>{try{if(!me?.logged_in)return openAuth('login');const d=await api('/api/exercises/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:$('#topic').value,difficulty:$('#difficulty').value,qtype:$('#qtype').value,count:+$('#exCount').value})});exItems=d.items;exIndex=0;renderExercise();$('#submitEx').disabled=false;$('#exFeedback').innerHTML=''}catch(e){toast(e.message)}};
function renderExercise(){const e=exItems[exIndex];if(!e)return;$('#exerciseBox').classList.remove('empty-state');$('#exerciseBox').innerHTML=`<div class="exercise-q"><div class="eyebrow">QUESTION ${exIndex+1}/${exItems.length} · ${esc(e.topic)} · ${esc(e.difficulty)}</div><div class="question-text">${e.question}</div>${e.type==='mcq'?`<div>${e.options.map(o=>`<button class="option exopt" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`:`<input id="numberAnswer" placeholder="Enter an integer or a number rounded to one decimal place">`}</div>`;if(e.type==='mcq')$$('.exopt').forEach(b=>b.onclick=()=>{$$('.exopt').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');b.dataset.selected='1'})}
$('#submitEx').onclick=async()=>{const e=exItems[exIndex];if(!e)return;const ans=e.type==='mcq'?($('.exopt.selected')?.dataset.v||''):$('#numberAnswer')?.value||'';if(!ans)return toast('Choose or enter an answer');try{const d=await api('/api/exercises/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:e,answer:ans})});$('#exFeedback').innerHTML=d.correct?`<div class="answer-box">✅ Correct! Answer: <b>${esc(d.answer)}</b></div>`:`<div class="answer-box">❌ Not quite.<br>Your answer: <b>${esc(ans)}</b><br>Correct: <b>${esc(d.answer)}</b><br><span>Why: ${esc(d.explanation)}</span></div>`;exIndex++;if(exIndex<exItems.length){setTimeout(renderExercise,500)}else{$('#submitEx').disabled=true;toast('Exercise set complete 🎉')}}catch(e){toast(e.message)}};
$('#exAI').onclick=()=>go('ai');

/* ---------- Dashboard ---------- */
async function loadAccount(){if(!me?.logged_in){$('#dashboard').innerHTML='<div class="card"><h3>🔒 Login required</h3><p class="muted">Create an account to see your personal learning record.</p><button class="primary" onclick="openAuth(\'login\')">Login / Register</button></div>';return}try{const d=await api('/api/dashboard');$('#dashboard').innerHTML=d.html;$('#progress').innerHTML=d.progress_html||'';renderAccountSummary()}catch(e){toast(e.message)}}
$$('[data-atab]').forEach(b=>b.onclick=()=>{$$('[data-atab]').forEach(x=>x.classList.toggle('active',x===b));$$('.apanel').forEach(x=>x.classList.toggle('active',x.id==='account-'+b.dataset.atab));if(b.dataset.atab==='dashboard')loadAccount()});

/* ---------- AI ---------- */
$('#chatImage').onchange=()=>{$('#imageName').textContent=$('#chatImage').files[0]?.name||''};
$('#chatForm').onsubmit=async e=>{e.preventDefault();const text=$('#chatInput').value.trim(),file=$('#chatImage').files[0];if(!text&&!file)return;const previous=chatHistory.slice();chatHistory.push([text||'📷 Image','Thinking…']);renderChat();let fd=new FormData();fd.append('message',text);fd.append('history',JSON.stringify(previous));if(file)fd.append('image',file);$('#chatInput').value='';try{const d=await api('/api/ai',{method:'POST',body:fd});chatHistory=d.history;renderChat();$('#chatImage').value='';$('#imageName').textContent=''}catch(err){chatHistory=previous;renderChat();toast('AI error: '+err.message)}};
function normalizeMathDelimiters(text){
  // marked treats \[ and \( as Markdown escapes, so it removes the backslash
  // before MathJax gets a chance to see the delimiter. Convert display/inline
  // delimiters to $$ / $ before Markdown parsing. Keep the LaTeX commands
  // inside untouched (\\frac, \\cdot, \\binom, \\begin, ...).
  return String(text ?? '')
    .replace(/\\\[/g, '\n\n$$\n')
    .replace(/\\\]/g, '\n$$\n\n')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');
}

function renderAIText(text){
  const raw=String(text??'');
  const mathSafe=normalizeMathDelimiters(raw);
  try{
    if(window.marked && window.DOMPurify){
      const html=window.marked.parse(mathSafe,{breaks:true,gfm:true});
      return window.DOMPurify.sanitize(html,{USE_PROFILES:{html:true}});
    }
  }catch(e){console.warn('Markdown render failed',e)}
  return esc(mathSafe).replace(/\n/g,'<br>');
}
async function typesetAI(){
  try{
    if(window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
    if(window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([$('#chatMessages')]);
  }catch(e){console.warn('MathJax render failed',e)}
}
window.addEventListener('load',()=>setTimeout(typesetAI,100));
function renderChat(){
  if(!chatHistory.length){$('#chatMessages').innerHTML='<div class="chat-empty"><span>✦</span><h3>What are you stuck on?</h3><p>Send a question or upload your worksheet.</p></div>';return}
  $('#chatMessages').innerHTML=chatHistory.map(x=>`<div class="msg-bubble msg-user">${esc(x[0]||'')}</div><div class="msg-bubble msg-ai ai-markdown">${renderAIText(x[1]||'')}</div>`).join('');
  const box=$('#chatMessages');box.scrollTo({top:box.scrollHeight,behavior:'smooth'});typesetAI();
}

/* ---------- Language + theme ---------- */
const I18N={
 en:{home:'Home',oxyz:'OXYZ',vocab:'Vocabulary',exercise:'Exercises',ai:'AI Tutor',account:'Account',start:'Start learning →',practice:'Practice exercises',login:'🔐 Login / Register',logout:'Logout',dash:'📊 Dashboard',profile:'👤 Profile',library:'My Library',review:'Review',test:'Test',progress:'Progress',create:'Create',add:'＋ Add card',random:'🎲 Random test',generate:'🌷 Generate',send:'Send',save:'Save profile'},
 vi:{home:'Trang chủ',oxyz:'OXYZ',vocab:'Từ vựng',exercise:'Bài tập',ai:'Gia sư AI',account:'Tài khoản',start:'Bắt đầu học →',practice:'Luyện bài tập',login:'🔐 Đăng nhập / Tạo tài khoản',logout:'Đăng xuất',dash:'📊 Tổng quan',profile:'👤 Hồ sơ',library:'Thư viện',review:'Ôn tập',test:'Kiểm tra',progress:'Tiến độ',create:'Tạo',add:'＋ Thêm từ',random:'🎲 Kiểm tra ngẫu nhiên',generate:'🌷 Tạo bài tập',send:'Gửi',save:'Lưu hồ sơ'}
};
function translate(lang){const t=I18N[lang];$$('[data-rating=\"Easy\"]').forEach(b=>b.textContent=lang==='vi'?'Ôn lại sau 2 ngày':'Review in 2 days');const nav={home:t.home,oxyz:t.oxyz,vocab:t.vocab,exercise:t.exercise,ai:t.ai,account:t.account};$$('.navbar nav button').forEach(b=>b.textContent=nav[b.dataset.page]);$$('[data-vtab]').forEach(b=>b.textContent=t[b.dataset.vtab]);$$('[data-atab]').forEach(b=>b.textContent=t[b.dataset.atab]);$('#createDeck').textContent=t.create;$('#addCard').textContent=t.add;$('#startTest').textContent=t.random;$('#generate').textContent=t.generate;$('.chatbar .primary').textContent=t.send;$('#saveProfile').textContent=t.save;$('#logoutBtn').textContent=t.logout;$('#openAuthVocab').textContent=me?.logged_in?'👤 Account':t.login;const heroBtns=$$('.hero-actions button');if(heroBtns[0])heroBtns[0].textContent=t.start;if(heroBtns[1])heroBtns[1].textContent=t.practice;document.documentElement.lang=lang;$$('.oxyz').forEach(f=>f.contentWindow?.postMessage({type:'67math-lang',lang},'*'))}
$('#lang').onclick=()=>{const l=document.documentElement.lang==='vi'?'en':'vi';localStorage.setItem('67lang',l);$('#lang').textContent=l==='vi'?'🇻🇳 VI':'🇬🇧 EN';translate(l)};
function sendOxyzState(f){if(!f?.contentWindow)return;const dark=document.body.classList.contains('dark');const lang=document.documentElement.lang||'en';f.contentWindow.postMessage({type:'67math-theme',dark},'*');f.contentWindow.postMessage({type:'67math-lang',lang},'*')}
function applyTheme(dark){document.body.classList.toggle('dark',dark);$('#theme').textContent=dark?'☀️':'🌙';localStorage.setItem('67theme',dark?'dark':'light');$$('.oxyz').forEach(sendOxyzState)}
$('#theme').onclick=()=>applyTheme(!document.body.classList.contains('dark'));

/* ---------- online heartbeat ---------- */
async function heartbeat(){if(!me?.logged_in)return;try{const sid=localStorage.getItem('67sid');const d=await api('/api/online',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid?+sid:null})});localStorage.setItem('67sid',d.session_id)}catch{}}
setInterval(heartbeat,30000);

function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

(function init(){const theme=localStorage.getItem('67theme')==='dark';applyTheme(theme);const lang=localStorage.getItem('67lang')||'en';$('#lang').textContent=lang==='vi'?'🇻🇳 VI':'🇬🇧 EN';translate(lang);selectExerciseCategory('Algebra');$$('.oxyz').forEach(f=>f.addEventListener('load',()=>sendOxyzState(f)));loadMe().catch(()=>{});renderChat()})();
