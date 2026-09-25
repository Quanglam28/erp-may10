import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { money } from './DocumentDetail.jsx';
import { approveCostingDraft, deleteCostingDraft, fetchCostingHistory, updateCostingDraft } from '../services/costing.js';

const dateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

export default function CostingResultsManager({ productionOrderId, refreshKey, canApprove = false, onChanged }) {
  const [state, setState] = useState({ loading: true, data: [] });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);

  const load = () => {
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: null }));
    fetchCostingHistory(productionOrderId, controller.signal)
      .then((body) => {
        if (body && !controller.signal.aborted) setState({ loading: false, data: body.data || [] });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ loading: false, data: [], error: error.message });
      });
    return controller;
  };

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [productionOrderId, refreshKey]);

  const beginEdit = (snapshot) => {
    setEditing(snapshot);
    setForm({
      laborCost: snapshot.chi_phi_nhan_cong_truc_tiep,
      overheadCost: snapshot.chi_phi_san_xuat_chung,
      allocationBasis: snapshot.ghi_chu || '',
      expectedQuantity: snapshot.so_luong_san_xuat,
      expectedMaterialCost: snapshot.chi_phi_vat_lieu_truc_tiep,
      confirmSourceChange: false,
    });
    setMessage(null);
  };

  const save = async (event) => {
    event.preventDefault();
    setMessage({ type: 'loading', text: 'Đang lưu thay đổi…' });
    try {
      await updateCostingDraft(editing.id, form);
      setEditing(null);
      setForm(null);
      setMessage({ type: 'success', text: 'Đã cập nhật dự thảo giá thành.' });
      load();
      onChanged?.();
    } catch (error) {
      if (error.code === 'COSTING_SOURCE_CHANGED' && error.details?.preview) {
        setForm((old) => ({
          ...old,
          expectedQuantity: error.details.preview.quantity,
          expectedMaterialCost: error.details.preview.materialCost,
          confirmSourceChange: true,
        }));
        setMessage({
          type: 'warning',
          text: `${error.message} Sản lượng mới: ${Number(error.details.preview.quantity).toLocaleString(
            'vi-VN'
          )}; NVL mới: ${money(error.details.preview.materialCost)}. Bấm Lưu thay đổi lần nữa để xác nhận.`,
        });
      } else setMessage({ type: 'error', text: error.message });
    }
  };

  const remove = async (snapshot) => {
    if (!window.confirm(`Xóa dự thảo ${snapshot.ky_tinh_gia_thanh}? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteCostingDraft(snapshot.id);
      setMessage({ type: 'success', text: 'Đã xóa dự thảo giá thành.' });
      load();
      onChanged?.();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const approve = async (snapshot) => {
    if (!window.confirm(`Duyệt kết quả giá thành ${snapshot.ky_tinh_gia_thanh}? Sau khi duyệt sẽ không thể sửa hoặc xóa.`))
      return;
    try {
      await approveCostingDraft(snapshot.id);
      setMessage({ type: 'success', text: 'Đã duyệt kết quả giá thành.' });
      load();
      onChanged?.();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <section className="panel costing-results-manager">
      <header>
        <div>
          <h2>Kết quả giá thành đã lưu</h2>
          <p>Lịch sử snapshot của lệnh sản xuất; kết quả đã duyệt được bảo vệ.</p>
        </div>
        <span>{state.data.length} kết quả</span>
      </header>
      {message && <div className={`costing-manager-message ${message.type}`}>{message.text}</div>}
      {state.loading ? (
        <div className="costing-state">Đang tải lịch sử kết quả…</div>
      ) : state.error ? (
        <div className="costing-state error">{state.error}</div>
      ) : !state.data.length ? (
        <div className="costing-empty compact">
          <Icon name="calculator" />
          <div>
            <h3>Chưa có kết quả giá thành</h3>
            <p>Hãy dùng khu vực tính giá thành phía trên để tạo dự thảo đầu tiên.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="erp-table costing-history-table">
            <thead>
              <tr>
                {[
                  'Kỳ',
                  'Sản phẩm',
                  'Sản lượng',
                  'NVL',
                  'Nhân công',
                  'SXC',
                  'Tổng',
                  'Đơn vị',
                  'Trạng thái',
                  'Ngày tạo',
                  'Người tính',
                  'Thao tác',
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.data.map((snapshot) => (
                <tr key={snapshot.id}>
                  <td>
                    <strong>{snapshot.ky_tinh_gia_thanh}</strong>
                    <small>{snapshot.ghi_chu || 'Không có ghi chú'}</small>
                  </td>
                  <td>
                    <strong>{snapshot.ma_san_pham}</strong>
                    <small>{snapshot.ten_san_pham}</small>
                  </td>
                  <td>{Number(snapshot.so_luong_san_xuat).toLocaleString('vi-VN')}</td>
                  <td className="amount">{money(snapshot.chi_phi_vat_lieu_truc_tiep)}</td>
                  <td className="amount">{money(snapshot.chi_phi_nhan_cong_truc_tiep)}</td>
                  <td className="amount">{money(snapshot.chi_phi_san_xuat_chung)}</td>
                  <td className="amount">{money(snapshot.tong_chi_phi)}</td>
                  <td className="amount">{money(snapshot.gia_thanh_don_vi)}</td>
                  <td>
                    <span className={`costing-badge ${snapshot.trang_thai === 'du_thao' ? 'warn' : 'done'}`}>
                      {snapshot.trang_thai === 'du_thao' ? 'Dự thảo' : 'Đã duyệt'}
                    </span>
                  </td>
                  <td>{dateTime(snapshot.ngay_tao)}</td>
                  <td>{snapshot.nguoi_tinh_ten || snapshot.nguoi_tinh || '—'}</td>
                  <td>
                    <div className="costing-result-actions">
                      <button title="Xem chi tiết" onClick={() => setViewing(snapshot)}>
                        <Icon name="eye" />
                      </button>
                      {snapshot.trang_thai === 'du_thao' && (
                        <>
                          {canApprove && (
                            <button
                              title="Duyệt kết quả"
                              className="approve"
                              onClick={() => approve(snapshot)}
                            >
                              <Icon name="check" />
                            </button>
                          )}
                          <button title="Sửa dự thảo" onClick={() => beginEdit(snapshot)}>
                            <Icon name="edit" />
                          </button>
                          <button
                            title="Xóa dự thảo"
                            className="danger"
                            onClick={() => remove(snapshot)}
                          >
                            <Icon name="trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {viewing && (
        <div className="costing-edit-overlay" role="dialog" aria-modal="true">
          <section className="costing-edit-modal costing-view-modal">
            <header>
              <div>
                <small>CHI TIẾT KẾT QUẢ GIÁ THÀNH</small>
                <h3>
                  {viewing.ma_lenh_san_xuat} · {viewing.ky_tinh_gia_thanh}
                </h3>
              </div>
              <button type="button" onClick={() => setViewing(null)}>
                ×
              </button>
            </header>
            <div className="costing-view-grid">
              {[
                ['Sản phẩm', `${viewing.ma_san_pham} · ${viewing.ten_san_pham}`],
                ['Sản lượng snapshot', Number(viewing.so_luong_san_xuat).toLocaleString('vi-VN')],
                ['NVL snapshot', money(viewing.chi_phi_vat_lieu_truc_tiep)],
                ['Nhân công', money(viewing.chi_phi_nhan_cong_truc_tiep)],
                ['Chi phí SXC', money(viewing.chi_phi_san_xuat_chung)],
                ['Tổng giá thành', money(viewing.tong_chi_phi)],
                ['Giá thành đơn vị', money(viewing.gia_thanh_don_vi)],
                ['Trạng thái', viewing.trang_thai === 'du_thao' ? 'Dự thảo' : 'Đã duyệt'],
                ['Ngày tạo', dateTime(viewing.ngay_tao)],
                ['Người tính', viewing.nguoi_tinh_ten || viewing.nguoi_tinh || '—'],
                ['Ghi chú / căn cứ', viewing.ghi_chu || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <footer>
              <button type="button" onClick={() => setViewing(null)}>
                Đóng
              </button>
            </footer>
          </section>
        </div>
      )}
      {editing && (
        <div className="costing-edit-overlay" role="dialog" aria-modal="true">
          <form onSubmit={save} className="costing-edit-modal">
            <header>
              <div>
                <small>SỬA DỰ THẢO</small>
                <h3>
                  {editing.ma_lenh_san_xuat} · {editing.ky_tinh_gia_thanh}
                </h3>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                ×
              </button>
            </header>
            <div className="costing-edit-source">
              <span>
                Sản lượng snapshot <b>{Number(editing.so_luong_san_xuat).toLocaleString('vi-VN')}</b>
              </span>
              <span>
                NVL snapshot <b>{money(editing.chi_phi_vat_lieu_truc_tiep)}</b>
              </span>
            </div>
            <label>
              Chi phí nhân công trực tiếp
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.laborCost}
                onChange={(e) => setForm({ ...form, laborCost: e.target.value, confirmSourceChange: false })}
              />
            </label>
            <label>
              Chi phí sản xuất chung
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.overheadCost}
                onChange={(e) => setForm({ ...form, overheadCost: e.target.value, confirmSourceChange: false })}
              />
            </label>
            <label>
              Căn cứ phân bổ
              <textarea
                required
                maxLength="2000"
                value={form.allocationBasis}
                onChange={(e) => setForm({ ...form, allocationBasis: e.target.value, confirmSourceChange: false })}
              />
            </label>
            {message?.type === 'warning' && <div className="costing-manager-message warning">{message.text}</div>}
            <footer>
              <button type="button" onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button type="submit">Lưu thay đổi</button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
