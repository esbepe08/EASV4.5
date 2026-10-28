// Player names (edit in place + Settings), word flash, touch haptics, fullscreen from Settings, turn dot.
import { launch, openGame, closeGame, VIEWPORTS } from './lib.mjs';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const b = await launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DESK = VIEWPORTS['desktop 1366x768'], PHONE = VIEWPORTS['portrait-phone 390x844'];
const names = p => p.evaluate(() => [0, 1].map(i => document.querySelector(`#pn${i} .pname`).textContent));
const paused = p => p.evaluate(async () => (await import('/js/state.js')).S.paused);
const store = (p, k) => p.evaluate(k => localStorage.getItem(k), k);

// ---------- names: in place ----------
{
  const { page, errors } = await openGame(b, DESK);
  ok((await names(page)).join('|') === 'اللاعب الأول|اللاعب الثاني', 'default names unchanged');
  ok(await page.$eval('#pn0 .pname', e => e.tabIndex === 0 && e.getAttribute('role') === 'button'), 'name is a focusable control');
  const h0 = await page.$eval('#pn0', e => e.getBoundingClientRect().height);
  await page.click('#pn0 .pname', { count: 2 });
  ok(!!await page.$('#pn0 .pnameEdit') && await page.$eval('#pn0 .pname', e => e.hidden), 'double-click opens the field in place');
  ok(await paused(page) === true, 'clock is frozen while editing');
  const h1 = await page.$eval('#pn0', e => e.getBoundingClientRect().height);
  ok(Math.abs(h0 - h1) < 0.6, `panel height does not change while editing (${h0} -> ${h1})`);
  await page.keyboard.type('Layla'); await page.keyboard.press('Enter');
  ok((await names(page))[0] === 'Layla', 'Enter keeps the name');
  ok(!await page.$('.pnameEdit') && await paused(page) === false, 'field gone and clock running again');
  ok(JSON.parse(await store(page, 'scrabble.names')).n.join('|') === 'Layla|', 'saved as an override only');
  ok(await page.$eval('#rk0', e => e.getAttribute('aria-label')) === 'رفّ Layla', 'rack accessible name follows');
  // Esc discards
  await page.click('#pn0 .pname', { count: 2 }); await page.keyboard.type('Zed'); await page.keyboard.press('Escape');
  ok((await names(page))[0] === 'Layla', 'Esc discards the change');
  ok(await page.evaluate(() => document.activeElement === document.querySelector('#pn0 .pname')), 'focus returns to the name after Esc');
  // duplicate
  await page.click('#pn1 .pname', { count: 2 }); await page.keyboard.type('layla'); await page.keyboard.press('Enter');
  ok((await names(page))[1] === 'اللاعب الثاني' && /مستخدم/.test(await page.$eval('#toast', e => e.textContent)), 'a name taken by the other player is refused with a message');
  // keyboard route
  await page.focus('#pn1 .pname'); await page.keyboard.press('Enter');
  ok(!!await page.$('#pn1 .pnameEdit'), 'Enter on the focused name opens the field');
  await page.keyboard.type('سلمى'); await page.keyboard.press('Enter');
  ok((await names(page))[1] === 'سلمى', 'Arabic name kept');
  // long press
  const r = await page.$eval('#pn0 .pname', e => { const x = e.getBoundingClientRect(); return [x.x + x.width / 2, x.y + x.height / 2]; });
  await page.mouse.move(...r); await page.mouse.down();
  await sleep(150); ok(await page.$eval('#pn0 .pname', e => e.classList.contains('pressing')), 'pressing shows the fill line');
  await sleep(550); await page.mouse.up();
  ok(!!await page.$('#pn0 .pnameEdit'), 'press and hold opens the field'); await page.keyboard.press('Escape');
  // a short press does not
  await page.mouse.move(...r); await page.mouse.down(); await sleep(120); await page.mouse.up(); await sleep(500);
  ok(!await page.$('.pnameEdit'), 'a short press does nothing');
  // empty = default
  await page.click('#pn0 .pname', { count: 2 }); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await page.keyboard.press('Enter');
  ok((await names(page))[0] === 'اللاعب الأول', 'empty name returns to the default');
  // history and result use names; hostile input is inert
  await page.click('#pn0 .pname', { count: 2 }); await page.keyboard.type('<img src=x onerror=window.__x=1>'); await page.keyboard.press('Enter');
  await page.click('#bPass'); await page.click('#bPass'); await sleep(100);
  ok(!await page.$('#pn0 img, #hList img, #toast img'), 'markup in a name is never parsed as HTML');
  ok(await page.evaluate(() => window.__x === undefined), 'no script ran from a name');
  ok((await page.$eval('#hList', e => e.textContent)).includes('<img'), 'name shown literally in the history');
  ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
  await closeGame(page);
}
// saved names are restored, corrupted ones ignored
{
  const { page } = await openGame(b, DESK, { storage: { 'scrabble.names': JSON.stringify({ v: 1, n: ['ليلى', null] }) } });
  ok((await names(page)).join('|') === 'ليلى|اللاعب الثاني', 'saved name restored on start'); await closeGame(page);
  const q = await openGame(b, DESK, { storage: { 'scrabble.names': '{"v":1,"n":["a","A"]}' } });
  ok((await names(q.page)).join('|') === 'اللاعب الأول|اللاعب الثاني', 'duplicate saved names fall back to defaults'); await closeGame(q.page);
  const w = await openGame(b, DESK, { storage: { 'scrabble.names': 'not json' } });
  ok((await names(w.page)).join('|') === 'اللاعب الأول|اللاعب الثاني', 'corrupted saved names fall back to defaults'); await closeGame(w.page);
}
// ---------- names: Settings ----------
{
  const { page } = await openGame(b, DESK);
  await page.click('#bSettings'); await page.waitForSelector('#ad[open]');
  await page.type('#nm0', 'Nour');
  ok((await names(page))[0] === 'Nour', 'Settings field applies as you type');
  await page.type('#nm1', 'nour');
  ok(await page.$eval('#nm1', e => e.getAttribute('aria-invalid')) === 'true' && (await names(page))[1] === 'nou', 'duplicate flagged in Settings; the last valid name (what was typed before it became a duplicate) stays');
  await page.$eval('#nm1', e => e.blur()); await page.$eval('#nm1', e => e.dispatchEvent(new Event('change')));
  ok(await page.$eval('#nm1', e => e.value === 'nou' && !e.hasAttribute('aria-invalid')), 'field settles on what was kept');
  await page.click('#aClose'); await closeGame(page);
}
// ---------- word flash ----------
{
  const { page } = await openGame(b, DESK);
  await page.evaluate(async () => {
    const { cur } = await import('/js/state.js'); const G = await import('/js/game.js');
    const [a, c, d] = cur().rack.filter(t => t && !t.blank);
    G.place(a, 7, 6); G.place(c, 7, 7); G.place(d, 7, 8); G.submit();
  });
  const f = await page.evaluate(() => [6, 7, 8].map(c => { const el = document.querySelector(`#board > [data-r="7"][data-c="${c}"]`); return { on: el.classList.contains('wf'), d: parseFloat(el.style.getPropertyValue('--wd')), x: el.getBoundingClientRect().x }; }));
  ok(f.every(x => x.on), 'every square of the scored word flashes');
  ok(f[0].d < f[1].d && f[1].d < f[2].d, 'delays grow along the word');
  ok(f[0].x > f[1].x && f[1].x > f[2].x, 'and run right to left on screen (reading order)');
  ok(await page.evaluate(() => document.querySelectorAll('.wf').length) === 3, 'only the scored squares flash');
  await page.waitForFunction(() => !document.querySelector('.wf'), { timeout: 4000 });
  ok(await page.evaluate(() => !document.querySelector('[style*="--wd"]')), 'delays cleaned up after the flash');
  // undo cancels
  await page.evaluate(async () => { const { cur } = await import('/js/state.js'); const G = await import('/js/game.js'); const t = cur().rack.find(t => t && !t.blank); G.place(t, 6, 7); G.submit(); });
  await page.evaluate(async () => (await import('/js/game.js')).undo());
  ok(await page.evaluate(() => !document.querySelector('.wf')), 'undo stops the flash');
  await closeGame(page);
}
// ---------- turn dot ----------
{
  const { page } = await openGame(b, DESK);
  const d = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#pn0 .pname'), '::before'), o = getComputedStyle(document.querySelector('#pn1 .pname'), '::before'); return { w: parseFloat(c.width), br: c.borderRadius, other: o.content }; });
  ok(d.w > 4 && d.w < 14 && d.br !== '0px', 'active player has a small round dot');
  ok(d.other === 'none' || d.other === 'normal', 'the other player has none');
  await page.click('#bPass');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('#pn1 .pname'), '::before').width !== 'auto'), 'the dot moves with the turn');
  await closeGame(page);
}
// ---------- fullscreen from Settings ----------
{
  const { page } = await openGame(b, DESK);
  ok(await page.$eval('#bFs', e => getComputedStyle(e).display) === 'none', 'Game Tools fullscreen stays hidden in the default layout');
  await page.click('#bSettings'); await page.waitForSelector('#ad[open]');
  ok(await page.$eval('#fsSet', e => e.offsetWidth > 0 && !e.hidden), 'Settings offers fullscreen in the default layout');
  await page.click('#fsSet').catch(() => {});
  await closeGame(page);
}
// ---------- haptics ----------
{
  const page0 = await openGame(b, PHONE);
  const { page } = page0;
  await page.evaluate(() => { window.__v = []; navigator.vibrate = p => { window.__v.push(p); return true; }; });
  ok(await page.$eval('#hpSec', e => !e.hidden), 'touch devices get the vibration switch');
  await page.touchscreen.tap(...(await page.$eval('#bPass', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })));
  await sleep(100);
  ok((await page.evaluate(() => window.__v)).length >= 1, 'a touch press vibrates');
  const n = (await page.evaluate(() => window.__v)).length;
  await page.evaluate(async () => { const { cur } = await import('/js/state.js'); const G = await import('/js/game.js'); const t = cur().rack.find(t => t && !t.blank); G.place(t, 7, 7); const { fail } = await import('/js/ui.js'); fail('x'); });
  ok((await page.evaluate(() => window.__v)).some(p => Array.isArray(p) && p[0] === 28), 'a refused move buzzes');
  // switch off
  await page.evaluate(async () => (await import('/js/game.js')).cancelSwapOrMove?.());
  await page.click('#bSettings'); await page.waitForSelector('#ad[open]');
  await page.click('#hpB button[data-v="false"]');
  ok(await store(page, 'scrabble.haptics') === 'off', 'switch saved');
  const m = (await page.evaluate(() => window.__v)).length;
  await page.touchscreen.tap(...(await page.$eval('#aClose', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })));
  await sleep(100);
  ok((await page.evaluate(() => window.__v)).length === m, 'nothing vibrates when switched off');
  await closeGame(page);
  const d = await openGame(b, DESK);
  ok(await d.page.$eval('#hpSec', e => e.hidden), 'desktop mouse users never see the switch');
  await d.page.evaluate(() => { window.__v = []; navigator.vibrate = p => window.__v.push(p); });
  await d.page.click('#bPass'); ok((await d.page.evaluate(() => window.__v)).length === 0, 'a mouse never vibrates');
  await closeGame(d.page);
}
await b.close();
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
