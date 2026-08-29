import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1100,height:900} });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: ' + m.text()); });

// Freeze time at 10:07 local so "now" behaviour is deterministic.
await p.addInitScript(() => {
  const fixed = new Date(2026, 7, 29, 10, 7, 30).getTime();
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a){ if (a.length===0) super(fixed); else super(...a); }
    static now(){ return fixed; }
  }
  window.Date = FakeDate;
});

await p.goto(new URL('../index.html', import.meta.url).href);
await p.waitForTimeout(300);

const T = (n,v) => console.log((v?'PASS':'FAIL') + '  ' + n);

// starter tasks seeded
const tasks = await p.$$eval('#tasklist li .name', els => els.map(e=>e.textContent));
T('3 starter tasks seeded', JSON.stringify(tasks)==='["Deep work","Email & admin","Break"]');

// day label says Today
T('date label shows Today', (await p.textContent('#daylabel')).includes('Today'));

// grid has 15 hours * 4 = 60 cells
const nCells = await p.$$eval('.cell', e=>e.length);
T('60 cells (07:00-22:00)', nCells===60);

// the "now" cell is 10:00-10:15 => index (10-7)*4 = 12
const nowIdx = await p.$eval('.cell.now', e=>e.dataset.i);
T('now cell = block 12 (10:00)', nowIdx==='12');

// --- drag-paint: select task 1, drag from 09:00 (idx 8) to 10:15 (idx 13)
await p.click('#tasklist li:nth-child(1)');
const box = i => p.$eval(`.cell[data-i="${i}"]`, e => { const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
const a = await box(8), z = await box(13);
await p.mouse.move(a.x,a.y); await p.mouse.down();
for (let s=1;s<=12;s++) await p.mouse.move(a.x+(z.x-a.x)*s/12, a.y+(z.y-a.y)*s/12);
await p.mouse.up();
await p.waitForTimeout(150);

const filled = await p.$$eval('.cell.filled', els => els.map(e=>Number(e.dataset.i)));
T('painted blocks 8..13', JSON.stringify(filled)==='[8,9,10,11,12,13]');
T('run label on first cell only',
  (await p.$$eval('.cell.filled .lab', els=>els.map(e=>e.textContent))).filter(Boolean).length === 2); // one per row (8 and 12)

// hours total on the task chip: 6 blocks = 1h 30m
T('task shows 1h 30m', (await p.textContent('#tasklist li:nth-child(1) .hrs')).trim()==='1h 30m');
T('footer counts planned', (await p.textContent('#planned')).startsWith('1h 30m planned'));

// NOW strip: inside "Deep work", run ends at 10:30 -> 22:30 remaining from 10:07:30
T('now strip names task', (await p.textContent('#nowwhat'))==='Deep work');
const left = (await p.textContent('#nowleft'));
T('countdown to end of run = 22:30 ('+left+')', left.startsWith('22:30'));
T('tab title tracks countdown', (await p.title()).startsWith('22:30 · Deep work'));

// --- persistence across reload
await p.reload(); await p.waitForTimeout(250);
T('plan survives reload', JSON.stringify(await p.$$eval('.cell.filled', els=>els.map(e=>Number(e.dataset.i))))==='[8,9,10,11,12,13]');

// --- drag over own blocks clears them
const c9 = await box(9), c11 = await box(11);
await p.mouse.move(c9.x,c9.y); await p.mouse.down();
await p.mouse.move(c11.x,c11.y,{steps:6}); await p.mouse.up();
await p.waitForTimeout(120);
T('drag over own blocks erases', JSON.stringify(await p.$$eval('.cell.filled',els=>els.map(e=>Number(e.dataset.i))))==='[8,12,13]');

// --- second task paints a different colour
await p.click('#tasklist li:nth-child(2)');
const c20 = await box(20);
await p.mouse.move(c20.x,c20.y); await p.mouse.down(); await p.mouse.up();
await p.waitForTimeout(100);
const colors = await p.$$eval('.cell.filled', els => [...new Set(els.map(e=>getComputedStyle(e).backgroundColor))]);
T('two distinct task colours', colors.length===2);

// --- keyboard: "3" selects third task, arrow keys change day
await p.keyboard.press('3');
T('key 3 selects third task', await p.$eval('#tasklist li:nth-child(3)', e=>e.classList.contains('sel')));
await p.keyboard.press('ArrowRight');
T('ArrowRight -> Tomorrow', (await p.textContent('#daylabel')).includes('Tomorrow'));
T('tomorrow starts empty', (await p.$$eval('.cell.filled',e=>e.length))===0);
T('off-day now strip is idle', (await p.textContent('#nowwhat')).includes('Viewing another day'));

// copy previous day
await p.click('#copyprev'); await p.waitForTimeout(120);
T('copy previous day', (await p.$$eval('.cell.filled',e=>e.length))===4);
await p.keyboard.press('t');
T('T returns to today', (await p.textContent('#daylabel')).includes('Today'));

// --- free-time branch: clear day, check "Free — ... at"
p.once('dialog', d => d.accept());
await p.click('#clear'); await p.waitForTimeout(150);
await p.click('#tasklist li:nth-child(1)');
const c40 = await box(40); // 17:00
await p.mouse.move(c40.x,c40.y); await p.mouse.down(); await p.mouse.up();
await p.waitForTimeout(1100);
const idleTxt = await p.textContent('#nowwhat');
T('free-time message points at next block', /Free — Deep work at 17:00/.test(idleTxt));
T('free countdown counts down to 17:00', (await p.textContent('#nowleft')).startsWith('6:52'));

// no horizontal overflow / no errors
T('no horizontal scroll', await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
T('no console/page errors', errs.length===0);
if (errs.length) console.log(errs.join('\n'));

// screenshot with a fuller plan for a look
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('jato.timeboxer.v1'));
  const k = Object.keys(s.days)[0];
  const d = new Array(60).fill(null);
  const ids = s.tasks.map(t=>t.id);
  for (let i=4;i<12;i++) d[i]=ids[0];
  for (let i=12;i<15;i++) d[i]=ids[1];
  for (let i=20;i<22;i++) d[i]=ids[2];
  for (let i=24;i<34;i++) d[i]=ids[0];
  for (let i=38;i<41;i++) d[i]=ids[1];
  s.days['2026-08-29']=d;
  localStorage.setItem('jato.timeboxer.v1', JSON.stringify(s));
});
await p.reload(); await p.waitForTimeout(400);
await p.screenshot({ path:'timeboxer-light.png', fullPage:true });
await p.emulateMedia({ colorScheme:'dark' });
await p.waitForTimeout(200);
await p.screenshot({ path:'timeboxer-dark.png', fullPage:true });

await b.close();
