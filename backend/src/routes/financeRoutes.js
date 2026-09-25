const { Router } = require('express');
const { requireRoles } = require('../middlewares/auth');
const document = require('../controllers/documentController');
const documentWrite = require('../controllers/documentWriteController');
const journal = require('../controllers/journalController');
const debt = require('../controllers/debtController');
const cost = require('../controllers/costController');
const costing = require('../controllers/costingController');
const orderEfficiency = require('../controllers/orderEfficiencyController');
const financialReport = require('../controllers/financialReportController');

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', server: true }));

// 1. Documents (Chứng từ gốc)
router.get('/documents/filters', route(document.getDocumentFilters));
router.get('/documents', route(document.getDocuments));
router.get('/documents/:id', route(document.getDocument));
router.post('/documents', route(documentWrite.postDocument));
router.patch('/documents/:id', route(documentWrite.patchDocument));
router.delete('/documents/:id', route(documentWrite.removeDocument));
router.post('/documents/:id/approve', requireRoles('ke_toan_truong'), route(documentWrite.approveDoc));

// 2. Journals (Sổ nhật ký hạch toán)
router.get('/journals/filters', route(journal.getJournalFilters));
router.get('/journals', route(journal.getJournals));
router.get('/journals/:id', route(journal.getJournal));
router.post('/journals', route(journal.postJournal));
router.patch('/journals/:id', route(journal.patchJournal));
router.post('/journals/:id/approve', requireRoles('ke_toan_truong'), route(journal.approveJournal));

// 3. Debts (Công nợ phải thu & phải trả)
router.get('/debts/filters', route(debt.getDebtFilters));
router.get('/debts', route(debt.getDebts));
router.get('/debts/:id', route(debt.getDebt));

// 4. Costs (Tập hợp chi phí sản xuất)
router.get('/costs/filters', route(cost.getCostFilters));
router.get('/costs', route(cost.getCosts));
router.get('/costs/:id', route(cost.getCost));

// 5. Costing (Tính giá thành sản phẩm & Quản lý vòng đời)
router.get('/costing/filters', route(costing.getCostingFilters));
router.post('/costing/preview', route(costing.postCostingPreview));
router.post('/costing/save', route(costing.postCostingSave));
router.patch('/costing/results/:id', route(costing.patchCostingDraft));
router.delete('/costing/results/:id', route(costing.removeCostingDraft));
router.post('/costing/results/:id/approve', requireRoles('ke_toan_truong'), route(costing.postCostingApproval));
router.get('/costing/:id/history', route(costing.getCostingHistory));
router.get('/costing', route(costing.getCosting));
router.get('/costing/:id', route(costing.getCostingDetail));

// 6. Order Efficiency (Hiệu quả đơn hàng - Chỉ Kế toán trưởng & Admin)
router.get('/order-efficiency/filters', requireRoles('ke_toan_truong'), route(orderEfficiency.getOrderEfficiencyFilters));
router.get('/order-efficiency', requireRoles('ke_toan_truong'), route(orderEfficiency.getOrderEfficiency));
router.get('/order-efficiency/:id', requireRoles('ke_toan_truong'), route(orderEfficiency.getOrderEfficiencyDetail));

// 7. Financial Reports (Báo cáo tài chính P&L - Chỉ Kế toán trưởng & Admin)
router.get('/financial-reports/filters', requireRoles('ke_toan_truong'), route(financialReport.getFinancialReportFilters));
router.get('/financial-reports/income-statement', requireRoles('ke_toan_truong'), route(financialReport.getIncomeStatement));
router.get('/financial-reports/snapshots', requireRoles('ke_toan_truong'), route(financialReport.getFinancialReportSnapshots));
router.get('/financial-reports/trend', requireRoles('ke_toan_truong'), route(financialReport.getFinancialReportTrend));

module.exports = router;