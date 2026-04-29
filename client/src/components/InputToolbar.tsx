import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { REASONING_EFFORTS, type AgentDefaults, type AgentModelGroup, type ReasoningEffort, type UsageStats } from '@shared/types';

function formatTokenCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 100_000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n / 1000)}K`;
}

const MAX_CONTEXT = 128_000;

export function ContextRing({ usage }: { usage: UsageStats }) {
  const pct = Math.round((usage.input_tokens / MAX_CONTEXT) * 100);
  const clampedPct = Math.min(pct, 100);

  const size = 26;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedPct / 100);

  const exceeded = pct > 100;
  let colorClass: string;
  if (pct > 85) colorClass = 'text-red-500';
  else if (pct > 60) colorClass = 'text-amber-500';
  else colorClass = 'text-zinc-400 dark:text-zinc-500';

  return (
    <div className="relative group cursor-default">
      <div className="relative w-[26px] h-[26px]">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-zinc-200 dark:stroke-zinc-700"
          />
          {pct > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className={`${colorClass} transition-[stroke-dashoffset] duration-700 ease-out`}
            />
          )}
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums leading-none ${colorClass}`}
        >
          {pct}
        </span>
      </div>

      <div className="absolute bottom-full right-0 mb-2.5 z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
        <div className="w-48 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Context window
          </p>
          {exceeded && (
            <p className="text-xs text-red-500 mb-0.5">{pct}% used (exceeded)</p>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {formatTokenCount(usage.input_tokens)} / {formatTokenCount(MAX_CONTEXT)} tokens used
          </p>
        </div>
        <div className="absolute -bottom-[3px] right-[9px] w-1.5 h-1.5 bg-white dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700 rotate-45" />
      </div>
    </div>
  );
}

const REASONING_LABELS: Record<ReasoningEffort, string> = {
  none: 'None',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'X-High',
};

interface ToolbarSelectOption {
  value: string;
  label: string;
  group?: string;
}

interface ToolbarSelectProps {
  icon: LucideIcon;
  value: string;
  options: ToolbarSelectOption[];
  disabled?: boolean;
  title: string;
  labelMaxWidthClass?: string;
  minMenuWidth?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
}

