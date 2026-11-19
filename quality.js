// MH Veritas AI v0.3.0 - begrenzte lokale Qualitätskontrolle.
// Kein unabhängiger Faktenchecker: bewertet Textmuster, nicht die Wahrheit der Aussagen.
const MEINERZHAGEN_URL='https://www.meinerzhagen.de/bildung/kultur-und-sport/stadtgeschichte';

function questionHasCurrentFacts(q){
  return /\b(aktuell|heute|jetzt|dieses jahr|einwohnerzahl|bürgermeister|öffnungszeit|neueste|letzte woche|202[5-9]|wetter|preis|wie viel einwohner)\b/i.test(q);
}

export function evidenceFirst(question,mode='chat',hasDocument=false){
 const q=String(question||'').trim();
 if(hasDocument) return null; // Das Nutzer-Dokument ist Quelle, nicht unabhängiger Beleg.
 // Nur kuratierte, benannte und offline mit der App ausgelieferte Quellenauszüge beantworten.
 if(/\bmeinerzhagen\b/i.test(q) && /\b(stadt|ort|geschichte|erzähl|erzähle|infos?|informationen|wissenswert|beschreib|über|zu)\b/i.test(q)){
  if(questionHasCurrentFacts(q))return {
   text:'Zu den aktuell angefragten Daten habe ich offline keine gesicherten Informationen. Bitte prüfe die aktuelle Angabe bei der Stadt Meinerzhagen. Die gespeicherte Stadtgeschichte enthält keine verlässlich aktuellen Zahlen.',
   category:'nicht-verifiziert',sources:[{title:'Stadt Meinerzhagen · Stadtgeschichte',url:MEINERZHAGEN_URL}],
  };
  return {
   text:'Meinerzhagen ist eine Stadt im Märkischen Kreis in Nordrhein-Westfalen, am westlichen Rand des Sauerlands. Sie wurde laut der offiziellen Stadtgeschichte erstmals 1174 urkundlich erwähnt. Die Stadt entwickelte sich unter anderem durch Eisenverarbeitung und später durch mittelständische Industrie. Heute sind die Umgebung mit Talsperren sowie Rad- und Wanderwege wichtige Freizeitangebote.\n\nQuelle: Stadt Meinerzhagen – Stadtgeschichte. Die Angaben stammen aus dem lokal hinterlegten Auszug; die Quelle wurde bei dieser Antwort nicht live abgerufen.',
   category:'quellenbasiert',sources:[{title:'Stadt Meinerzhagen · Stadtgeschichte',url:MEINERZHAGEN_URL}]
  };
 }
 // Unveränderliche Grenzen: dieses Modell hat keine aktuelle Recherche und keine Fach-Datenbank.
 if(/\b(wie viele|wann genau|wann ist|wer ist|neuste|neueste|heute|aktuell|derzeit|preis|wetter)\b/i.test(q)&&
    /\b(bürgermeister|einwohner|öffnungszeiten?|wetter|preise?|gerichtsurteile?|gesetze?|rechtslage|fristen?|richtlinien?|aktuelle meldungen?)\b/i.test(q)){
   return {text:'Dazu habe ich keine gesicherten aktuellen Informationen. Meine lokale KI hat keinen Live-Internetzugang. Für eine verlässliche Antwort benötige ich eine aktuelle offizielle Quelle oder einen von dir ausgewählten Textauszug.',category:'nicht-verifiziert'};
 }
 if(mode==='medications'&& /\b(wie viel|wieviel|dosier|dosis|absetzen|weglassen|gleichzeitig nehmen|wechselwirkung|kombinier|zusammen einnehmen|verträg|sicher einnehmen)\b/i.test(q)){
  return {text:'Für eine persönliche Einnahme-, Dosis- oder Wechselwirkungsentscheidung habe ich keine gesicherte Grundlage. Eine geprüfte Arzneimitteldatenbank ist hier nicht vorhanden. Bitte lass Wirkstoff, Stärke und deinen vollständigen Medikamentenplan durch Arzt oder Apotheke prüfen. Ändere die Einnahme nicht aufgrund einer KI-Antwort.',category:'fachlich-nicht-verifiziert'};
 }
 if(mode==='legal'&& /\b(welche frist|wie lange (habe|muss|kann)|welcher paragraph|welches urteil|ist das legal|ist das rechtens|was sagt das gesetz aktuell)\b/i.test(q)){
  return {text:'Die konkrete Rechtslage, Frist oder ein Gerichtsurteil kann ich offline nicht zuverlässig prüfen. Dazu habe ich keine gesicherten aktuellen Informationen. Ich kann dir helfen, den Sachverhalt zu strukturieren und die zuständige amtliche Quelle zu ermitteln.',category:'fachlich-nicht-verifiziert'};
 }
 // Detailbehauptungen zu unbekannten Städten/Institutionen ohne Beleg nicht generieren.
 if(/\b(erzähl|erzähle|berichte|beschreib|informier|was weißt)\b.*\b(stadt|gemeinde|ort|unternehmen|person)\b/i.test(q)){
  return {text:'Ich kann dazu ohne überprüfbare Quelle keine zuverlässigen konkreten Fakten nennen. Das lokale Modell könnte Orte, Jahreszahlen oder Einrichtungen erfinden. Wenn du einen offiziellen Text als Dokument auswählst, kann ich ihn verständlich und mit klarer Quellenkennzeichnung zusammenfassen.',category:'nicht-verifiziert'};
 }
 return null;
}

