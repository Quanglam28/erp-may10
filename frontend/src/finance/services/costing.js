import { financeFetch } from './http.js';

function canceled(error, signal) {
  return signal?.aborted || error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
}

async function request(path, options = {}) {
  let response;
  try {
    response = await financeFetch(`/api/costing${path}`, options);
  } catch (error) {
    if (canceled(error, options.signal)) return undefined;
    throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.');
  }
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || (!body && response.status !== 204)) {
    const error = new Error(
      response.status < 500
        ? body?.error?.message || 'Yêu cầu không hợp lệ.'
        : 'Không xử lý được dữ liệu giá thành.'
    );
    error.status = response.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details;
    throw error;
  }
  return body;
}

const read = (path, signal) => request(path, { signal });
const write = (path, payload, method = 'POST') =>
  request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const fetchCosting = (query, signal) => read(`?${new URLSearchParams(query)}`, signal);
export const fetchCostingFilters = (signal) => read('/filters', signal);
export const fetchCostingDetail = (id, signal) => read(`/${encodeURIComponent(id)}`, signal);
export const previewCosting = (payload) => write('/preview', payload);
export const saveCosting = (payload) => write('/save', payload);
export const fetchCostingHistory = (id, signal) => read(`/${encodeURIComponent(id)}/history`, signal);
export const updateCostingDraft = (id, payload) => write(`/results/${encodeURIComponent(id)}`, payload, 'PATCH');
export const deleteCostingDraft = (id) => request(`/results/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const approveCostingDraft = (id) => request(`/results/${encodeURIComponent(id)}/approve`, { method: 'POST' });
