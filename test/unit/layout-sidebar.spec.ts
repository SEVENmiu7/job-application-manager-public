import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutSource = readFileSync(
  resolve(process.cwd(), 'client/src/components/Layout.tsx'),
  'utf8',
);
const layoutStyles = readFileSync(
  resolve(process.cwd(), 'client/src/components/Layout.css'),
  'utf8',
);

describe('desktop sidebar collapse behavior', () => {
  it('does not restore hover-to-expand handlers or overlay state', () => {
    expect(layoutSource).not.toMatch(/onMouseEnter|onMouseLeave/);
    expect(layoutSource).not.toContain('sidebarHovered');
    expect(layoutStyles).not.toContain('layout-sidebar-hovered');
    expect(layoutStyles).not.toContain('margin-right: -');
  });

  it('keeps the collapsed sidebar at a fixed icon-rail width', () => {
    expect(layoutStyles).toMatch(
      /\.layout-sidebar-collapsed\s*\{[^}]*width:\s*68px;/s,
    );
    expect(layoutStyles).toMatch(
      /\.layout-sidebar-collapsed \.sidebar-header\s*\{[^}]*gap:\s*0;/s,
    );
    expect(layoutStyles).toMatch(
      /\.layout-sidebar-collapsed \.nav-item\s*\{[^}]*position:\s*relative;/s,
    );
  });

  it('isolates sticky main-content controls from the sidebar layer', () => {
    expect(layoutStyles).toMatch(
      /\.layout-main\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*0;[^}]*isolation:\s*isolate;/s,
    );
  });
});
