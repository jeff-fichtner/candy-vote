import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { App } from '../../src/web/App';
import { addVote, removeVote, votesUsed } from '../../src/web/PickScreen';
import { CANDIES } from '../../src/shared/candies';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  it('ships the voting screen with every candy and no votes used', () => {
    const html = renderToString(<App />);
    expect(html).toContain('King Size Showdown');
    for (const candy of CANDIES) {
      expect(html).toContain(candy.name.replaceAll('&', '&amp;').replaceAll("'", '&#x27;'));
    }
    expect(html).toContain('3 votes left');
  });
});

describe('voting on one device', () => {
  let container: HTMLDivElement;
  let root: Root;
  const fetchMock = vi.fn();

  const button = (label: RegExp): HTMLButtonElement => {
    const found = [...container.querySelectorAll('button')].find((b) =>
      label.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
    );
    if (!found) throw new Error(`no button matching ${label}`);
    return found;
  };
  const click = async (label: RegExp) => {
    await act(async () => {
      button(label).click();
    });
  };
  const text = () => container.textContent ?? '';

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('stacks votes, locks the other candies at three, and saves the ballot', async () => {
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 201 }));
    expect(button(/^I'm done!$/).disabled).toBe(true);

    await click(/^Kit Kat, no votes/);
    await click(/^Kit Kat, 1 vote/);
    await click(/^Twix, no votes/);
    expect(text()).toContain('All 3 votes used!');
    expect(button(/^Reese's Cups, no votes/).disabled).toBe(true);

    await click(/^Take a vote back from Twix/);
    expect(text()).toContain('1 vote left');
    await click(/^Kit Kat, 2 votes/);

    await click(/^I'm done!$/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/ballots');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ votes: { kitkat: 3 } });
    expect(text()).toContain('Your vote is in!');

    await click(/^Next voter$/);
    expect(text()).toContain('3 votes left');
    expect(button(/^Kit Kat, no votes/)).toBeTruthy();
  });

  it('lets a kid finish after one vote', async () => {
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 201 }));
    await click(/^Crunch, no votes/);
    expect(button(/^I'm done!$/).disabled).toBe(false);
    await click(/^I'm done!$/);
    expect(
      JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string),
    ).toEqual({ votes: { crunch: 1 } });
  });

  it('keeps the votes on screen and says so when saving fails', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"x"}', { status: 500 }));
    await click(/^Snickers, no votes/);
    await click(/^I'm done!$/);
    expect(text()).toContain("Your vote didn't save");
    expect(button(/^Snickers, 1 vote/)).toBeTruthy();
  });

  it('shows the standings and erases only after a second tap', async () => {
    const standings = {
      voters: 2,
      rows: CANDIES.map((c, i) => ({
        ...c,
        votes: i === 0 ? 4 : i === 1 ? 2 : 0,
        place: i < 2 ? i + 1 : 3,
      })),
    };
    fetchMock.mockImplementation(async (_path: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return new Response('{"ok":true}', { status: 200 });
      return new Response(JSON.stringify(standings), { status: 200 });
    });
    await click(/^See the standings$/);
    expect(text()).toContain('2 kids have voted so far');
    expect(text()).toContain("Reese's Cups4 votes");
    expect(text()).toContain('No votes yet');
    expect(text()).not.toContain('0 votes');

    await click(/^Erase all votes$/);
    expect(text()).toContain("Erase all 2 votes? This can't be undone.");
    expect(
      fetchMock.mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === 'DELETE'),
    ).toBe(false);

    standings.voters = 0;
    await click(/^Yes, erase$/);
    expect(
      fetchMock.mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === 'DELETE'),
    ).toBe(true);
    expect(text()).toContain('Nobody has voted yet.');
  });
});
