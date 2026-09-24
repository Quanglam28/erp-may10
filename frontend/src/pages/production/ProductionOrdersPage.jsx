import React, { useState, useEffect } from 'react';
import {
  Factory,
  Plus,
  Play,
  CheckCircle2,
  RefreshCw,
  Filter,
  Eye,
  Calendar,
} from 'lucide-react';
import {
  getProductionOrders,
  createProductionOrder,
  startProductionOrder,
  getProductionPlans,
} from '../../services/productionService';

export default function ProductionOrdersPage({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    ke_hoach_id: '',
    ma_lenh: '',
    so_luong: 500,
    phan_xuong: 'Xưởng may 1',
    ngay_bat_dau: new Date().toISOString().split('T')[0],
    ngay_hoan_thanh_du_kien: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    ghi_chu: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.trang_thai = statusFilter;
      const [resOrders, resPlans] = await Promise.all([
        getProductionOrders(params),
        getProductionPlans({ trang_thai: 'da_duyet' }),
      ]);
      setOrders(resOrders?.data || []);
      setPlans(resPlans?.data || []);
    } catch (err) {
      console.error('Lỗi tải lệnh sản xuất:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải danh sách lệnh sản xuất.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!formData.ke_hoach_id || !formData.so_luong || Number(formData.so_luong) <= 0) {
      if (showToast) showToast({ type: 'error', message: 'Vui lòng chọn KHSX và số lượng hợp lệ.' });
      return;
    }
    try {
      setSubmitting(true);
      await createProductionOrder({
        ma_ke_hoach_san_xuat: Number(formData.ke_hoach_id),
        so_luong_yeu_cau: Number(formData.so_luong),
        ghi_chu: formData.ghi_chu || (formData.phan_xuong ? `Phân xưởng: ${formData.phan_xuong}` : undefined),
      });
      if (showToast) showToast({ type: 'success', message: 'Phát hành lệnh sản xuất thành công!' });
      setShowModal(false);
      setFormData({
        ke_hoach_id: '',
        ma_lenh: '',
        so_luong: 500,
        phan_xuong: 'Xưởng may 1',
        ngay_bat_dau: new Date().toISOString().split('T')[0],
        ngay_hoan_thanh_du_kien: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        ghi_chu: '',
      });
      fetchData();
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi phát hành lệnh sản xuất.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartOrder = async (order) => {
    const code = order.ma_lenh_san_xuat || order.ma_lenh;
    if (!window.confirm(`Khởi động lệnh sản xuất ${code}?`)) return;
    try {
      await startProductionOrder(order.id);
      if (showToast) showToast({ type: 'success', message: `Lệnh sản xuất ${code} đã bắt đầu!` });
      fetchData();
    } catch (err) {
      if (showToast) showToast({ type: 'error', message: err.response?.data?.message || 'Lỗi khởi động LSX.' });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'chua_bat_dau':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Chưa bắt đầu</span>;
      case 'dang_san_xuat':
      case 'dang_thuc_hien':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Đang may/SX</span>;
      case 'hoan_thanh':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Hoàn thành</span>;
      case 'tam_dung':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Tạm dừng</span>;
      case 'huy':
      case 'da_huy':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Đã huỷ</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="chua_bat_dau">Chưa bắt đầu</option>
            <option value="dang_san_xuat">Đang sản xuất</option>
            <option value="hoan_thanh">Hoàn thành</option>
            <option value="tam_dung">Tạm dừng</option>
            <option value="huy">Đã huỷ</option>
          </select>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0d4f91] transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Phát hành lệnh sản xuất</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Mã LSX</th>
                <th className="px-4 py-3">Kế hoạch SX</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Phân xưởng</th>
                <th className="px-4 py-3 text-right">Tiến độ</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0F5FAF] mb-2" />
                    Đang tải danh sách lệnh sản xuất...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy lệnh sản xuất nào
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const targetQty = Number(ord.so_luong_yeu_cau || ord.so_luong || 0);
                  const pct = targetQty > 0 ? Math.min(100, Math.round(((ord.so_luong_hoan_thanh || 0) / targetQty) * 100)) : 0;
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-indigo-600">{ord.ma_lenh_san_xuat || ord.ma_lenh}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{ord.ma_ke_hoach}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{ord.ten_san_pham}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ord.ma_san_pham}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ord.phan_xuong || 'Xưởng may'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-slate-900">
                          {ord.so_luong_hoan_thanh || 0} / {targetQty}
                        </div>
                        <div className="w-20 ml-auto bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-[#0F5FAF]'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{formatDate(ord.ngay_bat_dau)} → {formatDate(ord.ngay_hoan_thanh_du_kien || ord.ngay_ket_thuc_yc)}</div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(ord.trang_thai)}</td>
                      <td className="px-4 py-3 text-center">
                        {ord.trang_thai === 'chua_bat_dau' && (
                          <button
                            onClick={() => handleStartOrder(ord)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors"
                            title="Khởi động sản xuất"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Bắt đầu</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Factory className="w-5 h-5 text-[#0F5FAF]" />
              Phát hành lệnh sản xuất mới
            </h3>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã lệnh (tuỳ chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: LSX-2026-003 (để trống tự sinh)"
                  value={formData.ma_lenh}
                  onChange={(e) => setFormData({ ...formData, ma_lenh: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thuộc kế hoạch sản xuất *</label>
                <select
                  required
                  value={formData.ke_hoach_id}
                  onChange={(e) => setFormData({ ...formData, ke_hoach_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF] bg-white"
                >
                  <option value="">-- Chọn KHSX đã duyệt --</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      [{pl.ma_ke_hoach}] {pl.ten_san_pham} (Tổng: {pl.so_luong_ke_hoach || pl.so_luong})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng may lệnh này *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.so_luong}
                    onChange={(e) => setFormData({ ...formData, so_luong: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân xưởng thực hiện</label>
                  <input
                    type="text"
                    value={formData.phan_xuong}
                    onChange={(e) => setFormData({ ...formData, phan_xuong: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={formData.ngay_bat_dau}
                    onChange={(e) => setFormData({ ...formData, ngay_bat_dau: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoàn thành dự kiến</label>
                  <input
                    type="date"
                    required
                    value={formData.ngay_hoan_thanh_du_kien}
                    onChange={(e) => setFormData({ ...formData, ngay_hoan_thanh_du_kien: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows="2"
                  value={formData.ghi_chu}
                  onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                  placeholder="Ghi chú yêu cầu kỹ thuật..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5FAF] hover:bg-[#0d4f91] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang phát hành...' : 'Phát hành lệnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
