import { chromium, Page, Browser, BrowserContext, Frame, Request, Response } from 'playwright';

type QueryInput = {
  message: string;
  sessionId: string;
};

type QueryOutput = {
  response: string;
  intent?: string | null;
  confidence?: number | null;
};

type WidgetContext = Record<string, string | number | boolean | null | undefined>;

const FORETHOUGHT_WIDGET_SRC = 'https://solve-widget.forethought.ai/embed.js';
const DEFAULT_REPLY_TIMEOUT_MS = Number(process.env.FT_REPLY_TIMEOUT_MS ?? 9000);
const HEADLESS = String(process.env.PLAYWRIGHT_HEADLESS ?? 'true') !== 'false';

export class ForethoughtService {
  private apiKey: string;
  private baseContext: WidgetContext;

  constructor(opts?: { apiKey?: string; baseContext?: WidgetContext }) {
    this.apiKey = opts?.apiKey ?? process.env.FORETHOUGHT_WIDGET_API_KEY ?? '';
    if (!this.apiKey) {
      throw new Error('FORETHOUGHT_WIDGET_API_KEY missing in env or constructor.');
    }
    this.baseContext = opts?.baseContext ?? {};
    console.log(`[FT] ForethoughtService MODE=widget | apiKey? ${Boolean(this.apiKey)} | baseCtxKeys=${Object.keys(this.baseContext).length}`);
  }

