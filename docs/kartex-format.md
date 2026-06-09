# Kartex Format Reference (v1)

The `.kartex` format is a plain-text, UTF-8 file format for flashcard decks. It is designed to be:

- **Human-readable** — you can write and edit files in any text editor.
- **LLM-friendly** — a language model can read this document alongside study material and produce a valid deck with no additional context.
- **Lenient** — malformed card blocks are skipped with a warning; only a missing or invalid header is a fatal error.

---

## File Structure at a Glance

```
---
deck: Deck Title
author: Optional Author
tags: [optional, deck-level, tags]
---

# This is a comment — ignored by the parser

:: card
front: Question text
back: Answer text
tags: [optional, card-level, tags]
::

:: card
front:
  Multi-line question.
  Math: $E = mc^2$

back:
  Multi-line answer.
  $$\Delta U = Q + W$$
::
```

---

## 1. Deck Header

Every `.kartex` file **must** begin with a YAML block delimited by `---`. The parser treats a missing or invalid header as a fatal error — the file cannot be imported.

```
---
deck:   Thermodynamics Basics      # required — deck title
author: Jane Doe                   # optional — creator name
tags:   [physics, thermo, exam]    # optional — deck-level tags
---
```

| Field    | Type             | Required | Description                        |
|----------|------------------|----------|------------------------------------|
| `deck`   | string           | Yes      | Title of the deck                  |
| `author` | string           | No       | Name of the deck creator           |
| `tags`   | array of strings | No       | Deck-level tags (YAML list syntax) |

The `tags` array accepts both inline (`[a, b, c]`) and block YAML list syntax.

---

## 2. Comments

Any line whose first non-whitespace character is `#` is a comment and is ignored by the parser, **except** for `#typst` which is a rich-content directive (see §5.3).

```
# This line is a comment
  # This indented line is also a comment
```

Comments may appear anywhere outside field values — before the header, between card blocks, or between cards. They cannot appear inside a field value (a line like `front: # not a comment` treats the `#` as part of the value).

---

## 3. Card Blocks

Each flashcard is wrapped in a block that opens with `:: card` and closes with `::`.

```
:: card
front: What is the capital of France?
back: Paris
::
```

- The opening delimiter is `:: card` (leading `::` + the word `card`).
- The closing delimiter is `::` alone on a line (optional trailing whitespace is ignored).
- There is no limit on the number of cards per file.

**Malformed cards** (missing `front:` or `back:`) are silently skipped and reported as warnings during import. They do not prevent valid cards in the same file from being imported.

---

## 4. Card Fields

Inside a card block, four fields are recognised:

| Field   | Required | Description                                           |
|---------|----------|-------------------------------------------------------|
| `front` | Yes      | The question / prompt side                            |
| `back`  | Yes      | The answer / explanation side                         |
| `tags`  | No       | Card-level tags (YAML list syntax)                    |
| `id`    | No       | Stable identifier for import-update matching          |

### Syntax

```
front: Single-line value
back:  Single-line value
tags:  [tag1, tag2]
id:    my-card-id
```

Fields are detected by a `fieldname:` prefix at the start of a line (no leading whitespace required). Fields may appear in any order inside the card block.

### Multi-line Values

A field value begins on the same line as `front:` or `back:` and continues on subsequent lines until the parser encounters another recognised field name (`front:`, `back:`, `tags:`, or `id:`) or the closing `::`.

```
:: card
front:
  What are Newton's three laws of motion?

back:
  1. An object at rest stays at rest (inertia).
  2. $F = ma$ — force equals mass times acceleration.
  3. For every action there is an equal and opposite reaction.
tags: [physics, classical-mechanics]
::
```

Leading and trailing whitespace is trimmed from the final field value.

### Tags Field

`tags` is a single-line field parsed as a YAML array. Both formats are valid:

```
tags: [greetings, politeness]
tags: [physics]
```

Tags at the card level supplement the deck-level tags — they are stored separately and can be used to filter study sessions.

### id Field

The optional `id:` field assigns a stable, human-readable identifier to a card. It is used by the import-update feature (Phase 16) to match cards in a `.kartex` file against existing cards in the deck — enabling updates and deletions without losing study progress.

```
:: card
id: newton-first-law
front: What does Newton's first law state?
back: An object at rest stays at rest unless acted upon by an external force.
tags: [physics]
::
```

**Rules:**
- Must be a non-empty string (an `id:` line with no value is ignored).
- Duplicate `id` values within the same file are tolerated by the parser — uniqueness within a deck is enforced during import.
- Omitting `id:` is always valid; existing imports without `id:` continue to work unchanged.

---

## 5. Rich Content

Both `front` and `back` values support Markdown and the following rich-content extensions.

### 5.1 Inline Math (LaTeX/KaTeX)

Wrap a formula in single dollar signs for inline rendering:

```
The energy formula is $E = mc^2$.
```

### 5.2 Block Math (LaTeX/KaTeX)

Wrap a formula in double dollar signs for a centred display block. The `$$` delimiters must each appear **on their own line**:

```
The first law of thermodynamics:

$$
\Delta U = Q + W
$$
```

> **Note:** A `$$` on the same line as content is treated as inline, not display mode.

### 5.3 Typst Blocks

For advanced mathematical typesetting that exceeds KaTeX's capabilities, use a `#typst` block. The line `#typst` must appear at the start of the field value (or on its own line within the value); the Typst expression follows on subsequent lines.

```
:: card
front:
  Efficiency of a heat engine?

back:
  #typst
  $ eta = 1 - T_"cold" / T_"hot" $
  Maximum efficiency is the Carnot limit.
::
```

