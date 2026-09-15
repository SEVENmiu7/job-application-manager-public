import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeSpreadsheetText } from '@/pages/PrivacySettings/privacy-export';

const root: string = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

describe('个人数据管理', () => {
  it('导出和删除接口均要求登录并使用登录上下文', () => {
    const controller: string = read(
      'server/modules/data-privacy/data-privacy.controller.ts',
    );

    expect(controller.match(/@NeedLogin\(\)/g)).toHaveLength(2);
    expect(controller).toContain('req.userContext.userId');
    expect(controller).not.toContain('body.userId');
  });

  it('数据库查询和删除始终带当前用户条件', () => {
    const service: string = read(
      'server/modules/data-privacy/data-privacy.service.ts',
    );

    expect(service.match(/eq\(applications\.userId, userId\)/g)).toHaveLength(
      2,
    );
    expect(
      service.match(/eq\(interviewReviews\.userId, userId\)/g),
    ).toHaveLength(2);
    expect(service.match(/eq\(todos\.userId, userId\)/g)).toHaveLength(2);
    expect(service).not.toContain('userId: row.userId');
  });

  it('个人数据备份包含岗位对比字段', () => {
    const service: string = read(
      'server/modules/data-privacy/data-privacy.service.ts',
    );
    const exportPage: string = read(
      'client/src/pages/PrivacySettings/PrivacySettings.tsx',
    );

    for (const field of [
      'salary',
      'jobHighlights',
      'jobConcerns',
    ]) {
      expect(service).toContain(`${field}: row.${field}`);
      expect(exportPage).toContain(`application.${field}`);
    }
    expect(service).toContain('workMode: this.parseWorkMode(row.workMode)');
    expect(service).toContain(
      'fitLevel: this.parseDecisionLevel(row.fitLevel)',
    );
    expect(service).toContain(
      'interestLevel: this.parseDecisionLevel(row.interestLevel)',
    );
    for (const field of ['workMode', 'fitLevel', 'interestLevel']) {
      expect(exportPage).toContain(`application.${field}`);
    }
  });

  it('个人数据备份和清空操作包含求职待办', () => {
    const service: string = read(
      'server/modules/data-privacy/data-privacy.service.ts',
    );
    const exportPage: string = read(
      'client/src/pages/PrivacySettings/PrivacySettings.tsx',
    );

    expect(service).toContain('todos: todoRows.map');
    expect(service).toContain('.delete(todos)');
    expect(service).toContain('deletedTodos: deletedTodos.length');
    expect(exportPage).toContain("book_append_sheet(workbook, todoSheet, '求职待办')");
    expect(exportPage).toContain('result.deletedTodos');
  });

  it.each(['=SUM(A1:A2)', '+1+1', '-2+3', '@cmd'])(
    'Excel 导出会转义可能被识别为公式的文本：%s',
    (value: string) => {
      expect(safeSpreadsheetText(value)).toBe(`'${value}`);
    },
  );

  it('普通文本保持不变', () => {
    expect(safeSpreadsheetText('产品经理')).toBe('产品经理');
  });
});
