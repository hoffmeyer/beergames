# Triple Crown Invitational — Tournament Schedule

5 teams, 5 rounds, 3 events (Kubb, Flunkyball, Tug of War). Every team faces every other team exactly once, spread across all three sports. Each round runs exactly two matches, and at most one of those is ever Tug of War (only one rope). No separate finale — final standings (total wins out of 4) crown the champion directly.

Team names below are placeholders (A–E) — swap in real rosters before use.

## Schedule

| Round | Resting | Match 1 | Event 1 | Match 2 | Event 2 |
|---|---|---|---|---|---|
| 1 | Team A | Team B vs Team E | Tug of War | Team C vs Team D | Flunkyball |
| 2 | Team B | Team A vs Team C | Tug of War | Team D vs Team E | Kubb |
| 3 | Team C | Team B vs Team D | Tug of War | Team A vs Team E | Flunkyball |
| 4 | Team D | Team C vs Team E | Kubb | Team A vs Team B | Flunkyball |
| 5 | Team E | Team A vs Team D | Kubb | Team B vs Team C | Kubb |

## Per-team event mix

| Team | Kubb | Flunkyball | Tug of War | Total |
|---|---|---|---|---|
| Team A | 1 | 2 | 1 | 4 |
| Team B | 1 | 1 | 2 | 4 |
| Team C | 2 | 1 | 1 | 4 |
| Team D | 2 | 1 | 1 | 4 |
| Team E | 2 | 1 | 1 | 4 |

Totals: 4 Kubb matches, 3 Flunkyball matches, 3 Tug of War matches — 10 matches overall.

## Standings & champion

No playoff needed — every team has already played every other team exactly once. After round 5, rank teams by total match wins out of 4 (across all three sports combined; it doesn't matter which sport the win came from, since everyone played the same 4 opponents).

**Tiebreaker order:**
1. Head-to-head result between the tied teams (they've already played each other).
2. If 3+ teams are tied in a cycle (A beat B, B beat C, C beat A), settle with one sudden-death game in any sport.

## Machine-readable schedule

```json
{
  "teams": ["A", "B", "C", "D", "E"],
  "events": ["kubb", "flunkyball", "tug_of_war"],
  "rounds": [
    {
      "round": 1,
      "resting": "A",
      "matches": [
        { "event": "tug_of_war", "teams": ["B", "E"] },
        { "event": "flunkyball", "teams": ["C", "D"] }
      ]
    },
    {
      "round": 2,
      "resting": "B",
      "matches": [
        { "event": "tug_of_war", "teams": ["A", "C"] },
        { "event": "kubb", "teams": ["D", "E"] }
      ]
    },
    {
      "round": 3,
      "resting": "C",
      "matches": [
        { "event": "tug_of_war", "teams": ["B", "D"] },
        { "event": "flunkyball", "teams": ["A", "E"] }
      ]
    },
    {
      "round": 4,
      "resting": "D",
      "matches": [
        { "event": "kubb", "teams": ["C", "E"] },
        { "event": "flunkyball", "teams": ["A", "B"] }
      ]
    },
    {
      "round": 5,
      "resting": "E",
      "matches": [
        { "event": "kubb", "teams": ["A", "D"] },
        { "event": "kubb", "teams": ["B", "C"] }
      ]
    }
  ]
}
```
