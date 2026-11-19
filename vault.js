// No plaintext conversation/document content is persisted. PBKDF2 -> AES-GCM.
const DB='mh-veritas-local-v1', STORE='vault', ITERATIONS=310000;
const encoder=new TextEncoder(), decoder=new TextDecoder();
const b64=bytes=>{const arr=new Uint8Array(bytes);let out='';for(let i=0;i<arr.length;i+=32768)out+=String.fromCharCode(...arr.subarray(i,i+32768));return btoa(out);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);});}
async function dbAction(mode,fn){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const req=fn(tx.objectStore(STORE));let result;req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error)};});}
const getRecord=()=>dbAction('readonly',s=>s.get('data'));
const putRecord=r=>dbAction('readwrite',s=>s.put(r,'data'));
async function derive(password,salt){const raw=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export const emptyData=()=>({schema:1,conversations:[],documents:[],settings:{tts:false,model:''}});
export const vaultExists=async()=>!!(await getRecord());
export async function createVault(password){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await derive(password,salt);const payload=emptyData();const record=await seal(key,payload,salt);await putRecord(record);return{key,payload,salt};}
async function seal(key,data,salt){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(data)));return{format:'mh-veritas-vault',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),ciphertext:b64(encrypted)};}
export async function openVault(password){const record=await getRecord();if(!record)throw Error('Kein Tresor gefunden');if(record.format!=='mh-veritas-vault'||record.iterations!==ITERATIONS)throw Error('Nicht unterstütztes Tresorformat');const salt=unb64(record.salt);const key=await derive(password,salt);let plaintext;try{plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(record.iv)},key,unb64(record.ciphertext));}catch{throw Error('Passwort falsch oder Daten beschädigt.');}const payload=JSON.parse(decoder.decode(plaintext));if(payload.schema!==1)throw Error('Nicht unterstützte Datenversion');return{key,payload,salt};}
export async function saveVault(key,payload,salt){await putRecord(await seal(key,payload,salt));}
export async function exportVault(){return await getRecord();}
export async function importVault(record){if(record?.format!=='mh-veritas-vault'||record.version!==1||record.iterations!==ITERATIONS||![record.salt,record.iv,record.ciphertext].every(v=>typeof v==='string'&&v.length>10))throw Error('Keine gültige Veritas-Sicherungsdatei');await putRecord(record);}
export async function eraseVault(){await dbAction('readwrite',s=>s.delete('data'));}
