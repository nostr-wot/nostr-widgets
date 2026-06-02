import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAndEncode } from './avatar.js';
import { config } from './config.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

describe('fetchAndEncode size handling', () => {
  it('returns null when streamed body exceeds avatarMaxBytes (no content-length header)', async () => {
    const chunk = new Uint8Array(64 * 1024);
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total <= config.avatarMaxBytes + chunk.byteLength) {
      chunks.push(chunk);
      total += chunk.byteLength;
    }

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(streamOf(chunks), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAndEncode('https://example.com/huge.jpg');
    expect(result).toBeNull();
  });

  it('rejects upfront when content-length exceeds avatarMaxBytes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(streamOf([new Uint8Array(1)]), {
        status: 200,
        headers: {
          'content-type': 'image/jpeg',
          'content-length': String(config.avatarMaxBytes + 1),
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAndEncode('https://example.com/lying.jpg');
    expect(result).toBeNull();
  });

  it('rejects disallowed content types', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(streamOf([new Uint8Array(8)]), {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAndEncode('https://example.com/not-an-image');
    expect(result).toBeNull();
  });
});
