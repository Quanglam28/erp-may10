/**
 * ERP May 10 — Production Module (PH2) Routes
 */

const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { requireAuth, requireRoles } = require('../middlewares/auth');

// Toàn bộ route yêu cầu xác thực JWT / HMAC-SHA256
router.use(requireAuth);

// 1. Dashboard Overview
router.get('/dashboard', requireRoles('san_xuat', 'admin', 'kho'), productionController.getDashboardStats);

// 2. Kế hoạch sản xuất (Plans)
router.get('/plans', requireRoles('san_xuat', 'admin'), productionController.getPlans);
router.post('/plans', requireRoles('san_xuat', 'admin'), productionController.createPlan);
router.put('/plans/:id', requireRoles('san_xuat', 'admin'), productionController.updatePlan);
router.get('/plans/:id', requireRoles('san_xuat', 'admin'), productionController.getPlanById);
router.post('/plans/:id/approve', requireRoles('san_xuat', 'admin'), productionController.approvePlan);
router.post('/plans/:id/pause', requireRoles('san_xuat', 'admin'), productionController.pausePlan);
router.post('/plans/:id/cancel', requireRoles('san_xuat', 'admin'), productionController.cancelPlan);

// 3. Định mức nguyên liệu (BOM)
router.get('/bom', requireRoles('san_xuat', 'admin'), productionController.getBom);
router.get('/boms', requireRoles('san_xuat', 'admin'), productionController.getBom);
router.post('/bom', requireRoles('san_xuat', 'admin'), productionController.createBom);
router.post('/boms', requireRoles('san_xuat', 'admin'), productionController.createBom);
router.put('/bom/:id', requireRoles('san_xuat', 'admin'), productionController.updateBom);
router.put('/boms/:id', requireRoles('san_xuat', 'admin'), productionController.updateBom);

// 4. Lệnh sản xuất (Orders)
router.get('/orders', requireRoles('san_xuat', 'admin', 'kho'), productionController.getOrders);
router.post('/orders', requireRoles('san_xuat', 'admin'), productionController.createOrder);
router.get('/orders/:id', requireRoles('san_xuat', 'admin', 'kho'), productionController.getOrderById);
router.post('/orders/:id/start', requireRoles('san_xuat', 'admin'), productionController.startOrder);

// 5. Hoạch định nhu cầu NVL (MRP)
router.get('/mrp', requireRoles('san_xuat', 'admin'), productionController.getMrp);
router.get('/mrp/requirements', requireRoles('san_xuat', 'admin'), productionController.getMrp);
router.get('/mrp/stock/:maVatTu', requireRoles('san_xuat', 'kho', 'admin'), productionController.getMrpStockByMaterial);
router.post('/mrp/create-pr', requireRoles('san_xuat', 'admin'), productionController.createPurchaseRequestFromMrp);
router.post('/mrp/create-purchase-request', requireRoles('san_xuat', 'admin'), productionController.createPurchaseRequestFromMrp);

// 6. Công đoạn & Kết quả sản xuất (Stages & Results)
router.get('/stages', requireRoles('san_xuat', 'admin'), productionController.getStages);
router.get('/orders/:orderId/stages', requireRoles('san_xuat', 'admin'), (req, res, next) => {
  req.query.ma_lenh_san_xuat = req.params.orderId;
  return productionController.getStages(req, res, next);
});
router.post('/results', requireRoles('san_xuat', 'admin'), productionController.recordResult);
router.post('/orders/:orderId/results', requireRoles('san_xuat', 'admin'), (req, res, next) => {
  req.body.ma_lenh_san_xuat = req.params.orderId;
  return productionController.recordResult(req, res, next);
});

// 7. Danh mục sản phẩm (Products)
router.get('/products', requireRoles('san_xuat', 'admin'), productionController.getProducts);

// 8. Đối soát tiêu hao nguyên vật liệu / Hỗ trợ Quyết toán FR-09
router.get('/reconciliation/:orderId', requireRoles('san_xuat', 'admin', 'kho', 'ke_toan'), productionController.getOrderReconciliation);
router.get('/orders/:orderId/reconciliation', requireRoles('san_xuat', 'admin', 'kho', 'ke_toan'), productionController.getOrderReconciliation);

module.exports = router;
