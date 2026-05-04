import type * as Monaco from 'monaco-editor'

import { doComplete, type VSCodeEmmetConfig } from './emmetHelper'
import { EmmetOptions, isValidLocationForEmmetAbbreviation } from './abbreviationActions'

declare global {
  interface Window {
    monaco?: typeof Monaco
  }
}

// https://github.com/microsoft/vscode/blob/main/extensions/emmet/src/util.ts#L86
const LANGUAGE_MODES: { [id: string]: string[] } = {
  html: ['!', '.', '}', ':', '*', '$', ']', '/', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  jade: ['!', '.', '}', ':', '*', '$', ']', '/', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  slim: ['!', '.', '}', ':', '*', '$', ']', '/', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  haml: ['!', '.', '}', ':', '*', '$', ']', '/', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  xml: ['.', '}', '*', '$', ']', '/', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  xsl: ['!', '.', '}', '*', '$', '/', ']', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  css: [':', '!', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  scss: [':', '!', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  sass: [':', '!', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  less: [':', '!', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  stylus: [':', '!', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  javascript: ['!', '.', '}', '*', '$', ']', '/', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  typescript: ['!', '.', '}', '*', '$', ']', '/', '>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
}

// https://github.com/microsoft/vscode/blob/main/extensions/emmet/src/util.ts#L124
const MAPPED_MODES: Record<string, string> = {
  handlebars: 'html',
  php: 'html',
  twig: 'html',
}

const DEFAULT_CONFIG: VSCodeEmmetConfig = {
  showExpandedAbbreviation: 'always',
  showAbbreviationSuggestions: true,
  showSuggestionsAsSnippets: false,
}

/**
 * add completion provider
 * @param monaco monaco self
 * @param languages language IDs to register the completion provider for
 * @param syntax emmet syntax profile to use, e.g. 'html', 'css', 'jsx'
 * @param options emmet options. `options.tokenizer` sets the tokenizer engine, default `'monarch'`. Use `'standard'` when a non-Monarch grammar (e.g. shiki) is active.
 */
function registerProvider(monaco: typeof Monaco | undefined, languages: string[], syntax: string, options?: EmmetOptions) {
  if (!monaco) {
    console.error("emmet-monaco-es: 'monaco' should be either declared on window or passed as first parameter")

    // Return a noop dispose function to avoid errors when calling the returned cleanup function
    return () => {}
  }

  const providers = languages.map((language) =>
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: LANGUAGE_MODES[MAPPED_MODES[language] || language],
      provideCompletionItems: (model, position) =>
        isValidLocationForEmmetAbbreviation(model, position, syntax, language, options)
          ? doComplete(monaco, model, position, syntax, DEFAULT_CONFIG)
          : undefined,
    }),
  )

  return () => {
    providers.forEach((provider) => provider.dispose())
  }
}

/**
 * emmet for `HTML`
 * @param monaco monaco self, if not provided, will use window.monaco
 * @param languages language IDs to support, default `['html']`. Should support any HTML compatible languages like `php`,`twig`
 * @param options emmet options. `options.tokenizer` sets the tokenizer engine, default `'monarch'`. Use `'standard'` when a non-Monarch grammar (e.g. shiki) is active.
 */
export function emmetHTML(monaco = window.monaco, languages = ['html'], options?: EmmetOptions) {
  return registerProvider(monaco, languages, 'html', options)
}

/**
 * emmet for `CSS` / `LESS` / `SCSS`
 * @param monaco monaco self, if not provided, will use window.monaco
 * @param languages language IDs to support, default `['css']`. Should support any CSS compatible languages like `scss`,`less`
 * @param options emmet options. `options.tokenizer` sets the tokenizer engine, default `'monarch'`. Use `'standard'` when a non-Monarch grammar (e.g. shiki) is active.
 */
export function emmetCSS(monaco = window.monaco, languages = ['css'], options?: EmmetOptions) {
  return registerProvider(monaco, languages, 'css', options)
}

/**
 * emmet for `JSX` / `TSX`
 * @param monaco monaco self, if not provided, will use window.monaco
 * @param languages language IDs to support, default `['javascript']`. Should support any jsx compatible languages like `typescript`
 * @param options emmet options. `options.tokenizer` sets the tokenizer engine, default `'monarch'`. Use `'standard'` when a non-Monarch grammar (e.g. shiki) is active.
 */
export function emmetJSX(monaco = window.monaco, languages = ['javascript'], options?: EmmetOptions) {
  return registerProvider(monaco, languages, 'jsx', options)
}

export { expandAbbreviation, registerCustomSnippets } from './emmetHelper'
