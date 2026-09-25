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
      <header className="costing-calc-header">
        <div className="costing-calc-title">
          <div className="costing-calc-heading-row">
            <h2>Tính giá thành sản phẩm</h2>
            <span className="costing-badge-draft">DỰ THẢO</span>
          </div>
          <p>Xem trước từ dữ liệu nguồn hiện tại, sau đó xác nhận lưu một snapshot mới.</p>
        </div>
      </header>

      {/* Source Data Cards Hierarchy */}
      <div className="costing-source-grid">
        <article className="costing-source-card">
          <small className="costing-source-label">Lệnh sản xuất</small>
          <strong className="costing-source-value font-mono">{item.ma_lenh_san_xuat}</strong>
        </article>
        <article className="costing-source-card">
          <small className="costing-source-label">Sản phẩm</small>
          <strong className="costing-source-value">{item.ma_san_pham}</strong>
          <span className="costing-source-sub">{item.ten_san_pham}</span>
        </article>
        <article className="costing-source-card">
          <small className="costing-source-label">Sản lượng hoàn thành</small>
          <strong className="costing-source-value text-blue">
            {Number(item.so_luong_hoan_thanh || 0).toLocaleString('vi-VN')}
          </strong>
        </article>
        <article className="costing-source-card">
          <small className="costing-source-label">Chi phí NVL thực tế</small>
          <strong className="costing-source-value text-emerald">
            {Number(item.so_dong_nguon) ? money(item.chi_phi_nvl_nguon) : '—'}
          </strong>
        </article>
      </div>

      <form onSubmit={handlePreview} className="costing-calc-form">
        <div className="costing-form-grid">
          {/* Field 1: Nhân công */}
          <div className="costing-field-group">
            <label htmlFor="costing-input-labor" className="costing-field-label">
              Chi phí nhân công trực tiếp <span className="req-star">*</span>
            </label>
            <div className="costing-input-container">
              <input
                id="costing-input-labor"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.laborCost}
                onChange={update('laborCost')}
                placeholder="Nhập chi phí nhân công..."
                className="costing-text-input"
              />
              <span className="costing-input-suffix">VNĐ</span>
            </div>
            <small className="costing-field-help">Tổng chi phí nhân công phát sinh trong kỳ</small>
          </div>

          {/* Field 2: Sản xuất chung */}
          <div className="costing-field-group">
            <label htmlFor="costing-input-overhead" className="costing-field-label">
              Chi phí sản xuất chung <span className="req-star">*</span>
            </label>
            <div className="costing-input-container">
              <input
                id="costing-input-overhead"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.overheadCost}
                onChange={update('overheadCost')}
                placeholder="Nhập chi phí sản xuất chung..."
                className="costing-text-input"
              />
              <span className="costing-input-suffix">VNĐ</span>
            </div>
            <small className="costing-field-help">Chi phí khấu hao, điện nước xưởng sản xuất</small>
          </div>

          {/* Field 3: Căn cứ phân bổ */}
          <div className="costing-field-group costing-field-full">
            <label htmlFor="costing-input-allocation" className="costing-field-label">
              Căn cứ phân bổ <span className="req-star">*</span>
            </label>
            <textarea
              id="costing-input-allocation"
              required
              maxLength={2000}
              value={form.allocationBasis}
              onChange={update('allocationBasis')}
              placeholder="Nhập căn cứ phân bổ chi phí nhân công, chi phí sản xuất chung..."
              className="costing-textarea"
              rows={3}
            />
            <small className="costing-field-help">Phương pháp phân bổ chi phí theo sản lượng hoặc định mức</small>
          </div>
        </div>

        {/* Warning/Info Box */}
        <aside className="costing-info-box">
          <span className="costing-info-icon">
            <Icon name="warning" />
          </span>
          <p className="costing-info-text">
            Chi phí nhân công và sản xuất chung là số liệu nhập thủ công, chưa được tự động đối soát từ phân hệ khác.
          </p>
        </aside>

        {/* Primary Action Button */}
        <div className="costing-action-bar">
          <button
            type="submit"
            className="costing-preview-button"
            disabled={state.loading}
          >
            <Icon name="calculator" />
            <span>{state.loading ? 'Đang tính toán…' : 'Xem trước kết quả'}</span>
          </button>
        </div>
      </form>

      {/* Messages */}
      {state.error && (
        <div className="costing-form-message error">
          <Icon name="warning" />
          <span>{state.error}</span>
        </div>
      )}
      {state.sourceChanged && (
        <div className="costing-form-message warning">
          <Icon name="warning" />
          <div>
            <strong>Dữ liệu nguồn đã thay đổi:</strong> {state.sourceChanged} Kết quả mới đã được cập nhật bên dưới; hãy kiểm tra rồi xác nhận lại.
          </div>
        </div>
      )}
      {state.success && (
        <div className="costing-form-message success">
          <Icon name="check" />
          <span>{state.success}</span>
        </div>
      )}

      {/* Preview Result Panel */}
      {preview && (
        <div className="costing-preview-result">
          <header className="costing-preview-header">
            <div>
              <small className="costing-preview-subtitle">KẾT QUẢ XEM TRƯỚC · {preview.period}</small>
              <h3 className="costing-preview-heading">
                {preview.productCode} — {preview.productName}
              </h3>
            </div>
            <span className="costing-badge-uncommitted">Chưa lưu</span>
          </header>

          <div className="costing-preview-breakdown">
            <div className="preview-metric-row">
              <span className="preview-metric-label">Chi phí NVL thực tế</span>
              <strong className="preview-metric-val">{money(preview.materialCost)}</strong>
            </div>
            <div className="preview-metric-row">
              <span className="preview-metric-label">Chi phí nhân công trực tiếp</span>
              <strong className="preview-metric-val">{money(preview.laborCost)}</strong>
            </div>
            <div className="preview-metric-row">
              <span className="preview-metric-label">Chi phí sản xuất chung</span>
              <strong className="preview-metric-val">{money(preview.overheadCost)}</strong>
            </div>
            <div className="preview-metric-divider" />
            <div className="preview-metric-row preview-metric-total">
              <span className="preview-metric-label">TỔNG GIÁ THÀNH</span>
              <strong className="preview-metric-val">{money(preview.totalCost)}</strong>
            </div>
            <div className="preview-metric-row preview-metric-unit">
              <span className="preview-metric-label">
                GIÁ THÀNH ĐƠN VỊ <small>({Number(preview.quantity).toLocaleString('vi-VN')} SP hoàn thành)</small>
              </span>
              <strong className="preview-metric-val">{money(preview.unitCost)} / SP</strong>
            </div>
          </div>

          <footer className="costing-preview-footer">
            <button
              type="button"
              onClick={handleSave}
              disabled={state.saving}
              className="costing-save-button"
            >
              <Icon name="check" />
              <span>
                {state.saving
                  ? 'Đang lưu…'
                  : state.sourceChanged
                  ? 'Xác nhận và lưu kết quả mới'
                  : 'Xác nhận lưu kết quả'}
              </span>
            </button>
          </footer>
        </div>
      )}
    </section>
  );
}
