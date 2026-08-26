# Product decisions

Settled decisions that shape the schema and the product's guarantees. Each one
is load-bearing somewhere in the code — the cross-references say where.

## Anonymity

**A story is written once and never regenerated.**
If a story refreshed as responses arrived, comparing consecutive versions would
isolate individual contributions — the ninth response is the difference between
story@8 and story@9. Generate once, freeze, never recompute.

**Raw responses are deleted once their story is generated.** *(confirmed)*
Themes persist; the sentences staff typed do not. This makes "no raw-response
downloads for leaders" true by construction rather than by policy, and means a
future database breach exposes nothing individual. Accepted cost: a past cycle
can never be re-analyzed, and there is no corpus for tuning theme detection.

**Representative statements are paraphrased, never verbatim.**
On a small unit, phrasing is identity.

**A manager sees a response count and nothing else.** *(confirmed)*
Never who responded, never what any individual wrote, at any point in the cycle.

**The schema is the guarantee.**
`responses` will carry no author column, no IP, no user agent, no session — not
nullable, absent. A future "can we see who hasn't responded?" request then fails
at the schema, which is where it should fail.

## Cycles

**One fixed question, every week.** *(confirmed)*
`WEEKLY_QUESTION` in `lib/cycle-policy.ts`. Fixed rather than editable so themes
stay comparable across weeks and across units. Making it editable later would
silently destroy that comparability.

**Responses close on a deadline — every Friday.** *(confirmed)*
`DEADLINE_DAY` in `lib/cycle-policy.ts`. The deadline is the trigger; the story
is generated after it closes, never during collection.

**The response threshold is a floor checked at close, not a trigger.**
This changed when the deadline was introduced. A cycle closing with fewer than
`MIN_RESPONSES` (8) produces **no story at all** — writing one would narrow who
said what.

**A cycle that closes short carries its responses into the next cycle.**
*(decided while building — worth confirming.)* The alternative is discarding
what staff took the trouble to write. The carried responses are deleted with
everything else when the story that finally includes them is generated. A
consequence to accept: a story may span more than one week on a quiet unit.

## Collecting responses

**Per-IP rate limiting cannot be a per-person control here.**
A hospital sits behind a handful of egress IPs — a whole unit scanning the QR
looks like one address. The limit in `/api/respond` is set far above what a real
unit produces and exists only to stop a scripted flood. Tightening it to
"one per IP" would lock out an entire ward.

**Double-submit protection is a cookie with a visible way past it.**
The marker is per-cycle, httpOnly, and carries nothing about what was written.
Break-room computers are shared, so blocking hard on it would stop the second
nurse from answering at all — the page offers "Sharing this device? Answer
anyway" instead. This discourages casual repeats; it does not prevent a
determined one, and it cannot, because there is no identity to check against.

**Response tokens are stored in plaintext.**
The token is a submission capability, not a read capability, and the manager has
to be able to re-display the QR. A database leak would let an attacker post junk
responses to a unit; it grants no read access to anything. Rotating a unit's
token revokes the old one immediately, which is the answer when a printout
leaves the ward.

**The deadline is enforced server-side, not just in the UI.**
Nothing flips `status` to 'closed' at the deadline yet — that is the scheduled
job arriving with story generation — so `closes_at` is the authority and both
the response page and `/api/respond` check it.

**Each unit carries its own timezone.**
Captured from the browser at unit creation. A Friday deadline computed in UTC
lands on Thursday evening across most of the US. `next_cycle_close()` does the
arithmetic in Postgres, which handles DST correctly.

**The staff response page fails soft.**
It is the one surface reached by scanning a poster. A stack trace there costs
the product its credibility with the person it most needs to trust it, so
misconfiguration and outages render as "come back later" while still logging
loudly.

## Writing the story

**Generation is atomic with destruction.**
`finalize_story()` writes the story, its themes, destroys the raw responses and
flips the cycle status inside one Postgres function. There is no window where
the text is gone but no story was recorded. Verified: when theme insertion
fails, all responses survive and no story is written.

**A cycle whose detection fails stays open.**
The closer throws rather than proceeding, leaving the responses intact for a
retry. Nothing is ever destroyed on a path where no story was written.

**"Generated once" is enforced by a UNIQUE constraint**, not by application
logic — `stories.cycle_id` is unique, and `finalize_story()` refuses a cycle
that already has one.