Typst syntax uses `$…$` for math expressions within the block (this is Typst's own math syntax, not KaTeX).

### 5.4 Code Blocks

Use standard Markdown fenced code blocks with an optional language identifier:

```
:: card
front: ```python
def greet(name):
    return f"Hello, {name}!"
```
What does `greet("world")` return?

back: `"Hello, world!"`
::
```

Syntax highlighting is applied automatically for common languages.

### 5.5 Media References (Images and Audio)

Files bundled in a `.kartex.zip` archive (see §7) can be referenced using the `media://` URI scheme:

```
:: card
front:
  ![Carnot cycle diagram](media://carnot.png)
  Label the four phases.

back:
  ![Audio pronunciation](media://audio-example.mp3)
  1. Isothermal expansion (A→B)
  2. Adiabatic expansion (B→C)
  3. Isothermal compression (C→D)
  4. Adiabatic compression (D→A)
::
```

- Images render inline.
- Audio files render as a playback widget.
- External images via standard `https://` URLs are also supported.

### 5.6 External Video Links

External video URLs (YouTube, Vimeo, etc.) are embedded as a player:

```
back:
  Watch the lecture: [Carnot cycle explained](https://www.youtube.com/watch?v=example)
```

---

## 6. Parsing Rules

| Rule | Behaviour |
|------|-----------|
| **D-01 — Lenient cards** | A card block missing `front:` or `back:` is skipped and added to the import warnings list. Other cards in the file are unaffected. |
| **D-02 — Required header** | A file without a valid `---` YAML header (or with a missing/empty `deck:` field) is rejected entirely — a fatal parse error is returned and nothing is imported. |
| **Comment stripping** | Lines starting with `#` (excluding `#typst`) are removed before parsing. This applies only to **standalone lines** (lines that are not continuation lines within a `front:` or `back:` field value). Code examples with a leading `#` inside a `back:` field (e.g. Python comments or shell scripts) are preserved correctly because those lines are collected as field-value continuations, not standalone lines. |
| **Line endings** | Both LF (`\n`) and CRLF (`\r\n`) are normalised. |
| **Tags fallback** | If a `tags:` value cannot be parsed as a YAML array, it is silently treated as empty (non-fatal). |

---

## 7. Import Bundle (`.kartex.zip`)

To include local media (images, audio), package the deck as a ZIP archive:

```
my-deck.kartex.zip
├── deck.kartex        ← the deck file (must be named deck.kartex)
└── media/
    ├── carnot.png
    └── lecture.mp3
```

Rules:
- The archive **must** contain a file named `deck.kartex` at the root.
- All media files **must** live in the `media/` directory at the root.
- Reference media from card content using `media://filename` (not a path, just the filename).
- Plain `.kartex` files (without media) can be uploaded directly without zipping.

---

## 8. Complete Example

```
---
deck: Introduction to Thermodynamics
author: Jane Doe
tags: [physics, thermo, exam-2025]
---

# === Chapter 1: Laws of Thermodynamics ===

:: card
front: What is the zeroth law of thermodynamics?
back: If two systems are each in thermal equilibrium with a third, they are in thermal equilibrium with each other. This defines temperature.
tags: [laws, zeroth-law]
::

:: card
front:
  State the first law of thermodynamics.

back:
  The internal energy of a closed system changes by:

  $$
  \Delta U = Q + W
  $$

  where $Q$ is heat added to the system and $W$ is work done on the system.
tags: [laws, first-law, formula]
::

:: card
front:
  ![Carnot cycle diagram](media://carnot.png)
  Label the four stages of the Carnot cycle.

back:
  1. **A→B** Isothermal expansion at $T_\text{hot}$
  2. **B→C** Adiabatic expansion
  3. **C→D** Isothermal compression at $T_\text{cold}$
  4. **D→A** Adiabatic compression
tags: [carnot, diagram]
::

:: card
front:
  What is the maximum efficiency of a heat engine?

back:
  #typst
  $ eta_max = 1 - T_"cold" / T_"hot" $

  This is the Carnot efficiency — no real engine can exceed it.
tags: [formula, efficiency, carnot]
::

:: card
front: ```python
import math
def carnot_efficiency(t_cold, t_hot):
    return 1 - t_cold / t_hot
```
What does `carnot_efficiency(300, 600)` return?

back: `0.5` — 50% efficiency when $T_\text{cold} = 300\,\text{K}$, $T_\text{hot} = 600\,\text{K}$.
tags: [code, python, carnot]
::
```

---

## 9. LLM Generation Prompt

Use this system prompt when asking a language model to generate a `.kartex` deck from study material:

```
You are a flashcard generator. Convert the provided study material into a valid Kartex v1 deck.

Rules:
- Start with the YAML header (--- ... ---) containing deck:, author:, and tags:.
- Wrap every card in :: card ... :: delimiters.
- Every card must have both front: and back: fields.
- Use $...$ for inline math and $$\n...\n$$ (dollar signs on their own lines) for display math.
- Use #typst blocks only for expressions that require advanced Typst typesetting.
- Use standard Markdown fenced code blocks for code examples.
- Add relevant tags: [...] to each card.
- Comments (lines starting with #, except #typst) are optional and will be ignored by the parser.
- Output only the .kartex file content — no explanation, no markdown wrapper.

Study material:
[INSERT CONTENT HERE]
```

### Tips for Better Results

- Tell the model the subject area and audience (e.g. "undergraduate physics").
- Specify the desired number of cards or granularity ("one card per concept").
- Ask the model to use `tags:` to group cards by sub-topic so study sessions can be filtered later.
- For math-heavy content, explicitly instruct the model to use `$$` display blocks for standalone formulas.
