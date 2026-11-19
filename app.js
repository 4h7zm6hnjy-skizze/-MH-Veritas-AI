import {createVault,openVault,saveVault,vaultExists,exportVault,importVault,eraseVault} from './vault.js';
import {systemPrompt,MODE_NAMES,emergencyNotice} from './rules.js';
import {extractDocument,asDataUrl} from './parsers.js';

const APP_VERSION='0.2.0';
const $=id=>document.getElementById(id);
const state={key:null,salt:null,data:null,view:'chat',previousView:'chat',updateReady:false,remoteVersion:null,swRegistration:null,mode:'chat',activeId:null,selectedDoc:null,engine:null,modelId:'',modelLibrary:null,busy:false,sidebar:false,tts:false,recognition:null};
const els={sidebar:$('sidebar'),screen:$('vaultScreen'),form:$('vaultForm'),pass:$('vaultPassword'),confirm:$('vaultConfirm'),passArea:$('confirmPassArea'),error:$('vaultError'),desc:$('vaultDescription'),submit:$('vaultSubmit'),messages:$('chatMessages'),hero:$('chatHero'),history:$('historyList'),input:$('messageInput'),composer:$('composerWrap'),send:$('sendButton'),file:$('filePicker'),docList:$('documentList'),docCount:$('docCount'),model:$('modelSelect'),engineBadge:$('engineBadge'),progress:$('modelProgress'),progressBar:$('progressBar'),chip:$('contextChip'),toast:$('toast'),tts:$('ttsToggle'),modelStorage:$('modelStorageStatus'),updateStatus:$('updateStatus'),updateButton:$('installUpdate')};
let toastTimer=0;
function toast(message){els.toast.textContent=message;els.toast.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('shown'),4200);}
const id=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const time=()=>new Date().toISOString();
const shortDate=str=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(str));
function download(name,blob){const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),10000);}
function lockView(isLocked){els.screen.classList.toggle('hidden',!isLocked);document.body.classList.toggle('locked',isLocked);}
async function start(){
 if(!window.isSecureContext||!window.crypto?.subtle||!window.indexedDB){els.error.textContent='Dieser Browser unterstützt die benötigte sichere Verschlüsselung nicht. Nutze HTTPS oder localhost.';els.submit.disabled=true;return;}
 try{const exists=await vaultExists();configureLockForm(exists);}catch(e){els.error.textContent='Lokaler Speicher ist nicht verfügbar: '+e.message;els.submit.disabled=true;}
 if('serviceWorker'in navigator&&window.isSecureContext){
  try{state.swRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(state.updateReady)location.reload();});}catch(e){console.warn('Offline-Worker nicht verfügbar:',e);}
 }
 $('appVersion').textContent=APP_VERSION;$('versionFooter').textContent=APP_VERSION;
 setupListeners();
}
function configureLockForm(exists){els.desc.textContent=exists?'Entsperre deinen verschlüsselten lokalen Tresor mit deinem Passwort.':'Lege ein Passwort fest. Es schützt deine Unterhaltungen und Dokumente ausschließlich auf diesem Gerät.';els.passArea.hidden=exists;els.pass.autocomplete=exists?'current-password':'new-password';els.submit.textContent=exists?'Tresor entsperren':'Sicheren Tresor anlegen';els.error.textContent='';els.pass.value='';els.confirm.value='';lockView(true);}
async function unlock(event){event.preventDefault();els.error.textContent='';const password=els.pass.value;const exists=await vaultExists();if(password.length<10){els.error.textContent='Bitte mindestens 10 Zeichen verwenden.';return;}if(!exists&&password!==els.confirm.value){els.error.textContent='Die Passwörter stimmen nicht überein.';return;}
 els.submit.disabled=true;els.submit.textContent=exists?'Entschlüsselung läuft …':'Verschlüsselung wird eingerichtet …';
 try{const result=exists?await openVault(password):await createVault(password);state.key=result.key;state.data=result.payload;state.salt=result.salt;state.tts=!!state.data.settings?.tts;els.tts.checked=state.tts;els.pass.value='';els.confirm.value='';els.input.value='';state.activeId=state.data.conversations[0]?.id||null;lockView(false);setView('chat');renderAll();toast(exists?'Tresor entsperrt.':'Verschlüsselter Tresor angelegt.');
 // Modelldateien werden im Browsercache gehalten, GPU-Modell muss nach Neustart neu initialisiert werden.
 if(state.data.settings?.model)void resumeSavedModel();}
 catch(err){els.error.textContent=err.message||'Der Tresor konnte nicht geöffnet werden.';}
 finally{els.submit.disabled=false;els.submit.textContent=exists?'Tresor entsperren':'Sicheren Tresor anlegen';}
}
async function persist(){if(!state.key||!state.data)throw Error('Tresor gesperrt');await saveVault(state.key,state.data,state.salt);}
async function lock(){if(state.busy){toast('Bitte warte, bis die laufende Antwort abgeschlossen ist.');return;}try{await state.engine?.unload?.();}catch{}state.key=null;state.salt=null;state.data=null;state.engine=null;state.activeId=null;state.selectedDoc=null;state.modelId='';els.messages.replaceChildren();els.docList.replaceChildren();els.history.replaceChildren();els.input.value='';updateStatus('Nicht geladen',false);configureLockForm(true);}
function setView(view){if(!state.data)return;if(view==='settings'&&state.view!=='settings')state.previousView=state.view;state.view=view;$('viewBack').classList.toggle('hidden',view==='chat');const isSpecial=['medical','medications','legal'].includes(view);if(isSpecial)state.mode=view;else if(view==='chat'&&!state.activeId)state.mode='chat';document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));document.querySelectorAll('.sidebar-nav [data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));els.composer.classList.toggle('hidden',view==='settings'||view==='documents');$('pageEyebrow').textContent=({chat:'DEIN PERSÖNLICHER ASSISTENT',medical:'MEDIZIN',medications:'MEDIKAMENTE',legal:'RECHT',documents:'DEINE GESCHÜTZTEN DATEIEN',settings:'SICHERHEIT & EINSTELLUNGEN'})[view]||'VERITAS AI';updateChip();closeSidebar();if(view==='documents')renderDocuments();if(view==='settings'){updateModelSelect();void updateStorageStatus();}}
function updateChip(){if(state.selectedDoc){const doc=state.data?.documents.find(d=>d.id===state.selectedDoc);els.chip.hidden=false;els.chip.textContent=doc?`Datei für nächste Frage ausgewählt: ${doc.name} · Nur vorhandener Text wird ausgewertet`:'Datei nicht gefunden';}else if(state.mode!=='chat'&&state.view==='chat'){els.chip.hidden=false;els.chip.textContent=`Fachmodus: ${MODE_NAMES[state.mode]} · Kein externer Quellencheck`;}else els.chip.hidden=true;}
function currentConversation(create=false){let conv=state.data?.conversations.find(c=>c.id===state.activeId);if(!conv&&create){conv={id:id(),title:'Neue Unterhaltung',mode:state.mode,created:time(),updated:time(),messages:[]};state.data.conversations.unshift(conv);state.activeId=conv.id;}return conv;}
function renderAll(){renderMessages();renderHistory();renderDocuments();updateModelSelect();updateChip();}
function renderHistory(){els.history.replaceChildren();if(!state.data?.conversations.length){const no=document.createElement('div');no.className='muted-history';no.textContent='Noch keine Unterhaltungen';els.history.append(no);return;}for(const conv of [...state.data.conversations].sort((a,b)=>new Date(b.updated)-new Date(a.updated))){const btn=document.createElement('button');btn.classList.toggle('active',conv.id===state.activeId);btn.textContent=`◌  ${conv.title}`;btn.title=conv.title;btn.addEventListener('click',()=>{state.activeId=conv.id;state.mode=conv.mode||'chat';setView('chat');renderMessages();renderHistory();});els.history.append(btn);}}
function createText(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
function renderMessages(){els.messages.replaceChildren();const conv=currentConversation();const hasMessages=!!conv?.messages.length;els.hero.style.display=hasMessages?'none':'';if(!hasMessages)return;for(const message of conv.messages)renderMessage(message);requestAnimationFrame(()=>{const root=document.querySelector('.main-content');root.scrollTop=root.scrollHeight;});}
function renderMessage(m){const container=createText('article','',`message ${m.role==='user'?'user':'assistant'}`);const avatar=createText('div',m.role==='user'?'DU':'V','avatar');const body=createText('div','','msg-body');const content=createText('div',m.text||'', 'msg-content');body.append(content);
 const foot=createText('div','','msg-foot');foot.append(createText('span',m.role==='user'?'Deine Nachricht':m.docName?`KI · Datei: ${m.docName} (ungeprüft)`:'KI-Antwort · nicht unabhängig geprüft',m.role==='user'?'':'warning-label'));
 if(m.role==='assistant'){const buttons=document.createElement('div');const copy=createText('button','Kopieren');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(m.text);toast('Text kopiert.');}catch{toast('Kopieren in diesem Browser nicht möglich.');}});buttons.append(copy);
 if('speechSynthesis'in window){const read=createText('button','Vorlesen');read.type='button';read.addEventListener('click',()=>speak(m.text));buttons.append(read);}foot.append(buttons);}
 body.append(foot);container.append(avatar,body);els.messages.append(container);return content;
}
function sendPrefill(prompt){state.mode=state.view==='medical'||state.view==='medications'||state.view==='legal'?state.view:state.mode;setView('chat');els.input.value=prompt;els.input.focus();autoGrow();}
function newChat(){state.activeId=null;state.mode='chat';state.selectedDoc=null;setView('chat');renderMessages();renderHistory();els.input.focus();}
function updateStatus(text,good){els.engineBadge.className='status-badge '+(good?'good':'warning');els.engineBadge.innerHTML='';const dot=createText('span','','status-dot');els.engineBadge.append(dot,document.createTextNode(text));}
function progress(message,number){els.progress.textContent=message;if(typeof number==='number'&&Number.isFinite(number))els.progressBar.style.width=`${Math.max(0,Math.min(100,number*100))}%`;}
function updateModelSelect(){if(!state.modelLibrary){const saved=state.data?.settings?.model;if(saved){els.model.replaceChildren(new Option(saved+' (gespeichert)',saved));}return;}const previous=state.data?.settings?.model||els.model.value||'';els.model.replaceChildren();const small=[...state.modelLibrary].sort((a,b)=>sizeRank(a.model_id)-sizeRank(b.model_id));for(const entry of small){const opt=document.createElement('option');opt.value=entry.model_id;opt.textContent=entry.model_id;els.model.append(opt);}els.model.value=small.some(m=>m.model_id===previous)?previous:small[0]?.model_id||'';}
function sizeRank(name){const m=String(name).match(/(\d+(?:\.\d+)?)B/i);return m?parseFloat(m[1]):999;}
async function loadLibrary(){
 if(state.webllm)return state.webllm;
 progress('Lade die KI-Bibliothek. Beim ersten Start ist dafür eine Internetverbindung nötig.');
 const webllm=await import('https://esm.run/@mlc-ai/web-llm@0.2.89');
 const models=webllm.prebuiltAppConfig.model_list.filter(x=>x.model_id&&!/(embedding|vision|vl-|reward)/i.test(x.model_id));
 if(!models.length)throw Error('Keine kompatiblen Textmodelle gefunden.');
 state.webllm=webllm;state.modelLibrary=models;updateModelSelect();return webllm;
}
async function updateStorageStatus(){
 const detail=[];
 const saved=state.data?.settings?.model;
 if(saved)detail.push('Gespeichertes Modell: '+saved+'.');
 else detail.push('Noch kein Modell ausgewählt.');
 if(navigator.storage?.persisted){
  try{detail.push(await navigator.storage.persisted()?'Geschützter Browserspeicher: gewährt.':'Geschützter Browserspeicher: nicht gewährt.');}catch{}
 }
 if(navigator.storage?.estimate){
  try{const estimate=await navigator.storage.estimate();if(Number.isFinite(estimate.usage))detail.push('Belegter App-Speicher (geschätzt): '+(estimate.usage/(1024*1024)).toFixed(0)+' MB.');}catch{}
 }
 detail.push('Bei Datenbereinigung durch iOS oder den Browser kann ein erneuter Download nötig sein.');
 els.modelStorage.textContent=detail.join(' ');
}
async function protectModelStorage(){
 if(!navigator.storage?.persist){toast('Dieser Browser unterstützt keinen Antrag auf dauerhaften Speicher.');await updateStorageStatus();return;}
 try{
  const allowed=await navigator.storage.persist();
  toast(allowed?'Dauerhafter Browserspeicher wurde gewährt.':'Browser hat dauerhaften Speicher nicht gewährt. Die Daten können trotzdem erhalten bleiben.');
 }catch(e){toast('Speicheranforderung fehlgeschlagen: '+e.message);}
 await updateStorageStatus();
}
async function resumeSavedModel(){
 const modelId=state.data?.settings?.model;
 if(!modelId||state.engine||state.busy)return;
 updateStatus('Gespeichertes Modell wird gestartet …',false);
 progress('Stelle das zuletzt ausgewählte Modell wieder her. Ein erneuter GPU-Start ist normal.');
 try{await loadModel({preferredId:modelId,automatic:true});}
 catch(e){progress('Automatische Wiederherstellung nicht möglich: '+e.message);}
}
async function loadModel({preferredId=null,automatic=false}={}){
 if(state.busy||!state.data)return;
 if(!navigator.gpu){progress('WebGPU ist auf diesem Gerät nicht verfügbar. Die Modell-Auswahl bleibt gespeichert.');updateStatus('WebGPU fehlt',false);return;}
 state.busy=true;$('loadEngine').disabled=true;
 try{
  const webllm=await loadLibrary();
  const wanted=preferredId||els.model.value||state.data.settings?.model;
  const entry=state.modelLibrary.find(m=>m.model_id===wanted)||[...state.modelLibrary].sort((a,b)=>sizeRank(a.model_id)-sizeRank(b.model_id))[0];
  if(!entry)throw Error('Modell nicht verfügbar.');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('Kein geeigneter GPU-Adapter verfügbar.');
  if(state.engine){try{await state.engine.unload?.();}catch{}state.engine=null;}
  progress((automatic?'Gespeichertes Modell wird aus dem Browsercache wiederhergestellt: ':'Modell wird installiert oder aus dem Cache geladen: ')+entry.model_id,0);
  updateStatus('KI-Modell wird initialisiert …',false);
  // Expliziter persistenter Modellcache. Kein Cloud-Chat; Browser kann Cache dennoch entfernen.
  const appConfig={...webllm.prebuiltAppConfig,cacheBackend:'indexeddb'};
  state.engine=await webllm.CreateMLCEngine(entry.model_id,{appConfig,initProgressCallback:info=>{progress(info.text||'Modelldaten werden geladen …',info.progress);}});
  state.modelId=entry.model_id;
  state.data.settings.model=entry.model_id;
  await persist();updateModelSelect();
  updateStatus('Lokale KI bereit',true);
  progress('Das lokale Modell ist bereit. Die Auswahl wurde gespeichert.',1);
  toast(automatic?'Gespeichertes KI-Modell wiederhergestellt.':'KI-Modell geladen und Auswahl gespeichert.');
  void updateStorageStatus();
 }catch(e){state.engine=null;updateStatus('Modell nicht geladen',false);progress('Modellstart fehlgeschlagen. Die gespeicherte Auswahl bleibt erhalten: '+(e.message||String(e)));}
 finally{state.busy=false;$('loadEngine').disabled=false;}
}
async function checkForUpdates(){
 const button=$('checkUpdates');if(state.busy){toast('Bitte laufenden Modellvorgang erst abschließen.');return;}
 button.disabled=true;els.updateButton.disabled=true;state.updateReady=false;
 els.updateStatus.textContent='Prüfe die neueste Version …';
 try{
  const response=await fetch('./version.json?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('Versionsdatei nicht erreichbar (HTTP '+response.status+').');
  const remote=await response.json();if(!/^\d+\.\d+\.\d+$/.test(remote.version))throw Error('Versionsinformation ungültig.');
  state.remoteVersion=remote.version;
  const compare=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]-y[i]}return 0;};
  if(compare(remote.version,APP_VERSION)>0){
   if(!('serviceWorker'in navigator))throw Error('Dieser Browser kann kein installierbares Update ausführen.');
   const reg=state.swRegistration||await navigator.serviceWorker.ready;
   await reg.update();state.swRegistration=reg;
   state.updateReady=true;els.updateButton.disabled=false;
   els.updateStatus.textContent='Neue Version '+remote.version+' gefunden. '+(remote.notes||'')+' Jetzt installieren.';
  }else{els.updateStatus.textContent='Aktuell: Version '+APP_VERSION+'. Kein neueres Update gefunden.';}
 }catch(e){els.updateStatus.textContent='Update-Prüfung fehlgeschlagen: '+e.message;}
 finally{button.disabled=false;}
}
async function installUpdate(){
 if(!state.updateReady||state.busy)return;
 const reg=state.swRegistration;
 els.updateStatus.textContent='Installiere das Update. Gespeicherte Chatdaten werden nicht gelöscht …';
 els.updateButton.disabled=true;
 try{
  await reg.update();
  // Eine installierende Service-Worker-Version darf zu Ende laden.
  if(reg.installing)await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Update-Download dauert zu lange.')),20000);
   const finish=()=>{if(reg.installing?.state==='installed'||reg.waiting){clearTimeout(timer);resolve();}else if(reg.installing?.state==='redundant'){clearTimeout(timer);reject(Error('Installation fehlgeschlagen.'));}};
   reg.installing.addEventListener('statechange',finish);finish();
  });
  if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'});els.updateStatus.textContent='Update aktiviert. Die App startet automatisch neu …';}
  else if(reg.active&&navigator.serviceWorker.controller){location.reload();}
  else throw Error('Keine installierte Service-Worker-Version gefunden.');
 }catch(e){els.updateStatus.textContent='Update nicht installiert: '+e.message;els.updateButton.disabled=false;}
}
async function checkGPU(){if(!navigator.gpu){toast('WebGPU fehlt in diesem Browser.');return;}try{const a=await navigator.gpu.requestAdapter();toast(a?'WebGPU verfügbar. Modellausführung ist noch nicht getestet.':'WebGPU-Schnittstelle vorhanden, aber kein Adapter verfügbar.');}catch(e){toast('WebGPU-Prüfung fehlgeschlagen: '+e.message);}}
function autoGrow(){els.input.style.height='auto';els.input.style.height=Math.min(150,els.input.scrollHeight)+'px';}
function gatherMessages(conv){return conv.messages.slice(-14).filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,content:m.text.slice(0,5000)}));}
async function send(){const question=els.input.value.trim();if(!question||state.busy)return;
 if(!state.engine){toast('Bitte zuerst unter Einstellungen ein lokales Modell laden.');setView('settings');return;}
 state.busy=true;els.send.disabled=true;const mode=state.mode;const conv=currentConversation(true);if(conv.messages.length===0){conv.mode=mode;conv.title=question.slice(0,55)+(question.length>55?'…':'');}
 const doc=state.selectedDoc?state.data.documents.find(d=>d.id===state.selectedDoc):null;const context=doc?.text?`Datei: ${doc.name}\n---\n${doc.text}`:'';
 const note=emergencyNotice(question);const msg={id:id(),role:'user',text:question,at:time()};conv.messages.push(msg);conv.updated=time();els.input.value='';autoGrow();state.selectedDoc=null;setView('chat');renderHistory();renderMessages();await persist();
 const reply={id:id(),role:'assistant',text:note?note+'\n\n':'',at:time(),docName:doc?.text?doc.name:null};conv.messages.push(reply);const output=renderMessage(reply);els.hero.style.display='none';
 try{
 const messages=[{role:'system',content:systemPrompt(mode,context)},...gatherMessages({...conv,messages:conv.messages.slice(0,-1)})];
 const chunks=await state.engine.chat.completions.create({messages,stream:true,temperature:0.15,max_tokens:1024});
 for await(const chunk of chunks){const delta=chunk.choices?.[0]?.delta?.content||'';if(delta){reply.text+=delta;output.textContent=reply.text;const root=document.querySelector('.main-content');root.scrollTop=root.scrollHeight;}}
 if(!reply.text.trim())reply.text='Dazu habe ich keine gesicherten Informationen. Das Modell hat keine verwertbare Antwort erzeugt.';
 if(state.tts)speak(reply.text);
 }catch(e){reply.text+='\n\n[Die lokale Antwort wurde unterbrochen: '+(e.message||'Unbekannter Modellfehler')+']';toast('Lokale Modellausführung fehlgeschlagen.');}
 finally{output.textContent=reply.text;conv.updated=time();try{await persist()}catch(e){toast('Konnte Antwort nicht speichern: '+e.message);}renderHistory();state.busy=false;els.send.disabled=false;els.input.focus();}
}
function speak(text){if(!('speechSynthesis'in window)){toast('Vorlesen wird nicht unterstützt.');return;}window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text.slice(0,12000));utterance.lang='de-DE';utterance.rate=.98;window.speechSynthesis.speak(utterance);}
async function localDictation(){const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition||typeof Recognition.available!=='function'){toast('Nachweislich lokale Spracheingabe wird hier nicht unterstützt. Keine Cloud-Aufnahme gestartet.');return;}
 try{const langs=['de-DE'];let availability=await Recognition.available({langs,processLocally:true});if(availability==='downloadable'||availability==='downloading'){if(!confirm('Für lokale Spracheingabe muss ein Sprachpaket heruntergeladen werden. Jetzt installieren?'))return;const installed=await Recognition.install({langs,processLocally:true});if(!installed){toast('Lokales Sprachpaket konnte nicht installiert werden.');return;}availability='available';}
 if(availability!=='available'){toast('Deutsches Offline-Sprachpaket nicht verfügbar.');return;}
 const rec=new Recognition();rec.lang='de-DE';rec.processLocally=true;rec.interimResults=false;rec.continuous=false;rec.onresult=e=>{els.input.value+=((els.input.value?' ':'')+Array.from(e.results).map(r=>r[0].transcript).join(' '));autoGrow();};rec.onerror=e=>toast('Lokale Spracheingabe: '+e.error);state.recognition=rec;rec.start();toast('Lokales Diktat gestartet.');
 }catch(e){toast('Lokale Spracheingabe nicht verfügbar: '+e.message);}}