**Responses are read ordered by id.**
The id is a random v4 uuid, so the sequence handed to the model carries no trace
of who submitted when. Heap order would have reflected insertion order.

**Model counts are clamped to reality.**
`mention_count` is capped at the number of responses. A manager reads it as a
factual claim about how many people said something, so a hallucinated 99 out of
5 would be worse than no number at all.

**Fallbacks are enabled on the detection call.**
`fallbacks: "default"` with the server-side fallback beta, so a safety decline
is rescued in the same call rather than leaving a unit with no story. A refusal
arrives as HTTP 200, so `stop_reason` is checked before the content is read.

**Scrubbing is risk reduction, not de-identification.**
Emails, URLs, phone numbers and long digit runs are removed. Room numbers,
times, bed counts and staffing ratios are deliberately kept — "the call light in
412 has been broken a week" is exactly the signal the product exists to surface.
The real protections are the threshold, the prompt, and deletion.

**The closer refuses to run without `CRON_SECRET`.**
It deletes data, so it fails closed rather than defaulting open. The comparison
is constant-time.

## The product loop

**Insights unlock at 8 responses, not at the deadline.** *(supersedes the
earlier deadline-only rule)*
Themes and de-identified excerpts appear as soon as a cycle reaches its
threshold, so a leader is not blocked until Friday. The Friday deadline still
closes the cycle, freezes the story and destroys the raw responses.

*The cost, stated plainly:* live counts can be differenced. A leader watching
the dashboard as response 9 arrives learns which theme it touched. The frozen
story was immune to this; live aggregates are not. Worth revisiting if a unit
ever reports feeling watched — banding the counts would close it at the cost of
the exact numbers.

**The threshold lives in the database, not the UI.**
`cycle_theme_counts()` and `cycle_safe_excerpts()` return nothing below the
minimum, and `response_themes` carries no select policy — so there is no query a
leader can write that counts around the gate. Verified: an authenticated leader
reading the link table directly gets 0 rows while 10 exist.

**Leaders never read `body`.**
`responses.safe_excerpt` is computed at write time and is the only text the
leader-facing functions return. It is NULL whenever the de-identifier was not
confident, and those responses are simply absent.

**De-identification fails closed.**
Rejects names (including at the start of a sentence — the case that first
slipped through), patient and room references, record numbers, contact details,
and anything too long to vet. It drops plenty of innocent responses; a leader
seeing four excerpts instead of six costs nothing, recognising who wrote one
costs the product its premise.

**Classification is deterministic keyword matching, behind an interface.**
`Classifier` in `lib/themes/classify.ts` — inspectable, free, instant, and
explainable to a nurse leader. Swapping in a model means providing another
implementation of one function. The Claude path from the earlier milestone
remains for the frozen weekly story only.

**Response tokens: hashed lookup, plaintext retained for display.**
The submit path matches `token_hash`. The plaintext stays because the manager
must re-render a QR already taped to a wall — a token on a wall is public by
construction, so hashing it away would break the feature while protecting
nothing. Per-recipient single-use tokens will be hash-only when messaging lands.

**Demo data seeds into the leader's own organization.**
A separate demo tenant would need cross-org access to be visible. The demo unit
is labelled, idempotent, and goes through the same classification and
de-identification code as a real submission.

## Organizations and access

**One organization per signup.**
`handle_new_user()` in `0002_core_schema.sql` provisions an org and profile from
signup metadata. Joining an existing org needs an invite flow, which does not
exist yet — two managers at the same hospital signing up separately today get
two separate organizations.

**Unit visibility is an explicit row, not implied by org membership.**
`unit_members` exists so that whether a DON or CNO can read a unit's themes is a
decision someone made, not a default. Still open: who beyond the unit manager
should be able to read a story.

**Login failures are deliberately generic.**
"That email and password do not match" — distinguishing no-such-account from
wrong-password would confirm which work emails are registered.

## Still open

- Does the response threshold scale with unit size? (8 on a 12-person unit is
  most of the team; on a 60-person unit it is a thin slice.)
- Who beyond the unit manager can read a unit's story?
- What stops one person submitting twenty times? With no identity there is no
  clean answer — per-device cookie, per-cycle cap, and rate limiting get most of
  the way. Perfect deduplication and true anonymity are mutually exclusive.
