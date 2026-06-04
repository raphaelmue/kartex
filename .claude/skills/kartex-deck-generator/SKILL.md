---
name: "Kartex Deck Generator"
description: "Generate a Kartex flashcard deck (.kartex or .kartex.zip) from a PDF, Markdown, or text file such as a lecture script or study notes. Use when you want to create importable flashcards from a document, lecture PDF, handout, or any structured study material. Produces a valid Kartex v1 file ready to import into the Kartex application."
argument-hint: "<path/to/source> [--cards N] [--author NAME] [--tags tag1,tag2] [--lang de|en] [--out path/to/output]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Agent
  - AskUserQuestion
---

# Kartex Deck Generator

## What This Skill Does

Reads a source document (PDF, Markdown, plain text, HTML) and generates a valid **Kartex v1** flashcard deck using Claude's understanding of the content.

1. Spawns a **reader agent** per file chunk that reads the source and returns structured section summaries — keeping the main context clean
2. Spawns a **generator agent** per section that produces `.kartex` card blocks from the summaries
3. Spawns a **merge agent** that concatenates all card blocks into a single valid `.kartex` file
4. Packages a `.kartex` file — or a `.kartex.zip` bundle if media files are needed
5. Prints the output path so you can drag it straight into the Kartex import page

> **Why agents?** Large PDFs and lecture scripts easily exceed the context window when read inline. Every read and generation step runs in an isolated sub-agent so the main context never fills up.

---

## Quick Start

```
/kartex-deck-generator path/to/lecture.pdf
/kartex-deck-generator notes.md --cards 40 --tags thermodynamics,exam
/kartex-deck-generator script.txt --author "Prof. Müller" --out ~/decks/
```

The generated file is saved next to the source file (or in `--out` if specified), with the same base name and a `.kartex` or `.kartex.zip` extension.

---

## Step-by-Step Execution

### Step 1 — Parse arguments

Extract from `$ARGUMENTS`:

| Argument | Default | Description |
|---|---|---|
| positional 1 | *(required)* | Path to the source file |
| `--cards N` | auto | Target number of cards (hint, not a hard limit) |
| `--author NAME` | *(omit)* | Author field in the deck header |
| `--tags a,b,c` | *(omit)* | Comma-separated deck-level tags |
| `--lang de\|en` | auto-detect | Primary language of the source material |
| `--out DIR` | same dir as source | Directory where the output file is written |

If no positional argument is given, ask with `AskUserQuestion`.

---

### Step 2 — Determine chunk plan (main context)

Do **not** read the file inline. Instead:

1. For **PDFs**: Use `Read` with `limit: 1` on the first page to find the title and estimate total pages. Then plan page-range chunks of **10 pages** each (e.g. pages 1–10, 11–20, …).
2. For **text/Markdown files**: Use `Bash` to get the line count (`wc -l`). Plan chunks of **300 lines** each.
3. For **short files** (≤ 15 PDF pages or ≤ 300 lines): use a single chunk.

Record the chunk plan as a list:

```
Chunk 1: pages 1–10   (or lines 1–300)
Chunk 2: pages 11–20  (or lines 301–600)
…
```

---

### Step 3 — Spawn reader agents (one per chunk, in parallel)

For each chunk, spawn an `Agent` with this prompt template:

```
You are a content extraction agent for a Kartex flashcard generator.

Your job:
1. Read the following chunk of the source file: <file path>, <pages/lines range>
2. Extract a structured JSON summary with these fields:
   - title: string (section or chapter title visible in this chunk, or null)
   - language: "de" | "en" | other  (detected language)
   - concepts: array of { term, definition } — key definitions and facts
   - formulas: array of { name, latex, description } — all formulas in LaTeX
   - code_examples: array of { language, code, explanation }
   - diagram_captions: array of strings — captions of any visible diagrams
   - raw_facts: array of strings — any other important facts not covered above

Return ONLY the JSON object, nothing else.

Source file: <absolute path>
Chunk: <pages "X-Y" or lines offset/limit>
```

Run all reader agents **in parallel** — one Agent call per chunk in the same message.

Wait for all reader agents to return before proceeding.

---

### Step 4 — Spawn generator agents (one per chunk, in parallel)

For each reader agent result, spawn a generator agent with this prompt template:

```
You are a Kartex flashcard generator. Convert the provided content summary
into valid Kartex v1 card blocks.

KARTEX FORMAT RULES:
- Wrap every card in :: card ... :: delimiters
- Every card must have both front: and back: fields
- Use $...$ for inline math and $$\n...\n$$ for display math (delimiters on own lines)
- Use standard Markdown fenced code blocks for code (```lang ... ```)
- Add tags: [subtopic, card-type] to every card
- card-type is one of: definition, formula, example, code, fact
- Do NOT include the deck header — only card blocks
- Do NOT output anything except the card blocks

Target card count for this chunk: <N or "auto">
Section heading comment to prepend: # === <title from chunk summary> ===

Content summary (JSON):
<paste the full JSON from the reader agent>
```

