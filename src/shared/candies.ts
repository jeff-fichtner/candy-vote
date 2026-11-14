/**
 * The candies on the ballot, in the order the voting screen shows them. `id` is what a ballot
 * stores, so it stays fixed; `name` is what kids read. `color` is the wrapper's color, used as a
 * stripe on the candy's button.
 */
export interface Candy {
  id: string;
  name: string;
  color: string;
}

export const CANDIES: readonly Candy[] = [
  { id: 'reeses', name: "Reese's Cups", color: '#F47B20' },
  { id: 'snickers', name: 'Snickers', color: '#A0673F' },
  { id: 'kitkat', name: 'Kit Kat', color: '#E0213F' },
  { id: 'twix', name: 'Twix', color: '#D4A63A' },
  { id: 'hersheys', name: "Hershey's Milk Chocolate", color: '#8A5A3C' },
  { id: 'butterfinger', name: 'Butterfinger', color: '#FFD200' },
  { id: 'musketeers', name: '3 Musketeers', color: '#C9D3DB' },
  { id: 'milkyway', name: 'Milky Way', color: '#9AD06B' },
  { id: 'crunch', name: 'Crunch', color: '#2F7BE0' },
  { id: 'skittles', name: 'Skittles', color: '#E8262C' },
  { id: 'starburst', name: 'Starburst', color: '#FBB8CF' },
  { id: 'mms', name: "Peanut M&M's", color: '#FDC300' },
  { id: 'cookies', name: "Cookies 'n' Creme", color: '#F4F1EA' },
];

/** How many votes each kid gets. They may put several, or all, on one candy. */
export const VOTES_PER_KID = 3;
