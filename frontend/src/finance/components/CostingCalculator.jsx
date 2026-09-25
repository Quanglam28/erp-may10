import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { money } from './DocumentDetail.jsx';
import { previewCosting, saveCosting } from '../services/costing.js';

const initialForm = { laborCost: '', overheadCost: '', allocationBasis: '' };

export default function CostingCalculator({ item, period, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState({});

  useEffect(() => {
    setForm(initialForm);
    setPreview(null);
    setState({});
  }, [item?.lenh_san_xuat_id, period]);

  if (!item) return null;
  const payload = {
    productionOrderId: item.lenh_san_xuat_id,
    period,
    laborCost: form.laborCost,
    overheadCost: form.overheadCost,
    allocationBasis: form.allocationBasis,
  };

  const update = (key) => (event) => {
    setForm((old) => ({ ...old, [key]: event.target.value }));
    setPreview(null);
    setState({});
  };

  const handlePreview = async (event) => {
    event.preventDefault();
    setState({ loading: true });
    try {
      const result = await previewCosting(payload);
      setPreview(result.data);
      setState({});
    } catch (error) {
      setState({ error: error.message });
    }
  };

  const handleSave = async () => {
    if (!preview || state.saving) return;
    setState({ saving: true });
    try {
      const result = await saveCosting({
        ...payload,
        expectedQuantity: preview.quantity,
        expectedMaterialCost: preview.materialCost,
      });
      setState({ success: 'Đã lưu kết quả giá thành ở trạng thái Dự thảo.' });
      setPreview(null);
      onSaved?.(result.data);
    } catch (error) {
      if (error.code === 'COSTING_SOURCE_CHANGED' && error.details?.preview) {
        setPreview(error.details.preview);
        setState({ sourceChanged: error.message });
      } else {
        setState({ error: error.message });
      }
    }
  };

  return (
    <section className="panel costing-calculator">
      <header>
        <div>
          <h2>Tính giá thành sản phẩm</h2>
          <p>Xem trước từ dữ liệu nguồn hiện tại, sau đó xác nhận lưu một snapshot mới.</p>
        </div>
        <span className="draft-badge">Lưu dạng dự thảo</span>
      </header>
      <div className="costing-source-grid">
        <article>
          <small>Lệnh sản xuất</small>
          <strong>{item.ma_lenh_san_xuat}</strong>
        </article>
        <article>
          <small>Sản phẩm</small>
          <strong>{item.ma_san_pham}</strong>
          <span>{item.ten_san_pham}</span>
        </article>
        <article>
          <small>Sản lượng hiện tại</small>
          <strong>{Number(item.so_luong_hoan_thanh || 0).toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <small>Chi phí NVL hiện tại</small>
          <strong>{Number(item.so_dong_nguon) ? money(item.chi_phi_nvl_nguon) : '—'}</strong>
        </article>
      </div>
      <form onSubmit={handlePreview} className="costing-input-form">
        <label>
          <span>Chi phí nhân công trực tiếp</span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.laborCost}
            onChange={update('laborCost')}
            placeholder="Nhập chi phí nhân công"
          />
        </label>
        <label>
          <span>Chi phí sản xuất chung</span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.overheadCost}
            onChange={update('overheadCost')}
            placeholder="Nhập chi phí sản xuất chung"
          />
        </label>
        <label className="allocation-basis">
          <span>
            Căn cứ phân bổ <b>*</b>
          </span>
          <textarea
            required
            maxLength="2000"
            value={form.allocationBasis}
            onChange={update('allocationBasis')}
            placeholder="Nêu căn cứ nhập và phân bổ chi phí nhân công, chi phí sản xuất chung..."
          />
        </label>
        <aside>
          <Icon name="warning" />
          <p>Chi phí nhân công và sản xuất chung là số liệu nhập thủ công, chưa được tự động đối soát từ phân hệ khác.</p>
        </aside>
        <button className="costing-preview-button" disabled={state.loading}>
          {state.loading ? 'Đang tính…' : 'Xem trước kết quả'}
        </button>
      </form>
      {state.error && <div className="costing-form-message error">{state.error}</div>}
      {state.sourceChanged && (
        <div className="costing-form-message warning">
          <strong>Dữ liệu nguồn đã thay đổi</strong>
          <span>
            {state.sourceChanged} Kết quả mới đã được cập nhật bên dưới; hãy kiểm tra rồi xác nhận lại.
          </span>
        </div>
      )}
      {state.success && <div className="costing-form-message success">{state.success}</div>}
      {preview && (
        <div className="costing-preview-result">
          <header>
            <div>
              <small>KẾT QUẢ XEM TRƯỚC · {preview.period}</small>
              <h3>
                {preview.productCode} · {preview.productName}
              </h3>
            </div>
            <span>Chưa lưu</span>
          </header>
          <div>
            {[
              ['Nguyên vật liệu', preview.materialCost],
              ['Nhân công trực tiếp', preview.laborCost],
              ['Sản xuất chung', preview.overheadCost],
              ['Tổng giá thành', preview.totalCost],
            ].map(([label, value]) => (
              <article key={label}>
                <small>{label}</small>
                <strong>{money(value)}</strong>
              </article>
            ))}
          </div>
          <footer>
            <div>
              <small>Sản lượng</small>
              <strong>{Number(preview.quantity).toLocaleString('vi-VN')}</strong>
            </div>
            <div>
              <small>Giá thành đơn vị</small>
              <strong>{money(preview.unitCost)}</strong>
            </div>
            <button type="button" onClick={handleSave} disabled={state.saving}>
              {state.saving
                ? 'Đang lưu…'
                : state.sourceChanged
                ? 'Xác nhận và lưu kết quả mới'
                : 'Xác nhận lưu kết quả'}
            </button>
          </footer>
        </div>
      )}
    </section>
  );
}