Run all generator agents **in parallel**.

Wait for all generator agents to return.

---

### Step 5 — Spawn merge agent

Spawn a single merge agent with this prompt:

```
You are a Kartex deck assembler. Combine the provided card block sections
into a single valid Kartex v1 file.

Instructions:
1. Write the YAML header first:
---
deck: <deck title>
author: <author or omit>
tags: [<tags>]
---
2. Append each section's card blocks in order, separated by a blank line.
3. Do not modify any card content.
4. Return ONLY the complete .kartex file content — no explanation.

Deck title: <derived from filename or first section title>
Author: <from --author argument or omit>
Tags: <from --tags argument plus inferred top-level topics>

Card sections in order:
--- SECTION 1 ---
<card blocks from generator agent 1>

--- SECTION 2 ---
<card blocks from generator agent 2>

… (all sections)
```

The merge agent returns the complete `.kartex` file content as a string.

---

### Step 6 — Write the output file (main context)

Receive the merged content from the merge agent and write it:

```
<--out dir or source dir>/<source-basename>.kartex
```

Use the `Write` tool.

---

### Step 7 — Media / ZIP bundle (optional)

If the deck references `media://` URIs **and** you have image files available:

```
<output-basename>.kartex.zip
├── deck.kartex        ← the file from step 5, renamed
└── media/
    ├── image1.png
    └── image2.jpg
```

Create the zip with Bash:
```bash
# from the output directory
mkdir -p media
# (copy media files into media/)
zip -r "<basename>.kartex.zip" deck.kartex media/
```

**If images cannot be automatically extracted from the PDF** (which is typical), tell the user:
> "Diagrams referenced as `media://` were not automatically extracted. To include them, extract the images manually from the PDF, place them in a `media/` folder next to `deck.kartex`, then zip both into `<name>.kartex.zip`."

For decks with no media, skip the zip step — a plain `.kartex` file imports fine.

### Step 8 — Report to user

Print a short summary:

```
Deck generated: path/to/output.kartex
Cards: <N>  |  Tags: <list>  |  Math blocks: <N>  |  Code blocks: <N>
Import via: Kartex → Import → select the file
```

---

## Kartex v1 Format Reference

This is the complete format the generator must produce.

### Header

```
---
deck:   Title of the Deck          # required
author: Jane Doe                   # optional
tags:   [topic1, topic2, exam]     # optional — YAML list
---
```

### Card block

```
:: card
front: Question text (single line)
back: Answer text (single line)
tags: [tag1, tag2]
::
```

Multi-line values — continue until the next field name or `::`:

```
:: card
front:
  What are Newton's three laws?

back:
  1. Inertia — an object at rest stays at rest.
  2. $F = ma$
  3. Equal and opposite reaction.
tags: [physics, classical-mechanics, formula]
::
```

### Math

```
Inline:  $\Delta G = \Delta H - T \Delta S$

Display (delimiters on own lines):
$$
\Delta U = Q + W
$$
```

### Code

````
:: card
front: ```python
def greet(name):
    return f"Hello, {name}!"
```
What does `greet("world")` return?

back: `"Hello, world!"`
tags: [python, code]
::
````

### Media (ZIP bundle only)

```
front:
  ![Circuit diagram](media://circuit.png)
  Label the components.
```

### Typst (advanced math only)

```
back:
  #typst
  $ eta_max = 1 - T_"cold" / T_"hot" $
```

---

## Parsing Rules (leniency)

| Rule | Behaviour |
|------|-----------|
| Missing `front:` or `back:` | Card is skipped with a warning — does not abort import |
| Missing/invalid YAML header | **Fatal** — entire import fails |
| `#` comment lines | Stripped before parsing (except `#typst`) |
| CRLF line endings | Normalised automatically |
| Unparseable `tags:` value | Silently treated as empty |

---

## Tips for Better Decks

- **Lecture PDFs**: Structure cards by lecture section. Use section headings as comments (`# === Section Name ===`) to stay organised.
- **Math-heavy content**: For every standalone formula, create one card asking what the formula expresses and one asking for the formula itself.
- **Definitions**: Use the pattern `front: Define: <term>` / `back: <definition>` consistently.
- **Code examples**: Put the code on the front, the expected output or explanation on the back.
- **Number of cards**: ~20–30 cards per hour of lecture material is a good heuristic. Use `--cards` to nudge higher or lower.
- **Language**: Generate card content in the same language as the source material unless `--lang` overrides.

---

## Troubleshooting

**Import rejected ("Fatal parse error")** — Check that the `---` YAML header is the very first thing in the file and `deck:` is not empty.

**Math not rendering** — Ensure `$$` display blocks have the delimiters on their own lines. Inline `$` must not contain unescaped special chars.

**ZIP not recognised** — The archive must contain `deck.kartex` at the root level (not inside a subdirectory). Media files must be in `media/` at the root.

**Cards missing after import** — Cards without both `front:` and `back:` are silently skipped. Check the import warnings panel in the Kartex UI.
