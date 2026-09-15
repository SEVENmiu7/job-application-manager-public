import { useMemo, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getApplicationStatusTheme } from '@/lib/application-theme';
import { cn } from '@/lib/utils';
import { formatLocations, type ApplicationRecord } from '@shared/types';

export function getApplicationPickerContentWidth(
  mode: 'standard' | 'contained',
): string {
  return mode === 'contained'
    ? 'var(--radix-popover-trigger-width)'
    : 'min(420px, calc(100vw - 32px))';
}
export const APPLICATION_PICKER_SEARCH_WRAPPER_CLASS =
  'm-2 h-11 shrink-0 rounded-[10px] border border-border-strong bg-input px-3 transition-[border-color,box-shadow,background-color] focus-within:border-primary focus-within:bg-surface-elevated focus-within:ring-2 focus-within:ring-ring/25';

export const APPLICATION_PICKER_SEARCH_INPUT_CLASS =
  'h-full py-0 outline-none ring-0 focus-visible:outline-none';

interface ApplicationSearchPickerProps {
  records: ApplicationRecord[];
  value?: string | null;
  excludedIds?: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  contentSideOffset?: number;
  contentMode: 'standard' | 'contained';
  allowClear?: boolean;
  onSelect: (id: string) => void;
  onClear?: () => void;
}

export function ApplicationSearchPicker({
  records,
  value,
  excludedIds = [],
  placeholder = '关联岗位',
  searchPlaceholder = '搜索公司、岗位或地区',
  className,
  contentSideOffset = 8,
  contentMode,
  allowClear = false,
  onSelect,
  onClear,
}: ApplicationSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const availableRecords = useMemo(
    () => records.filter((record) => Boolean(record.record_id) && !excludedIds.includes(record.record_id!)),
    [excludedIds, records],
  );
  const selected = records.find((record) => record.record_id === value);

  const choose = (id: string): void => {
    onSelect(id);
    setKeyword('');
    setOpen(false);
  };

  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setKeyword(''); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`${placeholder}，支持搜索`}
            disabled={availableRecords.length === 0 && !selected}
            className="min-w-0 flex-1 justify-between font-normal"
          >
            <span className="truncate">
              {selected
                ? `${selected.fields.公司名称} · ${selected.fields.岗位名称}`
                : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-foreground-muted" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={Math.max(contentSideOffset, 10)}
          collisionPadding={16}
          data-application-picker-mode={contentMode}
          style={{
            width:
              getApplicationPickerContentWidth(contentMode),
            maxWidth: 'var(--radix-popover-content-available-width)',
          }}
          className="z-[70] overflow-hidden rounded-xl border-border p-0 shadow-xl"
        >
          <Command className="rounded-xl">
            <CommandInput
              value={keyword}
              onValueChange={setKeyword}
              placeholder={searchPlaceholder}
              wrapperClassName={APPLICATION_PICKER_SEARCH_WRAPPER_CLASS}
              className={APPLICATION_PICKER_SEARCH_INPUT_CLASS}
            />
            <CommandList className="p-1.5" style={{ maxHeight: 'min(320px, var(--radix-popover-content-available-height))' }}>
              <CommandEmpty className="px-4 py-8 text-center text-sm text-foreground-muted">没有匹配的岗位</CommandEmpty>
              <CommandGroup>
                {availableRecords.map((record) => {
                  const id = record.record_id!;
                  const company = record.fields.公司名称 || '未填写公司';
                  const position = record.fields.岗位名称 || '未填写岗位';
                  const location = formatLocations(record.fields.工作地区);
                  const status = record.fields.当前进度 || '收藏';
                  const theme = getApplicationStatusTheme(status);
                  return (
                    <CommandItem
                      key={id}
                      value={id}
                      keywords={[company, position, location]}
                      onSelect={() => choose(id)}
                      className="items-center gap-3 rounded-lg px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{company} · {position}</span>
                        <span className="mt-0.5 block truncate text-xs text-foreground-muted">{location || '工作地区未填写'}</span>
                      </span>
                      <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold', theme.badge)}>{status}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {allowClear && value && (
        <Button type="button" variant="ghost" size="icon" onClick={onClear} aria-label="清除关联岗位">
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
