import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { controlBorderClass, controlClass, statusTextClass } from './Input.jsx';

/**
 * Async single-select built on the WAI-ARIA combobox pattern: one text input
 * owns focus, the popup is a listbox, and the active option is tracked with
 * aria-activedescendant. `items` are whatever the caller's `onSearch` returned —
 * the component never filters locally.
 * `initialLabel` seeds the input for a selection that already exists (a preset
 * order id); remount the component when that label changes.
 */
export function Combobox({
  label,
  placeholder,
  items,
  isLoading = false,
  onSearch,
  onSelect,
  status,
  disabled = false,
  emptyMessage = 'Không tìm thấy kết quả',
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  loadMoreLabel = 'Tải thêm kết quả',
  initialLabel = '',
  className,
}) {
  const [query, setQuery] = useState(initialLabel);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const activeOptionRef = useRef(null);
  const id = useId();
  const listboxId = `${id}-listbox`;
  const messageId = `${id}-message`;

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const optionId = (index) => `${id}-option-${index}`;

  const select = (item) => {
    setQuery(item.label);
    setIsOpen(false);
    onSelect(item);
  };

  const isDismissed = () => {
    const active = document.activeElement;
    return active !== null && containerRef.current !== null && !containerRef.current.contains(active);
  };

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-brand-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-invalid={status?.type === 'error' || undefined}
          aria-describedby={status?.message ? messageId : undefined}
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
            onSearch(event.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            if (isDismissed()) setIsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => Math.min(index + 1, items.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              if (isOpen && activeIndex >= 0 && items[activeIndex]) {
                event.preventDefault();
                select(items[activeIndex]);
              }
            } else if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className={cn(controlClass, 'h-10 pr-9', controlBorderClass(status))}
        />
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-slate-400"
        />
        {isOpen ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-brand-border bg-white py-1 shadow-md"
          >
            {isLoading ? (
              <li className="px-3 py-2 text-sm text-brand-secondary">Đang tải</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-2 text-sm text-brand-secondary">{emptyMessage}</li>
            ) : (
              <>
                {items.map((item, index) => (
                  <li
                    key={item.id}
                    id={optionId(index)}
                    ref={index === activeIndex ? activeOptionRef : undefined}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(item)}
                    className={cn(
                      'cursor-pointer px-3 py-2',
                      index === activeIndex ? 'bg-brand-light' : 'hover:bg-slate-50'
                    )}
                  >
                    <span className="block text-sm font-medium text-brand-text">{item.label}</span>
                    {item.description ? (
                      <span className="block text-xs text-brand-secondary">{item.description}</span>
                    ) : null}
                  </li>
                ))}
                {hasMore ? (
                  <li role="presentation" className="border-t border-brand-border">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onLoadMore?.()}
                      disabled={isLoadingMore}
                      className="w-full px-3 py-2 text-left text-sm font-medium text-brand-primary hover:bg-slate-50 disabled:text-slate-400"
                    >
                      {isLoadingMore ? 'Đang tải thêm...' : loadMoreLabel}
                    </button>
                  </li>
                ) : null}
              </>
            )}
          </ul>
        ) : null}
      </div>
      {status?.message ? (
        <p
          id={messageId}
          role={status.type === 'error' ? 'alert' : 'status'}
          aria-live={status.type === 'error' ? 'assertive' : 'polite'}
          className={cn('text-sm', statusTextClass(status))}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
