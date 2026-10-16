// Directory search: plurals, typos, synonyms, places, and every word counting.
import assert from 'node:assert/strict';
import { searchDirectory } from './search.js';

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log(`  ok   ${name}`); };
let n = 0;
const L = (name, category, subcategory, city, state, more = {}) => ({ id: `p${++n}`, name, category, subcategory, city, state, ...more });
const P = [
  L('Yokey Industries', 'Food & Catering', 'Factory / Co-packer', 'Miami', 'FL'),
  L('Elite Fish Wholesale', 'Food & Catering', 'Wholesale', 'Los Angeles', 'CA'),
  L('Mega Kosher Distribution', 'Food & Catering', 'Wholesale', 'Pompano Beach', 'FL', { tagline: 'Kosher food distributor' }),
  L('Levindale', 'Health', 'Nursing Home & Rehab', 'Baltimore', 'MD'),
  L('Atria', 'Health', 'Assisted Living', 'Boca Raton', 'FL'),
  L('Kings Highway Glatt', 'Food & Catering', 'Butcher', 'Brooklyn', 'NY'),
  L('Pita Pan Bakery', 'Food & Catering', 'Bakery', 'Boca Raton', 'FL'),
  L('Queens Bagels', 'Food & Catering', 'Bakery', 'Flushing', 'NY'),
  L('Chefah Catering', 'Food & Catering', 'Caterer', 'Lawrence', 'NY'),
  L('Burger Spot', 'Food & Catering', 'Restaurant', 'Flushing', 'NY'),
  L('Shalom Pizza', 'Food & Catering', 'Pizza', 'Los Angeles', 'CA'),
  L('Cajun Kosher', 'Food & Catering', 'Restaurant', 'New Orleans', 'LA'),
  L('La Vela Coffee', 'Food & Catering', 'Cafe', 'Miami Gardens', 'FL'),
  L('Chai Lifeline', 'Health', 'Support', 'Nationwide', '', { service_areas: ['Nationwide'] }),
];
const names = (q, where = '') => searchDirectory(P, { q, where }).results.sort((a, b) => b.score - a.score).map((r) => r.provider.name);

ok('plurals find the singular', () => {
  assert.deepEqual(names('factories'), ['Yokey Industries']);
  assert.deepEqual(names('butchers'), ['Kings Highway Glatt']);
});
ok('synonyms: wholesaler, distributor, senior home', () => {
  assert.deepEqual(names('wholesaler').sort(), ['Elite Fish Wholesale', 'Mega Kosher Distribution']);
  assert.deepEqual(names('senior home').sort(), ['Atria', 'Levindale']);
  assert.deepEqual(names('nursing homes').sort(), ['Atria', 'Levindale']);
});
ok('small typos are corrected and said', () => {
  assert.deepEqual(names('bakrey').sort(), ['Pita Pan Bakery', 'Queens Bagels']);
  assert.deepEqual(names('butchr'), ['Kings Highway Glatt']);
  assert.ok(names('resturant').includes('Burger Spot'));
  assert.equal(searchDirectory(P, { q: 'bakrey' }).parsed.corrected, 'bakery');
});
ok('caterer finds caterers, not every Food & Catering listing', () => {
  assert.deepEqual(names('caterer'), ['Chefah Catering']);
});
ok('FL is Florida, not Flushing', () => {
  const fl = names('', 'FL');
  assert.ok(fl.includes('Pita Pan Bakery') && !fl.includes('Queens Bagels') && !fl.includes('Burger Spot'));
});
ok('LA is Los Angeles, not Louisiana; NYC covers Flushing', () => {
  const la = names('', 'LA');
  assert.ok(la.includes('Shalom Pizza') && !la.includes('Cajun Kosher'));
  assert.ok(names('', 'NYC').includes('Queens Bagels'));
  assert.ok(names('', 'Louisiana').includes('Cajun Kosher'));
});
ok('every word counts: wholesale food, bakery Boca Raton, pizza LA', () => {
  assert.equal(names('wholesale food')[0], 'Mega Kosher Distribution');
  assert.ok(names('wholesale food').includes('Elite Fish Wholesale'));
  assert.deepEqual(names('bakery Boca Raton'), ['Pita Pan Bakery']);
  assert.deepEqual(names('pizza LA'), ['Shalom Pizza']);
  assert.deepEqual(names('la vela'), ['La Vela Coffee']);
});
ok('a blank place is everywhere, and nationwide listings serve every place', () => {
  assert.equal(names('').length, P.length);
  assert.ok(names('', 'Boca Raton').includes('Chai Lifeline'));
  assert.ok(names('', 'Boca').includes('Pita Pan Bakery'));
});
console.log(`\n${passed} passed`);
