import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { App } from '../../src/web/App';
import { addVote, removeVote, votesUsed } from '../../src/web/PickScreen';
import { standings, type Votes } from '../../src/shared/ballot';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = 'test-owner-key-0123456789abcdefghijklmnop';
const STORAGE = 'candy-vote-owner-key';

describe('vote helpers', () => {
  it('adds votes up to three, stacking on one candy', () => {
    let votes = addVote({}, 'reeses');
    votes = addVote(votes, 'reeses');
    votes = addVote(votes, 'twix');
    expect(votes).toEqual({ reeses: 2, twix: 1 });
    expect(addVote(votes, 'kitkat')).toBe(votes);
    expect(votesUsed(votes)).toBe(3);
  });

  it('takes a vote back and drops a candy at zero', () => {
    expect(removeVote({ reeses: 2 }, 'reeses')).toEqual({ reeses: 1 });
    expect(removeVote({ reeses: 1, twix: 1 }, 'reeses')).toEqual({ twix: 1 });
  });
});

describe('prerendered page', () => {
  it('ships the standings screen, with no voting and no owner controls', () => {
    const html = renderToString(<App />);
    expect(html).toContain('The Standings');
    expect(html).toContain('Counting the votes');
    expect(html).not.toContain('Start voting');
    expect(html).not.toContain('Give it a vote');
  });
});

/** A stand-in for the server: the same rules as the real routes, held in memory. */
function fakeServer() {
  const state = { ballots: [] as Votes[], open: false, deletes: 0 };
  const isOwner = (init?: RequestInit) =>
    (init?.headers as Record<string, string> | undefined)?.Authorization === `Bearer ${KEY}`;
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetch = vi.fn(async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (path === '/api/me') return reply(200, { owner: isOwner(init) });
    if (path === '/api/standings') {
      return reply(200, { ...standings(state.ballots), votingOpen: state.open });
    }
    if (!isOwner(init)) return reply(403, { error: 'only the owner device can do this' });
    if (path === '/api/voting') {
      state.open = (JSON.parse(init?.body as string) as { open: boolean }).open;
      return reply(200, { votingOpen: state.open });
    }
    if (path === '/api/ballots' && method === 'POST') {
      if (!state.open) return reply(409, { error: 'voting is closed' });
      state.ballots.push((JSON.parse(init?.body as string) as { votes: Votes }).votes);
      return reply(201, { ok: true });
    }
    if (path === '/api/ballots' && method === 'DELETE') {
      state.ballots = [];
      state.deletes += 1;
      return reply(200, { ok: true });
    }
    return reply(404, {});
  });
  return { state, fetch };
}

describe('the page in a browser', () => {
  let container: HTMLDivElement;
  let root: Root;
  let server: ReturnType<typeof fakeServer>;

  const buttons = () => [...container.querySelectorAll('button')];
  const find = (label: RegExp) =>
    buttons().find((b) => label.test(b.getAttribute('aria-label') ?? b.textContent ?? ''));
  const button = (label: RegExp): HTMLButtonElement => {
    const found = find(label);
    if (!found) throw new Error(`no button matching ${label} in: ${container.textContent}`);
    return found;
  };
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }
  };
  const click = async (label: RegExp) => {
    await act(async () => {
      button(label).click();
    });
    await settle();
  };
  const text = () => container.textContent ?? '';
  const open = async (hash = '') => {
    window.history.replaceState(null, '', `/${hash}`);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
    await settle();
  };

  beforeEach(() => {
    server = fakeServer();
    vi.stubGlobal('fetch', server.fetch);
    // Node 26's own `localStorage` global (undefined without --localstorage-file) hides jsdom's,
    // so each test gets a fresh in-memory one.
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, String(value)),
      removeItem: (key: string) => void items.delete(key),
      clear: () => items.clear(),
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('shows anyone else only the standings', async () => {
    server.state.ballots.push({ reeses: 3 }, { kitkat: 2, reeses: 1 });
    await open();
    expect(text()).toContain('2 kids have voted so far');
    expect(text()).toContain('Voting is closed.');
    expect(text()).toContain("Reese's Cups4 votes");
    expect(text()).toContain('No votes yet');
    expect(text()).not.toContain('0 votes');
    for (const label of [/Start voting/, /Erase all votes/, /Next voter/, /Stop voting/]) {
      expect(find(label)).toBeUndefined();
    }
  });

  it('takes the key from a setup link, hides it, and gives the owner the controls', async () => {
    await open(`#owner=${KEY}`);
    expect(window.location.hash).toBe('');
    expect(window.localStorage.getItem(STORAGE)).toBe(KEY);
    expect(button(/^Start voting$/)).toBeTruthy();
  });

  it('runs a voting cycle on the owner device: start, kids vote, stop', async () => {
    window.localStorage.setItem(STORAGE, KEY);
    await open();

    await click(/^Start voting$/);
    expect(server.state.open).toBe(true);
    expect(text()).toContain('3 votes left');

    await click(/^Kit Kat, no votes/);
    await click(/^Kit Kat, 1 vote/);
    await click(/^Twix, no votes/);
    expect(text()).toContain('All 3 votes used!');
    expect(button(/^Reese's Cups, no votes/).disabled).toBe(true);
    await click(/^Take a vote back from Twix/);
    await click(/^Kit Kat, 2 votes/);
    await click(/^I'm done!$/);
    expect(text()).toContain('Your vote is in!');
    expect(server.state.ballots).toEqual([{ kitkat: 3 }]);

    await click(/^Next voter$/);
    await click(/^Crunch, no votes/);
    await click(/^I'm done!$/);
    expect(server.state.ballots).toEqual([{ kitkat: 3 }, { crunch: 1 }]);

    await click(/^Next voter$/);
    await click(/^See the standings$/);
    expect(text()).toContain('Voting is open!');
    expect(text()).toContain('2 kids have voted so far');
    await click(/^Stop voting$/);
    expect(server.state.open).toBe(false);
    expect(text()).toContain('Voting is closed.');
    expect(button(/^Start voting$/)).toBeTruthy();
  });

  it('says so when voting was stopped before a kid finished', async () => {
    window.localStorage.setItem(STORAGE, KEY);
    await open();
    await click(/^Start voting$/);
    await click(/^Snickers, no votes/);
    server.state.open = false;
    await click(/^I'm done!$/);
    expect(text()).toContain('Voting is closed right now');
    expect(server.state.ballots).toEqual([]);
  });

  it('erases only after the owner confirms', async () => {
    window.localStorage.setItem(STORAGE, KEY);
    server.state.ballots.push({ reeses: 3 }, { twix: 1 });
    await open();
    await click(/^Erase all votes$/);
    expect(text()).toContain("Erase the votes of all 2 kids? This can't be undone.");
    expect(server.state.deletes).toBe(0);
    await click(/^Yes, erase$/);
    expect(server.state.deletes).toBe(1);
    expect(text()).toContain('Nobody has voted yet.');
  });

  it('drops a setup link the server refuses and stays a viewer', async () => {
    await open('#owner=not-the-right-key-0123456789abcdefghij');
    expect(text()).toContain("That setup link didn't work on this device.");
    expect(window.localStorage.getItem(STORAGE)).toBeNull();
    expect(find(/Start voting/)).toBeUndefined();
  });
});
