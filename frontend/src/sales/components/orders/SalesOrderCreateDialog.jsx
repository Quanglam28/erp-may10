import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Text } from '../ui/Typography.jsx';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Table, proportional, pixel } from '../ui/Table.jsx';
import { Input } from '../ui/Input.jsx';
import { NumberInput } from '../ui/NumberInput.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { DateInput } from '../ui/DateInput.jsx';
import { toast } from '../ui/toast.jsx';
import { fieldStatus, firstFieldError, orderFieldErrors, serverFieldErrors, toWireAmount, toWireQuantity } from '../../lib/validation.js';
import { FormSection } from '../common/FormSection.jsx';
import { createOrder } from '../../services/orderService.js';
import { formatCurrency } from '../../lib/format.js';
import { ProductSelector } from '../products/ProductSelector.jsx';
import { CustomerSelector } from '../customers/CustomerSelector.jsx';

/**
 * Fresh order dates: placed today, requested for delivery a week out. Kept in one
 * place so the initial state and every reopen agree on that seven-day lead.
 */
function defaultOrderDates() {
  const today = new Date();
  const requestedDelivery = new Date();
  requestedDelivery.setDate(requestedDelivery.getDate() + 7);
  return {
    ngay_dat_hang: today.toISOString().split('T')[0],
    ngay_giao_hang_yc: requestedDelivery.toISOString().split('T')[0],
  };
}

/**
 * Order creation as a modal, ported from the old \`/sales-orders/new\` page so the
 * order list can raise one without losing its filter and page state.
 * (Ported 1:1 from PH1 \`components/orders/SalesOrderCreateDialog.tsx\`.)
 */
