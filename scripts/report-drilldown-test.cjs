const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../apps/web/lib/report-utils.ts');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, filename);
const { createReportExpenseMatcher, applyReportDrilldown, NO_SUBCATEGORY } = loaded.exports;

const context = {
  categories: [{ id: 'food', name: 'Food' }, { id: 'travel', name: 'Travel' }],
  subcategories: [{ id: 'meal', name: 'Meal', categoryId: 'food' }, { id: 'taxi', name: 'Taxi', categoryId: 'travel' }],
  accounts: [{ id: 'cash', name: 'Cash Wallet' }, { id: 'card', name: 'Rewards Card' }]
};
const all = { categoryId: 'all', subcategoryId: 'all', accountId: 'all', recurring: 'all', query: '' };
const transactions = [
  { id: 'dec-meal', type: 'expense', categoryId: 'food', subcategoryId: 'meal', accountId: 'cash', occurredOn: '2025-12-31', amount: 10.25, merchant: 'Lunch' },
  { id: 'jan-meal', type: 'expense', categoryId: 'food', subcategoryId: 'meal', accountId: 'cash', occurredOn: '2026-01-01', amount: 20.5, merchant: 'Lunch', isRecurring: true },
  { id: 'jan-card', type: 'expense', categoryId: 'food', subcategoryId: 'meal', accountId: 'card', occurredOn: '2026-01-02', amount: 30, notes: 'DINNER' },
  { id: 'jan-none', type: 'expense', categoryId: 'food', accountId: 'cash', occurredOn: '2026-01-03', amount: 5 },
  { id: 'jan-taxi', type: 'expense', categoryId: 'travel', subcategoryId: 'taxi', accountId: 'cash', occurredOn: '2026-01-03', amount: 8 },
  { id: 'income', type: 'income', categoryId: 'food', subcategoryId: 'meal', accountId: 'cash', occurredOn: '2026-01-04', amount: 200 },
  { id: 'archived', type: 'expense', categoryId: 'archived', accountId: 'archived', occurredOn: '2026-01-05', amount: 2 }
];
const select = filters => transactions.filter(createReportExpenseMatcher({ ...all, ...filters }, context));
const ids = filters => select(filters).map(tx => tx.id);
assert.deepEqual(ids({}), ['dec-meal', 'jan-meal', 'jan-card', 'jan-none', 'jan-taxi', 'archived']);
assert.deepEqual(ids({ subcategoryId: 'meal', query: '  LUNCH  ', accountId: 'cash' }), ['dec-meal', 'jan-meal']);
assert.deepEqual(ids({ subcategoryId: 'meal', query: 'lunch', accountId: 'cash', recurring: 'recurring' }), ['jan-meal']);
assert.deepEqual(ids({ subcategoryId: 'meal', query: 'lunch', recurring: 'manual' }), ['dec-meal']);
assert.deepEqual(ids({ query: 'dinner' }), ['jan-card']);
assert.deepEqual(ids({ query: 'Rewards Card' }), ['jan-card']);
assert.deepEqual(ids({ query: 'meal' }), ['dec-meal', 'jan-meal', 'jan-card']);
assert.deepEqual(ids({ query: 'food' }), ['dec-meal', 'jan-meal', 'jan-card', 'jan-none']);
assert.deepEqual(ids({ categoryId: 'food', subcategoryId: NO_SUBCATEGORY }), ['jan-none']);
assert.deepEqual(ids({ subcategoryId: NO_SUBCATEGORY }), ['jan-none', 'archived']);
assert.deepEqual(ids({ query: 'missing' }), []);

const current = { ...all, categoryId: 'food', subcategoryId: 'meal', accountId: 'cash', recurring: 'manual', query: 'Lunch' };
assert.deepEqual(applyReportDrilldown(current, { categoryId: 'food' }, context.subcategories), current);
assert.deepEqual(applyReportDrilldown(current, { categoryId: 'travel' }, context.subcategories), { ...current, categoryId: 'travel', subcategoryId: 'all' });
assert.deepEqual(applyReportDrilldown(current, { subcategoryId: 'taxi' }, context.subcategories), { ...current, categoryId: 'travel', subcategoryId: 'taxi' });
assert.deepEqual(applyReportDrilldown(current, { accountId: 'card' }, context.subcategories), { ...current, accountId: 'card' });
assert.deepEqual(applyReportDrilldown(current, { month: new Date(2025, 11, 1) }, context.subcategories), current);
assert.deepEqual(applyReportDrilldown(current, { date: '2026-01-01' }, context.subcategories), current);
assert.deepEqual(applyReportDrilldown(current, { categoryId: 'food', subcategoryId: NO_SUBCATEGORY }, context.subcategories), { ...current, subcategoryId: NO_SUBCATEGORY });

// Both sides of a year boundary consume the same filtered ledger, preserving cents.
const matching = select({ subcategoryId: 'meal', accountId: 'cash', query: 'Lunch' });
assert.equal(matching.filter(tx => tx.occurredOn.startsWith('2025-12')).reduce((sum, tx) => sum + tx.amount, 0), 10.25);
assert.equal(matching.filter(tx => tx.occurredOn.startsWith('2026-01')).reduce((sum, tx) => sum + tx.amount, 0), 20.5);
assert.equal(matching.filter(tx => tx.occurredOn.startsWith('2026-02')).length, 0);
console.log('PASS: Report expense filters, combined search/account/recurring selections, missing subcategories, compatible drill-down filters, and year-boundary amounts.');
