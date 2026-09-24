import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Combobox } from '../ui/Combobox.jsx';
import { statusLabel } from '../common/StatusBadge.jsx';
import { getOrderById, getOrders } from '../../services/orderService.js';
import { formatCurrency, formatDate } from '../../lib/format.js';

/** One page of the server-side search; the picker pages through with "Tải thêm". */
const PAGE_SIZE = 10;

/** `ma — khách (trạng thái)`; the id itself is never shown to the user. */
function describeOrder(order) {
  const customer = order.ten_khach_hang ? ' — ' + order.ten_khach_hang : '';
  return order.ma_don_ban + customer + ' (' + statusLabel(order.trang_thai) + ')';
}

/** Secondary line: the facts a dispatcher checks before picking an order. */
function describeOrderFacts(order) {
  const parts = [];
  if (order.ngay_dat_hang) parts.push('Ngày đặt: ' + formatDate(order.ngay_dat_hang));
  if (order.tong_thanh_toan !== undefined && order.tong_thanh_toan !== null) {
    parts.push('Tổng: ' + formatCurrency(Number(order.tong_thanh_toan)));
  }
  return parts.join(' • ');
}

/**
 * Sales-order lookup for the delivery and invoice dialogs. The order is found by
 * searching the API (debounced, one page at a time) instead of typing a database
 * id, and `trangThaiIn` keeps the list to the states the target flow accepts.
 *
 * A `presetOrderId` (the entry point that opens on an order) is resolved through
 * `getOrderById` so the field shows the same label a search would have produced.
 *
 * @param {object} props
 * @param {(order: object) => void} props.onSelect Receives the full order record from the API.
 * @param {string} [props.label]
 * @param {string[]} props.trangThaiIn Order states the picker may offer.
 * @param {number | string | null} [props.presetOrderId]
 * @param {{type: string, message: string}} [props.status]
 * @param {boolean} [props.disabled]
 */
export function OrderSelector({
  onSelect,
  label = 'Đơn bán hàng liên kết *',
  trangThaiIn,
  presetOrderId = null,
  status,
  disabled = false,
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');

  const ordersById = useRef(new Map());
  const debounceRef = useRef(null);
  // The search text and page the current list belongs to, so "Tải thêm" keeps
  // paging the same query even though the input has moved on since.
  const searchRef = useRef('');
  const pageRef = useRef(0);
  // Only the newest request may write state: a late response from a superseded
  // query must never replace the list the user is looking at.
  const requestRef = useRef(0);
  // The exact value the request sends, so the callback depends on the filter's
  // contents rather than on a fresh array identity each render.
  const trangThaiQuery = Array.isArray(trangThaiIn) ? trangThaiIn.join(',') : '';

  const loadPage = useCallback(
    async (searchText, pageNumber, { append = false } = {}) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const res = await getOrders({
          search: searchText.trim(),
          trang_thai_in: trangThaiQuery,
          page: pageNumber,
          pageSize: PAGE_SIZE,
        });
        if (requestRef.current !== requestId) return;

        const mapped = res.orders.map((order) => {
          ordersById.current.set(String(order.id), order);
          return {
            id: String(order.id),
            label: describeOrder(order),
            description: describeOrderFacts(order),
          };
        });

        setItems((current) => (append ? [...current, ...mapped] : mapped));
        searchRef.current = searchText;
        pageRef.current = pageNumber;
        setHasMore(pageNumber < Number(res.meta?.totalPages || 1));
      } catch {
        if (requestRef.current !== requestId) return;
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        if (requestRef.current === requestId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [trangThaiQuery]
  );

  // Open on the first page of eligible orders; the rest of the table is reached
  // by searching or paging, never by preloading a capped list.
  useEffect(() => {
    void loadPage('', 1);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      requestRef.current += 1; // Whatever is still in flight is now stale
    };
  }, [loadPage]);

  // A preset order (opened from an order detail page) is resolved once so the
  // input shows its code instead of an empty field the user has to re-search.
  useEffect(() => {
    if (presetOrderId === null || presetOrderId === undefined || presetOrderId === '') return undefined;

    let cancelled = false;
    void (async () => {
      try {
        const order = await getOrderById(presetOrderId);
        if (cancelled || !order) return;
        ordersById.current.set(String(order.id), order);
        setPresetLabel(describeOrder(order));
      } catch {
        // The picker still works: the user can search for the order instead.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [presetOrderId]);

  const handleSearch = useCallback(
    (query) => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void loadPage(query, 1);
      }, 300);
    },
    [loadPage]
  );

  return (
    <Combobox
      // Remount when the preset changes so the input picks up the new label.
      key={presetLabel}
      initialLabel={presetLabel}
      label={label}
      placeholder="Gõ mã đơn hàng hoặc tên khách hàng..."
      items={items}
      isLoading={isLoading}
      status={status}
      disabled={disabled}
      onSearch={handleSearch}
      emptyMessage="Không tìm thấy đơn bán hàng phù hợp."
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={() => void loadPage(searchRef.current, pageRef.current + 1, { append: true })}
      onSelect={(item) => {
        const order = ordersById.current.get(item.id);
        if (order) onSelect(order);
      }}
      className="w-full"
    />
  );
}
