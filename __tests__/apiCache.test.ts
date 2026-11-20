import {
  clearCachedApiData,
  fetchCachedApiData,
  getCachedApiData,
  invalidateCachedApiData,
} from '../src/apiCache';

describe('API data cache', () => {
  beforeEach(() => {
    clearCachedApiData();
  });

  it('reuses successful data on later screen visits', async () => {
    const fetcher = jest.fn().mockResolvedValue([{ id: 1 }]);

    await expect(fetchCachedApiData('products', fetcher)).resolves.toEqual([
      { id: 1 },
    ]);
    await expect(fetchCachedApiData('products', fetcher)).resolves.toEqual([
      { id: 1 },
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('deduplicates requests that are still in flight', async () => {
    let resolveRequest!: (value: string[]) => void;
    const fetcher = jest.fn(
      () =>
        new Promise<string[]>(resolve => {
          resolveRequest = resolve;
        }),
    );

    const firstRequest = fetchCachedApiData('orders', fetcher);
    const secondRequest = fetchCachedApiData('orders', fetcher);
    resolveRequest(['order-1']);

    await expect(firstRequest).resolves.toEqual(['order-1']);
    await expect(secondRequest).resolves.toEqual(['order-1']);
    expect(firstRequest).toBe(secondRequest);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refreshes or invalidates cached data explicitly', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('fresh')
      .mockResolvedValueOnce('after-invalidation');

    await fetchCachedApiData('profile', fetcher);
    await expect(fetchCachedApiData('profile', fetcher, true)).resolves.toBe(
      'fresh',
    );
    expect(getCachedApiData('profile')).toBe('fresh');

    invalidateCachedApiData('profile');
    await expect(fetchCachedApiData('profile', fetcher)).resolves.toBe(
      'after-invalidation',
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
