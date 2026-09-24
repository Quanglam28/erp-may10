import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Edit,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertCircle,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  getBoms,
  createBom,
  updateBom,
  getProducts,
  getMaterials,
  getProductionPlanDetail,
} from '../../services/productionService';

export default function BomPage({ showToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const sanPhamIdParam = searchParams.get('sanPhamId');
  const maKeHoachParam = searchParams.get('maKeHoach');

  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBom, setEditingBom] = useState(null);
  const [planContext, setPlanContext] = useState(null);

  const [formData, setFormData] = useState({
    san_pham_id: '',
    vat_tu_id: '',
    dinh_muc: 1,
    don_vi_tinh: '',
    ty_le_hao_hut: 0,
    trang_thai: 'hieu_luc',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (planId) {
        params.ke_hoach_id = planId;
      } else if (sanPhamIdParam) {
        params.ma_san_pham = sanPhamIdParam;
      }

      const promises = [
        getBoms(params),
        getProducts(),
        getMaterials(),
      ];

      if (planId) {
        promises.push(getProductionPlanDetail(planId).catch(() => null));
      }

      const [resBoms, resProducts, resMaterials, resPlan] = await Promise.all(promises);
      setBoms(resBoms?.data || []);
      setProducts(resProducts || []);
      setMaterials(resMaterials || []);
      if (resPlan) {
        setPlanContext(resPlan);
      } else if (planId && (maKeHoachParam || sanPhamIdParam)) {
        setPlanContext({
          id: planId,
          ma_ke_hoach: maKeHoachParam,
          ma_san_pham: sanPhamIdParam,
        });
      } else if (!planId) {
        setPlanContext(null);
      }
    } catch (err) {
      console.error('Lỗi tải định mức BOM:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải danh sách định mức BOM.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, planId, sanPhamIdParam]);

  const handleClearPlanFilter = () => {
    setPlanContext(null);
    setSearchParams({});
  };

  const handleOpenCreate = () => {
    setEditingBom(null);
    const defaultProduct = planContext?.ma_san_pham || sanPhamIdParam || '';
    setFormData({
      san_pham_id: defaultProduct,
      vat_tu_id: '',
      dinh_muc: 1,
      don_vi_tinh: '',
      ty_le_hao_hut: 0,
      trang_thai: 'hieu_luc',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (bom) => {
    setEditingBom(bom);
    setFormData({
      san_pham_id: bom.ma_san_pham,
      vat_tu_id: bom.ma_vat_tu,
      dinh_muc: bom.dinh_muc,
      don_vi_tinh: bom.don_vi_tinh || '',
      ty_le_hao_hut: bom.ty_le_hao_hut || 0,
      trang_thai: bom.trang_thai || 'hieu_luc',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingBom) {
        await updateBom(editingBom.id, {
          dinh_muc: Number(formData.dinh_muc),
          ty_le_hao_hut: Number(formData.ty_le_hao_hut || 0),
          trang_thai: formData.trang_thai,
        });
        if (showToast) showToast({ type: 'success', message: 'Cập nhật định mức BOM thành công!' });
      } else {
        await createBom({
          ma_san_pham: Number(formData.san_pham_id),
          ma_vat_tu: Number(formData.vat_tu_id),
          dinh_muc: Number(formData.dinh_muc),
          ty_le_hao_hut: Number(formData.ty_le_hao_hut || 0),
          trang_thai: formData.trang_thai || 'hieu_luc',
        });
        if (showToast) showToast({ type: 'success', message: 'Thêm định mức BOM thành công!' });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi lưu định mức BOM.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Plan Context Banner */}
      {planId && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                <span>Kế hoạch sản xuất:</span>
                <span className="text-[#0F5FAF] font-bold">{planContext?.ma_ke_hoach || maKeHoachParam || `KHSX #${planId}`}</span>
                {planContext?.trang_thai && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100/70 text-purple-800">
                    {planContext.trang_thai}
                  </span>
                )}
              </div>
              <div className="text-slate-600 mt-0.5">
                Đang hiển thị định mức BOM cho sản phẩm: <b className="text-slate-800">{planContext?.ten_san_pham || (planContext?.ma_san_pham ? `Mã SP: ${planContext.ma_san_pham}` : (sanPhamIdParam ? `Mã SP: ${sanPhamIdParam}` : '—'))}</b>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/production/plans"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại Kế hoạch</span>
            </Link>
            <button
              type="button"
              onClick={handleClearPlanFilter}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 hover:bg-purple-200 font-medium transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xem tất cả BOM</span>
            </button>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã, tên SP hoặc vật tư..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
            />
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0d4f91] transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm định mức BOM</span>
        </button>
      </div>

      {/* BOM Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Sản phẩm may mặc</th>
                <th className="px-4 py-3">Nguyên phụ liệu (PH4)</th>
                <th className="px-4 py-3 text-right">Định mức chuẩn</th>
                <th className="px-4 py-3 text-right">Tỷ lệ hao hụt</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0F5FAF] mb-2" />
                    Đang tải định mức BOM...
                  </td>
                </tr>
              ) : boms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                    {planId ? (
                      <div className="max-w-md mx-auto space-y-2">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                        <div className="font-semibold text-slate-700">
                          Chưa có định mức / BOM
                        </div>
                        <p className="text-xs text-slate-500">
                          Kế hoạch <b className="text-slate-700">{planContext?.ma_ke_hoach || maKeHoachParam || `#${planId}`}</b> ({planContext?.ten_san_pham || `Sản phẩm #${sanPhamIdParam || ''}`}) hiện chưa được thiết lập định mức nguyên phụ liệu.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Bấm nút &quot;Thêm định mức BOM&quot; ở trên để thiết lập định mức nguyên vật liệu cho sản phẩm này.
                        </p>
                      </div>
                    ) : (
                      'Chưa có dữ liệu định mức BOM'
                    )}
                  </td>
                </tr>
              ) : (
                boms.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{b.ten_san_pham}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{b.ma_san_pham}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0F5FAF]">{b.ten_vat_tu}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{b.ma_vat_tu}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {b.dinh_muc} {b.don_vi_tinh || 'm'} / SP
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">
                      {b.ty_le_hao_hut || 0}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.trang_thai === 'hieu_luc' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Hiệu lực
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          Hết hiệu lực
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F5FAF] hover:bg-[#F4FAFE] transition-colors"
                        title="Chỉnh sửa định mức"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal create / update */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0F5FAF]" />
              {editingBom ? 'Cập nhật định mức BOM' : 'Thêm định mức BOM mới'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sản phẩm may mặc *</label>
                <select
                  required
                  disabled={!!editingBom}
                  value={formData.san_pham_id}
                  onChange={(e) => setFormData({ ...formData, san_pham_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF] bg-white disabled:bg-slate-100"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      [{sp.ma_san_pham}] {sp.ten_san_pham}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nguyên phụ liệu (PH4) *</label>
                <select
                  required
                  disabled={!!editingBom}
                  value={formData.vat_tu_id}
                  onChange={(e) => {
                    const selMat = materials.find((m) => m.id === Number(e.target.value));
                    setFormData({
                      ...formData,
                      vat_tu_id: e.target.value,
                      don_vi_tinh: selMat?.don_vi_tinh || formData.don_vi_tinh,
                    });
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF] bg-white disabled:bg-slate-100"
                >
                  <option value="">-- Chọn nguyên phụ liệu --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.ma_vat_tu}] {m.ten_vat_tu} ({m.don_vi_tinh})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Định mức / 1 SP *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={formData.dinh_muc}
                    onChange={(e) => setFormData({ ...formData, dinh_muc: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    value={formData.don_vi_tinh}
                    onChange={(e) => setFormData({ ...formData, don_vi_tinh: e.target.value })}
                    placeholder="mét, cái, cuộn..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tỷ lệ hao hụt (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.ty_le_hao_hut}
                    onChange={(e) => setFormData({ ...formData, ty_le_hao_hut: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={formData.trang_thai}
                    onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF] bg-white"
                  >
                    <option value="hieu_luc">Hiệu lực</option>
                    <option value="het_hieu_luc">Hết hiệu lực</option>
                  </select>
                </div>
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
                  {submitting ? 'Đang lưu...' : 'Lưu định mức'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
