import {
  normalizeCompareIds,
  toggleCompareId,
} from '../../client/src/pages/ApplicationCompare/comparison-selection';

describe('岗位对比选择', () => {
  it('去重并限制为三个岗位', () => {
    expect(normalizeCompareIds(['a', 'a', 'b', 'c', 'd'])).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('可添加、取消，并在超过上限时保持原选择', () => {
    expect(toggleCompareId(['a'], 'b')).toEqual({
      ids: ['a', 'b'],
      limitReached: false,
    });
    expect(toggleCompareId(['a', 'b'], 'a').ids).toEqual(['b']);
    expect(toggleCompareId(['a', 'b', 'c'], 'd')).toEqual({
      ids: ['a', 'b', 'c'],
      limitReached: true,
    });
  });
});
