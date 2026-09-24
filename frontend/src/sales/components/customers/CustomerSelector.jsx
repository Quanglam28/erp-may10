import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Combobox } from '../ui/Combobox.jsx';
import { getCustomers } from '../../services/customerService.js';

/** One page of the server-side search; the picker pages through with "Tải thêm". */
const PAGE_SIZE = 10;

/** `ma — tên (tỉnh)` so two customers with the same name stay distinguishable. */
function describeCustomer(customer) {
  const city = customer.tinh_thanh_pho ? ' — ' + customer.tinh_thanh_pho : '';
  return customer.ma_khach_hang + ' — ' + customer.ten_khach_hang + city;
}

/** Secondary line: the two fields a user may be searching by. */
function describeContact(customer) {
  const parts = [];
  if (customer.so_dien_thoai) parts.push('ĐT: ' + customer.so_dien_thoai);
  if (customer.ma_so_thue) parts.push('MST: ' + customer.ma_so_thue);
  return parts.join(' • ');
}

/**
 * Order-entry customer lookup. The search runs on the server (debounced) across
 * tên, mã, số điện thoại and mã số thuế, one page at a time, and only ever
 * offers `hoat_dong` customers — a suspended customer must not take a new order.
 * The whole Customer object is handed back, so the caller can pre-fill the
 * delivery address from real data instead of holding a capped local list.
 */
export function CustomerSelector({ onSelect, status, disabled = false }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const customersById = useRef(new Map());
  const debounceRef = useRef(null);
  // The search text and page the current list belongs to, so "Tải thêm" keeps
  // paging the same query even though the input has moved on since.
  const searchRef = useRef('');
  const pageRef = useRef(0);
  // Only the newest request may write state: a late response from a superseded
  // query must never replace the list the user is looking at.
  const requestRef = useRef(0);

  const loadPage = useCallback(async (searchText, pageNumber, { append = false } = {}) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const res = await getCustomers({
        search: searchText.trim(),
        trang_thai: 'hoat_dong', // Only customers that may trade
        page: pageNumber,
        pageSize: PAGE_SIZE,
      });
      if (requestRef.current !== requestId) return;

      const mapped = res.customers.map((customer) => {
        customersById.current.set(String(customer.id), customer);
        return {
          id: String(customer.id),
          label: describeCustomer(customer),
          description: describeContact(customer),
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
  }, []);

  // Open on the first page of active customers; the rest of the table is reached
  // by searching or paging, never by preloading a capped list.
  useEffect(() => {
    void loadPage('', 1);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      requestRef.current += 1; // Whatever is still in flight is now stale
    };
  }, [loadPage]);

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
      label="Khách hàng *"
      placeholder="Gõ tên, mã khách hàng, số điện thoại hoặc mã số thuế..."
      items={items}
      isLoading={isLoading}
      status={status}
      disabled={disabled}
      onSearch={handleSearch}
      emptyMessage="Không tìm thấy khách hàng đang hoạt động."
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={() => void loadPage(searchRef.current, pageRef.current + 1, { append: true })}
      onSelect={(item) => {
        const customer = customersById.current.get(item.id);
        if (customer) onSelect(customer);
      }}
      className="w-full"
    />
  );
}
