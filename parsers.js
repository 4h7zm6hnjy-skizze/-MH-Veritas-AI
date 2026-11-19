// No external processing. Native browser-only reading of text and DOCX when deflate-raw is supported.
export async function extractDocument(file){
 const name=file.name.toLowerCase();
 if(/\.(txt|md|csv|json|html|log)$/.test(name)||file.type.startsWith('text/'))return{content:(await file.text()).slice(0,220000),status:'Text lokal gelesen'};
 if(name.endsWith('.docx')){try{return{content:(await parseDOCX(await file.arrayBuffer())).slice(0,220000),status:'DOCX-Text lokal extrahiert'}}catch(e){return{content:'',status:'DOCX gespeichert; Textextraktion nicht möglich: '+e.message}}}
 if(name.endsWith('.pdf'))return{content:'',status:'PDF verschlüsselt gespeichert; PDF-Textextraktion in Version 0.1 nicht verfügbar'};
 if(file.type.startsWith('image/'))return{content:'',status:'Bild gespeichert; OCR und Bildverständnis in Version 0.1 noch nicht verfügbar'};
 return{content:'',status:'Datei gespeichert; automatische Analyse nicht verfügbar'};
}
async function parseDOCX(arrayBuffer){
 const view=new DataView(arrayBuffer), bytes=new Uint8Array(arrayBuffer),findEocd=()=>{for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50)return i;throw Error('ZIP-Ende fehlt')};
 const eocd=findEocd();const count=view.getUint16(eocd+10,true);let pos=view.getUint32(eocd+16,true);let info;
 for(let i=0;i<count;i++){
  if(view.getUint32(pos,true)!==0x02014b50)throw Error('Ungültige ZIP-Struktur');
  const method=view.getUint16(pos+10,true),length=view.getUint32(pos+20,true),nameLen=view.getUint16(pos+28,true),extraLen=view.getUint16(pos+30,true),commentLen=view.getUint16(pos+32,true),localPos=view.getUint32(pos+42,true);
  const name=new TextDecoder().decode(bytes.subarray(pos+46,pos+46+nameLen));if(name==='word/document.xml')info={method,length,localPos};pos+=46+nameLen+extraLen+commentLen;
 }
 if(!info)throw Error('Kein Word-Dokument gefunden');const p=info.localPos;
 if(view.getUint32(p,true)!==0x04034b50)throw Error('Lokaler ZIP-Eintrag ungültig');
 const offset=p+30+view.getUint16(p+26,true)+view.getUint16(p+28,true),compressed=bytes.slice(offset,offset+info.length);
 let output;
 if(info.method===0)output=compressed;
 else if(info.method===8){if(!('DecompressionStream'in window))throw Error('Browser kann DOCX nicht entpacken');const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));output=new Uint8Array(await new Response(stream).arrayBuffer());}
 else throw Error('Unbekannte Komprimierung');
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(output),'application/xml');if(xml.querySelector('parsererror'))throw Error('DOCX enthält ungültiges XML');
 const paragraphs=Array.from(xml.getElementsByTagNameNS('*','p'));return paragraphs.map(p=>Array.from(p.getElementsByTagNameNS('*','t')).map(n=>n.textContent).join('')).filter(Boolean).join('\n');
}
export const asDataUrl=async file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
export function findRelevantDocuments(documents,question){const terms=new Set((question.toLocaleLowerCase('de').match(/[a-zäöüß0-9]{4,}/g)||[]).filter(w=>!['diese','diesen','welche','meine','bitte','kannst','sagen','eine','einem','über','dass'].includes(w)));if(!terms.size)return[];return documents.map(d=>{const lower=(d.text||'').toLocaleLowerCase('de');let score=0;for(const t of terms)if(lower.includes(t))score++;return{...d,score}}).filter(d=>d.score>0&&d.text).sort((a,b)=>b.score-a.score).slice(0,2).map(d=>({name:d.name,text:d.text.slice(0,4000)}));}
