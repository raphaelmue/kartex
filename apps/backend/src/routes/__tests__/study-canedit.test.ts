import { describe, it } from 'vitest'

// Behavioral contract for SEDIT-01: canEdit computation in GET /api/study/due
// and GET /api/study/deck/:deckId. canEdit mirrors the owner / active-EDIT-or-MANAGE
// permission rule established by cards.ts's getDeckAccess helper — never invented anew.
// These tests document the required behavior; full mock-based coverage is a future
// test-harness task (project convention, see sharing.test.ts / study-rate-reviewlog.test.ts).

describe('study canEdit computation', () => {
  it.todo(
    'Test 1: GET /api/study/due returns canEdit=true for a card in a deck owned by the requesting user'
  )

  it.todo(
    'Test 2: GET /api/study/due returns canEdit=true for a card in a deck shared with the user via an active EDIT-permission share'
  )

  it.todo(
    'Test 3: GET /api/study/due returns canEdit=true for a card in a deck shared with the user via an active MANAGE-permission share'
  )

  it.todo(
    'Test 4: GET /api/study/due returns canEdit=false for a card in a deck shared with the user via a READ-permission share'
  )

  it.todo(
    'Test 5: GET /api/study/due returns canEdit=false for a card in a deck the user neither owns nor has any share on'
  )

  it.todo(
    'Test 6: GET /api/study/deck/:deckId returns canEdit=false when the user has an EDIT-permission share whose isActive is false (Pitfall 5 — the existing view-gate does not check isActive, but canEdit must)'
  )
})
