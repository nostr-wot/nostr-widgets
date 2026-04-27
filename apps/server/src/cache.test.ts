import { describe, expect, it } from 'vitest';
import { memoize } from './cache.js';

describe('memoize', () => {
  it('caches by bucket+key and reports hit on second call', async () => {
    let calls = 0;
    const compute = async () => {
      calls += 1;
      return { count: calls };
    };
    const a = await memoize('profile', 'k1', compute);
    const b = await memoize('profile', 'k1', compute);
    expect(a.hit).toBe(false);
    expect(b.hit).toBe(true);
    expect(b.value.count).toBe(1);
  });

  it('does not cache null/empty results so cold-start failures retry', async () => {
    let calls = 0;
    const compute = async (): Promise<null> => {
      calls += 1;
      return null;
    };
    const a = await memoize('follow', 'null-key', compute);
    const b = await memoize('follow', 'null-key', compute);
    expect(a.value).toBeNull();
    expect(a.hit).toBe(false);
    expect(b.hit).toBe(false);
    expect(calls).toBe(2);
  });
});
