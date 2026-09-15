import {
  APPLICATION_PICKER_SEARCH_INPUT_CLASS,
  APPLICATION_PICKER_SEARCH_WRAPPER_CLASS,
  getApplicationPickerContentWidth,
} from '@/components/application/ApplicationSearchPicker';

describe('岗位搜索浮层宽度', () => {
  it('在快捷待办浮窗中严格跟随触发器宽度', () => {
    expect(getApplicationPickerContentWidth('contained')).toBe(
      'var(--radix-popover-trigger-width)',
    );
  });

  it('在页面场景中保留阅读宽度并受视口限制', () => {
    expect(getApplicationPickerContentWidth('standard')).toBe(
      'min(420px, calc(100vw - 32px))',
    );
  });

  it('将焦点反馈放在有安全边距的完整搜索栏上', () => {
    expect(APPLICATION_PICKER_SEARCH_WRAPPER_CLASS).toContain('m-2');
    expect(APPLICATION_PICKER_SEARCH_WRAPPER_CLASS).toContain('h-11');
    expect(APPLICATION_PICKER_SEARCH_WRAPPER_CLASS).toContain('focus-within:ring-2');
    expect(APPLICATION_PICKER_SEARCH_INPUT_CLASS).toContain('h-full');
    expect(APPLICATION_PICKER_SEARCH_INPUT_CLASS).toContain('ring-0');
    expect(APPLICATION_PICKER_SEARCH_INPUT_CLASS).toContain('focus-visible:outline-none');
  });
});
