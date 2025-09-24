import { chromium, Page, Browser, BrowserContext } from 'playwright';
import fs from 'fs';
import path from 'path';

type WidgetContext = Record<string, string | number | boolean | null | undefined>;

export interface WidgetRunConfig {
  apiKey: string;                  // from ENV
  widgetContext?: WidgetContext;   // data-ft-* attributes
  startMessage: string;            // first user message
  maxTurns?: number;               // default 8–15
  delayBetweenTurnsMs?: number;    // default 1500–2500
  logNetwork?: boolean;
}

export interface WidgetTurn {
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: number;
}

export interface WidgetRunResult {
  turns: WidgetTurn[];
  errors: string[];
  networkEvents: Array<{ url: string; method: string; status?: number; bodyPreview?: string }>;
}

const HARNESS_FILE = path.resolve(__dirname, '../../automation/widgetHarness.html');

function renderHarness(apiKey: string, context: WidgetContext) {
  const raw = fs.readFileSync(HARNESS_FILE, 'utf8');
  return raw
    .replace('__API_KEY__', apiKey)
    .replace('__WIDGET_CONTEXT__', JSON.stringify(context ?? {}));
}

async function openHarness(page: Page, html: string) {
  // Serve as a data URL so we don't need an HTTP server
  const dataUrl = 'data:text/html;base64,' + Buffer.from(html, 'utf8').toString('base64');
  await page.goto(dataUrl);
}

async function openWidgetUI(page: Page) {
  // Many widget launchers inject a floating button – click it if present
  // Fallback: if frame is already present, skip.
  await page.waitForTimeout(800); // allow script to load
  const openers = [
    'button[aria-label*="chat"]',
    'button:has-text("Help")',
    'div[role="button"]',
    '#forethought-button',
  ];
  for (const sel of openers) {
    const btn = await page.$(sel);
    if (btn) {
      try { await btn.click({ timeout: 500 }); } catch {}
    }
  }
}

async function getChatIframe(page: Page) {
  // Try to find the Forethought iframe by src or title
  const frames = page.frames();
  const f = frames.find(fr =>
    /forethought|solve-widget|widget/i.test(fr.url()) || /chat|forethought/i.test(fr.name())
  );
  return f ?? null;
}

async function sendUserMessage(frame: Page['mainFrame'], text: string) {
  // Heuristics for input + send
  const selectors = [
    'textarea', 'input[type="text"]', '[contenteditable="true"]'
  ];
  for (const sel of selectors) {
    const el = await frame.$(sel);
    if (el) {
      await el.click();
      await el.fill('');
      await el.type(text);
      // Try Enter or a send button
      await el.press('Enter').catch(() => {});
      const sendBtn = await frame.$('button:has-text("Send"), button[aria-label*="send"]');
      if (sendBtn) await sendBtn.click().catch(() => {});
      return;
    }
  }
  throw new Error('Could not locate message input UI in widget.');
}

async function readLatestAssistantBubbles(frame: Page['mainFrame']) {
  // Generic capture of bot messages – refine selectors if you know them
  const candidates = await frame.$$('div, p, span');
  const texts: string[] = [];
  for (const el of candidates) {
    const cls = (await el.getAttribute('class')) || '';
    if (/assistant|bot|message|bubble/i.test(cls)) {
      const t = (await el.textContent())?.trim();
      if (t) texts.push(t);
    }
  }
  // Return the longest few to avoid system/UI noise
  return texts.sort((a,b)=>b.length-a.length).slice(0,3);
}

export async function runWidgetConversation(cfg: WidgetRunConfig): Promise<WidgetRunResult> {
  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext();
  const page = await context.newPage();

  const result: WidgetRunResult = { turns: [], errors: [], networkEvents: [] };

  // Network taps (best-effort insight)
  if (cfg.logNetwork) {
    page.on('requestfinished', async req => {
      try {
        const res = await req.response();
        const body = await res?.text();
        result.networkEvents.push({
          url: req.url(),
          method: req.method(),
          status: res?.status(),
          bodyPreview: body?.slice(0, 400),
        });
      } catch {}
    });
  }

  try {
    const html = renderHarness(cfg.apiKey, cfg.widgetContext ?? {});
    await openHarness(page, html);
    await openWidgetUI(page);

    const frame = await getChatIframe(page);
    if (!frame) throw new Error('Could not find Forethought widget iframe.');

    // Turn 1 (user)
    result.turns.push({ role: 'user', text: cfg.startMessage, ts: Date.now() });
    await sendUserMessage(frame, cfg.startMessage);

    // Read up to maxTurns, alternating user-bot using your LLM service upstream
    const maxTurns = cfg.maxTurns ?? 10;
    for (let i = 0; i < maxTurns; i++) {
      await page.waitForTimeout(cfg.delayBetweenTurnsMs ?? 1800);
      const bubbles = await readLatestAssistantBubbles(frame);
      const botReply = bubbles?.[0];
      if (botReply) {
        result.turns.push({ role: 'assistant', text: botReply, ts: Date.now() });
        // exit early if widget surfaced a resolution/ended state
        if (/resolved|anything else|glad i could/i.test(botReply)) break;
        // Leave generation of the *next user message* to your existing LLM service
        break; // Return after first reply so TestRunner can decide next turn
      }
    }
  } catch (err: any) {
    result.errors.push(err?.message || String(err));
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
  return result;
}