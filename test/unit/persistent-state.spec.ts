import {
  createStoredState,
  parseStoredState,
} from '../../client/src/lib/persistent-state';

describe('parseStoredState', () => {
  it('restores a draft that has not expired', () => {
    const value = { companyName: '示例公司', jobTitle: '产品经理' };
    expect(
      parseStoredState(
        JSON.stringify({ value, savedAt: 1_000, expiresAt: 3_000 }),
        2_000,
      ),
    ).toEqual({ value, savedAt: 1_000 });
  });

  it('ignores an expired draft', () => {
    expect(
      parseStoredState(
        JSON.stringify({
          value: { jobTitle: '产品经理' },
          savedAt: 1_000,
          expiresAt: 2_000,
        }),
        2_000,
      ),
    ).toBeNull();
  });

  it('ignores an invalid payload', () => {
    expect(parseStoredState(JSON.stringify({ value: {} }), 2_000)).toBeNull();
  });

  it('sets the expiry from the retention period', () => {
    expect(createStoredState('草稿', 1_000, 7_000)).toEqual({
      value: '草稿',
      savedAt: 1_000,
      expiresAt: 8_000,
    });
  });
});
