# Looplish

Looplish is a Chrome/Edge extension for sentence-by-sentence English listening practice on YouTube. It uses a video's existing English captions, keeps the answer hidden while you type, compares your transcription word by word, and saves progress locally in IndexedDB.

## Current MVP

- Prefers manually authored English captions, then English auto-captions
- Groups YouTube caption cues into practice-sized sentences
- Replays one sentence and pauses automatically at its end
- Supports playback speed from 0.75× to 1.5×
- Shows missing and extra words after submission
- Saves transcripts, attempts, and progress in extension-owned IndexedDB
- Requests persistent browser storage when the side panel starts

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run check
```

The production extension is written to `dist/`.

## Load the extension locally

1. Run `npm run build`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the generated `dist/` directory.
5. Open a YouTube video that has captions, then click the Looplish toolbar button.

YouTube is a single-page application. If the side panel cannot read a video immediately after extension installation, refresh the YouTube tab once so the content scripts are attached.

## Keyboard controls

- `Alt + Space`: replay the current sentence
- `Alt + Left`: previous sentence
- `Alt + Right`: next sentence
- `Ctrl/Command + Enter`: check the typed answer

## Architecture

```text
domain/          Pure transcript, comparison, and study data rules
application/     Study-session state and use-case coordination
infrastructure/  YouTube and IndexedDB adapters
extension/       Manifest V3 background/content entry points
panel/           Side-panel view and controller
shared/          Configuration and cross-context message contracts
```

The domain and application modules do not depend on Chrome APIs, which keeps them independently testable. YouTube page internals and IndexedDB are isolated behind infrastructure modules.

