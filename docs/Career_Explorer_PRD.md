# Career Explorer — Product Requirements Document

**Client:** Wanderlust Careers, LLC
**Owner / Builder:** Mohannad Madi
**Status:** MVP scoping (post client feedback — Maps confirmed in MVP)
**Last updated:** August 19, 2026

---

## 1. Overview

Career Explorer is an internal web tool for Wanderlust Careers' coaching team. A coach enters a job title and gets back labor-market data — posting volume over time, geographic distribution on a US map, salary range, and suggested adjacent titles — so they can show clients, in real time during a session, whether a different title might open up better opportunities.

## 2. Problem Statement

Coaches currently have no fast, visual way to answer "is this job title in demand, and where, and is there something adjacent that's in higher demand?" during a live client conversation. This tool answers that in one search.

## 3. Goals

- Coaches can pull labor-market data for any job title in under a few seconds.
- Data is visual enough to screen-share directly with a client, no explanation needed.
- Adjacent-title suggestions give coaches a concrete "what if" to discuss.
- Runs at effectively $0/month at MVP usage levels.

**Out of scope for success metrics:** this is internal tooling; no client-facing analytics or usage billing needed for MVP.

## 4. Users

- **Primary:** Wanderlust Careers coaches (internal use, single shared login for MVP).
- **Secondary (indirect):** Coaching clients, who see the tool screen-shared live but never log in themselves.

## 5. MVP Scope

### 5.1 Core flow
1. Coach enters a job title in a single search field.
2. Tool queries Adzuna for postings matching that title (US only).
3. Dashboard renders below the search field.
4. Coach can search a new title immediately — built for live use mid-session.

### 5.2 Dashboard components (MVP)

| Component | Description |
|---|---|
| Posting volume trend | Job postings for the title over the last 3 / 6 / 12 months, line or bar chart |
| **US map (Google Maps)** | Postings plotted geographically across the US — bubble/heatmap style, sized by posting concentration (see §8 for design decision on granularity) |
| Salary snapshot | Posted salary range where Adzuna provides it; labeled as estimated where Adzuna itself estimates it |
| Adjacent titles | Short list of related titles (category-based matching for MVP) with their own posting counts, so a coach can compare at a glance |
| Recent searches | Basic list of the last several searches in the session, for quick revisit |

### 5.3 Explicitly out of scope for MVP
- Individual coach accounts (single shared login only)
- Client-facing self-serve access
- Lightcast integration
- Skills-gap analysis, resume matching, or other coaching-content features
- Trend alerts / saved-title notifications
- Company-level hiring insights

## 6. Functional Requirements

- **FR1:** System accepts a free-text job title and normalizes it before querying Adzuna (trim, lowercase, basic synonym handling).
- **FR2:** System fetches and caches Adzuna results per title for 24 hours, to stay within the free-tier call limit (see §8).
- **FR3:** System renders posting counts for 3/6/12-month windows from Adzuna's historical data.
- **FR4:** System geocodes/aggregates location data from Adzuna postings and renders it as points or a heatmap on a Google Map of the US.
- **FR5:** System derives 3–5 adjacent titles via category matching against the searched title, and fetches posting counts for each.
- **FR6:** System displays salary range when available, with a visible "estimated" label when Adzuna itself flags it as estimated.
- **FR7:** System requires a single shared login (Supabase Auth) before the dashboard is accessible.
- **FR8:** System logs the last N searches for the session/user for quick revisit.

## 7. Non-Functional Requirements

- Page load and search response should feel fast enough for live use in a client session (target: under ~2–3 seconds per search, aided by caching).
- No cost beyond Google Maps' standard free usage tier at expected MVP volume (see §8).
- Mobile is not a priority for MVP — this is a coach-operated, desktop/screen-share tool.

## 8. Data Source & Technical Design

### 8.1 Adzuna API
- Free tier: ~1,000 calls/month (~33/day). A 24-hour cache per searched title is required to avoid hitting this limit with live coach usage.
- Provides: postings by title/location, historical posting counts, salary histograms (some estimated), category tags, regional-level location data.
- Does **not** provide: a native "related/adjacent titles" endpoint, or fine-grained (city/neighborhood) location data — only regional/state-level, with inconsistent city-level tagging on individual postings.