const NORMALIZE = s => String(s||'').toLocaleLowerCase('de-DE')
 .replace(/\*|[#_`]/g,'').replace(/[^\p{L}\p{N} ]/gu,' ')
 .replace(/\s+/g,' ').trim();

function badLoop(text){
 const normalized=NORMALIZE(text);
 if(!normalized || normalized.length<160)return false;
 const words=normalized.split(' ');
 // Vergleich von 10-Wort-Sequenzen erkennt die in den Screenshots sichtbaren Textschleifen.
 const seen=new Map();
 for(let i=0;i<=words.length-10;i++){
  const n=words.slice(i,i+10).join(' ');
  if(n.length<45)continue;
  const hits=(seen.get(n)||0)+1;
  if(hits>=3)return true;
  seen.set(n,hits);
 }
 // identische Sätze mehrfach wiederholt
 const sentences=String(text).split(/[.!?](?:\s+|$)/).map(NORMALIZE).filter(s=>s.length>=35);
 return sentences.some(s=>sentences.filter(x=>x===s).length>=3);
}

export function reviewGeneratedAnswer(raw,{question='',mode='chat'}={}){
 let text=String(raw||'').replace(/<\|[^>]+\|>/g,'').trim();
 if(!text)return {text:'Dazu habe ich keine gesicherten Informationen. Das lokale Modell hat keine verwertbare Antwort erzeugt.',category:'nicht-verifiziert'};
 if(badLoop(text) || /\b(kulturinsitum|meuse.weich|meistermühlen)\b/i.test(text)){
  return {text:'Die erzeugte Antwort enthielt auffällige Wiederholungen oder offensichtlich fragwürdige Begriffe. Ich habe sie nicht übernommen. Dazu habe ich ohne eine verlässliche Quelle keine gesicherten Informationen.',category:'verworfen'};
 }
 // Long-form hallucination reduction: cut at complete sentence, never let a broken enumeration run on.
 const maxChars=1500;
 if(text.length>maxChars){
  const cut=text.slice(0,maxChars);
  const end=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('! '),cut.lastIndexOf('? '),cut.lastIndexOf('\n\n'));
  text=(end>300?cut.slice(0,end+1):cut).trim();
 }
 // Remove repeated blank-line blocks; do not promise factual validation.
 return {text,category:mode==='medical'||mode==='medications'||mode==='legal'?'fachlich-nicht-verifiziert':'modellantwort'};
}

export function smallModelWarning(modelId=''){
 const match=String(modelId).match(/(\d+(?:\.\d+)?)B\b/i);
 if(!match)return 'Die Antwortqualität hängt stark vom Modell und Gerät ab; Fakten bleiben ungeprüft.';
 const b=Number(match[1]);
 if(b<=0.6)return 'Sehr kleines Modell (bis 0,6B): besonders hohes Risiko für erfundene Fakten. Für anspruchsvolle Fragen nach Möglichkeit ein größeres Modell auswählen.';
 if(b<=1.6)return 'Kompaktes Modell: bessere Ergebnisse möglich, aber keine verlässliche Faktenprüfung. Gerät benötigt mehr Speicher.';
 return 'Größeres lokales Modell: benötigt viel Arbeitsspeicher und kann auf Mobilgeräten abstürzen. Fakten bleiben ungeprüft.';
}

export function simplePrompt(mode='chat',documentText=''){
 const scope={chat:'Allgemeine Hilfestellung',medical:'Allgemeine medizinische Begriffserklärung, keine Diagnose',medications:'Allgemeines Arzneimittelwissen, keine Dosierung oder Wechselwirkungsfreigabe',legal:'Allgemeine Rechtsorientierung, keine aktuellen Gesetze oder Fristen'}[mode]||'Allgemeine Hilfestellung';
 return `Du bist Veritas, ein vorsichtiger deutschsprachiger Assistent. Thema: ${scope}.\nAntworte in 2-5 sachlichen Sätzen, ohne erfundene Details, Zahlen, Namen, Orte oder Quellen. Höchstens 3 Stichpunkte, keine langen Listen, keine Wiederholungen. Wenn du dir nicht sicher bist, schreibe: "Dazu habe ich keine gesicherten Informationen." Du hast kein Internet und keine Fach-Datenbank. Behaupte nie, etwas geprüft zu haben.\n${documentText?`Benutze NUR den folgenden vom Nutzer bereitgestellten Text. Er ist nicht unabhängig geprüft:\n${documentText.slice(0,4500)}`:''}`;
}
