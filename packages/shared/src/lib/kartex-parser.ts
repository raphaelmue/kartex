// .kartex format parser — pure function, no I/O, no side effects.
// See docs/design.md §7 for the format specification.
// D-01: Lenient for card blocks — malformed cards are skipped with a warning.
// D-02: Deck header is required — missing or invalid YAML is a fatal error.

import { parse as parseYaml } from 'yaml'
import type { DeckHeader, ParsedCard, ParseWarning, KartexParseResult } from '../schemas/import.js'

export type { KartexParseResult }

export interface KartexParseError {
  fatal: true
  message: string
}

// Parses a .kartex file string into a typed result. Pure function — no I/O.
// Returns KartexParseResult on success, KartexParseError on fatal failure (D-02: missing/invalid header).
// Malformed card blocks are skipped with a warning (D-01: lenient for cards).
export function parseKartex(source: string): KartexParseResult | KartexParseError {
  // 1. Strip comment lines before header extraction.
  //    Comment lines start with '#' (ignoring leading whitespace).
  //    We must preserve '#typst' inside card blocks, so we only strip
  //    standalone comment lines in the pre-header and inter-card regions.
  //    Strategy: strip comment lines globally, since #typst content inside
  //    card blocks is part of field values (e.g. front: "#typst\n...") and
  //    will appear as part of a field value line, not a standalone # line.
  const lines = source.split('\n')
  const filteredLines = lines.map((line) => {
    // A comment line is one where the first non-whitespace character is '#'
    // AND it is a standalone line (not part of a field value continuation).
    // We only strip lines that are purely comments — lines like "# This is a comment"
    // but NOT lines like `front: "#typst"` (the # is inside a value).
    // Since we strip at the line level, a line starting with # is a comment only
    // if it is not a field assignment itself. Field assignment lines start with
    // word characters (front:, back:, tags:, ---).
    // Safety: replace comment lines with empty string to preserve line numbers/structure.
    return /^\s*#(?!typst)/.test(line) && !/^\s*(front|back|tags|deck|author)\s*:/.test(line)
      ? ''
      : line
  })
  const stripped = filteredLines.join('\n')

  // 2. Extract YAML header between first --- and next ---
  //    Use multiline flag so ^ matches after blank lines (from stripped comments)
  const headerMatch = stripped.match(/^---\r?\n([\s\S]*?)\r?\n---/m)
  if (!headerMatch) {
    return {
      fatal: true,
      message: 'No deck header found. Your .kartex file must start with a `---` YAML block.',
    }
  }

  // 3. Parse the YAML header
  let rawHeader: Record<string, unknown>
  try {
    const parsed = parseYaml(headerMatch[1])
    rawHeader = (parsed as Record<string, unknown>) ?? {}
  } catch {
    return {
      fatal: true,
      message:
        'Deck header is not valid YAML. Your .kartex file must start with a `---` YAML block.',
    }
  }

  if (typeof rawHeader?.deck !== 'string' || rawHeader.deck.trim() === '') {
    return {
      fatal: true,
      message: 'No deck header found. Your .kartex file must start with a `---` YAML block.',
    }
  }

  const deck: DeckHeader = {
    deck: rawHeader.deck.trim(),
    author: typeof rawHeader.author === 'string' ? rawHeader.author.trim() : undefined,
    tags: Array.isArray(rawHeader.tags) ? rawHeader.tags.map(String) : [],
  }

  // 4. Extract the text after the closing --- of the header.
  //    headerMatch.index is the start of the full match ('---\n...\n---').
  //    headerMatch[0].length is the length of the full match string.
  //    After the match ends we have the rest of the file (card blocks).
  const afterHeader = stripped.slice((headerMatch.index ?? 0) + headerMatch[0].length)

  // 5. Parse card blocks using regex: from ':: card' to '::'
  //    Per Pitfall 1: match with optional trailing whitespace on delimiters.
  //    Use multiline anchors for reliable line-based matching.
  const cards: ParsedCard[] = []
  const warnings: ParseWarning[] = []

  const cardBlockRegex = /^::\s*card\s*$([\s\S]*?)^::\s*$/gm
  let cardIndex = 0
  let match: RegExpExecArray | null

  while ((match = cardBlockRegex.exec(afterHeader)) !== null) {
    cardIndex++
    const blockContent = match[1]
    const parsed = parseCardBlock(blockContent, cardIndex)
    if ('warning' in parsed) {
      warnings.push(parsed.warning)
    } else {
      cards.push(parsed.card)
    }
  }

  return { deck, cards, warnings }
}

