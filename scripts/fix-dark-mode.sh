#!/usr/bin/env bash
# Pair every light-mode Tailwind color class with a dark: variant so the
# always-dark <html class="dark"> theme renders admin pages legibly.
# Idempotent: skips classes that already have a dark: sibling.
set -euo pipefail

files=("$@")

# Pairs: "search pattern" -> "replacement"
# Use word boundaries via regex; only add the dark variant when none follows.
declare -a rules=(
  # Backgrounds
  's/\bbg-white\b(?! dark:)/bg-white dark:bg-surface-1/g'
  's/\bbg-gray-50\b(?! dark:)/bg-gray-50 dark:bg-surface-1/g'
  's/\bbg-gray-100\b(?! dark:)/bg-gray-100 dark:bg-surface-2/g'
  's/\bbg-gray-200\b(?! dark:)/bg-gray-200 dark:bg-surface-3/g'
  's/\bbg-gray-300\b(?! dark:)/bg-gray-300 dark:bg-zinc-600/g'
  's/\bbg-slate-50\b(?! dark:)/bg-slate-50 dark:bg-surface-1/g'

  # Text — grays
  's/\btext-gray-300\b(?! dark:)/text-gray-300 dark:text-zinc-600/g'
  's/\btext-gray-400\b(?! dark:)/text-gray-400 dark:text-zinc-500/g'
  's/\btext-gray-500\b(?! dark:)/text-gray-500 dark:text-zinc-400/g'
  's/\btext-gray-600\b(?! dark:)/text-gray-600 dark:text-zinc-400/g'
  's/\btext-gray-700\b(?! dark:)/text-gray-700 dark:text-zinc-300/g'
  's/\btext-gray-800\b(?! dark:)/text-gray-800 dark:text-zinc-200/g'
  's/\btext-gray-900\b(?! dark:)/text-gray-900 dark:text-zinc-100/g'
  's/\btext-gray-950\b(?! dark:)/text-gray-950 dark:text-zinc-100/g'

  # Borders — grays
  's/\bborder-gray-100\b(?! dark:)/border-gray-100 dark:border-zinc-800/g'
  's/\bborder-gray-200\b(?! dark:)/border-gray-200 dark:border-zinc-800/g'
  's/\bborder-gray-300\b(?! dark:)/border-gray-300 dark:border-zinc-700/g'
  's/\bborder-slate-200\b(?! dark:)/border-slate-200 dark:border-zinc-800/g'

  # Reds — keep light tone, add usable dark equivalent
  's/\bbg-red-50\b(?! dark:)/bg-red-50 dark:bg-red-950\/30/g'
  's/\bbg-red-100\b(?! dark:)/bg-red-100 dark:bg-red-900\/30/g'
  's/\btext-red-500\b(?! dark:)/text-red-500 dark:text-red-400/g'
  's/\btext-red-600\b(?! dark:)/text-red-600 dark:text-red-400/g'
  's/\btext-red-700\b(?! dark:)/text-red-700 dark:text-red-300/g'
  's/\bborder-red-100\b(?! dark:)/border-red-100 dark:border-red-900\/40/g'
  's/\bborder-red-200\b(?! dark:)/border-red-200 dark:border-red-900\/40/g'

  # Greens
  's/\bbg-green-50\b(?! dark:)/bg-green-50 dark:bg-green-950\/30/g'
  's/\bbg-green-100\b(?! dark:)/bg-green-100 dark:bg-green-900\/30/g'
  's/\bbg-green-200\b(?! dark:)/bg-green-200 dark:bg-green-900\/40/g'
  's/\btext-green-500\b(?! dark:)/text-green-500 dark:text-green-400/g'
  's/\btext-green-600\b(?! dark:)/text-green-600 dark:text-green-400/g'
  's/\btext-green-700\b(?! dark:)/text-green-700 dark:text-green-300/g'
  's/\btext-green-800\b(?! dark:)/text-green-800 dark:text-green-300/g'
  's/\bborder-green-200\b(?! dark:)/border-green-200 dark:border-green-900\/40/g'

  # Blues
  's/\bbg-blue-50\b(?! dark:)/bg-blue-50 dark:bg-blue-950\/30/g'
  's/\bbg-blue-100\b(?! dark:)/bg-blue-100 dark:bg-blue-900\/30/g'
  's/\bbg-blue-200\b(?! dark:)/bg-blue-200 dark:bg-blue-900\/40/g'
  's/\btext-blue-600\b(?! dark:)/text-blue-600 dark:text-blue-400/g'
  's/\btext-blue-700\b(?! dark:)/text-blue-700 dark:text-blue-300/g'
  's/\btext-blue-800\b(?! dark:)/text-blue-800 dark:text-blue-300/g'
  's/\bborder-blue-200\b(?! dark:)/border-blue-200 dark:border-blue-900\/40/g'

  # Oranges (less common — only the lighter ones)
  's/\bbg-orange-100\b(?! dark:)/bg-orange-100 dark:bg-orange-900\/30/g'
  's/\btext-orange-700\b(?! dark:)/text-orange-700 dark:text-orange-300/g'
)

for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "skip (missing): $file" >&2
    continue
  fi
  before=$(wc -c <"$file")
  for rule in "${rules[@]}"; do
    perl -i -pe "$rule" "$file"
  done
  after=$(wc -c <"$file")
  echo "patched: $file (+$((after - before)) bytes)"
done
