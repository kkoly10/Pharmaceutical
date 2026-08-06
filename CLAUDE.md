# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Pre-launch. MVP scaffold built as of 2026-07-31**, validating with the founder and one friend before deciding whether to invest further. A web prototype came first; a native app is an explicit *later* phase, not part of this build. Low blast radius: no real user data exists yet, so schema changes and reshaping the data model carry much lower risk than they will once real people's closets are stored here. Still confirm with the user before genuinely destructive/hard-to-reverse actions (force-push, dropping a migration that already ran against real data, deleting branches) once real data exists — but don't withhold routine build-and-ship work out of launched-product caution that doesn't apply yet.

### This app shares a Supabase project with unrelated live apps — read before touching the database

The Supabase project backing this app (`oeseuguleghhywqrruaz`, "website builder" in the dashboard) is **not dedicated to this project**. It's the founder's existing project for a separate, live web-design-agency tool with real customer data (leads, quotes, proposals, customer portal, etc.) — deliberately reused here to avoid paying for a second project while this is still a hobby-scale prototype. The founder's call, made explicitly: give this app its own dedicated project only if the prototype gets real traction.

Consequences that matter for every future change here:

- **Every object this app owns is prefixed `wardrobe_`** — tables (`wardrobe_closet_items`, `wardrobe_outfits`, `wardrobe_outfit_items`, `wardrobe_outfit_wears`), the storage bucket (`wardrobe-closet-photos`), and the RPC function (`wardrobe_mark_outfit_worn`). Keep this prefix on anything you add. Never rename it away "for cleanliness" — it's the only thing keeping this app's schema visually distinguishable from the agency tool's ~40 unrelated tables in the same `public` schema.
- **`auth.users` is shared** with the agency tool. RLS keeps every table's *rows* scoped correctly by `user_id = auth.uid()`, but anyone who signs up for this app is also, technically, a user in the agency project's auth system (and vice versa). This is an accepted tradeoff for a hobby prototype, not something to "fix" unilaterally.
- **Never touch a non-`wardrobe_`-prefixed table, function, or bucket** in this project without asking first — those belong to the live agency app and may have real customer data behind them.
- **Auth settings (email confirmation, redirect URL allow-list, SMTP) are project-wide**, already configured for the agency app. Don't change them for this app's sake; work within whatever they already are.
- If/when this app gets a dedicated Supabase project, the migration in `supabase/migrations/` can be replayed as-is (drop the `wardrobe_` prefix at that point if desired, since isolation-by-naming would no longer be needed).

## What this product is

An app that looks at the clothes someone already owns and tells them what to wear for a given occasion — solving decision fatigue and an underused wardrobe. It is **not** primarily a wardrobe-organizing tool (cost-per-wear stats, packing lists) and not a social or shopping app. See "MVP scope" below before adding anything outside that.

## Self-verification protocol — MANDATORY after every deliverable

A deliverable is **not done** until it has been verified against its requirement **empirically**, not from memory or optimism. Run every step, every time, before telling the user something is done.

1. **Re-read the actual changed code against the requirement.** Open the diff (`git diff`) and read each hunk with its surrounding context. Confirm the code does what the requirement literally says — not what you intended to write.
2. **Enumerate ALL enforcement points when you change a default, a gate, or any shared behavior.** Grep for every call site / reader of the thing you changed and confirm they ALL agree — e.g. a formality rule changed in the recommendation engine but not in the seed/demo data, or a color-matching default changed on the server but not in the client component that mirrors it.
3. **Verify BOTH sides of every dual path.** E.g. the "manual tag" item-entry path and the "AI auto-tag" item-entry path must produce items in the same shape — never assume one mirrors the other without checking.
4. **Prove claims; don't assert them.** Every factual statement about the codebase (what a query returns, whether RLS actually blocks cross-user access, what a rule does) must be backed by a command you ran (`grep`, a test, `curl`, a query) whose output you saw. If you didn't check it, say "unverified," don't state it as fact.
5. **Green tests are necessary, not sufficient.** Tests can pass while the underlying invariant is violated. Reason explicitly about the invariant the change must preserve (e.g. "a user must never see another user's closet"), and add/adjust a test that would catch the specific bug the change could introduce.
6. **Do a dedicated adversarial review pass scoped to the ACTUAL diff of THIS deliverable** — not a neighbouring change. Ask "what did I change, and what class of bug could this exact change introduce?" and go looking for it.
7. **Report what you verified and how** — the commands and their results — not a vague "all good / done." State any part you could NOT verify and why.

