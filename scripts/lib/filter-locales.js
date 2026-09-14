'use strict';

// Build-time locale filter for the generated translations module.
//
// src/utils/translations.js carries every shipped language (~313 KB minified,
// 45% of the bundle) so that one build serves everyone. A private build for a
// single Home Assistant instance only ever resolves one of them: the card
// falls back to CARD.config.language ('en') for any language missing from
// TRANSLATIONS_FLAT, so dropping the rest degrades to English rather than
// failing.
//
// The literal is regenerated rather than pattern-edited: the block is read
// with the same regex the generator writes it with, evaluated (it is our own
// generated source, not input), filtered, and re-serialised.

const KEYS_RE = /const TRANSLATION_KEYS = (\[[\s\S]*?\n\]);/;
const FLAT_RE = /const TRANSLATIONS_FLAT = (\{[\s\S]*?\n\});/;

/**
 * @param {string} source  contents of src/utils/translations.js
 * @param {string[]} keep  language codes to retain ('en' is always kept)
 * @returns {{ code: string, kept: string[], dropped: number }}
 */
function filterLocales(source, keep) {
  if (!FLAT_RE.test(source) || !KEYS_RE.test(source)) {
    throw new Error('filter-locales: TRANSLATION_KEYS/TRANSLATIONS_FLAT block not found');
  }

  const literal = source.match(FLAT_RE)[1];
  // eslint-disable-next-line no-new-func
  const flat = new Function(`return ${literal};`)();

  // 'en' is not optional: it backs the 0 "same as English" sentinel and is the
  // fallback for any language that is not present.
  const wanted = new Set(['en', ...keep]);
  const missing = [...wanted].filter((l) => !Object.hasOwn(flat, l));
  if (missing.length) {
    throw new Error(`filter-locales: unknown language(s): ${missing.join(', ')}`);
  }

  const filtered = {};
  for (const lang of Object.keys(flat)) {
    if (wanted.has(lang)) filtered[lang] = flat[lang];
  }

  const code = source.replace(
    FLAT_RE,
    () => `const TRANSLATIONS_FLAT = ${JSON.stringify(filtered, null, 2)};`,
  );

  return {
    code,
    kept: Object.keys(filtered),
    dropped: Object.keys(flat).length - Object.keys(filtered).length,
  };
}

module.exports = { filterLocales };