async function uploadFiles(files){if(!state.data)return;for(const file of files){if(file.size>8*1024*1024){toast(`${file.name}: Maximal 8 MB pro Datei.`);continue;}if(!/\.(txt|md|csv|json|html|log|pdf|docx|png|jpg|jpeg|webp)$/i.test(file.name)){toast(`${file.name}: Dateityp nicht unterstützt.`);continue;}try{
 const extracted=await extractDocument(file);const encoded=await asDataUrl(file);const record={id:id(),name:file.name,type:file.type||'application/octet-stream',size:file.size,added:time(),dataUrl:encoded,text:extracted.content,status:extracted.status};state.data.documents.unshift(record);await persist();toast(`${file.name} verschlüsselt gespeichert.`);
 }catch(e){toast(`Import ${file.name}: ${e.message}`);}}
 renderDocuments();}
function renderDocuments(){els.docList.replaceChildren();const docs=state.data?.documents||[];els.docCount.textContent=`${docs.length} ${docs.length===1?'Datei':'Dateien'}`;if(!docs.length){els.docList.append(createText('div','Noch keine Dateien gespeichert.','empty-docs'));return;}
 for(const doc of docs){const item=createText('div','','document-item'),iconEl=createText('div',doc.type.startsWith('image/')?'▧':'▤','document-icon'),meta=createText('div','','document-meta');meta.append(createText('strong',doc.name),createText('small',`${shortDate(doc.added)} · ${(doc.size/1024).toFixed(1)} KB · ${doc.status}`));
 const downloadBtn=createText('button','Öffnen');downloadBtn.title='Datei aus dem Tresor herunterladen';downloadBtn.onclick=()=>{const a=document.createElement('a');a.href=doc.dataUrl;a.download=doc.name;document.body.appendChild(a);a.click();a.remove();};
 item.append(iconEl,meta,downloadBtn);
 if(doc.text){const use=createText('button','Im Chat nutzen');use.onclick=()=>{state.selectedDoc=doc.id;state.mode='chat';setView('chat');toast('Dateitext für die nächste Frage bereit.');els.input.focus();};item.append(use);}
 const del=createText('button','✕','del');del.title='Dokument löschen';del.onclick=async()=>{if(!confirm(`Datei „${doc.name}“ aus deinem lokalen Tresor löschen?`))return;state.data.documents=state.data.documents.filter(d=>d.id!==doc.id);if(state.selectedDoc===doc.id)state.selectedDoc=null;await persist();renderDocuments();updateChip();};item.append(del);els.docList.append(item);}
}
async function doExport(){try{const record=await exportVault();download('MH-Veritas-AI-Backup-'+new Date().toISOString().slice(0,10)+'.json',new Blob([JSON.stringify(record)],{type:'application/json'}));toast('Verschlüsseltes Backup exportiert.');}catch(e){toast('Backup fehlgeschlagen: '+e.message);}}
async function doImport(event){const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>90*1024*1024)throw Error('Backup zu groß');const data=JSON.parse(await file.text());if(!confirm('ACHTUNG: Das Backup ersetzt den aktuellen Tresor auf diesem Gerät vollständig. Hast du dein jetziges Backup gespeichert?'))return;await importVault(data);state.key=null;state.data=null;state.salt=null;state.engine=null;configureLockForm(true);toast('Backup importiert. Entsperre es mit dem ursprünglichen Passwort.');}catch(e){toast('Import abgelehnt: '+e.message);}}
async function doDelete(){if(prompt('Alle lokalen Veritas-Unterhaltungen und -Dokumente werden unwiderruflich gelöscht. Gib zur Bestätigung LÖSCHEN ein:')!=='LÖSCHEN')return;await eraseVault();state.engine=null;state.data=null;state.key=null;state.salt=null;configureLockForm(false);toast('Lokaler Tresor gelöscht. Browser-Modellcache kann separat bestehen bleiben.');}
function closeSidebar(){state.sidebar=false;els.sidebar.classList.remove('open');$('mobileShade').classList.remove('on');}
function setupListeners(){els.form.addEventListener('submit',unlock);
 document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
 document.querySelectorAll('[data-prompt]').forEach(el=>el.addEventListener('click',()=>sendPrefill(el.dataset.prompt)));
 $('newChat').addEventListener('click',newChat);$('settingsNav').addEventListener('click',()=>setView('settings'));$('menuToggle').addEventListener('click',()=>{state.sidebar=!state.sidebar;els.sidebar.classList.toggle('open',state.sidebar);$('mobileShade').classList.toggle('on',state.sidebar)});$('mobileShade').addEventListener('click',closeSidebar);
 $('lockButton').addEventListener('click',lock);els.input.addEventListener('input',autoGrow);els.input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});els.send.addEventListener('click',send);$('attachButton').addEventListener('click',()=>setView('documents'));
 $('loadEngine').addEventListener('click',()=>loadModel());$('gpuCheck').addEventListener('click',checkGPU);
 $('keepModel').addEventListener('click',protectModelStorage);
 $('viewBack').addEventListener('click',()=>setView(state.view==='settings'?state.previousView||'chat':'chat'));
 $('settingsBack').addEventListener('click',()=>setView(state.previousView||'chat'));
 $('checkUpdates').addEventListener('click',checkForUpdates);
 $('installUpdate').addEventListener('click',installUpdate);
 els.model.addEventListener('change',async()=>{if(!state.data)return;state.data.settings.model=els.model.value;try{await persist();await updateStorageStatus();toast('Modell-Auswahl gespeichert. Zum Aktivieren „Modell auswählen & laden“ nutzen.');}catch(e){toast('Modell-Auswahl konnte nicht gespeichert werden: '+e.message)}});
 els.file.addEventListener('change',e=>{uploadFiles([...e.target.files]);e.target.value='';});const drop=$('dropzone');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');uploadFiles([...e.dataTransfer.files])});drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();els.file.click();}});
 $('exportVault').addEventListener('click',doExport);$('importVault').addEventListener('change',doImport);$('deleteVault').addEventListener('click',doDelete);
 els.tts.addEventListener('change',async e=>{state.tts=e.target.checked;state.data.settings.tts=state.tts;await persist();});
 const mic=createText('button','♩','attach-btn');mic.type='button';mic.title='Nur überprüft lokale Spracheingabe';mic.setAttribute('aria-label','Lokale Spracheingabe');mic.addEventListener('click',localDictation);els.input.before(mic);
}
start();
