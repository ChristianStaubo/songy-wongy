PRD — Songy-Wongy 🎵

Objective
Songy-Wongy is a fun, lightweight web + backend app that lets users prompt AI to generate silly or serious songs. The MVP is designed to be simple, focusing on monorepo management.
Core Features (MVP1)

Auth

Email/password and social provier signup/login

Simple profile with credit balance.

Credits + Payments

Users can purchase credits via Stripe (1 credit = 1 song).

Display remaining credits in UI.

Song Generation

User enters a text prompt.

Backend calls ElevenLabs Music API (fast, paid provider).

Returns: audio file (MP3), auto-generated lyrics, and a simple thumbnail. We store in S3 and our postgres db

Deducts credits.

Song Library

Users see all generated songs in their account.

Song card: thumbnail, title, lyrics preview.

Actions: Play, Download, Delete.

Storage

Songs stored in S3 (audio + thumbnail).

Songs can be deleted on demand.

Public access only via signed URLs.

MVP2 Enhancements

“Slow” Self-Hosted Model

Run an open-source music generation model (e.g., on a cheap GPU box).

Expose as an alternate provider (“Slow & Cheap”).

Users can pick:

Fast → ElevenLabs (credits cost more).

Slow → Self-hosted (credits cost less).

Marketed as: “Want a cheaper song? Wait longer 🎶.”

Better Auth

React Native App

Companion mobile app to browse, play, and generate songs.

Shares types with web via Turborepo /packages.

Tech Stack

Frontend (Web): Next.js + Tailwind and Shadcn.

Backend: NestJS API.

Storage: AWS S3 for audio/thumbnail.

Payments: Stripe Checkout.

AI (MVP1): ElevenLabs API.

AI (MVP2): Self-hosted open-source model (Dockerized).

Monorepo: Turborepo, with /apps/web, /services/api, /packages/types.

Flow

User signs up → receives starter credits (optional).

User buys credits → Stripe checkout → webhook increments credits.

User enters prompt → API checks credits → calls ElevenLabs → uploads audio to S3 → stores song record.

User sees song card → can play, download, delete.

MVP2: Option to choose “fast” (ElevenLabs) vs “slow” (self-hosted model).

Success Criteria

A user can go from signup → purchase credits → generate a song → play/download it.

Payments & credit usage work reliably.

Audio playback in browser is smooth.

Deletion removes songs from S3 + DB.

MVP2: self-hosted model integrated with fallback selection.

👉 That’s it. Simple, scoped, and fun.
