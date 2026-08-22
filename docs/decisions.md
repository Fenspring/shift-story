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