If any step surfaces a flaw, fix it and re-run the protocol before declaring done.

## Working with the user — decisions and suggestions

- **When the user hands you a decision** ("you decide", "your call", "whatever you think is best"), do not answer from intuition alone — **research the web first** to ground the choice (competitor apps, current library/API options, pricing), then decide and state the evidence-backed rationale. Delegated authority raises the bar for being right, not lowers it.
- **When you offer a suggestion or recommendation** (stack choice, algorithm approach, third-party API), back it with **web research** rather than asserting it, and cite sources so the reasoning is checkable.
- The user is validating a prototype with a small number of real people (starting with themselves and one friend) before deciding whether to invest in a native app — don't gold-plate for scale or a user base that doesn't exist yet.

## Commands

```bash
npm run dev          # start Next.js dev server (Turbopack)
npm run build        # production build
npm run lint         # eslint + tsc --noEmit
npm test             # node --experimental-strip-types --test lib/**/*.test.ts (outfit-matching engine)
```

Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (used for the auth email-confirmation redirect), optionally `ANTHROPIC_API_KEY` for the not-yet-built photo auto-tag assist.

## Architecture

### Stack

- **Next.js 16** (App Router, Turbopack, Node 20+) + TypeScript + React, deployed on **Vercel**.
- **Supabase**: Postgres + Row Level Security for the database, Supabase Auth for accounts, Supabase Storage for clothing photos. Chosen over a local-only/no-backend build because the plan is "web prototype now, native app later" — a real backend means the native app reuses the same data instead of the prototype being throwaway. **Shared project with an unrelated app — see the callout above before touching the database.**
- **Tailwind CSS + shadcn/ui** for the UI — fast to build image-heavy grid/gallery layouts.
- **Zod** for validating closet-item and outfit-request input at the server boundary.
- **Anthropic API (Claude Haiku, vision)** — optional "auto-tag from photo" assist layered on top of manual entry, never a replacement for it. Not yet built. Call it server-side only (route handler / server action); never ship the API key to the client.
- **Open-Meteo** (not OpenWeatherMap — research corrected this: fully free, no API key, no card on file, so no billing-risk surface for a hobby project) if/when weather-aware suggestions are built — not yet built; cache responses, don't call it per-request. `generateOutfits()` already accepts an optional `targetWarmth` for this. Request location only just-in-time (when the user opens the weather-aware picker, never at signup), and let the user set a home city once via Open-Meteo's built-in geocoding as a persistent override.

### Data model (`supabase/migrations/20260731012536_initial_schema.sql`)

Every table/function/bucket is prefixed `wardrobe_` — see the shared-project callout above for why.

- `wardrobe_closet_items`: owner (user id, RLS-scoped), category, color(s) (1-2, from the fixed palette in `lib/outfit-matching/colors.ts`), pattern, formality (1-5), warmth (1-3), `photo_path` (a Storage object path, not a public URL — the bucket is private), archived flag.
- `wardrobe_outfits` + `wardrobe_outfit_items` (join table): occasion (fixed enum, not a table — see `lib/outfit-matching/types.ts`) + the closet items used.
- `wardrobe_outfit_wears`: one row per time an outfit was marked worn (`worn_on` date) — this is what lets the app avoid repeating the same suggestion, the actual complaint ("I have all these clothes but can't make an outfit") this product exists to fix.
- Marking a suggestion worn calls the `wardrobe_mark_outfit_worn` RPC, which creates the `wardrobe_outfits` row, its `wardrobe_outfit_items`, and the `wardrobe_outfit_wears` row atomically (a suggestion is never persisted unless/until it's worn — there's no "save without wearing" flow in v1).

