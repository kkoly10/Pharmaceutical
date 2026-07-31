# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Pre-launch, greenfield. Zero code, zero users, as of 2026-07-31.** This repo starts empty — a web prototype is being built first, with a native app as an explicit *later* phase, not part of this build. Low blast radius: no real user data exists yet, so schema changes, pushing to `main`, and reshaping the data model all carry much lower risk than they will once real people's closets are stored here. Still confirm with the user before genuinely destructive/hard-to-reverse actions (force-push, dropping a migration that already ran against real data, deleting branches) once real data exists — but don't withhold routine build-and-ship work out of launched-product caution that doesn't apply yet.

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

_Not yet scaffolded as of 2026-07-31 — update this section the moment `package.json` exists._ Planned:

```bash
npm run dev          # start Next.js dev server (Turbopack)
npm run build        # production build
npm run lint         # typecheck (and/or eslint, once configured)
npm test             # unit tests — the outfit-matching/scoring logic is the highest-value thing to test here
```

## Architecture (target — build this, don't assume any of it exists yet)

### Stack

- **Next.js 16** (App Router, Turbopack, Node 20+) + TypeScript + React, deployed on **Vercel**.
- **Supabase**: Postgres + Row Level Security for the database, Supabase Auth for accounts, Supabase Storage for clothing photos. Chosen over a local-only/no-backend build because the plan is "web prototype now, native app later" — a real backend means the native app reuses the same data instead of the prototype being throwaway.
- **Tailwind CSS + shadcn/ui** for the UI — fast to build image-heavy grid/gallery layouts.
- **Zod** for validating closet-item and outfit-request input at the server boundary.
- **Anthropic API (Claude Haiku, vision)** — optional "auto-tag from photo" assist layered on top of manual entry, never a replacement for it. Call it server-side only (route handler / server action); never ship the API key to the client.
- **OpenWeatherMap** (free tier) if/when weather-aware suggestions are built — cache responses, don't call it per-request.

### Data model (sketch — adjust as the schema is actually created via migrations; this is not yet real)

- `closet_items`: owner (user id, RLS-scoped), category, color(s), pattern, formality level, season/warmth, photo URL, archived flag.
- `occasions`: a fixed set to start (work, casual, date night, formal, workout, travel) — decide whether it needs to be user-editable when you actually build this, don't design a generic tagging system speculatively before there's a second use for it.
- `outfits`: a set of `closet_item` references + the occasion it was generated/saved for + worn history (dates worn) — the worn history is what lets the app avoid repeating the same suggestion, which is the actual complaint ("I have all these clothes but can't make an outfit") this product exists to fix.

### Outfit-matching logic

Rule-based for v1 — no ML/embeddings needed at this scale: fill the required category "slots" for the occasion, filter candidates by formality/season fit, score combinations with simple color-harmony rules (neutral pairs freely, limit clashing bold-pattern combos), exclude recently-worn items first. Keep this logic in plain, framework-free TypeScript modules (no Next.js/Supabase imports inside the scoring function itself) so it stays independently unit-testable and portable to a native app later — this is the one part of the codebase worth that isolation now; don't extend the same treatment to code that has no such reuse need yet.

## MVP scope — what v1 is and is not

**In scope:** add closet items (manual tags, optional photo, optional AI auto-tag assist); pick an occasion; get outfit suggestions built only from clothes the user already owns; swap out a piece and regenerate; mark an outfit worn; avoid repeating recent suggestions.

**Explicitly deferred — do not build until asked:** AI chat stylist, social/community features, cost-per-wear or sustainability analytics, shopping/try-before-you-buy integration, the native app itself.
