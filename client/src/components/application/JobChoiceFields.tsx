import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DECISION_LEVEL_OPTIONS,
  WORK_MODE_OPTIONS,
  type DecisionLevel,
  type WorkMode,
} from '@shared/types';

export interface JobChoiceValues {
  薪资: string;
  工作方式: WorkMode | '';
  能力匹配: DecisionLevel | null;
  主观意愿: DecisionLevel | null;
  岗位亮点: string;
  主要顾虑: string;
}

export function JobChoiceFields({
  value,
  onChange,
  title = '选岗信息（可选）',
}: {
  value: JobChoiceValues;
  onChange: <K extends keyof JobChoiceValues>(
    key: K,
    next: JobChoiceValues[K],
  ) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-surface-muted px-3.5 text-sm font-semibold text-foreground-secondary transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="text-left">
          {title}
          <span className="ml-2 text-xs font-normal text-foreground-muted">
            用于岗位对比，不影响投递流程
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Labeled label="薪资">
            <input
              className="form-input"
              value={value.薪资}
              onChange={(event) => onChange('薪资', event.target.value)}
              placeholder="如：20–30K·15薪"
            />
          </Labeled>
          <Labeled label="工作方式">
            <Select
              value={value.工作方式 || 'unset'}
              onValueChange={(next: string) =>
                onChange('工作方式', next === 'unset' ? '' : (next as WorkMode))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">暂不确定</SelectItem>
                {WORK_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Labeled>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DecisionButtons
            label="能力匹配"
            value={value.能力匹配}
            onChange={(next) => onChange('能力匹配', next)}
          />
          <DecisionButtons
            label="主观意愿"
            value={value.主观意愿}
            onChange={(next) => onChange('主观意愿', next)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Labeled label="岗位亮点">
            <textarea
              className="form-input resize-y"
              rows={3}
              value={value.岗位亮点}
              onChange={(event) => onChange('岗位亮点', event.target.value)}
              placeholder="这个岗位最吸引你的地方"
            />
          </Labeled>
          <Labeled label="主要顾虑">
            <textarea
              className="form-input resize-y"
              rows={3}
              value={value.主要顾虑}
              onChange={(event) => onChange('主要顾虑', event.target.value)}
              placeholder="需要进一步确认或权衡的风险"
            />
          </Labeled>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-foreground-secondary">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DecisionButtons({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DecisionLevel | null;
  onChange: (value: DecisionLevel | null) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-foreground-secondary">
        {label}
      </legend>
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'rounded-lg border px-2 py-2 text-xs font-semibold',
            value === null
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border text-foreground-muted',
          )}
        >
          未评估
        </button>
        {DECISION_LEVEL_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg border px-2 py-2 text-xs font-semibold',
              value === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface-elevated text-foreground-secondary',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