// Parses a single card block's content string.
// Returns { card } on success or { warning } if the block is malformed.
function parseCardBlock(
  content: string,
  cardIndex: number,
): { card: ParsedCard } | { warning: ParseWarning } {
  // Extract field values using line-by-line parsing.
  // Fields: front:, back:, tags: (all optional except front+back are required).
  // Multi-line values: value starts after 'field:' on the same line and
  // continues until the next recognized field name at the start of a line.

  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n')

  // Use regex to extract multi-line field values.
  // Each field value extends until the next field name (front:, back:, tags:) or end of content.
  const frontMatch = normalized.match(/^front:([\s\S]*?)(?=^back:|^tags:|(?:\n|$)(?=front:|back:|tags:|$))/m)
  const backMatch = normalized.match(/^back:([\s\S]*?)(?=^front:|^tags:|(?:\n|$)(?=front:|back:|tags:|$))/m)
  const tagsMatch = normalized.match(/^tags:\s*(.+)$/m)

  // Simpler approach: split on field name lines and collect values
  const fields = parseFields(normalized)

  const front = fields.front
  const back = fields.back
  const tagsRaw = fields.tags
  const id = fields.id

  void frontMatch
  void backMatch
  void tagsMatch

  if (!front) {
    return {
      warning: {
        cardIndex,
        reason: 'Missing `front:` field — card skipped',
      },
    }
  }

  if (!back) {
    return {
      warning: {
        cardIndex,
        reason: 'Missing `back:` field — card skipped',
      },
    }
  }

  // Parse tags from card block (Pitfall 2: tags: [a, b] is not YAML in card context,
  // but we apply yaml.parse() to the value portion for consistency with deck header)
  let tags: string[] = []
  if (tagsRaw) {
    try {
      const parsed = parseYaml(tagsRaw.trim())
      if (Array.isArray(parsed)) {
        tags = parsed.map(String)
      }
    } catch {
      // Tags parse failed — treat as empty (non-fatal)
    }
  }

  return { card: { front, back, tags, id } }
}

// Parse field values from a card block content string.
// Returns an object with front, back, tags, and optional id string values (or undefined if absent).
function parseFields(content: string): { front?: string; back?: string; tags?: string; id?: string } {
  const lines = content.split('\n')
  const result: { front?: string; back?: string; tags?: string; id?: string } = {}

  let currentField: 'front' | 'back' | null = null
  let currentLines: string[] = []

  const FIELD_PATTERN = /^(front|back|tags|id):\s*(.*)/

  for (const line of lines) {
    const fieldMatch = FIELD_PATTERN.exec(line)
    if (fieldMatch) {
      // Save previous field
      if (currentField) {
        result[currentField] = currentLines.join('\n').trim()
      }
      const fieldName = fieldMatch[1] as 'front' | 'back' | 'tags' | 'id'
      if (fieldName === 'tags' || fieldName === 'id') {
        // Single-line fields: empty value (D-03: min-length-1) → undefined
        const val = fieldMatch[2].trim()
        if (fieldName === 'id') {
          result.id = val.length > 0 ? val : undefined
        } else {
          result.tags = val
        }
        currentField = null
        currentLines = []
      } else {
        currentField = fieldName
        currentLines = fieldMatch[2] ? [fieldMatch[2]] : []
      }
    } else if (currentField) {
      currentLines.push(line)
    }
  }

  // Save last field
  if (currentField) {
    result[currentField] = currentLines.join('\n').trim()
  }

  return result
}