### 8.2 Map design decision (open — needs a call before build)
Because Adzuna's location data is regional/state-level (not consistently city-level), the map has two viable approaches for MVP:
- **Option A — State-level bubble map:** aggregate postings by state, plot a sized bubble per state on the US map. Simple, reliable, matches what Adzuna actually gives us.
- **Option B — City-level points via geocoding:** parse whatever city-level text exists in individual postings, geocode it with Google's Geocoding API, and plot individual/clustered points. More granular and visually closer to what Katherine asked for, but depends on inconsistent data and adds a geocoding step (and a small additional API cost) to the build.

**Recommendation:** start with Option A for MVP (reliable, ships within the extended timeline), and treat Option B as a fast-follow if the state-level view isn't granular enough once she sees it live.

### 8.3 Adjacent titles
Category-based matching against Adzuna's category taxonomy for MVP. Not a true similarity model — flagged in §10 as a known limitation.

## 9. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (React) |
| Charts | Recharts |
| Map | Google Maps JavaScript API |
| Backend / DB | Supabase (Postgres) |
| Auth | Supabase Auth |
| Job data | Adzuna Jobs API |
| Hosting | Vercel |
| Analytics | PostHog (free tier) |

**Cost note:** everything above is $0/month at MVP usage except Google Maps, which is free up to a monthly usage credit and pay-as-you-go beyond it — not expected to be an issue at this traffic level, but worth monitoring.

## 10. Known Limitations

- Adzuna's ~1,000 calls/month cap means data is cached for 24 hours per title, not live-live.
- No native adjacent-title feature — MVP uses category matching, which is a reasonable first pass but not a true similarity model.
- Map granularity depends on the Option A/B decision in §8.2; state-level is the safe default.
- Salary data is directional — many postings don't list salary and Adzuna estimates it.
- Posting counts reflect Adzuna's aggregator coverage, not the full labor market.

## 11. Timeline

Extended from the original 1-week estimate to fold Google Maps into the MVP rather than post-launch:

| Phase | Focus |
|---|---|
| Setup | Repo, Vercel/Supabase config, Adzuna + Google Maps API access |
| Core build | Search flow, data fetching, caching layer, charts |
| Map integration | State-level bubble map (Option A), styling to match dashboard |
| Adjacent titles | Category-matching logic |
| Polish | Loading/error states, shared login, UI pass |
| Review | Walkthrough with Wanderlust Careers team, feedback, fixes |

Exact day count to be confirmed once build starts — communicated to Katherine as "a few days past the original week."

## 12. Post-MVP Roadmap

- City-level map granularity (Option B, geocoded points) if state-level isn't enough
- Lightcast upgrade for deeper monthly data, hiring companies, skills
- Smarter adjacent-title matching (LLM/embedding-based similarity)
- Individual coach accounts with saved history and notes
- Client-facing shareable report links
- Skills-gap view per title
- Trend alerts on saved titles
- Company-level hiring insights

## 13. Design Specification

This is a working tool a coach operates live in front of a client — so the design goal is clarity and speed of reading, not a marketing look. Boldness is spent in one place: the map. Everything else stays quiet and gets out of the data's way.

### 13.1 Design tokens

**Color** — builds on the palette already used in the proposal doc, so the tool and the paperwork feel like one product:

| Token | Hex | Use |
|---|---|---|
| Deep teal (primary) | `#2F5D50` | Header, primary actions, map bubble core color |
| Teal tint | `#EAF1EE` | Card backgrounds, hover states |
| Ink | `#1F2A24` | Body text, headings |
| Slate | `#5B6B63` | Secondary text, captions, axis labels |
| Amber (data accent) | `#C98A3E` | Positive signal only — rising posting-volume trend, highlighted adjacent title |
| Canvas | `#FAFAF8` | Page background (soft off-white, not stark white) |

