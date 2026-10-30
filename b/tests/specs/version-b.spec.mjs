// Version B: direct-labeled instruments.
import { test, expect, setRange, offline } from './helpers.mjs';
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.locator('#liveSource').filter({ hasText: /Live|Simulation/ }).waitFor({ timeout: 20_000 }); });

const ink = (page, sel) => page.locator(sel).evaluate(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });

test('supply chart draws and moves with the year slider', async ({ page, errors }) => {
  await page.locator('#supplyCanvas').scrollIntoViewIfNeeded();
  expect(await ink(page, '#supplyCanvas')).toBeGreaterThan(500);
  const before = await page.locator('#supplyCanvas').screenshot();
  await setRange(page, '#yIn', 2035.0);
  expect((await page.locator('#supplyCanvas').screenshot()).equals(before)).toBe(false);
});

test('shipped rows: dated marks run left to right in date order, undated ones sit in the gutter', async ({ page, errors }) => {
  const xs = await page.locator('.ship .srow:not(.later) .when i').evaluateAll(els => els.map(e => e.getBoundingClientRect().x));
  expect(xs.length).toBe(4);
  for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  const later = await page.locator('.ship .later .when b').evaluateAll(els => els.map(e => e.getBoundingClientRect().x));
  later.forEach(x => expect(x).toBeGreaterThan(xs[3]));
  const labels = await page.locator('.ship .when b').evaluateAll(els => els.map(e => { const b = e.getBoundingClientRect(); return b.right; }));
  const vw = page.viewportSize().width; labels.forEach(r => expect(r).toBeLessThanOrEqual(vw));
});

test('every live figure names its endpoint, and the read time shows', async ({ page, errors }) => {
  await expect(page.locator('#liveFacts li code')).toHaveCount(3);
  await expect(page.locator('#lfAt')).toContainText(/at \d{1,2}:\d{2}:\d{2}/, { timeout: 20_000 });
});

test('open questions read as rows on mobile without sideways scroll', async ({ page, errors }) => {
  const sc = page.locator('#c8 .scroll');
  expect(await sc.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
});

test('no numbered section kickers outside Moose', async ({ page, errors }) => {
  expect(await page.locator('section:not(#moose) .meta').filter({ hasText: /^\d · / }).count()).toBe(0);
});

test('offline: the read-time line says the network was not reached', async ({ browser }) => {
  const page = await browser.newPage(); await offline(page); await page.goto('/');
  await expect(page.locator('#lfAt')).toHaveText('The network could not be reached from this page.', { timeout: 20_000 });
  await page.close();
});