### Routing

`/` is the **public marketing page** (`app/page.tsx`, outside the `(app)` route group — no auth layout, no nav bar) — this is the one exception to auth-gating, see `PUBLIC_EXACT_PATHS` in `lib/supabase/proxy.ts`. The authenticated occasion-picker home lives at `/app` (`app/(app)/app/page.tsx`); `/closet` is the other authenticated page. Both `signIn`/`signUp` (`lib/auth/actions.ts`) and the email-confirmation callback (`app/auth/callback/route.ts`) redirect to `/app`, not `/`, after success — if you ever add another post-auth redirect, it goes to `/app` too, not the marketing page.

### Outfit-matching logic (`lib/outfit-matching/`)

Rule-based, no ML/embeddings: `generate.ts` fills the required category "slots" for the occasion (`occasions.ts` — a dress, or a top+bottom, plus shoes, with optional outerwear/accessory), filters candidates by formality range, scores combinations by color-harmony (`colors.ts` — neutrals pair with anything; chromatic pairs are scored by hue-distance against Itten's named harmony angles via `HARMONY_ANGLES`, so analogous/triadic/complementary all score high and off-angle near-misses dip toward ~0.6), penalizes combining two bold patterns, and soft-penalizes recently-worn items (with a stronger penalty for repeating the exact same item set within 14 days, read from `wardrobe_outfit_wears`/`wardrobe_outfit_items`). Framework-free (no Next.js/Supabase imports in these files) so it stays independently unit-testable (`generate.test.ts`, run via `npm test`) and portable to a native app later — this is the one part of the codebase worth that isolation; don't extend the same treatment to code that has no such reuse need.

### Outfit-matching quality roadmap (researched, not yet built)

The founder's own framing: don't chase competitors' "AI stylist" layer — that's the exact part reviewers tear apart across every competitor researched (nonsensical/weather-blind pairings, ignoring whole categories). Our structural advantage is that this engine *can't* produce those specific failures (hard slot-filling + formality range make them impossible, not just unlikely). "Improve the core" here means richer, still-fully-explainable rules and a transparent per-user signal — never an opaque model. Research was run across Western, Japanese, Korean, French, and Chinese sources specifically (not English-only) — see the finding on why below.

**Named-harmony-angle color scoring — DONE (2026-07-31).** The old 3-bucket model (analogous ≤40°, complementary ≥150°, else a flat 0.3 "awkward middle") scored red/green — 120° apart in this palette — as a clash, but 120° is Itten's (Bauhaus) canonical **triadic harmony** angle. Replaced in `colors.ts` (`HARMONY_ANGLES` + `hueHarmonyScore`) with named harmony angles (30°=analogous, 60°, 90°=tetradic, 120°=triadic, 150°=split-complementary, 180°=complementary) and a per-degree falloff toward the midpoints between them. red/green now scores 0.82 (was 0.30); regression-guarded in `generate.test.ts`. The four rules below are the still-unbuilt remainder of this section.

Further rules found, each independently sourced and each directly implementable without ML:
- **Color-role scoring** (Western 60-30-10 rule *and* Korean 무채색+원포인트 "neutrals + one point color" converge on the same structure): score for a dominant/secondary/accent role by category (base = dress or top+bottom, secondary = outerwear, accent = shoes/accessory), rather than averaging every pair identically. Bonus when exactly one item is the deliberate "point" of color against an otherwise-neutral base.
- **Kasane-no-irome mediation** (Japanese Heian-era kimono-layering theory, 襲の色目): a neutral item in a 3+ item outfit should soften the clash penalty between two chromatic items it sits "between" — mirrors the historical convention of inserting a pale layer between two contrasting colors.
- **Near-clash neutral exception** (French styling guides): navy+black is a named "faux pas" — too close to read as intentional, too different to read as deliberate. Carve out specific known-clashing neutral pairs rather than treating all neutral-neutral pairs as uniformly safe.
- **Lightness ordering** (Chinese 色彩搭配, 明度排列法): small bonus for a monotonic light-to-dark (or reverse) gradient from top to bottom of the outfit — needs each palette color hand-tagged with an approximate lightness value. Genuinely novel next to the Western/Japanese rules; our current *unordered* pairwise-average scoring can't express this at all.
- **PCCS tone axis** (Japanese 配色/haishoku): score hue-distance and a separate tone-distance (light/dark/vivid/dull buckets) as two independent axes, so "same hue different tone" (tone-on-tone) or "same tone different hue" also count as valid harmony, not just hue-angle proximity. Bigger lift than the rest (needs a second hand-tagged attribute per palette color) — sequence after the others.

**Deliberately not adopting**, and why: 五行/wuxing "auspicious color" pairing (Chinese five-element fortune theory) — it's a luck framing, not a visual-harmony one, wrong fit for this app. Korean 퍼스널컬러 (personal color matched to skin/hair/eye tone) — a real, separate future feature (matches clothing *to the wearer*, not item-to-item), not a same-outfit scoring change, and needs user-appearance data we don't collect.

**Per-user preference learning** — the other real gap: the engine currently scores identically on day 1 and day 100 except for the recency penalty; nothing it does gets more personalized over time. One new additive score term, **Beta-Bernoulli Bayesian shrinkage** (the same math underlies Thompson Sampling, Bayesian/IMDB-style rating averages, and the Wilson score interval — one implementation, three citable justifications):

```
preference(f) = (3 + worn(f)) / (6 + worn(f) + 0.3 × shown(f))
```

for a tracked feature `f` (e.g. a specific color pairing), added to the existing linear score with a small weight. The `3`/`3` prior keeps 1-2 data points from swinging the score; `0.3` encodes that a shown-but-not-chosen suggestion is much weaker evidence than an actually-worn one. Checked Chinese- and Korean-language recommender-systems sources explicitly — both converged on the same classical techniques English sources give (no hidden alternative there), though a Chinese source's formula independently confirmed the recency-decay design already in `generate.ts`.

**Open decision, not yet resolved — confirm before building:** `shown(f)` requires persisting every *generated* suggestion, not just worn ones — a real change to the "a suggestion is never persisted unless/until it's worn" principle above. A simpler version needs no schema change: track only `worn(f)`, drop the negative term entirely — `preference(f) = worn(f) / (worn(f) + 5)`. Same shrinkage principle, positive-only signal. Pick one before implementing either.

## MVP scope — what v1 is and is not

**In scope, and built:** a public marketing page at `/` (honest positioning, no fabricated metrics/testimonials — see its content for the actual competitive research behind it); add closet items (manual tags, optional photo — AI auto-tag assist is not yet built); pick an occasion; get outfit suggestions built only from clothes the user already owns; mark an outfit worn; avoid repeating recent suggestions.

**In scope, not yet built:** swap out one piece and regenerate (today you'd re-run the whole picker; there's no per-item swap UI yet — implementation note: extend `generateOutfits()` with an optional `lockedItemIds` param that pre-fills those slots and skips them in the search, scoring the smaller remaining space with the exact same functions already in `colors.ts`, not a second algorithm); AI auto-tag from photo (Claude Haiku vision, per the Stack section); weather-aware suggestions (Open-Meteo, per the Stack section); the color-matching and per-user preference-learning upgrades in "Outfit-matching quality roadmap" above.

**Explicitly deferred — do not build until asked:** AI chat stylist, social/community features, cost-per-wear or sustainability analytics, shopping/try-before-you-buy integration, the native app itself.
