import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { date, money } from '../components/DocumentDetail.jsx';
import { fetchFinancialReportFilters, fetchFinancialReportSnapshots, fetchFinancialReportTrend, fetchIncomeStatement } from '../services/financialReports.js';
import './FinancialReports.css';

const modeLabels = { month: 'Tháng', quarter: 'Quý', year: 'Năm' };
const statusLabels = { da_phe_duyet: 'Đã phê duyệt', nhap: 'Nháp' };
const has = (value) => value !== null && value !== undefined;
const percent = (value) => has(value) ? `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%` : '—';
const billions = (value) => Number.isFinite(Number(value)) ? `${(Number(value) / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : '—';
const valueFromChoice = ({ mode, month, quarter, year }) => mode === 'month' ? `${String(month).padStart(2, '0')}/${year}` : mode === 'quarter' ? `Q${quarter}/${year}` : String(year);
const labelFromChoice = ({ mode, month, quarter, year }) => mode === 'month' ? `Tháng ${month} / ${year}` : mode === 'quarter' ? `Quý ${['I', 'II', 'III', 'IV'][quarter - 1]} / ${year}` : `Năm ${year}`;

function PeriodSummaryChart({ report }) {
  const columns = [['Doanh thu', report.doanh_thu_thuan, 'blue'], ['Giá vốn', report.gia_von_hang_ban, 'orange'], ['Lợi nhuận trước thuế', report.loi_nhuan_truoc_thue, 'green'], ['Lợi nhuận sau thuế', report.loi_nhuan_sau_thue, 'indigo']];
  const maximum = Math.max(...columns.map(([, value]) => Math.abs(Number(value) || 0)), 1);
  return (
    <div className="period-column-chart">
      <aside>{[100, 75, 50, 25, 0].map((tick) => <span key={tick}>{tick ? billions(maximum * tick / 100).replace(' tỷ', '') : '0'}</span>)}</aside>
      <section>
        <div className="chart-grid">{[100, 75, 50, 25, 0].map((tick) => <i key={tick} />)}</div>
        <div className="chart-columns">
          {columns.map(([label, value, tone]) => (
            <div key={label}>
              <strong>{billions(value)}</strong>
              <span className="column-track">
                <i className={tone} style={{ height: `${Math.max(Math.abs(Number(value) || 0) / maximum * 100, 3)}%` }} title={`${label}: ${money(value)}`} />
              </span>
              <small>{label === 'Lợi nhuận trước thuế' ? 'LNTT' : label === 'Lợi nhuận sau thuế' ? 'LNST' : label}</small>
            </div>
          ))}
        </div>
      </section>
      <b>Đơn vị: tỷ VND</b>
    </div>
  );
}

function MultiPeriodTrend({ rows }) {
  if (!rows?.length) return null;
  const isSingle = rows.length === 1;
  const maximum = Math.max(...rows.flatMap((item) => [Number(item.doanh_thu_thuan) || 0, Number(item.loi_nhuan_sau_thue) || 0]), 1);
  const point = (item, index, key) => `${isSingle ? 50 : index * 100 / (rows.length - 1)},${100 - (Number(item[key]) || 0) / maximum * 82}`;
  const revenuePoints = rows.map((item, index) => point(item, index, 'doanh_thu_thuan')).join(' ');
  const profitPoints = rows.map((item, index) => point(item, index, 'loi_nhuan_sau_thue')).join(' ');

  return (
    <article className="executive-card multi-period-trend">
      <header>
        <div>
          <h3>Xu hướng doanh thu và lợi nhuận</h3>
          <p>Dữ liệu các snapshot KQKD đã lưu theo thời gian</p>
        </div>
        <div className="trend-legend">
          <span><i className="revenue" />Doanh thu</span>
          <span><i className="profit" />Lợi nhuận sau thuế</span>
        </div>
      </header>
      {isSingle && (
        <div className="single-snapshot-notice">
          <Icon name="report" />
          <span>Hiện hệ thống có dữ liệu snapshot cho 1 kỳ báo cáo ({rows[0].ky_bao_cao}).</span>
        </div>
      )}
      <div className="trend-plot">
        <aside>
          {[100, 75, 50, 25, 0].map((tick) => (
            <span key={tick}>{tick ? billions(maximum * tick / 100).replace(' tỷ', '') : '0'}</span>
          ))}
        </aside>
        <section>
          <div className="trend-grid">
            {[1, 2, 3, 4, 5].map((line) => <i key={line} />)}
          </div>
          {isSingle && <div className="single-point-guide" style={{ left: '50%' }} />}
          <svg viewBox="0 0 100 104" preserveAspectRatio="none" role="img" aria-label="Xu hướng doanh thu và lợi nhuận sau thuế">
            {!isSingle && (
              <>
                <polyline className="revenue" points={revenuePoints} />
                <polyline className="profit" points={profitPoints} />
              </>
            )}
            {rows.map((item, index) => {
              const cx = isSingle ? 50 : index * 100 / (rows.length - 1);
              const cyRev = 100 - (Number(item.doanh_thu_thuan) || 0) / maximum * 82;
              const cyProfit = 100 - (Number(item.loi_nhuan_sau_thue) || 0) / maximum * 82;
              return (
                <g key={item.id} className={isSingle ? 'single-snapshot-markers' : ''}>
                  <circle className="revenue" cx={cx} cy={cyRev} r={isSingle ? 2.8 : 1.25}>
                    <title>{item.period?.label || item.ky_bao_cao} · Doanh thu: {money(item.doanh_thu_thuan)}</title>
                  </circle>
                  <circle className="profit" cx={cx} cy={cyProfit} r={isSingle ? 2.8 : 1.25}>
                    <title>{item.period?.label || item.ky_bao_cao} · LNST: {money(item.loi_nhuan_sau_thue)}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
          <div className="trend-labels">
            {isSingle ? (
              <span style={{ margin: '0 auto', fontWeight: 700, color: '#1768ad' }}>
                {rows[0].ky_bao_cao} ({rows[0].period?.label || rows[0].ky_bao_cao})
              </span>
            ) : (
              rows.map((item) => <span key={item.id}>{item.ky_bao_cao}</span>)
            )}
          </div>
        </section>
      </div>
      {isSingle && (
        <div className="single-point-callout">
          <div>
            <span className="badge-revenue">Doanh thu: {money(rows[0].doanh_thu_thuan)} ({billions(rows[0].doanh_thu_thuan)})</span>
            <span className="badge-profit">Lợi nhuận sau thuế: {money(rows[0].loi_nhuan_sau_thue)} ({billions(rows[0].loi_nhuan_sau_thue)})</span>
          </div>
        </div>
      )}
    </article>
  );
}

function SamePeriodComparison({ comparison, current }) {
  if (!comparison?.data) {
    const currentLabel = current?.period?.label || 'Quý II / 2026';
    const priorLabel = comparison?.period?.label || 'Quý II / 2025';
    return (
      <section className="executive-card same-period empty">
        <header>
          <div>
            <small>SO SÁNH CÙNG KỲ</small>
            <h3>Chưa có dữ liệu cùng kỳ năm trước</h3>
          </div>
          <span className="same-period-status-badge">
            <Icon name="calendar" /> Chưa có dữ liệu
          </span>
        </header>
        <div className="same-period-box-container">
          <div className="comparison-period-box current">
            <span className="period-box-label">Kỳ hiện tại</span>
            <strong className="period-box-val">{currentLabel}</strong>
            <span className="period-box-tag active">Đã có snapshot KQKD</span>
          </div>
          <div className="comparison-arrow-icon">
            <Icon name="arrow" />
          </div>
          <div className="comparison-period-box prior">
            <span className="period-box-label">Kỳ so sánh</span>
            <strong className="period-box-val">{priorLabel}</strong>
            <span className="period-box-tag empty">Chưa có snapshot</span>
          </div>
        </div>
        <p className="same-period-explanation">
          Dữ liệu so sánh sẽ hiển thị khi hệ thống có snapshot của kỳ tương ứng.
        </p>
      </section>
    );
  }
  const previous = comparison.data;
  const metrics = [
    ['Doanh thu', 'doanh_thu_thuan'],
    ['Giá vốn', 'gia_von_hang_ban'],
    ['Lợi nhuận trước thuế', 'loi_nhuan_truoc_thue'],
    ['Lợi nhuận sau thuế', 'loi_nhuan_sau_thue']
  ];
  const maximum = Math.max(...metrics.flatMap(([, key]) => [Math.abs(Number(previous[key]) || 0), Math.abs(Number(current?.[key]) || 0)]), 1);
  return (
    <section className="executive-card same-period comparison-chart">
      <header>
        <div>
          <small>SO SÁNH CÙNG KỲ</small>
          <h3>{comparison.period.label} và {current?.period?.label}</h3>
        </div>
      </header>
      <div className="comparison-legend">
        <span><i className="prior" />{comparison.period.label}</span>
        <span><i className="current" />{current?.period?.label}</span>
      </div>
      <div className="comparison-columns">
        {metrics.map(([label, key]) => (
          <div key={key}>
            <section>
              <i style={{ height: `${Math.abs(Number(previous[key]) || 0) / maximum * 100}%` }} title={`${comparison.period.label}: ${money(previous[key])}`} />
              <i style={{ height: `${Math.abs(Number(current?.[key]) || 0) / maximum * 100}%` }} title={`${current?.period?.label}: ${money(current?.[key])}`} />
            </section>
            <small>{label === 'Lợi nhuận trước thuế' ? 'LNTT' : label === 'Lợi nhuận sau thuế' ? 'LNST' : label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function OverviewDashboard({ result, loading, error, requestedLabel, trend }) {
  if (loading) return <div className="financial-loading"><span /><p>Đang tải dữ liệu tài chính…</p></div>;
  if (error) return <div className="financial-state compact error">{error}</div>;
  if (!result?.data) return <section className="financial-empty compact"><span><Icon name="report" /></span><h2>Chưa có dữ liệu tài chính cho kỳ đã chọn.</h2><p>Không tìm thấy snapshot báo cáo cho {requestedLabel}.</p></section>;
  const report = result.data;
  const afterTaxMargin = Number(report.doanh_thu_thuan) ? Number(report.loi_nhuan_sau_thue) / Number(report.doanh_thu_thuan) * 100 : null;
  return (
    <section className="executive-dashboard">
      <div className="executive-kpis">
        {[
          ['Tổng doanh thu', 'doanh_thu_thuan', report.doanh_thu_thuan, 'blue', 'chart'],
          ['Tổng giá vốn / chi phí', 'gia_von_hang_ban', report.gia_von_hang_ban, 'orange', 'wallet'],
          ['Lợi nhuận trước thuế', 'loi_nhuan_truoc_thue', report.loi_nhuan_truoc_thue, 'green', 'arrow'],
          ['Lợi nhuận sau thuế', 'loi_nhuan_sau_thue', report.loi_nhuan_sau_thue, 'indigo', 'check'],
          ['Biên lợi nhuận', 'gross_margin', report.gross_margin, 'navy', 'report'],
        ].map(([label, key, value, tone, icon], index) => {
          const prior = key === 'gross_margin' && result.comparison?.data ? Number(result.comparison.data.loi_nhuan_truoc_thue) / Number(result.comparison.data.doanh_thu_thuan) * 100 : result.comparison?.data?.[key];
          const change = has(prior) && Number(prior) !== 0 ? (Number(value) - Number(prior)) / Math.abs(Number(prior)) * 100 : null;
          return (
            <article className={tone} key={label}>
              <header>
                <small>{label}</small>
                <span><Icon name={icon} /></span>
              </header>
              <strong>{index === 4 ? percent(value) : money(value)}</strong>
              <p className={has(change) ? (change >= 0 ? 'up' : 'down') : 'no-comparison'}>
                {has(change) ? `${change >= 0 ? '↑' : '↓'} ${percent(Math.abs(change))} · So với cùng kỳ` : 'Chưa có dữ liệu cùng kỳ'}
              </p>
            </article>
          );
        })}
      </div>
      <MultiPeriodTrend rows={trend} />
      <div className="executive-grid top">
        <article className="executive-card trend-card">
          <header>
            <div>
              <h3>Tổng quan kết quả tài chính</h3>
              <p>So sánh các chỉ tiêu chính trong kỳ {report.period.label}</p>
            </div>
            <Icon name="chart" />
          </header>
          <PeriodSummaryChart report={report} />
        </article>
        <SamePeriodComparison comparison={result.comparison} current={report} />
      </div>
      <div className="executive-grid analytics">
        <article className="executive-card executive-profitability horizontal">
          <header>
            <div>
              <h3>Khả năng sinh lời</h3>
              <p>Tỷ suất được tính từ cùng snapshot báo cáo, không đánh giá tốt hoặc xấu.</p>
            </div>
            <Icon name="chart" />
          </header>
          <div className="profitability-horizontal">
            <div className="executive-ring" style={{ '--value': `${Math.min(Math.max(Number(report.gross_margin) || 0, 0), 100) * 3.6}deg` }}>
              <span><strong>{percent(report.gross_margin)}</strong><small>Biên LNTT</small></span>
            </div>
            <dl>
              <div>
                <dt>Biên lợi nhuận trước thuế</dt>
                <dd>{percent(report.gross_margin)}</dd>
              </div>
              <div>
                <dt>Biên lợi nhuận sau thuế</dt>
                <dd>{percent(afterTaxMargin)}</dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="executive-card executive-structure">
          <header>
            <div>
              <h3>Cơ cấu doanh thu</h3>
              <p>Giá vốn và lợi nhuận trước thuế trên doanh thu thuần</p>
            </div>
          </header>
          <div className="revenue-stack">
            <i className="cost" style={{ width: `${Number(report.doanh_thu_thuan) ? Number(report.gia_von_hang_ban) / Number(report.doanh_thu_thuan) * 100 : 0}%` }} />
            <i className="profit" style={{ width: `${Number(report.doanh_thu_thuan) ? Number(report.loi_nhuan_truoc_thue) / Number(report.doanh_thu_thuan) * 100 : 0}%` }} />
          </div>
          <div className="structure-values">
            <div>
              <i className="cost" />
              <span>Giá vốn</span>
              <strong>{money(report.gia_von_hang_ban)}</strong>
              <small>{percent(Number(report.doanh_thu_thuan) ? Number(report.gia_von_hang_ban) / Number(report.doanh_thu_thuan) * 100 : null)}</small>
            </div>
            <div>
              <i className="profit" />
              <span>Lợi nhuận trước thuế</span>
              <strong>{money(report.loi_nhuan_truoc_thue)}</strong>
              <small>{percent(report.gross_margin)}</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function ReportRepository({ state, view }) {
  const reportName = (item) => item.loai_bao_cao === 'ket_qua_kinh_doanh' ? 'Báo cáo kết quả hoạt động kinh doanh' : item.loai_bao_cao;
  return <section className="report-repository compact-report-library" id="financial-report-library">
    <header><div><small>KHO BÁO CÁO TÀI CHÍNH</small><h2>Kho báo cáo tài chính</h2><p>Tra cứu các báo cáo tài chính đã được lưu trong hệ thống.</p></div><span>{state.data.length} báo cáo</span></header>
    {state.loading ? <div className="repository-state compact">Đang tải danh sách báo cáo…</div> : state.error ? <div className="repository-state compact error">{state.error}</div> : !state.data.length ? <div className="repository-state compact">Chưa có báo cáo tài chính được lưu.</div> : <div className="compact-report-table"><table><thead><tr><th>Tên báo cáo</th><th>Loại báo cáo</th><th>Kỳ</th><th>Ngày lập</th><th>Người lập</th><th>Trạng thái</th><th>Nguồn</th><th>Thao tác</th></tr></thead><tbody>{state.data.map((item) => <tr key={item.id}><td><strong>{reportName(item)}</strong></td><td>KQKD</td><td>{item.period?.label || item.ky_bao_cao}</td><td>{date(item.ngay_lap_bao_cao)}</td><td>{item.ten_nguoi_lap || '—'}</td><td><span className={`repository-status ${item.trang_thai}`}>{statusLabels[item.trang_thai] || item.trang_thai}</span></td><td>{item.source === 'stored_snapshot' ? 'Snapshot hệ thống' : item.source || '—'}</td><td><button onClick={() => view(item)}>Xem báo cáo <Icon name="arrow" /></button></td></tr>)}</tbody></table></div>}
  </section>;
}
function IncomeStatement({ result, loading, error, requestedLabel, snapshot }) {
  if (loading) return <div className="financial-loading"><span /><p>Đang tải báo cáo…</p></div>;
  if (error) return <div className="financial-state compact error">{error}</div>;
  if (!result?.data) return <section className="financial-empty compact"><span><Icon name="report" /></span><h2>Chưa có báo cáo cho kỳ này</h2><p>Không tìm thấy snapshot Báo cáo kết quả hoạt động kinh doanh cho {requestedLabel}.</p></section>;
  const report = result.data;
  const previous = result.comparison?.data;
  const metrics = [
    ['01', 'Doanh thu thuần', report.doanh_thu_thuan, previous?.doanh_thu_thuan, 'normal'],
    ['02', 'Giá vốn hàng bán', report.gia_von_hang_ban, previous?.gia_von_hang_ban, 'subtotal'],
    ['03', 'Lợi nhuận trước thuế', report.loi_nhuan_truoc_thue, previous?.loi_nhuan_truoc_thue, 'total'],
    ['04', 'Lợi nhuận sau thuế', report.loi_nhuan_sau_thue, previous?.loi_nhuan_sau_thue, 'total'],
  ].filter(([, , value]) => has(value));
  const revenue = Number(report.doanh_thu_thuan);
  const beforeTaxMargin = revenue ? Number(report.loi_nhuan_truoc_thue) / revenue * 100 : null;
  const afterTaxMargin = revenue ? Number(report.loi_nhuan_sau_thue) / revenue * 100 : null;
  const taxImpact = has(report.loi_nhuan_truoc_thue) && has(report.loi_nhuan_sau_thue) ? Number(report.loi_nhuan_truoc_thue) - Number(report.loi_nhuan_sau_thue) : null;
  return <article className="statement-document" id="active-financial-report">
    <header className="statement-document-header">
      <div><small>BÁO CÁO TÀI CHÍNH</small><h1>BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH</h1><p>Kỳ báo cáo: <strong>{report.period.label}</strong></p></div>
      <span className="report-status"><Icon name="check" />{statusLabels[report.trang_thai] || report.trang_thai}</span>
    </header>
    <section className="statement-metadata"><div><small>Ngày lập</small><strong>{date(snapshot?.ngay_lap_bao_cao || report.ngay_lap_bao_cao)}</strong></div><div><small>Người lập</small><strong>{snapshot?.ten_nguoi_lap || '—'}</strong></div><div><small>Nguồn dữ liệu</small><strong>Snapshot hệ thống</strong></div><div><small>Mã báo cáo</small><strong>#{report.id}</strong></div></section>
    <section className="statement-primary">
      <header><div><small>ĐƠN VỊ SỐ LIỆU THEO SNAPSHOT</small><h2>Bảng chỉ tiêu kết quả hoạt động kinh doanh</h2></div><span>{report.period.label}</span></header>
      <div className="statement-detail-table"><table><thead><tr><th>Mã số</th><th>Chỉ tiêu</th><th>Kỳ này</th>{previous && <><th>Kỳ trước</th><th>Chênh lệch</th><th>%</th></>}</tr></thead><tbody>{metrics.map(([code, label, current, prior, kind]) => { const difference = has(prior) ? Number(current) - Number(prior) : null; const change = has(prior) && Number(prior) !== 0 ? difference / Math.abs(Number(prior)) * 100 : null; return <tr className={kind} key={code}><td>{code}</td><td>{label}</td><td>{money(current)}</td>{previous && <><td>{money(prior)}</td><td>{money(difference)}</td><td>{percent(change)}</td></>}</tr>; })}</tbody></table></div>
    </section>
    <section className="statement-insights"><header><h2>Phân tích báo cáo</h2><p>Các tỷ lệ được tính trực tiếp từ cùng snapshot</p></header><div><article><small>Biên lợi nhuận trước thuế</small><strong>{percent(beforeTaxMargin)}</strong></article><article><small>Biên lợi nhuận sau thuế</small><strong>{percent(afterTaxMargin)}</strong></article><article><small>Ảnh hưởng thuế đến lợi nhuận</small><strong>{money(taxImpact)}</strong></article></div></section>
    <footer className="statement-document-footer"><h2>Thông tin báo cáo</h2><dl><div><dt>Kỳ báo cáo</dt><dd>{report.period.label}</dd></div><div><dt>Ngày lập</dt><dd>{date(snapshot?.ngay_lap_bao_cao || report.ngay_lap_bao_cao)}</dd></div><div><dt>Người lập</dt><dd>{snapshot?.ten_nguoi_lap || '—'}</dd></div><div><dt>Trạng thái</dt><dd>{statusLabels[report.trang_thai] || report.trang_thai}</dd></div><div><dt>Nguồn dữ liệu</dt><dd>Snapshot đã lưu</dd></div></dl></footer>
    <section className="statement-validation"><Icon name={result.validation?.journal?.status === 'balanced' ? 'check' : 'warning'} /><div><strong>{result.validation?.journal?.status === 'balanced' ? 'Dữ liệu nhật ký trong kỳ cân đối' : 'Chưa có bút toán trong kỳ để đối chiếu cân đối'}</strong><p>Snapshot báo cáo không có quan hệ trực tiếp với từng bút toán nguồn.</p></div></section>
  </article>;
}
export default function FinancialReports({ reportId, navigate }) {
  const [filters, setFilters] = useState({ periods: [], reports: [], years: [] });
  const [repository, setRepository] = useState({ loading: true, data: [] });
  const [trend, setTrend] = useState([]);
  const [choice, setChoice] = useState({ mode: 'quarter', month: 1, quarter: 1, year: new Date().getFullYear() });
  const [appliedPeriod, setAppliedPeriod] = useState('');
  const [appliedLabel, setAppliedLabel] = useState('Đang xác định kỳ');
  const [state, setState] = useState({ loading: true });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchFinancialReportFilters(controller.signal), fetchFinancialReportSnapshots({}, controller.signal), fetchFinancialReportTrend(controller.signal)])
      .then(([filterData, snapshotData, trendData]) => {
        if (controller.signal.aborted || !filterData || !snapshotData || !trendData) return;
        const snapshots = snapshotData.data || [];
        setFilters(filterData);
        setRepository({ loading: false, data: snapshots });
        setTrend(trendData.data || []);
        const selectedSnapshot = reportId ? snapshots.find((item) => String(item.id) === String(reportId)) : null;
        if (reportId && !selectedSnapshot) {
          setAppliedLabel('Không tìm thấy báo cáo');
          setState({ loading: false, error: 'Báo cáo được yêu cầu không tồn tại.' });
          return;
        }
        const first = selectedSnapshot?.period || snapshots[0]?.period || filterData.periods?.[0];
        if (first) {
          const next = { mode: first.mode, month: first.month || 1, quarter: first.quarter || 1, year: first.year };
          setChoice(next);
          setAppliedPeriod(selectedSnapshot?.ky_bao_cao || first.value);
          setAppliedLabel(first.label);
        } else {
          setAppliedLabel('Chưa có kỳ dữ liệu');
          setState({ loading: false, data: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error?.name !== 'AbortError') {
          setRepository({ loading: false, data: [], error: error.message });
          setState({ loading: false, error: error.message });
        }
      });
    return () => controller.abort();
  }, [reportId]);

  useEffect(() => {
    if (!appliedPeriod) return undefined;
    const controller = new AbortController();
    setState({ loading: true });
    fetchIncomeStatement(appliedPeriod, controller.signal)
      .then((data) => { if (data && !controller.signal.aborted) setState({ loading: false, ...data }); })
      .catch((error) => { if (!controller.signal.aborted && error?.name !== 'AbortError') setState({ loading: false, error: error.message }); });
    return () => controller.abort();
  }, [appliedPeriod]);

  const years = filters.years?.length ? filters.years : [choice.year];
  const applyPeriod = (event) => {
    event.preventDefault();
    const value = valueFromChoice(choice);
    setAppliedPeriod(value);
    setAppliedLabel(labelFromChoice(choice));
  };
  const viewSnapshot = (item) => navigate(`/bao-cao-tai-chinh/${item.id}`);
  const backToOverview = () => navigate('/bao-cao-tai-chinh');

  if (reportId) return <div className="financial-reports-page report-detail-page">
    <div className="report-viewer-nav"><button onClick={backToOverview}>← Quay lại Tổng quan báo cáo tài chính</button><span>{state.data?.period?.label || appliedLabel}</span></div>
    <main className="report-center"><IncomeStatement result={state} loading={state.loading} error={state.error} requestedLabel={appliedLabel} snapshot={repository.data.find((item) => String(item.id) === String(reportId))} /></main>
  </div>;

  return <div className="financial-reports-page">
    <header className="financial-page-header"><div><nav>Tài chính - Kế toán <span>›</span> Báo cáo tài chính</nav><div><span><Icon name="report" /></span><section><h1>Báo cáo tài chính</h1><p>Tổng hợp và theo dõi doanh thu, chi phí, lợi nhuận và xu hướng tài chính theo kỳ.</p></section></div></div><aside><small>KỲ PHÂN TÍCH</small><strong>{appliedLabel}</strong><span>{state.data ? 'Có snapshot dữ liệu' : 'Chưa có snapshot'}</span></aside></header>
    <nav className="financial-section-tabs" aria-label="Điều hướng Báo cáo tài chính"><button type="button" className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><Icon name="chart" />Tổng quan tài chính</button><button type="button" className={activeTab === 'repository' ? 'active' : ''} onClick={() => setActiveTab('repository')}><Icon name="report" />Kho báo cáo tài chính</button></nav>
    {activeTab === 'overview' && <form className="financial-controls" onSubmit={applyPeriod}><section><small>KỲ PHÂN TÍCH</small><nav>{['month', 'quarter', 'year'].map((mode) => <button type="button" key={mode} className={choice.mode === mode ? 'active' : ''} onClick={() => setChoice((old) => ({ ...old, mode }))}>{modeLabels[mode]}</button>)}</nav></section>{choice.mode === 'month' && <label><span>Tháng</span><select value={choice.month} onChange={(event) => setChoice((old) => ({ ...old, month: Number(event.target.value) }))}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>Tháng {index + 1}</option>)}</select></label>}{choice.mode === 'quarter' && <label><span>Quý</span><select value={choice.quarter} onChange={(event) => setChoice((old) => ({ ...old, quarter: Number(event.target.value) }))}>{['I', 'II', 'III', 'IV'].map((value, index) => <option value={index + 1} key={value}>Quý {value}</option>)}</select></label>}<label><span>Năm</span><select value={choice.year} onChange={(event) => setChoice((old) => ({ ...old, year: Number(event.target.value) }))}>{years.map((year) => <option value={year} key={year}>{year}</option>)}</select></label><button><Icon name="search" />Xem dữ liệu</button></form>}
    <main className="report-center">{activeTab === 'overview' ? <OverviewDashboard result={state} loading={state.loading} error={state.error} requestedLabel={appliedLabel} trend={trend} /> : <ReportRepository state={repository} view={viewSnapshot} />}</main>
  </div>;
}
