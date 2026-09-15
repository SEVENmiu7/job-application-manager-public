import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GitCompareArrows,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { api } from '@/api';
import { PageHeader } from '@/components/page-ui';
import { Button } from '@/components/ui/button';
import { ApplicationSearchPicker as JobSearchPicker } from '@/components/application/ApplicationSearchPicker';
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
  formatLocations,
  type ApplicationRecord,
  type DecisionLevel,
  type WorkMode,
} from '@shared/types';
import { normalizeCompareIds } from './comparison-selection';

type ReturnState = { returnPage?: number; scrollTop?: number };
type DraftFields = Partial<ApplicationRecord['fields']>;
type SectionKey = 'materials' | 'core' | 'judgment';

const INITIAL_SECTIONS: Record<SectionKey, boolean> = {
  materials: true,
  core: false,
  judgment: false,
};

const SECTION_NAV_ITEMS = [
  {
    key: 'materials',
    title: '岗位资料',
    hint: '职责 · 要求 · 备注',
    icon: FileText,
  },
  {
    key: 'core',
    title: '核心信息',
    hint: '地区 · 薪资 · 进度',
    icon: BriefcaseBusiness,
  },
  {
    key: 'judgment',
    title: '我的判断',
    hint: '匹配 · 意愿 · 取舍',
    icon: SlidersHorizontal,
  },
] as const;

