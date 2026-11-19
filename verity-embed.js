/** MH Veritas AI integration widget. Do not use as a data bridge. Embedding does not share vaults across origins. */
export function mountVeritas({target,appUrl,mode='button',label='Veritas AI öffnen'}={}){
 if(!target||!appUrl)throw new Error('target and appUrl are required');
 const host=typeof target==='string'?document.querySelector(target):target;
 if(!host)throw new Error('Target element not found');
 const url=new URL(appUrl,location.href);if(!['https:','http:'].includes(url.protocol))throw new Error('Unsupported protocol');
 if(mode==='iframe'){
  const frame=document.createElement('iframe');frame.title='MH Veritas AI';frame.src=url.href;frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.style.cssText='width:100%;height:650px;border:1px solid #354767;border-radius:16px;background:#0b1324';host.append(frame);return frame;
 }
 const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='background:#424fa4;color:#fff;border:0;padding:12px 18px;border-radius:11px;font:600 14px system-ui;cursor:pointer';button.addEventListener('click',()=>window.open(url.href,'_blank','noopener,noreferrer'));host.append(button);return button;
}
