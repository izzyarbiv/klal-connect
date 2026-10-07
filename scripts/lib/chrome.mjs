// Waiting for headless Chrome to be ready, and saying so when it never is.
//
// Every check had its own copy of this, and every copy waited ten seconds and
// then threw "no debug target" — true, and useless. Two things were wrong with
// it. Ten seconds is generous on an idle laptop and not generous at all on a
// two-core CI runner that is also running vite and the API server, so the
// checks failed for being early and looked like a browser that could not
// start. And Chrome was spawned with its stderr thrown away, so when it really
// did fail there was nothing to read: diagnosing it took four CI runs that
// each told us only that something had not happened.
import { setTimeout as sleep } from 'node:timers/promises';

/** Where Chrome is. CHROME_PATH so these can run somewhere other than a Mac. */
export const chromePath = () => process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** The flags every check launches with. */
export const chromeFlags = (port, profile) => [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  // Chrome falls back to a small /dev/shm in CI and dies part way through a
  // page; this makes it use /tmp instead. Harmless on a laptop.
  '--disable-dev-shm-usage',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
];

/**
 * The websocket URL of Chrome's page target, once it has one.
 *
 * `chrome` is the spawned process; pass it and its stderr ends up in the error
 * message rather than nowhere. Spawn it with stdio ['ignore','ignore','pipe'].
 */
export async function debugTarget(port, chrome, { timeoutMs = 60000 } = {}) {
  let stderr = '';
  chrome?.stderr?.on('data', (d) => { stderr += d; });
  let exited = null;
  chrome?.on?.('exit', (code, signal) => { exited = `chrome exited early (code ${code}, signal ${signal})`; });

  const deadline = Date.now() + timeoutMs;
  let lastSeen = '(never answered)';
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      lastSeen = JSON.stringify(list.map((t) => t.type));
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    if (exited) break;
    await sleep(250);
  }
  throw new Error(
    `Chrome never offered a page to drive after ${Math.round(timeoutMs / 1000)}s.\n` +
    `  binary:  ${chromePath()}\n` +
    `  port:    ${port}\n` +
    `  targets: ${lastSeen}\n` +
    (exited ? `  ${exited}\n` : '') +
    (stderr ? `  its own output:\n${stderr.split('\n').slice(-12).map((l) => '    ' + l).join('\n')}\n` : '  it printed nothing.\n')
  );
}
