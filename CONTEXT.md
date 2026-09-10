# Beerlympiad — Domain Glossary

## Team
One of exactly 5 competitors in the tournament. Created once during setup and never deleted. Has an immutable `number` (1-5, assigned in creation order) and a mutable `name` and `avatar`, editable at any time — including mid- or post-tournament — with no locking.

## Schedule Slot
The letter position (A-E) a Team occupies in tournament-schedule.md's fixed schedule. A Schedule Slot is permanently identical to a Team's `number`: slot A is team 1, slot B is team 2, and so on, from the moment that team is created. Each slot carries a fixed rest-round and event mix defined entirely by tournament-schedule.md — this never changes and is never reassigned independently of team creation order.

## Match
One of the 10 fixed pairings from tournament-schedule.md. Each Match belongs to a round, is assigned one event (Kubb, Flunkyball, or Tug of War), and involves two Schedule Slots (teams).

## Match Result
The winner-only outcome of a Match. Unset until first recorded. Anyone can record or correct it at any time, with no login or password of any kind; there are no points or scores, only a winner.

## Leaderboard
The ranking of Teams by total Match wins. Two-team ties are broken by their head-to-head Match Result. A tie among three or more teams in a cycle (A beat B, B beat C, C beat A) is flagged by naming the tied teams — the app never auto-resolves or records an in-app tiebreaker Match for this case; it's settled manually outside the app.