export function SalesOrderCreateDialog({ isOpen, onOpenChange, onCreated }) {
  const formId = 'sales-order-create-form';

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderDate, setOrderDate] = useState(() => defaultOrderDates().ngay_dat_hang);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    () => defaultOrderDates().ngay_giao_hang_yc
  );
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Each open starts from a clean form; the customer picker reloads its own page.
  useEffect(() => {
    if (!isOpen) return undefined;

    const { ngay_dat_hang, ngay_giao_hang_yc } = defaultOrderDates();
    setSelectedCustomer(null);
    setDeliveryAddress('');
    setOrderDate(ngay_dat_hang);
    setRequestedDeliveryDate(ngay_giao_hang_yc);
    setNotes('');
    setLines([]);
    setIsSubmitting(false);
    setFieldErrors({});

    return undefined;
  }, [isOpen]);

  // Selecting a customer pre-fills the delivery address from the API record and
  // leaves it editable — the goods may be going somewhere else.
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    const address = [customer.dia_chi, customer.tinh_thanh_pho].filter(Boolean).join(', ');
    if (address) setDeliveryAddress(address);
  };

  const handleAddProduct = (product) => {
    const existingIdx = lines.findIndex((l) => l.product.id === product.id);
    if (existingIdx !== -1) {
      const updated = [...lines];
      updated[existingIdx].quantity += 1;
      setLines(updated);
    } else {
      setLines([...lines, { product, quantity: 1, discountRate: 0 }]);
    }
  };

  const handleUpdateLine = (index, updates) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    setLines(updated);
  };

  const handleRemoveLine = (index) => {
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // Live Totals Calculation Preview
  const grossTotal = lines.reduce((sum, l) => sum + l.quantity * Number(l.product.gia_ban), 0);
  const discountTotal = lines.reduce(
    (sum, l) => sum + (l.quantity * Number(l.product.gia_ban) * l.discountRate) / 100,
    0
  );
  const netTotal = Math.max(0, grossTotal - discountTotal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Same rules and messages as `createOrderSchema`; the server re-checks anyway.
    const localErrors = orderFieldErrors({
      customerId: selectedCustomer ? selectedCustomer.id : '',
      orderDate,
      requestedDeliveryDate,
      deliveryAddress,
      notes,
      lines,
    });
    const firstError = firstFieldError(localErrors);
    if (firstError) {
      if (firstError.field === 'lines') toast.error(firstError.message);
      setFieldErrors(localErrors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const created = await createOrder({
        ma_khach_hang: selectedCustomer.id,
        ngay_dat_hang: orderDate,
        ngay_giao_hang_yc: requestedDeliveryDate,
        dia_chi_giao_hang: deliveryAddress.trim(),
        ghi_chu: notes.trim() || undefined,
        lines: lines.map((l) => ({
          ma_san_pham: l.product.id,
          so_luong: toWireQuantity(l.quantity),
          ty_le_giam_gia: toWireAmount(l.discountRate),
        })),
      });

      if (onCreated) onCreated(created.id);
      onOpenChange(false);
    } catch (err) {
      setFieldErrors(
        serverFieldErrors(err, [
          'ma_khach_hang',
          'ngay_dat_hang',
          'ngay_giao_hang_yc',
          'dia_chi_giao_hang',
          'ghi_chu',
          'lines',
        ])
      );
      toast.error(err instanceof Error ? err : 'Không thể tạo đơn hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lineRows = lines.map((line, index) => ({
    key: String(line.product.id),
    index,
    line,
  }));

  const lineColumns = [
    {
      key: 'product',
      header: 'Sản phẩm',
      width: proportional(1),
      renderCell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="block max-w-[280px] truncate font-semibold" title={row.line.product.ten_san_pham}>
            {row.line.product.ten_san_pham}
          </span>
          <Text variant="supporting">
            {row.line.product.ma_san_pham + ' • ĐVT: ' + (row.line.product.ten_don_vi || 'Cái')}
          </Text>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Số lượng',
      width: pixel(120),
      align: 'end',
      renderCell: (row) => (
        <NumberInput
          label="Số lượng"
          isLabelHidden
          value={row.line.quantity}
          min={1}
          onChange={(value) => handleUpdateLine(row.index, { quantity: Math.max(1, Number(value) || 1) })}
        />
      ),
    },
    {
      key: 'unitPrice',
      header: 'Đơn giá',
      width: pixel(130),
      align: 'end',
      renderCell: (row) => (
        <Text className="font-medium tabular-nums">{formatCurrency(Number(row.line.product.gia_ban))}</Text>
      ),
    },
    {
      key: 'discountRate',
      header: 'Giảm (%)',
      width: pixel(110),
      align: 'end',
      renderCell: (row) => (
        <NumberInput
          label="Giảm (%)"
          isLabelHidden
          value={row.line.discountRate}
          min={0}
          max={100}
          onChange={(value) =>
            handleUpdateLine(row.index, { discountRate: Math.min(100, Math.max(0, Number(value) || 0)) })
          }
        />
      ),
    },
    {
      key: 'lineTotal',
      header: 'Thành tiền',
      width: pixel(140),
      align: 'end',
      renderCell: (row) => {
        const gross = row.line.quantity * Number(row.line.product.gia_ban);
        const discount = (gross * row.line.discountRate) / 100;
        return <Text className="font-semibold tabular-nums">{formatCurrency(gross - discount)}</Text>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: pixel(56),
      align: 'end',
      renderCell: (row) => (
        <IconButton
          icon={<Trash2 size={16} aria-hidden />}
          label="Xóa dòng sản phẩm"
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveLine(row.index)}
        />
      ),
    },
  ];

  const footer = (
    <>
      <Button variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
        Hủy
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting || lines.length === 0}
      >
        {isSubmitting ? 'Đang tạo đơn hàng...' : 'Lưu đơn bán hàng'}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      title="Tạo đơn bán hàng mới"
      description="Lập đơn hàng, thêm sản phẩm và tính toán giá niêm yết tự động"
      className="max-w-4xl"
      footer={footer}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1"
      >
        <FormSection title="1. Thông tin chung đơn hàng">
          <div className="flex flex-col gap-1.5">
            <CustomerSelector
              onSelect={handleCustomerSelect}
              status={fieldStatus(fieldErrors, 'ma_khach_hang')}
            />
            {selectedCustomer ? (
              <Text variant="supporting">
                {'Đã chọn: ' + selectedCustomer.ma_khach_hang +
                  (selectedCustomer.so_dien_thoai ? ' • ĐT: ' + selectedCustomer.so_dien_thoai : '') +
                  (selectedCustomer.ma_so_thue ? ' • MST: ' + selectedCustomer.ma_so_thue : '')}
              </Text>
            ) : null}
          </div>

          <Input
            label="Địa chỉ giao hàng *"
            value={deliveryAddress}
            onChange={(value) => setDeliveryAddress(value)}
            status={fieldStatus(fieldErrors, 'dia_chi_giao_hang')}
          />

          <DateInput
            label="Ngày đặt hàng *"
            value={orderDate}
            onChange={(value) => setOrderDate(value ?? '')}
            status={fieldStatus(fieldErrors, 'ngay_dat_hang')}
          />

          <DateInput
            label="Ngày giao hàng yêu cầu *"
            value={requestedDeliveryDate}
            onChange={(value) => setRequestedDeliveryDate(value ?? '')}
            status={fieldStatus(fieldErrors, 'ngay_giao_hang_yc')}
          />

          <Textarea
            label="Ghi chú đơn hàng"
            rows={2}
            value={notes}
            onChange={(value) => setNotes(value)}
            status={fieldStatus(fieldErrors, 'ghi_chu')}
          />
        </FormSection>

        <FormSection
          title="2. Danh sách sản phẩm đặt mua"
          description="Giá niêm yết được áp dụng tự động từ máy chủ"
        >
          <div className="flex flex-col gap-2">
            <Text variant="label" as="label">
              Tra cứu &amp; thêm sản phẩm vào đơn:
            </Text>
            <ProductSelector onSelect={handleAddProduct} />
          </div>

          {lines.length === 0 ? (
            <Card variant="muted" className="p-4">
              <div className="flex flex-row w-full justify-center">
                <Text variant="supporting" as="p">
                  Chưa có sản phẩm nào được chọn. Hãy tra cứu sản phẩm ở trên để thêm vào đơn hàng.
                </Text>
              </div>
            </Card>
          ) : (
            <>
              <Table data={lineRows} columns={lineColumns} idKey="key" density="balanced" />

              <div className="border-t border-brand-border" />

              <div className="flex flex-row w-full justify-end">
                <div className="flex w-full flex-col gap-2 sm:w-80">
                  <div className="flex flex-row w-full justify-between gap-4">
                    <Text variant="supporting" as="span">
                      Tổng tiền hàng:
                    </Text>
                    <Text className="font-medium tabular-nums" as="span">
                      {formatCurrency(grossTotal)}
                    </Text>
                  </div>

                  <div className="flex flex-row w-full justify-between gap-4">
                    <Text variant="supporting" as="span">
                      Tiền giảm giá:
                    </Text>
                    <Text className="tabular-nums" as="span">{'- ' + formatCurrency(discountTotal)}</Text>
                  </div>

                  <div className="border-t border-brand-border" />

                  <div className="flex flex-row w-full justify-between gap-4">
                    <Text className="font-bold" as="span">
                      Tổng thanh toán:
                    </Text>
                    <Text className="font-bold tabular-nums" as="span">
                      {formatCurrency(netTotal)}
                    </Text>
                  </div>
                </div>
              </div>
            </>
          )}
        </FormSection>
      </form>
    </Dialog>
  );
}
