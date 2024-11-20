import { chromium, firefox, devices, type Page } from "playwright";
import { test, expect, Browser } from '@playwright/test';
import assert from 'node:assert';

// const URL = "https://meet.lukas-coding.us";
const URL = "http://localhost:5173/?mock";

async function waitForStableVideo(page: Page, peerId: string, timeoutMs: number, delayMs = 0) {
  // return page.waitForFunction(({ peerId, durationSeconds }) => {
  //   const video = document.querySelector(`video[data-testid=${peerId}]`) as HTMLVideoElement;
  //   return !!video && !video.paused && video.currentTime > durationSeconds;
  // }, { peerId, durationSeconds });

  const video = page.getByTestId(peerId);
  const start = performance.now();

  while ((performance.now() - start) < timeoutMs) {
    try {
      expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
      expect(await video.evaluate((v: HTMLVideoElement) => v.ended)).toBe(false);
      expect(await video.evaluate((v: HTMLVideoElement) => v.readyState)).toBe(4);
      await page.waitForTimeout(delayMs).catch(() => { });
      return;
    } catch (_e) {
      await page.waitForTimeout(1000).catch(() => { });
    }
  }

  throw new Error("waitForStableVideo timeout");
}

async function connect(page: Page, peerId: string, otherPeerId: string) {
  await page.getByPlaceholder('You').click();
  await page.getByPlaceholder('You').fill(peerId);
  await waitForStableVideo(page, peerId, 5_000);

  await page.getByRole('button', { name: 'Go Live' }).click();
  await page.getByPlaceholder('Other').click();
  await page.getByPlaceholder('Other').fill(otherPeerId);
  await page.getByRole('button', { name: 'Connect' }).click();
  await waitForStableVideo(page, otherPeerId, 10_000, 5_000);

  await page.getByRole('button', { name: 'Stop' }).click();
}

function launchChromium() {
  return chromium.launch({
    args: ['--disable-web-security',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  })
}

function launchFirefox() {
  return firefox.launch({
    firefoxUserPrefs: {
      'media.navigator.streams.fake': true,
      'media.navigator.permission.disabled': true,
    }
  })
}

function getAllPairs<T>(list: T[]): [T, T][] {
  const pairs: [T, T][] = [];

  for (let i = 0; i < list.length; i++) {
    for (let j = i; j < list.length; j++) {
      pairs.push([list[i], list[j]]);
    }
  }

  return pairs;
}

interface BrowserInfo {
  name: string;
  builder: () => Promise<Browser>;
}

function randId() {
  return Math.floor(Math.random() * 2 ** 32);
}

// test.describe("basic", () => {
//   const browsers: BrowserInfo[] = [
//     { name: "chromium", builder: launchChromium },
//     { name: "firefox", builder: launchFirefox },
//   ];
//   const pairs = getAllPairs(browsers);
//
//   for (const p of pairs) {
//     const [browserA, browserB] = p;
//
//
//     // test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0' });
//     test(`${browserA.name}_${browserB.name}`, async ({ }) => {
//       // const bA = await browserA.builder();
//       const bB = await browserB.builder();
//       // const contextA = await bA.newContext();
//       const contextB = await bB.newContext();
//
//       // const pageA = await contextA.newPage();
//       const pageB = await contextB.newPage();
//
//       // await pageA.goto(URL);
//       await pageB.goto(URL);
//
//       // const peerA = `__${browserA.name}_${bA.version()}_${randId()}`;
//       const peerA = "a";
//       const peerB = `__${browserB.name}_${bB.version()}_${randId()}`;
//       await Promise.all([
//         // connect(pageA, peerA, peerB),
//         connect(pageB, peerB, peerA)
//       ]);
//     });
//   }
// });

test(`connect`, async ({ browser, browserName }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(URL);

  const peerA = "a";
  const peerB = `__${browserName}_${randId()}`;
  await connect(page, peerB, peerA);
});
