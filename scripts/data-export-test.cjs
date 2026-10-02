const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}

const { buildDataExport, exportTransactionsCsv, exportFilename, resolveExportPeriod } = loadTs('apps/web/lib/data-export.ts');
const { fetchAllRows } = loadTs('packages/shared/src/pagination.ts');
const data = {
  accounts: [{ id: 'a', name: 'Cash', type: 'cash', openingBalance: 100, color: '#fff' }],
  categories: [{ id: 'c', name: 'Food', kind: 'expense', icon: 'tag', color: '#fff', monthlyBudget: 500 }],
  subcategories: [{ id: 's', categoryId: 'c', name: 'Lunch' }],
  budgets: [{ id: 'b1', categoryId: 'c', month: '2024-02-01', amount: 400 }, { id: 'b2', categoryId: 'c', month: '2024-03-01', amount: 450 }],
  recurringRules: [{ id: 'r', accountId: 'a', categoryId: 'c', type: 'expense', amount: 30, merchant: 'Bill', frequency: 'monthly', nextDueOn: '2025-01-01', autoCreate: false }],
  goals: [{ id: 'g', name: 'Savings', targetAmount: 1000, currentAmount: 10, targetDate: '2025-01-01', color: '#fff' }],
  transactions: [
    { id: '1', accountId: 'a', categoryId: 'c', subcategoryId: 's', type: 'expense', amount: 0.1, occurredOn: '2024-02-01', notes: 'ထမင်း, "lunch"\nsecond line' },
    { id: '2', accountId: 'a', categoryId: 'c', type: 'expense', amount: 0.2, occurredOn: '2024-02-29', merchant: '=HYPERLINK("bad")', isRecurring: true, recurringRuleId: 'r', recurringDueOn: '2024-02-29' },
    { id: '3', accountId: 'a', type: 'income', amount: 100, occurredOn: '2024-03-01' },
    { id: '4', accountId: 'archived', categoryId: 'archived', subcategoryId: 'archived', type: 'expense', amount: 5, occurredOn: '2023-12-31' }
  ]
};
const options = { source: 'personal', usingCachedData: false, pendingChanges: 0, exportedAt: '2026-10-02T00:00:00Z' };

(async () => {
  assert.deepEqual(resolveExportPeriod({ mode: 'months', from: '2024-02', to: '2024-02' }), { startDate: '2024-02-01', endDate: '2024-02-29', label: '2024-02-01 to 2024-02-29' });
  assert.equal(resolveExportPeriod({ mode: 'months', from: '2025-12', to: '2026-01' }).endDate, '2026-01-31');
  for (const period of [{ mode: 'months', from: '', to: '2024-02' }, { mode: 'months', from: '2024-13', to: '2025-01' }, { mode: 'dates', from: '2023-02-29', to: '2024-01-01' }, { mode: 'dates', from: '2024-03-02', to: '2024-03-01' }, { mode: 'dates', from: '0000-01-01', to: '2024-01-01' }]) assert.throws(() => resolveExportPeriod(period));
  const feb = buildDataExport(data, { mode: 'months', from: '2024-02', to: '2024-02' }, options);
  assert.deepEqual(feb.transactions.map(tx => tx.id), ['1', '2']);
  assert.deepEqual(feb.summary.totals, { transactionCount: 2, income: 0, expenses: 0.3, net: -0.3 });
  assert.equal(feb.transactions[0].categoryName, 'Food');
  assert.equal(feb.transactions[0].subcategoryName, 'Lunch');
  assert.equal(feb.transactions[0].accountName, 'Cash');
  assert.equal(feb.summary.byMonth[0].expenses, 0.3);
  assert.equal(feb.summary.byCategory[0].expenses, 0.3);
  assert.equal(feb.summary.bySubcategory.length, 2);
  assert.equal(feb.summary.byAccount[0].expenses, 0.3);
  assert.equal(feb.budgets.length, 1);
  assert.equal(feb.goals.length, 1, 'Goals must remain current context despite a selected period');
  assert.equal(feb.recurringRules.length, 1);
  assert.equal(feb.transactions[1].recurringRuleId, 'r');
  const all = buildDataExport(data, { mode: 'all' }, options);
  assert.equal(all.transactions.length, 4);
  assert.equal(all.budgets.length, 2);
  assert.equal(all.summary.totals.net, 94.7);
  assert.equal(all.transactions[0].categoryName, 'Unknown or archived category');
  assert.equal(all.transactions[3].categoryName, 'Uncategorized');
  const oneDay = buildDataExport(data, { mode: 'dates', from: '2024-02-29', to: '2024-02-29' }, options);
  assert.deepEqual(oneDay.transactions.map(tx => tx.id), ['2']);
  assert.equal(exportFilename(oneDay, 'json'), 'athonesayate-2024-02-29_to_2024-02-29.json');
  const empty = buildDataExport(data, { mode: 'dates', from: '2030-01-01', to: '2030-01-01' }, options);
  assert.deepEqual(empty.summary.totals, { transactionCount: 0, income: 0, expenses: 0, net: 0 });
  assert.equal(empty.transactions.length, 0);
  const csv = exportTransactionsCsv(feb);
  assert(csv.startsWith('\uFEFFid,date,type,amount,currency,'));
  assert(csv.includes('"Food","s","Lunch"'));
  assert(csv.includes('"ထမင်း, ""lunch""\nsecond line"'));
  assert(csv.includes('"\'=HYPERLINK(""bad"")"'), 'Formula-like text must be neutralized');
  assert(csv.includes('"true","r","2024-02-29","personal"'));
  assert.equal(exportFilename(buildDataExport(data, { mode: 'all' }, { ...options, source: 'demo' }), 'csv'), 'athonesayate-sample-all-data.csv');
  const manyRows = Array.from({ length: 1250 }, (_, id) => ({ id }));
  const calls = [];
  const paged = await fetchAllRows(async (from, to) => { calls.push([from, to]); return { data: manyRows.slice(from, to + 1), error: null }; });
  assert.deepEqual(paged.data, manyRows);
  assert.deepEqual(calls, [[0, 499], [500, 999], [1000, 1499]]);
  const failed = await fetchAllRows(async from => from ? { data: null, error: { message: 'Network failed' } } : { data: manyRows.slice(0, 500), error: null });
  assert.equal(failed.data, null, 'A failed later page must never produce a partial export');
  assert.equal(failed.error.message, 'Network failed');
  console.log('PASS: Inclusive export ranges, leap dates, categorization, precise totals, context, CSV escaping and complete paginated history.');
})().catch(error => { console.error(error); process.exitCode = 1; });