  async queryKnowledgeBase(input: QueryInput): Promise<QueryOutput> {
    console.log('[FT] queryKnowledgeBase(widget) →', { msg: input.message.slice(0, 80), ctxKeys: Object.keys(this.baseContext) });

    const browser: Browser = await chromium.launch({ headless: HEADLESS });
    const context: BrowserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1200, height: 900 }
    });
    const page = await context.newPage();

    let parsedIntent: string | null = null;
    let parsedConfidence: number | null = null;

    const tap = async (req: Request) => {
      try {
        const res: Response | null = await req.response();
        if (!res) return;
        const url = req.url();
        if (!/forethought|solve/i.test(url)) return;

        const ct = res.headers()['content-type'] || '';
        if (!/application\/json|text\/json/i.test(ct)) return;

        const text = await res.text();
        if (!text) return;

        try {
          const json = JSON.parse(text);
          if (typeof json?.intent === 'string') parsedIntent = json.intent;
          const conf = Number(json?.confidence);
          if (!Number.isNaN(conf)) parsedConfidence = conf;
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
    };

    page.on('requestfinished', tap);

    try {
      const html = this.renderHarness(this.apiKey, {
        ...this.baseContext,
        'data-ft-Workflow-Tag':
          this.baseContext['data-ft-Workflow-Tag'] ?? process.env.DEFAULT_WORKFLOW_TAG
      });

      const dataUrl = 'data:text/html;base64,' + Buffer.from(html, 'utf8').toString('base64');
      await page.goto(dataUrl, { waitUntil: 'domcontentloaded' });

      await this.openWidgetUI(page);

      const frame = await this.findWidgetFrame(page);
      if (!frame) throw new Error('Could not locate Forethought widget iframe');

      await this.sendUserMessage(frame, input.message);

      const assistantText = await this.readAssistantReply(frame, DEFAULT_REPLY_TIMEOUT_MS);
      const cleaned = (assistantText || '').trim() || '(no reply)';

      if (parsedIntent == null || parsedConfidence == null) {
        const domParsed = await this.tryExtractIntentAndConfidence(frame);
        if (parsedIntent == null) parsedIntent = domParsed.intent;
        if (parsedConfidence == null) parsedConfidence = domParsed.confidence;
      }

      return { response: cleaned, intent: parsedIntent, confidence: parsedConfidence };
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  }

  // ---------------- helpers ----------------

  private renderHarness(apiKey: string, ctx: WidgetContext) {
    const attrs: string[] = [
      `src="${FORETHOUGHT_WIDGET_SRC}"`,
      `id="forethought-widget-embed-script"`,
      `data-api-key="${this.escape(String(apiKey))}"`
    ];

    for (const [k, v] of Object.entries(ctx)) {
      if (v === undefined || v === null) continue;
      const sv = String(v);
      if (!sv.length) continue;
      const key = k.startsWith('data-') ? k : `data-${k}`;
      attrs.push(`${key}="${this.escape(sv)}"`);
    }

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>FT Harness</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>html,body{height:100%}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}</style>
  </head>
  <body>
    <script ${attrs.join(' ')}></script>
  </body>
</html>`;
  }

  private escape(s: string) {
    return s.replace(/"/g, '&quot;');
  }

  private async openWidgetUI(page: Page) {
    await page.waitForTimeout(1000);
    const openers = [
      'button[aria-label*="chat" i]',
      'button:has-text("Help")',
      '#forethought-button',
      'button:has-text("Support")',
      'button:has-text("Chat")',
      'div[role="button"]'
    ];
    for (const sel of openers) {
      const btn = await page.$(sel);
      if (btn) {
        try { await btn.click({ timeout: 500 }); break; } catch { /* try next */ }
      }
    }
    await page.waitForTimeout(600);
  }

  private async findWidgetFrame(page: Page): Promise<Frame | null> {
    for (let i = 0; i < 12; i++) {
      const frames = page.frames();
      const f = frames.find(fr =>
        /forethought|solve|widget/i.test(fr.url()) || /forethought|chat|solve/i.test(fr.name())
      );
      if (f) return f;
      await page.waitForTimeout(250);
    }
    return null;
  }

  private async sendUserMessage(frame: Frame, text: string) {
    const inputSelectors = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '[role="textbox"]'
    ];
    for (const sel of inputSelectors) {
      const el = await frame.$(sel);
      if (!el) continue;

      await el.click({ delay: 10 }).catch(() => {});
      try { await (el as any).fill?.(''); } catch {}
      await el.type(text, { delay: 8 });

      await el.press('Enter').catch(() => {});
      const sendBtn =
        (await frame.$('button[aria-label*="send" i]')) ||
        (await frame.$('button:has-text("Send")'));
      if (sendBtn) await sendBtn.click().catch(() => {});
      return;
    }
    throw new Error('Widget message input not found.');
  }

  private async readAssistantReply(frame: Frame, timeoutMs: number): Promise<string | null> {
    const start = Date.now();
    let lastLongest = '';

    while (Date.now() - start < timeoutMs) {
      const selectors = [
        '[class*="assistant"]',
        '[class*="bot"]',
        '[class*="message"]',
        '[class*="bubble"]',
        '[data-role="assistant"]'
      ];

      let texts: string[] = [];
      for (const sel of selectors) {
        const nodes = await frame.$$(sel);
        for (const n of nodes) {
          const t = (await n.textContent())?.trim();
          if (t && t.length > 2) texts.push(t);
        }
      }

      if (!texts.length) {
        const nodes = await frame.$$('div, p, span');
        for (const n of nodes) {
          const cls = (await n.getAttribute('class')) || '';
          if (/assistant|bot|reply|message|bubble/i.test(cls)) {
            const t = (await n.textContent())?.trim();
            if (t && t.length > 2) texts.push(t);
          }
        }
      }

      const candidate = texts.sort((a, b) => b.length - a.length)[0];
      if (candidate && candidate.length >= lastLongest.length) lastLongest = candidate;

      if (lastLongest.length > 10) {
        await frame.waitForTimeout(350);
        return lastLongest;
      }
      await frame.waitForTimeout(180);
    }
    return lastLongest || null;
  }

  private async tryExtractIntentAndConfidence(
    frame: Frame
  ): Promise<{ intent: string | null; confidence: number | null }> {
    const candidates = await frame.$$('div, span');
    for (const el of candidates) {
      const txt = (await el.textContent())?.trim() || '';
      const m = txt.match(/intent[:\s]+([a-zA-Z0-9_ -]+)\s*\((0\.\d+|1(?:\.0)?)\)/i);
      if (m) return { intent: m[1].trim(), confidence: parseFloat(m[2]) };
    }
    return { intent: null, confidence: null };
  }
}