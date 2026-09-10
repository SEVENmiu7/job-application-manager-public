import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root: string = process.cwd();
const read = (path: string): string =>
  readFileSync(join(root, path), 'utf8');

describe('公开多人版安全边界', () => {
  it('所有业务接口都要求登录并从登录上下文取得用户 ID', () => {
    const applicationController: string = read(
      'server/modules/application/application.controller.ts',
    );
    const reviewController: string = read(
      'server/modules/interview-review/interview-review.controller.ts',
    );

    expect(applicationController.match(/@NeedLogin\(\)/g)).toHaveLength(7);
    expect(reviewController.match(/@NeedLogin\(\)/g)).toHaveLength(5);
    expect(applicationController).not.toContain('body.userId');
    expect(reviewController).not.toContain('body.userId');
    expect(applicationController).toContain('req.userContext.userId');
    expect(reviewController).toContain('req.userContext.userId');
  });

  it('投递与复盘的详情和写操作均包含用户归属条件', () => {
    const applicationService: string = read(
      'server/modules/application/application.service.ts',
    );
    const reviewService: string = read(
      'server/modules/interview-review/interview-review.service.ts',
    );

    expect(applicationService).toContain(
      'eq(applications.userId, userId)',
    );
    expect(applicationService).toContain(
      'and(eq(applications.id, id), eq(applications.userId, userId))',
    );
    expect(reviewService).toContain(
      'eq(interviewReviews.userId, userId)',
    );
    expect(reviewService).toContain(
      'and(eq(applications.id, applicationId), eq(applications.userId, userId))',
    );
  });

  it('数据库策略仅允许本人读写并拒绝匿名访问', () => {
    const applicationsMigration: string = read(
      'server/database/migrations/001_create_applications.sql',
    );
    const reviewsMigration: string = read(
      'server/database/migrations/003_create_interview_reviews.sql',
    );

    for (const migration of [applicationsMigration, reviewsMigration]) {
      expect(migration).toContain('authenticated_modify_own_policy');
      expect(migration).toContain('authenticated_read_own_policy');
      expect(migration).toContain(
        "user_id = current_setting('app.user_id', TRUE)",
      );
      expect(migration).toContain('anon_denied_policy');
      expect(migration).toContain('TO anon USING (false)');
    }
    expect(applicationsMigration).not.toContain(
      'authenticated_modify_all_policy',
    );
    expect(applicationsMigration).not.toContain('public_read_policy');
  });

  it('空账号不会自动生成演示数据', () => {
    const applicationService: string = read(
      'server/modules/application/application.service.ts',
    );

    expect(applicationService).not.toContain('ensureDemoData');
    expect(applicationService).not.toContain('DEMO_APPLICATION_SEEDS');
    expect(
      existsSync(
        join(
          root,
          'server/modules/application/demo-applications.ts',
        ),
      ),
    ).toBe(false);
  });
});
