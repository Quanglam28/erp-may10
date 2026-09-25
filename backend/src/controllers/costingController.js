const { costingDetail, costingFilters, costingHistory, listCosting } = require('../services/costingService');
const {
  previewCosting,
  saveCosting,
  updateCostingDraft,
  deleteCostingDraft,
  approveCostingDraft,
} = require('../services/costingWriteService');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function text(q, k, m = 200) {
  const v = q[k];
  if (v === undefined) return '';
  if (typeof v !== 'string' || v.length > m) invalid(`Tham số ${k} không hợp lệ.`);
  return v.trim();
}

function id(v) {
  if (!/^[1-9]\d{0,18}$/.test(v)) invalid('ID không hợp lệ.');
  return v;
}

function day(q, k) {
  const v = text(q, k, 10);
  if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))) invalid(`Ngày ${k} không hợp lệ.`);
  return v;
}

function integer(q, k, f, m) {
  const v = text(q, k, 10);
  if (!v) return f;
  if (!/^\d+$/.test(v) || +v < 1 || +v > m) invalid(`Tham số ${k} không hợp lệ.`);
  return +v;
}

async function getCosting(req, res) {
  const allowed = ['q', 'objectId', 'status', 'from', 'to', 'page', 'pageSize'];
  if (Object.keys(req.query).some((k) => !allowed.includes(k))) invalid('Tham số không được hỗ trợ.');
  const from = day(req.query, 'from');
  const to = day(req.query, 'to');
  const objectId = text(req.query, 'objectId', 20);
  const status = text(req.query, 'status', 20);
  if (from && to && from > to) invalid('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  if (status && !['calculated', 'missing'].includes(status)) invalid('Trạng thái không hợp lệ.');
  res.set('Cache-Control', 'no-store').json(
    await listCosting({
      q: text(req.query, 'q'),
      objectId: objectId ? id(objectId) : '',
      status,
      from,
      to,
      page: integer(req.query, 'page', 1, 100000),
      pageSize: integer(req.query, 'pageSize', 20, 100),
    }),
  );
}

async function getCostingFilters(req, res) {
  res.set('Cache-Control', 'no-store').json(await costingFilters());
}

async function getCostingDetail(req, res) {
  const data = await costingDetail(id(req.params.id));
  if (!data) return res.status(404).json({ error: { message: 'Không tìm thấy đối tượng tính giá thành.' } });
  res.set('Cache-Control', 'no-store').json({ data });
}

async function postCostingPreview(req, res) {
  const data = await previewCosting(req.body);
  res.set('Cache-Control', 'no-store').json({ data });
}

async function postCostingSave(req, res) {
  try {
    const data = await saveCosting(req.body, req.user);
    res.status(201).set('Cache-Control', 'no-store').json({ data });
  } catch (error) {
    if (error.code === 'COSTING_SOURCE_CHANGED') {
      return res.status(409).json({ error: { message: error.message, code: error.code, details: error.details } });
    }
    throw error;
  }
}

async function getCostingHistory(req, res) {
  res.set('Cache-Control', 'no-store').json({ data: await costingHistory(id(req.params.id)) });
}

async function patchCostingDraft(req, res) {
  try {
    res.set('Cache-Control', 'no-store').json({ data: await updateCostingDraft(req.params.id, req.body, req.user) });
  } catch (error) {
    if (error.code === 'COSTING_SOURCE_CHANGED') {
      return res.status(409).json({ error: { message: error.message, code: error.code, details: error.details } });
    }
    throw error;
  }
}

async function removeCostingDraft(req, res) {
  await deleteCostingDraft(req.params.id, req.user);
  res.status(204).end();
}

async function postCostingApproval(req, res) {
  try {
    const data = await approveCostingDraft(req.params.id, req.user);
    res.set('Cache-Control', 'no-store').json({ data });
  } catch (error) {
    if (error.code === 'COSTING_SOURCE_CHANGED') {
      return res.status(409).json({ error: { message: error.message, code: error.code, details: error.details } });
    }
    throw error;
  }
}

module.exports = {
  getCosting,
  getCostingFilters,
  getCostingDetail,
  postCostingPreview,
  postCostingSave,
  getCostingHistory,
  patchCostingDraft,
  removeCostingDraft,
  postCostingApproval,
};
