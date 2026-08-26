// Verifies the gate in a real browser: normal load, offline with a cached
// Shabbos window (must LOCK), and offline with no cache (must BLOCK).
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9225, BASE = 'http://localhost:5173';
const [EMAIL, PASSWORD] = process.argv.slice(2);

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=/tmp/kc-shab-${Date.now()}`,'about:blank'],{stdio:'ignore'});
process.on('exit',()=>{try{chrome.kill('SIGKILL')}catch{}});

async function target(){for(let i=0;i<40;i++){try{const l=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();const p=l.find(t=>t.type==='page');if(p?.webSocketDebuggerUrl)return p.webSocketDebuggerUrl}catch{}await sleep(250)}throw new Error('no target')}
const ws=new WebSocket(await target());await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let id=0;const pend=new Map();
ws.onmessage=m=>{const x=JSON.parse(m.data);if(pend.has(x.id)){const{res,rej}=pend.get(x.id);pend.delete(x.id);x.error?rej(new Error(x.error.message)):res(x.result)}};
const send=(method,params={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method,params}))});
const ev=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.value;

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');

const shot = async (name) => {
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:760,deviceScaleFactor:1,mobile:false});
  const s = await send('Page.captureScreenshot',{format:'png'});
  writeFileSync(`/tmp/kc-shabbos-${name}.png`, Buffer.from(s.data,'base64'));
};
const visible = async () => ({
  blocking: await ev(`!!document.body.innerText.match(/Checking Shabbos/)`),
  locked:   await ev(`!!document.body.innerText.match(/Gut Shabbos|Gut Yom Tov/)`),
  // What a click at the centre of the screen would actually land on.
  covered:  await ev(`(()=>{const el=document.elementFromPoint(innerWidth/2, innerHeight/2);
                            return !!el && !!el.closest('.fixed.inset-0');})()`),
  text:     (await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,90)`)) || '',
});

// --- sign in ---------------------------------------------------------------
await send('Page.navigate',{url:`${BASE}/login`}); await sleep(2500);
const type=(sel,v)=>ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,${JSON.stringify(v)});el.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()`);
await type('#email',EMAIL); await type('#password',PASSWORD);
await ev(`document.querySelector('form').requestSubmit()`); await sleep(3000);

console.log('\n1. ONLINE, no location set on the account');
await send('Page.navigate',{url:BASE}); await sleep(3000);
console.log('  ', JSON.stringify(await visible()));

// Block ONLY the status endpoint. Full offline just yields the browser's error
// page (there is no service worker yet), which tests nothing about the gate.
const blockStatus = (on) => send('Network.setBlockedURLs', { urls: on ? ['*getShabbosStatus*'] : [] });

console.log('\n2. status request failing, cached window -> must LOCK');
await ev(`localStorage.setItem('kc_shabbos_last', JSON.stringify({
  status: { hasLocation:true, isRestricted:true, readOnly:false,
            startsAt: Date.now()-3600000, endsAt: Date.now()+7200000,
            cityLabel:'Lakewood', tzid:'America/New_York', parsha:'Parashat Ki Tavo', isInIsrael:false },
  profileKey:'Lakewood|America/New_York|false', savedAt: Date.now() }))`);
await blockStatus(true);
await send('Page.navigate',{url:BASE}); await sleep(3500);
const off = await visible(); console.log('  ', JSON.stringify(off));
await shot('offline-locked');

console.log('\n3. status request failing, no cache -> must BLOCK');
await ev(`localStorage.removeItem('kc_shabbos_last')`);
await send('Page.navigate',{url:BASE}); await sleep(3500);
const none = await visible(); console.log('  ', JSON.stringify(none));
await shot('offline-blocked');

await blockStatus(false);

console.log('\n4. status endpoint restored -> app usable again');
await send('Page.navigate',{url:BASE}); await sleep(3500);
console.log('  ', JSON.stringify(await visible()));

const pass = off.locked && off.covered && none.blocking && none.covered;
console.log(pass ? '\nPASS: offline never renders an unlocked app' : '\nFAIL: gate leaked');
ws.close(); process.exit(pass?0:1);