function ToolbarSelect({
  icon: Icon,
  value,
  options,
  disabled = false,
  title,
  labelMaxWidthClass = 'max-w-[11rem] sm:max-w-[14rem]',
  minMenuWidth = 180,
  searchable = false,
  searchPlaceholder = 'Search...',
  onChange,
}: ToolbarSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedOption = options[selectedIndex] ?? options[0];
  const filteredOptions = useMemo(() => {
    if (!searchable) return options;

    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return options;

    return options.filter((option) => {
      const searchableText = [
        option.label,
        option.value,
        option.group ?? '',
      ].join(' ').toLowerCase();

      return terms.every((term) => searchableText.includes(term));
    });
  }, [options, query, searchable]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const padding = 8;
    const gap = 8;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 260;
    const width = Math.min(
      Math.max(rect.width, minMenuWidth),
      window.innerWidth - padding * 2,
    );
    const left = Math.min(
      Math.max(rect.left, padding),
      window.innerWidth - width - padding,
    );

    const top = Math.max(padding, rect.top - menuHeight - gap);

    setMenuStyle((prev) => {
      if (prev && prev.left === left && prev.top === top && prev.width === width) return prev;
      return { position: 'fixed', zIndex: 50, left, top, width };
    });
  }, [minMenuWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [filteredOptions.length, open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    setQuery('');

    if (searchable) {
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const nextSelectedIndex = filteredOptions.findIndex((option) => option.value === value);
    setActiveIndex(Math.max(0, nextSelectedIndex));
  }, [filteredOptions, open, value]);

  const choose = useCallback((option: ToolbarSelectOption) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      const isSearchField = event.target === searchRef.current;

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (isSearchField && !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(Math.max(filteredOptions.length - 1, 0));
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        if (isSearchField && event.key === ' ') return;
        event.preventDefault();
        const next = filteredOptions[activeIndexRef.current];
        if (!next) return;
        choose(next);
      }
    }

    document.addEventListener('mousedown', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [choose, filteredOptions, open, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/70"
      >
        <Icon size={12} className="shrink-0" />
        <span className={`min-w-0 truncate ${labelMaxWidthClass}`}>
          {selectedOption?.label ?? 'Select'}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={menuStyle ?? { position: 'fixed', left: -9999, top: -9999, zIndex: 50 }}
          className="rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl outline-none dark:border-zinc-700 dark:bg-zinc-900"
        >
          {searchable && (
            <div className="px-2 pb-1.5">
              <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                <Search size={14} className="shrink-0" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>
          )}

          <div
            id={menuId}
            role="listbox"
            aria-activedescendant={filteredOptions.length > 0 ? `${menuId}-${activeIndex}` : undefined}
            className="max-h-64 overflow-y-auto"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No matches
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const previousGroup = index > 0 ? filteredOptions[index - 1].group : undefined;
                const showGroup = option.group && option.group !== previousGroup;
                const selected = option.value === value;
                const active = index === activeIndex;

                return (
                  <Fragment key={`${option.group ?? 'root'}:${option.value}`}>
                    {showGroup && (
                      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        {option.group}
                      </div>
                    )}
                    <button
                      id={`${menuId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(option)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <Check
                        size={14}
                        className={`shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  </Fragment>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

interface InputToolbarProps {
  model: string | null;
  reasoningEffort: ReasoningEffort | null;
  defaults?: AgentDefaults | null;
  modelGroups?: AgentModelGroup[];
  disabled?: boolean;
  onModelChange: (model: string | null) => void;
  onReasoningEffortChange: (effort: ReasoningEffort | null) => void;
}

function hasModel(groups: AgentModelGroup[] | undefined, model: string | null): boolean {
  if (!model) return true;
  return Boolean(groups?.some((group) => group.models.some((option) => option.id === model)));
}

export function InputToolbar({
  model,
  reasoningEffort,
  defaults,
  modelGroups = [],
  disabled = false,
  onModelChange,
  onReasoningEffortChange,
}: InputToolbarProps) {
  const defaultModel = defaults?.model ?? null;
  const defaultReasoning = defaults?.reasoningEffort ?? null;
  const selectedModelMissing = !hasModel(modelGroups, model);
  const modelOptions = useMemo(() => {
    const options: ToolbarSelectOption[] = [
      {
        value: '',
        label: defaultModel ? `Inherit: ${defaultModel}` : 'Inherit default',
      },
    ];

    if (selectedModelMissing && model) {
      options.push({ value: model, label: model, group: 'Current' });
    }

    for (const group of modelGroups) {
      for (const option of group.models) {
        options.push({
          value: option.id,
          label: option.label,
          group: group.provider,
        });
      }
    }

    return options;
  }, [defaultModel, model, modelGroups, selectedModelMissing]);

  const reasoningOptions = useMemo<ToolbarSelectOption[]>(() => [
    {
      value: '',
      label: defaultReasoning ? `Inherit: ${REASONING_LABELS[defaultReasoning]}` : 'Inherit default',
    },
    ...REASONING_EFFORTS.map((effort) => ({
      value: effort,
      label: REASONING_LABELS[effort],
    })),
  ], [defaultReasoning]);

  return (
    <div className="flex items-center gap-2 min-w-0 flex-wrap">
      <ToolbarSelect
        icon={Sparkles}
        value={model ?? ''}
        options={modelOptions}
        disabled={disabled}
        title={model ? `Model: ${model}` : defaultModel ? `Inherits ${defaultModel}` : 'Inherits default model'}
        labelMaxWidthClass="max-w-[13rem] sm:max-w-[18rem]"
        minMenuWidth={280}
        searchable
        searchPlaceholder="Search models or providers..."
        onChange={(nextModel) => onModelChange(nextModel || null)}
      />

      <ToolbarSelect
        icon={Zap}
        value={reasoningEffort ?? ''}
        options={reasoningOptions}
        disabled={disabled}
        title={reasoningEffort ? `Reasoning: ${reasoningEffort}` : defaultReasoning ? `Inherits ${defaultReasoning}` : 'Inherits default reasoning'}
        minMenuWidth={180}
        onChange={(nextReasoning) => onReasoningEffortChange((nextReasoning || null) as ReasoningEffort | null)}
      />
    </div>
  );
}