Amber is used sparingly and only to mean "worth a second look" — it should never appear as decoration, only as a signal.

**Type** — a data tool needs numbers that align and read cleanly, and headings that don't compete with the charts:
- Display / headings: **Fraunces** (a warm, slightly editorial serif) — used only for the title and section headers, never body text. Signals "career guidance," not "generic SaaS dashboard."
- Body / UI: **Inter** — clean, high-legibility sans for labels, buttons, descriptions.
- Data / numbers: **IBM Plex Mono**, tabular figures — every posting count, salary figure, and chart axis label uses this so numbers line up and read as data, not prose.

**Spacing & shape:** 8px base grid. Cards use 12px corner radius (soft, not sharp — approachable, not clinical) and a 1px hairline border in teal tint rather than a heavy shadow.

**Motion:** used once, deliberately — when a search resolves, the map bubbles grow in from zero over ~400ms rather than popping in. Charts and cards fade/slide up slightly on the same beat. No motion elsewhere; this is a tool people will stare at for hours, not a landing page.

### 13.2 Layout concept

Pre-search state — centered, minimal, nothing to look at but the one input:

```
┌─────────────────────────────────────┐
│         Career Explorer              │
│                                       │
│   [ Enter a job title...      🔍 ]   │
│                                       │
└─────────────────────────────────────┘
```

Post-search state — search bar docks to the top; the map is the dominant visual element since that's what Katherine specifically asked to see, with supporting cards below/beside it:

```
┌───────────────────────────────────────────────┐
│ [ Product Manager            🔍 ]  Recent ▾    │
├───────────────────────────────────────────────┤
│                                                 │
│         US MAP — bubble per state              │
│         (sized by posting volume)               │
│                                                 │
├───────────────────┬────────────────────────────┤
│ Posting trend      │ Salary snapshot            │
│ (3/6/12mo chart)   │ $XXk – $XXk (est.)         │
├───────────────────┴────────────────────────────┤
│ Adjacent titles                                │
│ [Title A · 1.2k postings] [Title B · 900] ...  │
└─────────────────────────────────────────────────┘
```

The map spans full width at the top of the results — it's the answer to Katherine's specific ask, so it shouldn't share a row with anything else. Trend and salary sit side by side underneath as equal-weight supporting detail. Adjacent titles run along the bottom as a horizontal scroll of cards, so a coach can point at one mid-conversation.

### 13.3 Component notes

- **Map:** teal bubble scale (light teal → deep teal → amber only for the single highest-volume state). Hovering a state shows exact posting count in a small tooltip using the mono numeral font.
- **Trend chart:** simple line, teal, no gridlines beyond a faint horizontal baseline — the shape of the line is the point, not the chrome around it.
- **Adjacent title cards:** each shows title + posting count in mono figures; the single highest-volume adjacent title gets the amber accent border, everything else stays neutral.
- **Recent searches:** a plain dropdown, no styling flourish — utility only.

### 13.4 States

- **Loading:** map bubbles and cards render as soft teal-tint skeleton shapes, not a spinner — keeps the layout stable so nothing jumps when data arrives.
- **No results:** plain-language message ("No postings found for this title — try a broader term") plus one suggested adjacent search, in the interface's voice, not an apology.
- **Error (API/rate-limit):** short, direct message that the data is temporarily unavailable and to try again shortly — never expose the raw API error.

### 13.5 Responsive & accessibility floor

- Primary use case is desktop/screen-share; the layout should degrade gracefully to a single column on tablet width, but mobile polish isn't a priority for MVP.
- Visible keyboard focus states on the search field and any interactive card.
- Color is never the only signal — the amber "highlight" always pairs with a label or numeral, not color alone, so it still reads correctly for colorblind users.

## 14. Open Questions

- Map granularity: ship state-level bubble map first, or hold for city-level from day one?
- Branding: any Wanderlust Careers visual guidelines (colors, logo) to reflect in the UI? (Design spec above assumes the proposal's teal palette carries through — flag if that should change.)
- Caching tolerance: confirmed OK with 24-hour data refresh per title, not live-live?
