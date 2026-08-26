// The scenario the service worker creates: the shell boots offline. Verifies
// the Shabbos gate still refuses to render an unlocked app.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9226, BASE = 'http://localhost:4173';
const [EMAIL, PASSWORD] = process.argv.slice(2);

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=/tmp/kc-sw-${Date.now()}`,'about:blank'],{stdio:'ignore'});
process.on('exit',()=>{try{chrome.kill('SIGKILL')}catch{}});

async function target(){for(let i=0;i<40;i++){try{const l=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();const p=l.find(t=>t.type==='page');if(p?.webSocketDebuggerUrl)return p.webSocketDebuggerUrl}catch{}await sleep(250)}throw new Error('no target')}
const ws=new WebSocket(await target());await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let id=0;const pend=new Map();
ws.onmessage=m=>{const x=JSON.parse(m.data);if(pend.has(x.id)){const{res,rej}=pend.get(x.id);pend.delete(x.id);x.error?rej(new Error(x.error.message)):res(x.result)}};
const send=(m,p={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:p}))});
const ev=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.value;

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');

const view = async () => ({
  blocking: await ev(`!!document.body.innerText.match(/Checking Shabbos/)`),
  locked:   await ev(`!!document.body.innerText.match(/Gut Shabbos|Gut Yom Tov/)`),
  covered:  await ev(`(()=>{const el=document.elementFromPoint(innerWidth/2,innerHeight/2);return !!el&&!!el.closest('.fixed.inset-0')})()`),
  text:     (await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,80)`)) || '',
});

// Sign in and let the service worker install.
await send('Page.navigate',{url:`${BASE}/login`}); await sleep(3000);
const type=(sel,v)=>ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,${JSON.stringify(v)});el.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()`);
await type('#email',EMAIL); await type('#password',PASSWORD);
await ev(`document.querySelector('form').requestSubmit()`); await sleep(3500);

const swReady = await ev(`navigator.serviceWorker.ready.then(r=>!!r.active).catch(()=>false)`);
console.log('\nservice worker active:', swReady);

// Seed a Shabbos window, then cut the network entirely.
await ev(`localStorage.setItem('kc_shabbos_last', JSON.stringify({
  status:{ hasLocation:true, isRestricted:true, readOnly:false,
           startsAt:Date.now()-3600000, endsAt:Date.now()+7200000,
           cityLabel:'Lakewood', tzid:'America/New_York', parsha:'Parashat Ki Tavo', isInIsrael:false },
  profileKey:'Lakewood|America/New_York|false', savedAt:Date.now() }))`);

await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
await send('Page.navigate',{url:BASE}); await sleep(4000);

const shellBooted = await ev(`!!document.querySelector('#root') && document.querySelector('#root').children.length > 0`);
const offline = await view();
console.log('\nOFFLINE, service worker serving the shell:');
console.log('  shell booted from cache:', shellBooted);
console.log(' ', JSON.stringify(offline));

await send('Emulation.setDeviceMetricsOverride',{width:1280,height:760,deviceScaleFactor:1,mobile:false});
const s = await send('Page.captureScreenshot',{format:'png'});
writeFileSync('/tmp/kc-sw-offline.png', Buffer.from(s.data,'base64'));

// And with no cached window at all, offline.
await ev(`localStorage.removeItem('kc_shabbos_last')`);
await send('Page.navigate',{url:BASE}); await sleep(4000);
const nocache = await view();
console.log('\nOFFLINE, no cached window:');
console.log(' ', JSON.stringify(nocache));

const pass = shellBooted && offline.locked && offline.covered && nocache.blocking && nocache.covered;
console.log(pass
  ? '\nPASS: shell boots offline and the gate still refuses to show the app'
  : '\nFAIL: offline shell leaked an unlocked app');
ws.close(); process.exit(pass?0:1);