export default function ApplicationCompare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ids = useMemo(
    () => normalizeCompareIds((searchParams.get('ids') || '').split(',')),
    [searchParams],
  );
  const [records, setRecords] = useState<ApplicationRecord[]>([]);
  const [allRecords, setAllRecords] = useState<ApplicationRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftFields>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] =
    useState<Record<SectionKey, boolean>>(INITIAL_SECTIONS);
  const [activeSection, setActiveSection] = useState<SectionKey>('materials');
  const desktopSectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    materials: null,
    core: null,
    judgment: null,
  });
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      Promise.all(ids.map((id) => api.getApplication(id))),
      api.listApplications(),
    ])
      .then(([selected, all]) => {
        if (!active) return;
        setRecords(
          selected.filter((item): item is ApplicationRecord => Boolean(item)),
        );
        setAllRecords(all);
        setDrafts({});
      })
      .catch((error: unknown) =>
        toast.error(
          `岗位对比加载失败：${error instanceof Error ? error.message : '未知错误'}`,
        ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ids.join(',')]);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>('.layout-main');
    if (!scrollContainer || records.length < 2) return;

    let animationFrame: number | null = null;
    const updateActiveSection = (): void => {
      animationFrame = null;
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      const activationLine =
        scrollContainer.getBoundingClientRect().top + (mobile ? 196 : 154);
      let nextActive: SectionKey = 'materials';

      if (mobile) {
        document
          .querySelectorAll<HTMLElement>('[data-compare-mobile-section]')
          .forEach((element) => {
            if (element.getBoundingClientRect().top <= activationLine) {
              nextActive = element.dataset.compareMobileSection as SectionKey;
            }
          });
      } else {
        SECTION_NAV_ITEMS.forEach(({ key }) => {
          const element = desktopSectionRefs.current[key];
          if (!element || element.getBoundingClientRect().height === 0) return;
          if (element.getBoundingClientRect().top <= activationLine) {
            nextActive = key;
          }
        });
      }
      setActiveSection((current) =>
        current === nextActive ? current : nextActive,
      );
    };
    const scheduleUpdate = (): void => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    scrollContainer.addEventListener('scroll', scheduleUpdate, {
      passive: true,
    });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();
    return () => {
      scrollContainer.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [records.length]);

  const visibleRecords = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        fields: {
          ...record.fields,
          ...(record.record_id ? drafts[record.record_id] : undefined),
        },
      })),
    [drafts, records],
  );
  const dirtyIds = Object.keys(drafts).filter(
    (id) => Object.keys(drafts[id] || {}).length > 0,
  );
  const hasDrafts = dirtyIds.length > 0;
  const allSectionsOpen = Object.values(openSections).every(Boolean);

  const changeIds = (nextIds: string[]): void => {
    if (hasDrafts) {
      toast.info('请先保存或撤销修改，再调整对比岗位');
      return;
    }
    const normalized = normalizeCompareIds(nextIds);
    navigate(`/applications/compare?ids=${normalized.join(',')}`, {
      replace: true,
      state: location.state,
    });
  };

  const updateDraft = (
    record: ApplicationRecord,
    fields: DraftFields,
  ): void => {
    const id = record.record_id;
    if (!id) return;
    setDrafts((current) => {
      const next = { ...(current[id] || {}), ...fields };
      for (const key of Object.keys(next) as (keyof DraftFields)[]) {
        if (Object.is(next[key], record.fields[key])) delete next[key];
      }
      if (Object.keys(next).length === 0) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: next };
    });
  };

  const saveDrafts = async (): Promise<void> => {
    if (!hasDrafts || saving) return;
    setSaving(true);
    const entries = dirtyIds.map((id) => [id, drafts[id]] as const);
    const submittedDrafts = Object.fromEntries(entries) as Record<
      string,
      DraftFields
    >;
    const results = await Promise.allSettled(
      entries.map(([id, fields]) => api.updateApplication(id, fields)),
    );
    const successfulIds = entries
      .filter((_, index) => results[index].status === 'fulfilled')
      .map(([id]) => id);

    if (successfulIds.length > 0) {
      setRecords((current) =>
        current.map((record) =>
          record.record_id && successfulIds.includes(record.record_id)
            ? {
                ...record,
                fields: {
                  ...record.fields,
                  ...submittedDrafts[record.record_id],
                },
              }
            : record,
        ),
      );
      setAllRecords((current) =>
        current.map((record) =>
          record.record_id && successfulIds.includes(record.record_id)
            ? {
                ...record,
                fields: {
                  ...record.fields,
                  ...submittedDrafts[record.record_id],
                },
              }
            : record,
        ),
      );
      setDrafts((current) => {
        const next = { ...current };
        successfulIds.forEach((id) => {
          const remaining = { ...(next[id] || {}) };
          for (const key of Object.keys(
            submittedDrafts[id],
          ) as (keyof DraftFields)[]) {
            if (Object.is(remaining[key], submittedDrafts[id][key])) {
              delete remaining[key];
            }
          }
          if (Object.keys(remaining).length === 0) delete next[id];
          else next[id] = remaining;
        });
        return next;
      });
    }

    const failedCount = results.length - successfulIds.length;
    if (failedCount === 0) toast.success('对比修改已保存');
    else toast.error(`${failedCount} 个岗位保存失败，修改已保留，请重试`);
    setSaving(false);
  };

  const clearJudgment = (): void => {
    records.forEach((record) =>
      updateDraft(record, {
        能力匹配: null,
        主观意愿: null,
        岗位亮点: '',
        主要顾虑: '',
      }),
    );
    setOpenSections((current) => ({ ...current, judgment: true }));
    toast.info('“我的判断”已清空，点击“保存修改”后生效');
  };

  const toggleSection = (key: SectionKey): void =>
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  const navigateToSection = (
    key: SectionKey,
    layout: 'desktop' | 'mobile',
  ): void => {
    setActiveSection(key);
    if (!openSections[key]) {
      setOpenSections((current) => ({ ...current, [key]: true }));
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scrollContainer =
          document.querySelector<HTMLElement>('.layout-main');
        const mobile = layout === 'mobile';
        const stickyOffset = mobile ? 196 : 154;
        let target: HTMLElement | null = desktopSectionRefs.current[key];
        if (mobile && scrollContainer) {
          const activationLine =
            scrollContainer.getBoundingClientRect().top + stickyOffset;
          const cards = Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-compare-mobile-card]',
            ),
          );
          const currentCard =
            cards.find((card) => {
              const rect = card.getBoundingClientRect();
              return rect.bottom > activationLine && rect.top < activationLine;
            }) || cards[0];
          target =
            currentCard?.querySelector<HTMLElement>(
              `[data-compare-mobile-section="${key}"]`,
            ) || null;
        }
        if (!target || !scrollContainer) return;
        const targetTop =
          scrollContainer.scrollTop +
          target.getBoundingClientRect().top -
          scrollContainer.getBoundingClientRect().top -
          stickyOffset;
        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        scrollContainer.scrollTo({
          top: Math.max(0, targetTop),
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      });
    });
  };

  const toggleAllSections = (): void =>
    setOpenSections(
      allSectionsOpen
        ? { materials: false, core: false, judgment: false }
        : { materials: true, core: true, judgment: true },
    );

  const syncHorizontalScroll = (
    source: HTMLDivElement,
    target: HTMLDivElement | null,
  ): void => {
    if (target && Math.abs(target.scrollLeft - source.scrollLeft) > 1) {
      target.scrollLeft = source.scrollLeft;
    }
  };

  const goBack = (): void => {
    if (hasDrafts) {
      toast.info('仍有未保存修改，请先保存或撤销');
      return;
    }
    navigate('/applications', {
      state: {
        fromCompare: true,
        returnPage: (location.state as ReturnState | null)?.returnPage,
        scrollTop: (location.state as ReturnState | null)?.scrollTop,
      },
    });
  };

  if (loading)
    return (
      <div className="glass-panel py-24 text-center text-foreground-muted">
        正在整理岗位对比…
      </div>
    );

  return (
    <div className="mx-auto max-w-[1680px] space-y-6">
      <PageHeader
        eyebrow="选岗决策"
        title="岗位对比"
        description="按岗位资料、核心信息和个人判断逐层比较；编辑后统一保存。"
        actionsClassName="md:self-end"
        leading={
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            aria-label="返回投递列表"
          >
            <ArrowLeft />
          </Button>
        }
        actions={
          records.length < 3 ? (
            <JobSearchPicker
              records={allRecords}
              excludedIds={ids}
              contentMode="standard"
              placeholder="添加岗位"
              searchPlaceholder="搜索公司、岗位或地区"
              className="w-44 sm:w-52"
              contentSideOffset={20}
              onSelect={(id) => changeIds([...ids, id])}
            />
          ) : undefined
        }
      />

      {records.length >= 2 && (
        <section className="sticky top-3 z-30 flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated/95 p-4 shadow-[var(--shadow)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            {hasDrafts ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                <SlidersHorizontal className="size-4" />
              </span>
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="size-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {hasDrafts
                  ? `${dirtyIds.length} 个岗位有未保存修改`
                  : '当前修改已保存'}
              </p>
              <p className="truncate text-xs text-foreground-muted">
                {hasDrafts
                  ? '可继续编辑，完成后统一保存'
                  : '可以安全返回或调整对比岗位'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeIds([])}
              disabled={saving}
            >
              <Trash2 className="size-4" />
              清空对比
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrafts({})}
              disabled={!hasDrafts || saving}
            >
              <RotateCcw className="size-4" />
              撤销修改
            </Button>
            <Button
              size="sm"
              onClick={saveDrafts}
              disabled={!hasDrafts || saving}
            >
              <Save className="size-4" />
              {saving ? '保存中…' : '保存修改'}
            </Button>
          </div>
        </section>
      )}

      {records.length < 2 ? (
        <section className="glass-panel px-6 py-16 text-center">
          <GitCompareArrows className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-lg font-bold">至少选择两个岗位</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            返回投递列表重新选择，最多可同时比较三个岗位。
          </p>
          <Button className="mt-5" onClick={goBack}>
            返回选择
          </Button>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface-elevated/80 shadow-[var(--shadow)] md:block">
            <div
              ref={headerScrollRef}
              className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) =>
                syncHorizontalScroll(
                  event.currentTarget,
                  contentScrollRef.current,
                )
              }
            >
              <div
                className="min-w-[920px]"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `minmax(152px,176px) repeat(${visibleRecords.length}, minmax(300px,1fr))`,
                }}
              >
                <div className="sticky left-0 z-10 border-b border-r border-border bg-surface-elevated p-5 text-[13px] font-bold text-foreground-muted">
                  对比维度
                </div>
                {visibleRecords.map((record) => (
                  <JobHeader
                    key={record.record_id}
                    record={record}
                    allRecords={allRecords}
                    ids={ids}
                    dirty={Boolean(
                      record.record_id && drafts[record.record_id],
                    )}
                    onRemove={() =>
                      changeIds(ids.filter((id) => id !== record.record_id))
                    }
                    onReplace={(nextId) =>
                      changeIds(
                        ids.map((id) =>
                          id === record.record_id ? nextId : id,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </div>

            <SectionNavigator
              layout="desktop"
              activeSection={activeSection}
              openSections={openSections}
              allSectionsOpen={allSectionsOpen}
              onNavigate={(key) => navigateToSection(key, 'desktop')}
              onToggle={toggleSection}
              onToggleAll={toggleAllSections}
            />

            <div
              ref={contentScrollRef}
              className="overflow-x-auto"
              onScroll={(event) =>
                syncHorizontalScroll(
                  event.currentTarget,
                  headerScrollRef.current,
                )
              }
            >
              <div
                className="min-w-[920px]"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `minmax(152px,176px) repeat(${visibleRecords.length}, minmax(300px,1fr))`,
                }}
              >
                <SectionHeader
                  columns={visibleRecords.length}
                  title="岗位资料"
                  description="先看职责与要求，判断岗位到底在招什么"
                  icon={FileText}
                  open={openSections.materials}
                  onToggle={() => toggleSection('materials')}
                  sectionRef={(node) => {
                    desktopSectionRefs.current.materials = node;
                  }}
                />
                {openSections.materials && (
                  <>
                    {(['岗位职责', '任职要求'] as const).map((key) => (
                      <CompareRow
                        key={key}
                        label={key}
                        records={visibleRecords}
                      >
                        {(record) => {
                          const textKey = `${record.record_id}:${key}`;
                          return (
                            <LongText
                              text={record.fields[key]}
                              expanded={Boolean(expandedText[textKey])}
                              onToggle={() =>
                                setExpandedText((current) => ({
                                  ...current,
                                  [textKey]: !current[textKey],
                                }))
                              }
                            />
                          );
                        }}
                      </CompareRow>
                    ))}
                    <CompareRow label="个人备注" records={visibleRecords}>
                      {(record) => (
                        <DraftTextarea
                          value={record.fields.个人备注 || ''}
                          placeholder="补充个人备注"
                          onChange={(value) =>
                            updateDraft(record, { 个人备注: value })
                          }
                        />
                      )}
                    </CompareRow>
                  </>
                )}

                <SectionHeader
                  columns={visibleRecords.length}
                  title="核心信息"
                  description="集中比较地点、薪资、方式与当前进度"
                  icon={BriefcaseBusiness}
                  open={openSections.core}
                  onToggle={() => toggleSection('core')}
                  sectionRef={(node) => {
                    desktopSectionRefs.current.core = node;
                  }}
                />
                {openSections.core && (
                  <>
                    <CompareRow label="工作地区" records={visibleRecords}>
                      {(record) => (
                        <Value text={formatLocations(record.fields.工作地区)} />
                      )}
                    </CompareRow>
                    <CompareRow label="薪资" records={visibleRecords}>
                      {(record) => (
                        <DraftInput
                          value={record.fields.薪资 || ''}
                          placeholder="补充薪资"
                          onChange={(value) =>
                            updateDraft(record, { 薪资: value })
                          }
                        />
                      )}
                    </CompareRow>
                    <CompareRow label="工作方式" records={visibleRecords}>
                      {(record) => (
                        <WorkModeSelect
                          value={record.fields.工作方式}
                          onChange={(value) =>
                            updateDraft(record, { 工作方式: value })
                          }
                        />
                      )}
                    </CompareRow>
                    <CompareRow label="行业 / 职能" records={visibleRecords}>
                      {(record) => (
                        <Value
                          text={[
                            record.fields.所属行业,
                            ...(record.fields.职能方向 || []),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        />
                      )}
                    </CompareRow>
                    <CompareRow label="当前进度" records={visibleRecords}>
                      {(record) => (
                        <Value text={record.fields.当前进度} strong />
                      )}
                    </CompareRow>
                  </>
                )}

                <SectionHeader
                  columns={visibleRecords.length}
                  title="我的判断"
                  description="记录匹配度、意愿、亮点和顾虑，形成选择结论"
                  icon={SlidersHorizontal}
                  open={openSections.judgment}
                  onToggle={() => toggleSection('judgment')}
                  sectionRef={(node) => {
                    desktopSectionRefs.current.judgment = node;
                  }}
                  action={
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-foreground-muted hover:bg-surface-elevated hover:text-destructive"
                      onClick={clearJudgment}
                    >
                      清空本区
                    </button>
                  }
                />
                {openSections.judgment && (
                  <>
                    <CompareRow label="能力匹配" records={visibleRecords}>
                      {(record) => (
                        <DecisionControl
                          value={record.fields.能力匹配}
                          onChange={(value) =>
                            updateDraft(record, { 能力匹配: value })
                          }
                        />
                      )}
                    </CompareRow>
                    <CompareRow label="主观意愿" records={visibleRecords}>
                      {(record) => (
                        <DecisionControl
                          value={record.fields.主观意愿}
                          onChange={(value) =>
                            updateDraft(record, { 主观意愿: value })
                          }
                        />
                      )}
                    </CompareRow>
                    <CompareRow label="岗位亮点" records={visibleRecords}>
                      {(record) => (
                        <DraftTextarea
                          value={record.fields.岗位亮点 || ''}
                          placeholder="写下最吸引你的地方"
                          onChange={(value) =>
                            updateDraft(record, { 岗位亮点: value })
                          }
                        />
                      )}
                    </CompareRow>
                    <CompareRow label="主要顾虑" records={visibleRecords}>
                      {(record) => (
                        <DraftTextarea
                          value={record.fields.主要顾虑 || ''}
                          placeholder="写下需要确认的风险"
                          onChange={(value) =>
                            updateDraft(record, { 主要顾虑: value })
                          }
                        />
                      )}
                    </CompareRow>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 md:hidden">
            <SectionNavigator
              layout="mobile"
              activeSection={activeSection}
              openSections={openSections}
              allSectionsOpen={allSectionsOpen}
              onNavigate={(key) => navigateToSection(key, 'mobile')}
              onToggle={toggleSection}
              onToggleAll={toggleAllSections}
            />
            {visibleRecords.map((record) => (
              <MobileJobCard
                key={record.record_id}
                record={record}
                dirty={Boolean(record.record_id && drafts[record.record_id])}
                openSections={openSections}
                onToggleSection={toggleSection}
                onRemove={() =>
                  changeIds(ids.filter((id) => id !== record.record_id))
                }
                onUpdate={(fields) => updateDraft(record, fields)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionNavigator({
  layout,
  activeSection,
  openSections,
  allSectionsOpen,
  onNavigate,
  onToggle,
  onToggleAll,
}: {
  layout: 'desktop' | 'mobile';
  activeSection: SectionKey;
  openSections: Record<SectionKey, boolean>;
  allSectionsOpen: boolean;
  onNavigate: (key: SectionKey) => void;
  onToggle: (key: SectionKey) => void;
  onToggleAll: () => void;
}) {
  const mobile = layout === 'mobile';
  return (
    <nav
      aria-label="对比分区导航"
      className={cn(
        'sticky z-20 border-y border-border bg-surface-elevated/95 backdrop-blur',
        mobile
          ? 'top-[132px] overflow-x-auto rounded-xl shadow-[var(--shadow)]'
          : 'top-[84px]',
      )}
    >
      <div
        className={cn(
          'flex items-stretch gap-1 p-1.5',
          mobile ? 'min-w-max' : 'w-full',
        )}
      >
        <div
          className={cn(
            'grid flex-1 grid-cols-3 gap-1',
            mobile && 'min-w-[336px]',
          )}
        >
          {SECTION_NAV_ITEMS.map(({ key, title, hint, icon: Icon }) => {
            const active = activeSection === key;
            const open = openSections[key];
            return (
              <div
                key={key}
                className={cn(
                  'relative flex min-w-0 items-center rounded-lg border transition-colors',
                  active
                    ? 'border-primary/30 bg-primary-soft text-primary'
                    : 'border-transparent text-foreground-secondary hover:border-border hover:bg-surface-muted',
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-l-lg px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => onNavigate(key)}
                  aria-current={active ? 'location' : undefined}
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-md',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-muted text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold sm:text-sm">
                      {title}
                    </span>
                    {!mobile && (
                      <span className="block truncate text-[11px] font-normal text-foreground-muted">
                        {hint}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className="flex min-h-9 w-8 shrink-0 items-center justify-center rounded-r-lg text-foreground-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => onToggle(key)}
                  aria-label={`${open ? '收起' : '展开'}${title}`}
                  aria-expanded={open}
                >
                  {open ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </button>
                {active && (
                  <span
                    className="absolute inset-x-2 -bottom-1.5 h-0.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="ml-1 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-foreground-secondary hover:border-border-strong hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onToggleAll}
          aria-label={allSectionsOpen ? '全部收起' : '全部展开'}
        >
          {allSectionsOpen ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          <span>{allSectionsOpen ? '全部收起' : '全部展开'}</span>
        </button>
      </div>
    </nav>
  );
}

function JobHeader({
  record,
  allRecords,
  ids,
  dirty,
  onRemove,
  onReplace,
}: {
  record: ApplicationRecord;
  allRecords: ApplicationRecord[];
  ids: string[];
  dirty: boolean;
  onRemove: () => void;
  onReplace: (id: string) => void;
}) {
  return (
    <div className="border-b border-border bg-surface-elevated p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-foreground">
              {record.fields.公司名称}
            </p>
            {dirty && (
              <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
                待保存
              </span>
            )}
          </div>
          <p className="truncate text-sm text-foreground-secondary">
            {record.fields.岗位名称}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onRemove}
          aria-label="移出对比"
        >
          <X />
        </Button>
      </div>
      <JobSearchPicker
        records={allRecords}
        excludedIds={ids}
        contentMode="standard"
        placeholder="替换这个岗位"
        searchPlaceholder="搜索公司、岗位或地区"
        className="mt-4 h-9 w-full text-xs"
        onSelect={onReplace}
      />
    </div>
  );
}

function SectionHeader({
  columns,
  title,
  description,
  icon: Icon,
  open,
  onToggle,
  sectionRef,
  action,
}: {
  columns: number;
  title: string;
  description: string;
  icon: typeof FileText;
  open: boolean;
  onToggle: () => void;
  sectionRef?: (node: HTMLDivElement | null) => void;
  action?: React.ReactNode;
}) {
  return (
    <div
      ref={sectionRef}
      className="flex scroll-mt-40 items-center gap-3 border-y border-border bg-surface-muted/85 px-5 py-3.5"
      style={{ gridColumn: `1 / span ${columns + 1}` }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            open
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-elevated text-primary',
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">
            {title}
          </span>
          <span className="block truncate text-xs font-normal text-foreground-muted">
            {description}
          </span>
        </span>
        <span className="text-foreground-muted">
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      </button>
      {action}
    </div>
  );
}

function CompareRow({
  label,
  records,
  children,
}: {
  label: string;
  records: ApplicationRecord[];
  children: (record: ApplicationRecord) => React.ReactNode;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 border-b border-r border-border bg-surface-elevated px-5 py-4 text-[13px] font-semibold text-foreground-muted">
        {label}
      </div>
      {records.map((record) => (
        <div
          key={`${label}-${record.record_id}`}
          className="min-w-0 border-b border-border px-5 py-4 text-sm"
        >
          {children(record)}
        </div>
      ))}
    </>
  );
}

function Value({ text, strong }: { text?: string; strong?: boolean }) {
  return (
    <p
      className={cn(
        'whitespace-pre-wrap leading-7',
        strong ? 'font-bold text-primary' : 'text-foreground-secondary',
      )}
    >
      {text || <span className="text-foreground-muted">未填写</span>}
    </p>
  );
}

function DecisionControl({
  value,
  onChange,
}: {
  value?: DecisionLevel | null;
  onChange: (value: DecisionLevel | null) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-md border px-1 py-1.5 text-xs',
          !value
            ? 'border-primary bg-primary-soft text-primary'
            : 'border-border',
        )}
      >
        未评
      </button>
      {DECISION_LEVEL_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md border px-1 py-1.5 text-xs',
            value === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DraftInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="form-input h-9 text-sm"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function DraftTextarea({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      rows={3}
      className="form-input resize-y text-sm"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function WorkModeSelect({
  value,
  onChange,
}: {
  value?: WorkMode | null;
  onChange: (value: WorkMode | null) => void;
}) {
  return (
    <Select
      value={value || 'unset'}
      onValueChange={(next) =>
        onChange(next === 'unset' ? null : (next as WorkMode))
      }
    >
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unset">未填写</SelectItem>
        {WORK_MODE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LongText({
  text,
  expanded,
  onToggle,
}: {
  text?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <p
        className={cn(
          'whitespace-pre-wrap leading-7 text-foreground-secondary',
          !expanded && 'line-clamp-4',
        )}
      >
        {text || '未填写'}
      </p>
      {text && text.length > 180 && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          {expanded ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
          {expanded ? '收起内容' : '展开内容'}
        </button>
      )}
    </div>
  );
}

function MobileJobCard({
  record,
  dirty,
  openSections,
  onToggleSection,
  onRemove,
  onUpdate,
}: {
  record: ApplicationRecord;
  dirty: boolean;
  openSections: Record<SectionKey, boolean>;
  onToggleSection: (key: SectionKey) => void;
  onRemove: () => void;
  onUpdate: (fields: DraftFields) => void;
}) {
  const fields = record.fields;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <article
      className="glass-panel overflow-hidden p-0"
      data-compare-mobile-card
    >
      <header className="flex justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-bold">{fields.公司名称}</h2>
            {dirty && (
              <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
                待保存
              </span>
            )}
          </div>
          <p className="truncate text-sm text-foreground-secondary">
            {fields.岗位名称}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="移出对比"
        >
          <X />
        </Button>
      </header>

      <MobileSection
        sectionKey="materials"
        title="岗位资料"
        icon={FileText}
        open={openSections.materials}
        onToggle={() => onToggleSection('materials')}
      >
        <DecisionBlock label="岗位职责">
          <LongText
            text={fields.岗位职责}
            expanded={Boolean(expanded.岗位职责)}
            onToggle={() =>
              setExpanded((current) => ({
                ...current,
                岗位职责: !current.岗位职责,
              }))
            }
          />
        </DecisionBlock>
        <DecisionBlock label="任职要求">
          <LongText
            text={fields.任职要求}
            expanded={Boolean(expanded.任职要求)}
            onToggle={() =>
              setExpanded((current) => ({
                ...current,
                任职要求: !current.任职要求,
              }))
            }
          />
        </DecisionBlock>
        <DecisionBlock label="个人备注">
          <DraftTextarea
            value={fields.个人备注 || ''}
            placeholder="补充个人备注"
            onChange={(value) => onUpdate({ 个人备注: value })}
          />
        </DecisionBlock>
      </MobileSection>

      <MobileSection
        sectionKey="core"
        title="核心信息"
        icon={BriefcaseBusiness}
        open={openSections.core}
        onToggle={() => onToggleSection('core')}
      >
        <div className="grid grid-cols-2 gap-3 text-sm">
          <DecisionBlock label="地区">
            <Value text={formatLocations(fields.工作地区)} />
          </DecisionBlock>
          <DecisionBlock label="薪资">
            <DraftInput
              value={fields.薪资 || ''}
              placeholder="补充薪资"
              onChange={(value) => onUpdate({ 薪资: value })}
            />
          </DecisionBlock>
          <DecisionBlock label="工作方式">
            <WorkModeSelect
              value={fields.工作方式}
              onChange={(value) => onUpdate({ 工作方式: value })}
            />
          </DecisionBlock>
          <DecisionBlock label="当前进度">
            <Value text={fields.当前进度} strong />
          </DecisionBlock>
        </div>
        <DecisionBlock label="行业 / 职能">
          <Value
            text={[fields.所属行业, ...(fields.职能方向 || [])]
              .filter(Boolean)
              .join(' · ')}
          />
        </DecisionBlock>
      </MobileSection>

      <MobileSection
        sectionKey="judgment"
        title="我的判断"
        icon={SlidersHorizontal}
        open={openSections.judgment}
        onToggle={() => onToggleSection('judgment')}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DecisionBlock label="能力匹配">
            <DecisionControl
              value={fields.能力匹配}
              onChange={(value) => onUpdate({ 能力匹配: value })}
            />
          </DecisionBlock>
          <DecisionBlock label="主观意愿">
            <DecisionControl
              value={fields.主观意愿}
              onChange={(value) => onUpdate({ 主观意愿: value })}
            />
          </DecisionBlock>
        </div>
        <DecisionBlock label="岗位亮点">
          <DraftTextarea
            value={fields.岗位亮点 || ''}
            placeholder="写下岗位亮点"
            onChange={(value) => onUpdate({ 岗位亮点: value })}
          />
        </DecisionBlock>
        <DecisionBlock label="主要顾虑">
          <DraftTextarea
            value={fields.主要顾虑 || ''}
            placeholder="写下主要顾虑"
            onChange={(value) => onUpdate({ 主要顾虑: value })}
          />
        </DecisionBlock>
      </MobileSection>
    </article>
  );
}

function MobileSection({
  sectionKey,
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  sectionKey: SectionKey;
  title: string;
  icon: typeof FileText;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className="scroll-mt-48 border-t border-border"
      data-compare-mobile-section={sectionKey}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 bg-surface-muted px-4 py-3 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-lg',
            open
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-elevated text-primary',
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="flex-1 text-sm font-bold">{title}</span>
        {open ? (
          <ChevronUp className="size-4 text-foreground-muted" />
        ) : (
          <ChevronDown className="size-4 text-foreground-muted" />
        )}
      </button>
      {open && <div className="space-y-4 p-4">{children}</div>}
    </section>
  );
}

function DecisionBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-bold text-foreground-muted">
        {label}
      </h3>
      {children}
    </section>
  );
}
