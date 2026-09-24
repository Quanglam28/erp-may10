import api from './api';

// 1. Dashboard
export const getProductionDashboard = () =>
  api.get('/production/dashboard').then((res) => res.data.data);

// 2. Kế hoạch sản xuất (Production Plans)
export const getProductionPlans = (params) =>
  api.get('/production/plans', { params }).then((res) => res.data);

export const getProductionPlanDetail = (id) =>
  api.get(`/production/plans/${id}`).then((res) => res.data.data);

export const createProductionPlan = (data) =>
  api.post('/production/plans', data).then((res) => res.data);

export const updateProductionPlan = (id, data) =>
  api.put(`/production/plans/${id}`, data).then((res) => res.data);

export const approveProductionPlan = (id) =>
  api.post(`/production/plans/${id}/approve`).then((res) => res.data);

export const pauseProductionPlan = (id) =>
  api.post(`/production/plans/${id}/pause`).then((res) => res.data);

export const cancelProductionPlan = (id, reason) =>
  api.post(`/production/plans/${id}/cancel`, { ly_do: reason }).then((res) => res.data);

// 3. Định mức nguyên liệu (BOM)
export const getBoms = (params) =>
  api.get('/production/boms', { params }).then((res) => res.data);

export const createBom = (data) =>
  api.post('/production/boms', data).then((res) => res.data);

export const updateBom = (id, data) =>
  api.put(`/production/boms/${id}`, data).then((res) => res.data);

// 4. Lệnh sản xuất (Production Orders - LSX)
export const getProductionOrders = (params) =>
  api.get('/production/orders', { params }).then((res) => res.data);

export const getProductionOrderDetail = (id) =>
  api.get(`/production/orders/${id}`).then((res) => res.data.data);

export const createProductionOrder = (data) =>
  api.post('/production/orders', data).then((res) => res.data);

export const startProductionOrder = (id) =>
  api.post(`/production/orders/${id}/start`).then((res) => res.data);

export const pauseProductionOrder = (id) =>
  api.post(`/production/orders/${id}/pause`).then((res) => res.data);

export const getOrderStages = (orderId) =>
  api.get(`/production/orders/${orderId}/stages`).then((res) => res.data.data);

export const recordProductionResult = (orderId, data) =>
  api.post(`/production/orders/${orderId}/results`, data).then((res) => res.data);

export const getOrderReconciliation = (orderId) =>
  api.get(`/production/orders/${orderId}/reconciliation`).then((res) => res.data.data);

// 5. Hoạch định nhu cầu nguyên liệu (MRP)
export const calculateMrp = (planId) =>
  api.get('/production/mrp', { params: { ke_hoach_id: planId } }).then((res) => res.data.data);

export const getMrpRequirements = (params) =>
  api.get('/production/mrp/requirements', { params }).then((res) => res.data);

export const createPrFromMrp = (data) =>
  api.post('/production/mrp/create-pr', data).then((res) => res.data);

// Tồn kho được đọc trực tiếp từ dữ liệu dùng chung của PH4 Kho (Read-Only).
export const getMrpStockByMaterial = (maVatTu) =>
  api.get(`/production/mrp/stock/${maVatTu}`).then((res) => res.data);

// 6. Danh mục sản phẩm & vật tư
export const getProducts = () =>
  api.get('/production/products').then((res) => res.data.data);

export const getMaterials = () =>
  api.get('/master-data/vat-tu').then((res) => res.data.data || res.data);
