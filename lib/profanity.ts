/**
 * Multilingual profanity filter
 * Engine : leo-profanity
 * Wordlists: naughty-words (28 languages — ar, cs, da, de, en, eo, es, fa,
 *             fi, fil, fr, hi, hu, it, ja, ko, nl, no, pl, pt, ru, sv, th, tr, zh …)
 */
import leoProfanity from 'leo-profanity';

let ready = false;

function init() {
  if (ready) return;
  ready = true;

  // leo-profanity ships with a default English list; clear it so we load
  // only from naughty-words to avoid duplicates.
  leoProfanity.clearList();

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nw = require('naughty-words') as Record<string, string[]>;
    Object.values(nw).forEach((words) => {
      if (Array.isArray(words)) leoProfanity.add(words);
    });
  } catch {
    // Fallback: reload the built-in English list if naughty-words failed
    leoProfanity.loadDictionary();
  }
}

export interface FilterResult {
  text: string;       // censored text (bad words replaced with ***)
  flagged: boolean;   // true if at least one bad word was found
}

export function filterMessage(raw: string): FilterResult {
  init();

  let flagged = false;

  // Single pass: check each token after stripping punctuation, then mask.
  // This correctly handles words with trailing/leading punctuation ("fuck!" "...shit").
  const cleaned = raw.replace(/\S+/g, (token) => {
    const word = token.replace(/[^a-zA-Z0-9]/g, '');   // strip punctuation
    if (word.length > 1 && leoProfanity.check(word)) {
      flagged = true;
      // Keep first visible character, mask the rest: "fuck!" → "f****"
      return token[0] + '*'.repeat(token.length - 1);
    }
    return token;
  });

  return { text: flagged ? cleaned : raw, flagged };
}
