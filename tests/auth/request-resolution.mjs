// Run in a fresh Node process with --conditions=react-server so React.cache is
// exercised by the real RSC renderer, not replaced by a test memoizer.
import { registerHooks, createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import * as React from 'react';
import { renderToReadableStream } from 'next/dist/compiled/react-server-dom-webpack/server.node.js';
// Source modules are loaded only after registering the boundary substitutions.
const loadSource = createRequire(import.meta.url);
const requests = new AsyncLocalStorage();
function count(key) { requests.getStore().counts[key]++; }
let revoked = false;
let databaseFailed = false;
let updateFailed = false;
let user = { id: 'user_1', firebaseUid: 'uid_1', email: 'member@example.test', name: 'Member', image: null, emailVerified: true, isAdmin: false, ageAttestedAt: new Date(0), taskerVerification: { status: 'VERIFIED', appealCount: 0 } };
const verificationChecks = [];
const mocks = {
  'server-only': {},
  'next/headers': { headers: async () => requests.getStore().headers },
  'next/navigation': { redirect: (path) => { throw new Error(`REDIRECT:${path}`); } },
  '@/lib/auth/firebase-admin': { getFirebaseAdminAuth: () => ({ verifySessionCookie: async (cookie, checkRevoked) => {
    count('verify');
    verificationChecks.push(checkRevoked);
    await new Promise((done) => setTimeout(done, 5));
    if (revoked || cookie === 'invalid') throw new Error('auth/session-cookie-revoked');
    return { uid: cookie === 'user_2' ? 'uid_2' : 'uid_1', email: 'member@example.test', email_verified: true };
  } }) },
  '@/lib/prisma': { prisma: { user: {
    findUnique: async ({ where }) => {
      count('reads');
      await new Promise((done) => setTimeout(done, 5));
      if (databaseFailed) throw new Error('Database unavailable');
      if (!user) return null;
      if (where.firebaseUid === 'uid_2' || where.id === 'user_2') return { ...user, id: 'user_2', isAdmin: true };
      return { ...user };
    },
    update: async ({ data }) => { count('updates'); if (updateFailed) throw new Error('Update unavailable'); Object.assign(user, data); return { ...user }; },
  } } },
  'next/script': { __esModule: true, default: () => null },
  '@/components/viewer/viewer-provider': { ViewerProvider: ({ children }) => children },
};
global.__authTestMocks = mocks;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './firebase-admin' && context.parentURL?.endsWith('/auth/session.ts')) specifier = '@/lib/auth/firebase-admin';
    if (Object.hasOwn(mocks, specifier) || specifier.endsWith('.css')) return { url: `mock:${specifier}`, shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: `file://${resolve('src', specifier.slice(2))}.ts`, shortCircuit: true };
    if (specifier.startsWith('.') && context.parentURL?.startsWith(`file://${resolve('src')}/`) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return { url: new URL(`${specifier}.ts`, context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('mock:')) return { format: 'commonjs', source: `module.exports = global.__authTestMocks[${JSON.stringify(url.slice(5))}] || {};`, shortCircuit: true };
    if (/\.tsx?$/.test(url)) return { format: 'commonjs', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { loadCurrentActor } = loadSource('../../src/lib/auth/current-actor.ts');
const { loadActorById } = loadSource('../../src/lib/auth/actor.ts');
const { getAuthSession } = loadSource('../../src/lib/auth/session.ts');
const { guardPage } = loadSource('../../src/lib/auth/guard.ts');
const RootLayout = loadSource('../../src/app/layout.tsx').default;
const ProfileLayout = loadSource('../../src/app/profile/layout.tsx').default;
async function render(cookie = 'valid', includeSession = false) {
  const actors = [];
  const sessions = [];
  const errors = [];
  const counts = { verify: 0, reads: 0, updates: 0 };
  const started = performance.now();
  async function Page() {
    const [a, b] = await Promise.all([loadCurrentActor(), loadCurrentActor()]);
    actors.push(a, b);
    if (includeSession) sessions.push(await getAuthSession(new Headers(await mocks['next/headers'].headers())));
    await guardPage('view_private_account');
    return React.createElement('p', null, a?.id ?? 'guest');
  }
  await requests.run({ counts, headers: new Headers(cookie === null ? {} : { cookie: `taskhive_session=${cookie}` }) }, async () => {
    const tree = React.createElement(RootLayout, null, React.createElement(ProfileLayout, null, React.createElement(Page)));
    const stream = renderToReadableStream(tree, {}, { onError: (error) => { errors.push(error.message); return 'test-error'; } });
    for await (const chunk of stream) void chunk;
  });
  return { counts, elapsedMs: Math.round((performance.now() - started) * 100) / 100, actors, sessions, errors };
}
(async () => {
  const first = await render();
  const second = await render();
  const mixed = await render('valid', true);
  const concurrent = await Promise.all([render(), render('user_2')]);
  user = { ...user, isAdmin: true, ageAttestedAt: null, taskerVerification: { status: 'REJECTED', appealCount: 1 } };
  const changed = await render();
  user.isAdmin = false;
  const demoted = await render();
  revoked = true;
  const revokedRequest = await render();
  revoked = false;
  const invalid = await render('invalid');
  const guest = await render(null);
  databaseFailed = true;
  const unavailable = await render();
  databaseFailed = false;
  user = null;
  const missing = await render();
  user = { id: 'user_1', firebaseUid: 'uid_1', email: 'old@example.test', name: 'Member', image: null, emailVerified: false, isAdmin: false, ageAttestedAt: null, taskerVerification: null };
  const synchronized = await render('valid', true);
  user.emailVerified = false;
  updateFailed = true;
  const syncFailed = await render();
  updateFailed = false;
  const malformed = await render('%E0%A4%A');
  // Route Handlers are outside React's render cache. Even the same Headers
  // object must reverify, and explicit post-mutation actor reads must stay fresh.
  const uncached = await requests.run({ counts: { verify: 0, reads: 0, updates: 0 } }, async () => {
    const headers = new Headers({ cookie: 'taskhive_session=valid' });
    const signedIn = await getAuthSession(headers);
    revoked = true;
    const afterRevocation = await getAuthSession(headers);
    revoked = false;
    user.name = 'Updated profile';
    const afterMutation = await loadActorById(user.id);
    return { counts: requests.getStore().counts, signedIn: Boolean(signedIn), afterRevocation, afterMutation };
  });
  process.stdout.write(JSON.stringify({ first, second, mixed, concurrent, changed, demoted, synchronized, syncFailed, malformed, uncached, revokedRequest, invalid, guest, unavailable, missing, verificationChecks }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
