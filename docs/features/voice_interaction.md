# Voice Interaction (Whisper + TTS)

## User Value
Provide hands-free conversational experience – users can send voice messages and receive spoken replies, improving accessibility and mobile friendliness.

## Technical Requirements
1. **ASR (Speech-to-Text)** – transcribe voice attachments using OpenAI Whisper or Google Speech-to-Text.
2. **TTS (Text-to-Speech)** – generate audio of Gemini responses (Google Cloud TTS or ElevenLabs).
3. **Discord Handling** – accept `/voice` command or auto-detect `.ogg` voice attachments; upload audio replies.
4. **Caching** – store generated TTS per message to avoid duplicate cost.
5. **Rate Limits** – manage audio size (<25 MB) and queue long transcriptions.

## Dependencies
* OpenAI Whisper API (or local whisper.cpp for cost)
* Google Cloud TTS / ElevenLabs SDK
* Prisma `VoiceLog` model for usage tracking

## Implementation Plan
| Phase | Description |
|-------|-------------|
| 1 | Add `voice-utils.ts`: download Ogg/Opus -> convert to PCM via FFmpeg; call Whisper; reply with text. |
| 2 | Integrate TTS option: after Gemini reply, slash param `tts:true` converts text to mp3 and attaches. |
| 3 | Persist logs: `VoiceLog` {userId, durationSec, tokens, costUsd}. Stats merged into `/stats`. |
| 4 | Feature flag per-guild; default off. Gather feedback, optimize latency. |

## Risks & Mitigations
* **Latency** – Whisper large model can be slow ➜ use medium model + caching.
* **Cost Spikes** – enforce per-user quota & chunk TTS length.
* **Privacy** – transiently store audio on server only until processed; purge after.
* **Format Issues** – Discord uses Opus; rely on FFmpeg for robust conversion.
