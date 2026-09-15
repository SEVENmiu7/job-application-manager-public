import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Download,
  ListChecks,
  LayoutGrid,
  List,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';

import { AppearanceMenu } from './theme/AppearanceMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useMediaQuery, useSidebarCollapsed } from '@/hooks/useMediaQuery';
import './Layout.css';
import './todo/todo.css';
import { TodoBubble } from './todo/TodoBubble';
import { TodoProvider, useTodoSummary } from './todo/TodoProvider';

interface NavigationItem {
  path: string;
  label: string;
  icon: typeof LayoutGrid;
  exact: boolean;
}

const NAV_ITEMS: NavigationItem[] = [
  { path: '/', label: '投递看板', icon: LayoutGrid, exact: true },
  {
    path: '/applications',
    label: '投递列表',
    icon: List,
    exact: true,
  },
  {
    path: '/applications/new',
    label: '添加投递',
    icon: PlusCircle,
    exact: true,
  },
  { path: '/scraping', label: '岗位采集', icon: Download, exact: false },
  { path: '/todos', label: '求职待办', icon: ListChecks, exact: true },
];

export default function Layout() {
  return (
    <TodoProvider>
      <LayoutContent />
    </TodoProvider>
  );
}

function LayoutContent() {
  const location = useLocation();
  const { summary } = useTodoSummary();
  const automaticSidebarCollapsed: boolean = useSidebarCollapsed();
  const isMobile: boolean = useMediaQuery('(max-width: 767px)');
  const [manualSidebarCollapsed, setManualSidebarCollapsed] = useState<
    boolean | null
  >(() => {
    const saved: string | null = window.localStorage.getItem(
      'qz-sidebar-collapsed',
    );
    return saved === null ? null : saved === 'true';
  });
  const sidebarCollapsed: boolean =
    !isMobile &&
    (manualSidebarCollapsed === null
      ? automaticSidebarCollapsed
      : manualSidebarCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const toggleSidebar = (): void => {
    setManualSidebarCollapsed((current: boolean | null) => {
      const effectiveCollapsed: boolean =
        current === null ? automaticSidebarCollapsed : current;
      const nextCollapsed: boolean = !effectiveCollapsed;
      window.localStorage.setItem(
        'qz-sidebar-collapsed',
        String(nextCollapsed),
      );
      return nextCollapsed;
    });
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const renderNavItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const active: boolean =
      item.path === '/applications'
        ? location.pathname === '/applications' ||
          location.pathname.startsWith('/applications/edit/') ||
          location.pathname.startsWith('/applications/compare')
        : item.exact
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path);
    const link = (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.exact}
        className={`nav-item ${active ? 'nav-item-active' : ''}`}
        aria-label={item.label}
      >
        <Icon className="nav-icon" />
        <span className="nav-label">{item.label}</span>
        {item.path === '/todos' &&
          summary.overdueCount + summary.todayCount > 0 && (
            <span
              className="nav-count-badge"
              aria-label={`${summary.overdueCount} 项逾期，${summary.todayCount} 项今天到期`}
            >
              {Math.min(summary.overdueCount + summary.todayCount, 99)}
            </span>
          )}
      </NavLink>
    );
    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.path} delayDuration={300}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <div className="layout-root">
      <header className="mobile-header">
        <div className="mobile-brand">
          <span className="mobile-logo" aria-hidden="true">
            <Target />
          </span>
          <div>
            <div className="sidebar-title">求职投递管理器</div>
            <div className="sidebar-subtitle">个人工作台</div>
          </div>
        </div>
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen((open: boolean) => !open)}
          aria-label={mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="关闭导航菜单"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`layout-sidebar ${mobileMenuOpen ? 'layout-sidebar-open' : ''} ${
          sidebarCollapsed ? 'layout-sidebar-collapsed' : ''
        }`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo" aria-hidden="true">
            <Target />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-title">求职投递管理器</div>
            <div className="sidebar-subtitle">个人工作台</div>
          </div>
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            aria-pressed={sidebarCollapsed}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="主导航">
          {NAV_ITEMS.map((item: NavigationItem) => renderNavItem(item))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-appearance">
            <AppearanceMenu />
          </div>
          {renderNavItem({
            path: '/privacy',
            label: '数据与隐私',
            icon: ShieldCheck,
            exact: true,
          })}
        </div>
      </aside>

      <main className="layout-main">
        <Outlet />
      </main>
      <TodoBubble />
    </div>
  );
}
