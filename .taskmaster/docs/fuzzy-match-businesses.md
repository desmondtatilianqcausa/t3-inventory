## PRD: Venue → Business Fuzzy Matching

### Overview

Map scraped candidate event venues (free-form strings) to existing `businesses` in the same city/state using fuzzy matching. Persist a proposed match and confidence for reviewer approval, enabling automatic linking of events to businesses and consolidating instances under a single event.

### Goals

- Increase auto-link rate of candidates to correct businesses
- Reduce reviewer effort with high-confidence proposals
- Provide auditable provenance and safe fallbacks

### Non-Goals

- Automatic business creation from ambiguous data without reviewer confirmation
- Universal deduplication of businesses (separate task)

## Requirements

### Inputs

- Candidate fields: `eventTitle`, `eventLocation`, `ticketUrl?`, `startAt?`, `endAt?`, `city`, `state`
- Business catalog: `businesses` table scoped to candidate city/state

### Outputs (stored on `eventCandidates`)

- `proposedBusinessId?: Id<'businesses'>`
- `proposedBusinessName?: string`
- `businessMatchConfidence?: number` (0.0–1.0)
- `businessMatchSignals?: string[]` (e.g., ["jw=0.91","phone+","domain+"])

### Matching Rules

- Normalization (applied to both sides):
  - Lowercase, trim, collapse spaces
  - Strip punctuation and diacritics
  - Remove leading "the "
  - Remove suffixes: `inc|llc|co|ltd|corp|corporation|company|pllc|plc` (trailing only)
- Primary similarity metric: Jaro–Winkler (JW)
- Thresholds:
  - JW ≥ 0.90 → Auto-propose (high confidence)
  - 0.80 ≤ JW < 0.90 → Propose (needs review)
  - JW < 0.80 → No proposal
- Signal boosts (cap total at 1.00):
  - Phone digits match: +0.10
  - Website domain match (candidate URL contains business domain): +0.10
  - Address/ZIP overlap: +0.05
  - Category overlap: +0.03

### Performance

- Scope by `city,state` before matching
- Precompute and cache `normalizedName` on businesses
- Shortlist by n-gram index (optional) before exact JW

### Error Handling

- If `eventLocation` is empty, skip matching
- If multiple top candidates within ε=0.02, treat as ambiguous → no auto-proposal

## Data Model Updates (Convex)

- Add optional fields on `eventCandidates`:
  - `proposedBusinessId?: v.id('businesses')`
  - `proposedBusinessName?: v.string()`
  - `businessMatchConfidence?: v.number()`
  - `businessMatchSignals?: v.array(v.string())`

## Workflow Integration

### Ingestion Flow (Convex Workflow)

1. Scrape candidates
2. Enrichment (detail pages / search) [existing/next]
3. Match venues → businesses
   - Query `businesses` by city/state
   - Compute best match + confidence + signals
   - Patch candidate with proposed fields
4. Group by `seriesKey` and present grouped review

### Functions (Convex)

- `internal.eventIngestion.matchCandidateBusiness` (action)
  - args: `{ candidateId }`
  - returns: proposed fields
- `internal.eventIngestion.matchBusinessesForJob` (action)
  - args: `{ jobId }`
  - batch-matches all candidates in job

## Reviewer UX

- Review page shows:
  - Proposed business (name, confidence, signals)
  - Dropdown to change business
  - Button to "Create Business" if none matches
- Confidence badges:
  - ≥ 0.90 = green; 0.80–0.89 = yellow; < 0.80 = none

## Metrics & Observability

- Track: attempted matches, auto-proposals, reviewer accept/reject rates, avg confidence, per-city performance
- Log signals for accepted vs rejected to refine thresholds

## Security & Privacy

- Normalize in-memory; store only proposed fields & signals (no PII beyond what already exists)

## Rollout Plan

- Phase 1: Implement normalization + JW; add proposed fields; UI display
- Phase 2: Add signal boosts (phone/domain/address)
- Phase 3: Add shortlist index & per-city tuning of thresholds

## Open Questions

- Should we persist `normalizedName` on `businesses` and keep it updated via a mutation?
- Preferred fuzzy library for JW in Convex vs precomputing in FastAPI?
- Domain extraction canonicalization rules (www., trailing slash, TLD variants)?

