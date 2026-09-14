import { sealData, unsealData } from 'iron-session';

// Split one authenticated ciphertext, never independently trusted session pieces.
// Leave ample room under each browser cookie's 4KB limit and bound total headers.
const CHUNK_SIZE = 3000;
const MAX_CHUNKS = 3;
const TTL = 14 * 24 * 60 * 60;

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export interface CookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: CookieOptions): void;
}

export async function getCookieSession<T extends object>(
  store: CookieStore,
  options: { password: string; cookieName: string; secure: boolean },
) {
  if (options.password.length < 32)
    throw new Error('Session password must be at least 32 characters');
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL - 60,
  };
  const chunkName = (index: number) =>
    index === 0 ? options.cookieName : `${options.cookieName}.${index}`;
  const first = store.get(options.cookieName)?.value ?? '';
  // Accept the original single-cookie format so existing sessions keep working.
  let seal = first;
  if (first.startsWith('chunks:')) {
    const match = /^chunks:([1-3]):(.*)$/.exec(first);
    seal = '';
    if (match) {
      const chunks = [match[2] ?? ''];
      for (let index = 1; index < Number(match[1]); index++) {
        chunks.push(store.get(chunkName(index))?.value ?? '');
      }
      if (chunks.every((chunk) => chunk.length > 0 && chunk.length <= CHUNK_SIZE)) {
        seal = chunks.join('');
      }
    }
  }
  const session = (
    seal ? await unsealData<T>(seal, { password: options.password, ttl: TTL }) : {}
  ) as T & { save(): Promise<void>; destroy(): void };

  function clearChunks(start: number) {
    for (let index = start; index < MAX_CHUNKS; index++) {
      if (store.get(chunkName(index))) {
        store.set(chunkName(index), '', { ...cookieOptions, maxAge: 0 });
      }
    }
  }

  Object.defineProperties(session, {
    save: {
      value: async () => {
        const sealed = await sealData(session, { password: options.password, ttl: TTL });
        const count = Math.ceil(sealed.length / CHUNK_SIZE);
        // Validate before writing anything; failed saves leave existing cookies intact.
        if (count > MAX_CHUNKS) throw new Error('Encrypted session is too large');
        for (let index = 0; index < count; index++) {
          const chunk = sealed.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
          store.set(
            chunkName(index),
            index === 0 ? `chunks:${count}:${chunk}` : chunk,
            cookieOptions,
          );
        }
        clearChunks(count);
      },
    },
    destroy: {
      value: () => {
        for (const key of Object.keys(session)) delete session[key as keyof T];
        clearChunks(0);
      },
    },
  });
  return session;
}
