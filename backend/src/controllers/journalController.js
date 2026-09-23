const { listJournals, journalFilters, journalDetail } = require('../services/journalService');
const { createJournalEntry, updateJournalEntry, approveJournalEntry } = require('../services/journalWriteService');
function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function text(query, key, max = 200) {
  const value = query[key];
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) invalid(`Tham số ${key} không hợp lệ.`);
  return value.trim();
}
function id(value) { if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) invalid('ID không hợp lệ.'); return value; }
function day(query, key) {
  const value = text(query, key, 10);
  if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01' || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) invalid(`Ngày ${key} không hợp lệ.`);
  return value;
}
function integer(query, key, fallback, max) { const value = text(query, key, 10); if (!value) return fallback; if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) invalid(`Tham số ${key} không hợp lệ.`); return Number(value); }
async function getJournals(req, res) {
  const allowed = ['q', 'documentId', 'accountId', 'status', 'from', 'to', 'page', 'pageSize'];
  if (Object.keys(req.query).some((key) => !allowed.includes(key))) invalid('Tham số không được hỗ trợ.');
  const from = day(req.query, 'from'), to = day(req.query, 'to');
  if (from && to && from > to) invalid('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  const documentId = text(req.query, 'documentId', 19), accountId = text(req.query, 'accountId', 19);
  res.set('Cache-Control', 'no-store').json(await listJournals({ q: text(req.query, 'q'), status: text(req.query, 'status'), documentId: documentId ? id(documentId) : '', accountId: accountId ? id(accountId) : '', from, to, page: integer(req.query, 'page', 1, 1000000), pageSize: integer(req.query, 'pageSize', 20, 100) }));
}
async function getJournalFilters(req, res) { res.set('Cache-Control', 'no-store').json(await journalFilters()); }
async function getJournal(req, res) { const data = await journalDetail(id(req.params.id)); if (!data) return res.status(404).json({ error: { message: 'Không tìm thấy bút toán.' } }); res.set('Cache-Control', 'no-store').json({ data }); }

async function postJournal(req, res) {
  if (!req.is('application/json') || !req.body || Array.isArray(req.body)) invalid('Dữ liệu gửi lên phải là JSON object.');
  const allowed = new Set(['documentId', 'debitAccountId', 'creditAccountId', 'amount', 'description']);
  if (Object.keys(req.body).some((key) => !allowed.has(key))) invalid('Dữ liệu chứa trường không được phép ghi.');
  const documentId = id(String(req.body.documentId ?? ''));
  const debitAccountId = id(String(req.body.debitAccountId ?? ''));
  const creditAccountId = id(String(req.body.creditAccountId ?? ''));
  if (debitAccountId === creditAccountId) invalid('Tài khoản Nợ và tài khoản Có phải khác nhau.');
  const amount = String(req.body.amount ?? '').trim();
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) invalid('Số tiền phải lớn hơn 0, tối đa 16 chữ số nguyên và 2 chữ số thập phân.');
  if (typeof req.body.description !== 'string' || !req.body.description.trim() || req.body.description.length > 10000) invalid('Diễn giải là bắt buộc và không được vượt quá 10.000 ký tự.');
  const data = await createJournalEntry({ documentId, debitAccountId, creditAccountId, amount, description: req.body.description.trim(), userId: req.user?.id });
  res.status(201).set('Cache-Control', 'no-store').json({ data });
}

async function patchJournal(req, res) {
  if (!req.is('application/json') || !req.body || Array.isArray(req.body)) invalid('Dữ liệu gửi lên phải là JSON object.');
  const allowed = new Set(['debitAccountId', 'creditAccountId', 'amount', 'description']);
  const keys = Object.keys(req.body);
  if (!keys.length || keys.some((key) => !allowed.has(key))) invalid('Chỉ được sửa tài khoản Nợ, tài khoản Có, số tiền hoặc diễn giải.');
  const data = {};
  if ('debitAccountId' in req.body) data.debitAccountId = id(String(req.body.debitAccountId ?? ''));
  if ('creditAccountId' in req.body) data.creditAccountId = id(String(req.body.creditAccountId ?? ''));
  if ('amount' in req.body) {
    const amount = String(req.body.amount ?? '').trim();
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) invalid('Số tiền phải lớn hơn 0, tối đa 16 chữ số nguyên và 2 chữ số thập phân.');
    data.amount = amount;
  }
  if ('description' in req.body) {
    if (typeof req.body.description !== 'string' || !req.body.description.trim() || req.body.description.length > 10000) invalid('Diễn giải là bắt buộc và không được vượt quá 10.000 ký tự.');
    data.description = req.body.description.trim();
  }
  res.set('Cache-Control', 'no-store').json({ data: await updateJournalEntry(id(req.params.id), data) });
}

async function approveJournal(req, res) {
  const journalId = id(req.params.id);
  const data = await approveJournalEntry(journalId, req.user);
  res.json({ data });
}

module.exports = { getJournals, getJournalFilters, getJournal, postJournal, patchJournal, approveJournal };
