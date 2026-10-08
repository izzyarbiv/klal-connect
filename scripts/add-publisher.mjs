// Let a collaborator publish to the live site by pushing to main:
//
//   npm run add-publisher -- eliepstein0817
//
// The deploy workflow keeps its list of people allowed to publish in two
// places — the deploy job and the job that explains why a push did not
// deploy — and GitHub Actions cannot share a value between job conditions.
// Editing both by hand, with a leading "!" on one of them, is exactly the kind
// of YAML nobody should do from a phone. This edits both consistently, checks
// the result still parses, and prints what changed. It does NOT commit or push:
// review the diff, then commit it yourself.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const file = '.github/workflows/deploy.yml';
const who = (process.argv[2] || '').trim();
if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(who)) {
  console.error('usage: npm run add-publisher -- <github-username>');
  process.exit(1);
}

let text = readFileSync(file, 'utf8');
const re = /fromJSON\('(\[[^']*\])'\), github\.actor/g;
const lists = [...text.matchAll(re)];
if (lists.length !== 2) {
  console.error(`Expected the publisher list in 2 places, found ${lists.length}. The workflow has changed shape; edit ${file} by hand.`);
  process.exit(1);
}
const current = JSON.parse(lists[0][1]);
if (current.includes(who)) { console.log(`${who} can already publish.`); process.exit(0); }

const next = JSON.stringify([...current, who]).replace(/","/g, '", "');
text = text.replace(re, `fromJSON('${next}'), github.actor`);
const doc = require('js-yaml').load(text); // refuse to write a file that no longer parses
if (!doc?.jobs?.deploy?.if || !doc.jobs['explain-no-deploy']?.if) throw new Error('Workflow no longer has both conditions.');
writeFileSync(file, text);
console.log(`${who} can now publish. Publishers: ${current.concat(who).join(', ')}`);
console.log('Review with `git diff`, then commit and push it.');
