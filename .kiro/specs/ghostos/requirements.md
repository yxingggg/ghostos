# GhostOS — Requirements

## Introduction

GhostOS is a fully client-side, browser-based desktop environment that recreates the
nostalgic 1990s personal-computing experience with modern web technologies. It runs
entirely offline, with no external API dependencies for its core functionality. The
system provides a window manager, a desktop with icons, a start menu and taskbar, and a
set of built-in applications (notes, file explorer, calculator, terminal, music player,
and an optional AI assistant). State persists locally via IndexedDB so a user's desktop,
files, and notes survive page reloads.

The visual language is "retro gothic": dark palettes, ornate framing, pixel-era chrome,
CRT scanline/glow effects, and original (self-drawn) iconography. The experience must be
keyboard accessible, responsive across viewport sizes, and respect user preferences such
as reduced motion and muted sound.

### Glossary

- **WM**: Window Manager — the subsystem that tracks and renders windows.
- **VFS**: Virtual File System — an in-browser hierarchical file store persisted in IndexedDB.
- **App**: A built-in application that runs inside one or more windows.
- **z-order**: Stacking order of windows; the focused window has the highest z-index.

---

## Requirements

### Requirement 1: Window Manager — lifecycle

**User Story:** As a user, I want to open, close, minimize, maximize, and restore windows,
so that I can manage multiple applications like a real desktop.

#### Acceptance Criteria

1. WHEN a user launches an app THEN the WM SHALL create a window with a unique id, a title, a default size, and a position, and SHALL render it on the desktop.
2. WHEN a user clicks a window's close control THEN the WM SHALL destroy that window and remove it from the taskbar.
3. WHEN a user clicks a window's minimize control THEN the WM SHALL hide the window from the desktop while retaining its entry in the taskbar.
4. WHEN a user clicks a minimized window's taskbar entry THEN the WM SHALL restore the window to its previous size and position and give it focus.
5. WHEN a user clicks a window's maximize control AND the window is not maximized THEN the WM SHALL expand the window to fill the available desktop area and SHALL store the previous bounds for later restoration.
6. WHEN a user clicks the maximize control AND the window is already maximized THEN the WM SHALL restore the window to its previously stored bounds.
7. IF a window is created without an explicit position THEN the WM SHALL place it using a cascading offset so that it does not fully overlap existing windows.

### Requirement 2: Window Manager — focus and z-order

**User Story:** As a user, I want clicking a window to bring it to the front, so that I can
work with overlapping windows.

#### Acceptance Criteria

1. WHEN a user clicks anywhere on a window THEN the WM SHALL assign that window the highest z-order and mark it as focused.
2. WHEN a window becomes focused THEN the WM SHALL mark all other windows as unfocused and SHALL render focused and unfocused windows with distinct styling.
3. WHEN the focused window is closed THEN the WM SHALL transfer focus to the next-highest window in z-order, IF any window remains.
4. WHILE no window is focused THE WM SHALL ensure no window displays the focused styling.

### Requirement 3: Window Manager — drag and resize

**User Story:** As a user, I want to drag windows by their title bar and resize them from
their edges, so that I can arrange my workspace.

#### Acceptance Criteria

1. WHEN a user presses and drags a window title bar THEN the WM SHALL move the window to follow the pointer and SHALL update the stored position on release.
2. WHEN a user drags a window resize handle THEN the WM SHALL change the window's width and/or height to follow the pointer.
3. The WM SHALL enforce a configurable minimum window width and height during resize.
4. WHEN a drag or resize would move a window entirely outside the desktop bounds THEN the WM SHALL clamp the window so that at least the title bar remains reachable.
5. WHILE a window is maximized THE WM SHALL disable dragging and edge resizing for that window.

### Requirement 4: Desktop, icons, start menu, and taskbar

**User Story:** As a user, I want a desktop with icons, a start menu, and a taskbar, so
that I can discover and launch applications.

#### Acceptance Criteria

1. The desktop SHALL display a grid of selectable icons, one per registered app.
2. WHEN a user double-clicks a desktop icon (or activates it via keyboard) THEN the system SHALL launch the associated app.
3. WHEN a user single-clicks a desktop icon THEN the system SHALL mark it as selected and SHALL deselect other icons.
4. WHEN a user activates the start button THEN the system SHALL toggle a start menu listing all registered apps.
5. WHEN a user selects an app from the start menu THEN the system SHALL launch it and close the start menu.
6. The taskbar SHALL display one button per open window, SHALL indicate which window is focused, and SHALL display a live clock.
7. WHEN a user clicks a taskbar button for the focused window THEN the system SHALL minimize that window.

### Requirement 5: Persistence

**User Story:** As a user, I want my desktop, files, and notes to persist, so that my work
survives reloads and offline sessions.

#### Acceptance Criteria

1. WHEN application data (notes, VFS entries, settings, music metadata) changes THEN the system SHALL persist it to IndexedDB.
2. WHEN the application loads THEN the system SHALL rehydrate persisted state from IndexedDB before rendering interactive content.
3. IF IndexedDB is unavailable THEN the system SHALL fall back to in-memory state and SHALL surface a non-blocking notice to the user.
4. The system SHALL perform all core persistence without contacting any external network service.

### Requirement 6: Notes application

**User Story:** As a user, I want a notes app, so that I can write and keep text notes.

#### Acceptance Criteria

1. WHEN a user creates a note THEN the Notes app SHALL store it with a unique id, a title, body text, and created/updated timestamps.
2. WHEN a user edits a note THEN the Notes app SHALL persist changes (debounced) and SHALL update the updated timestamp.
3. WHEN a user deletes a note THEN the Notes app SHALL remove it from storage and from the list.
4. WHEN the Notes app opens THEN it SHALL list existing standalone quick notes ordered by most recently updated.

### Requirement 6b: GraveNotes ↔ virtual filesystem integration

**User Story:** As a user, I want documents I create in GraveNotes to become real files
visible in Tomb Explorer, so that my work is a first-class part of the filesystem.

#### Acceptance Criteria

1. GraveNotes SHALL provide a File menu with New, Open, Save, Save As, and Close.
2. WHEN a user saves a new standalone document THEN GraveNotes SHALL create a real VFS file (not just a note), and it SHALL appear in Tomb Explorer immediately without a browser refresh.
3. The Save As dialog SHALL let the user choose a file name, a `.txt` or `.md` extension, and a destination folder.
4. WHEN a document is first saved THEN GraveNotes SHALL bind the editor to the created file's VFS identifier, so subsequent saves update the SAME file and never create a duplicate.
5. WHEN a user presses Ctrl/Cmd+S on a document not yet bound to a VFS file THEN GraveNotes SHALL open Save As; WHEN the document is already bound THEN it SHALL update the original file; in both cases it SHALL prevent the browser's default save dialog while the editor is focused.
6. GraveNotes SHALL let a user open an existing VFS text/Markdown file directly.
7. WHEN a chosen file name already exists in the destination THEN GraveNotes SHALL require overwrite confirmation (or let the user pick a different name), and SHALL NOT keep two conflicting copies.
8. GraveNotes SHALL display the current file name, its path, and an accurate save status (Unsaved changes, Saving, Saved, or Save failed), reporting persistence failures explicitly rather than falsely indicating success.
9. A stale debounced autosave SHALL NOT overwrite newer content (writes are guarded by a monotonic edit version).
10. WHEN the editor window closes with unsaved edits THEN GraveNotes SHALL flush the pending save.
11. Saved files SHALL remain accessible after the editor closes or the browser reloads.
12. Legacy standalone quick notes SHALL be preserved and SHALL offer a "Save as File" action; the integration SHALL never delete existing notes or reset IndexedDB.

### Requirement 7: Virtual file explorer

**User Story:** As a user, I want a file explorer over a virtual file system, so that I can
organize files and folders.

#### Acceptance Criteria

1. The VFS SHALL model a single-rooted tree of nodes, where each node is either a folder (with children) or a file (with content).
2. WHEN a user creates a folder or file THEN the VFS SHALL add it under the selected folder with a name unique among its siblings.
3. WHEN a user renames a node THEN the VFS SHALL update its name, rejecting a name that collides with a sibling.
4. WHEN a user deletes a folder THEN the VFS SHALL remove that folder and all of its descendants.
5. WHEN a user moves a node into a folder THEN the VFS SHALL reparent it, and SHALL reject any move that would place a folder inside its own descendant.
6. WHEN a user navigates into a folder THEN the explorer SHALL display that folder's children and a breadcrumb path to the root.
7. The VFS SHALL maintain the invariant that every non-root node has exactly one parent and that the tree contains no cycles.

### Requirement 7b: Opening files from the file explorer

**User Story:** As a user, I want to open files from Tomb Explorer, so that I can view and
edit their contents in the right application.

#### Acceptance Criteria

1. WHEN a user double-clicks a file (or selects it and presses Enter) THEN the explorer SHALL open it in the application associated with its type.
2. WHEN a user double-clicks or activates a folder THEN the explorer SHALL navigate into that folder rather than launching an application.
3. The explorer SHALL determine the handling application from a pure file-type association (by extension, then MIME) WITHOUT introducing application-specific branching into the window manager.
4. WHEN a user opens a text or Markdown file THEN the system SHALL open it in GraveNotes, passing the file's VFS identifier so GraveNotes loads that file's content.
5. WHEN a user edits and saves a file opened from the explorer THEN the system SHALL write the changes back to the SAME VFS file (by its identifier) and SHALL NOT create an unrelated note.
6. WHEN a user opens a newly created empty text file THEN the system SHALL open it without error and allow editing and saving.
7. WHEN a user opens a supported audio file THEN the system SHALL open it in DeadWave and begin playback where compatible.
8. WHEN a user opens a supported image file THEN the system SHALL display a preview in an image viewer.
9. IF a file's type is unsupported THEN the system SHALL display an informative message and SHALL NOT fail silently.

### Requirement 7c: File management context menu

**User Story:** As a user, I want a right-click context menu in Tomb Explorer, so that I can
manage files efficiently.

#### Acceptance Criteria

1. WHEN a user right-clicks a file or folder THEN the explorer SHALL show a context menu positioned at the pointer and SHALL close it on outside click or Escape.
2. The context menu SHALL offer Open, Open with, Rename, Delete, Duplicate, Download, and Properties, showing only actions applicable to the target (e.g. Open with/Download for files).
3. Every visible context-menu action SHALL be functional; the explorer SHALL NOT present placeholder actions.
4. WHEN a user chooses Duplicate THEN the explorer SHALL create a copy (including file content) under a non-colliding name within the same parent.
5. WHEN a user chooses Download on a file THEN the browser SHALL download that file's content.
6. WHEN a user chooses Properties THEN the explorer SHALL display the item's name, type, location, size (files) or item count (folders), and timestamps.
7. WHEN a user chooses Open with THEN the explorer SHALL let the user pick a compatible application and open the file there.

### Requirement 8: Calculator

**User Story:** As a user, I want a calculator, so that I can perform arithmetic.

#### Acceptance Criteria

1. The Calculator SHALL support addition, subtraction, multiplication, and division over decimal numbers.
2. WHEN a user divides by zero THEN the Calculator SHALL display an error state rather than crashing.
3. WHEN a user presses clear THEN the Calculator SHALL reset to an initial zero state.
4. The Calculator SHALL accept input from both on-screen buttons and the physical keyboard.

### Requirement 8b: Terminal

**User Story:** As a user, I want a simulated terminal, so that I can explore the VFS and
system with text commands.

#### Acceptance Criteria

1. The Terminal SHALL provide a prompt that accepts typed commands and displays output in a scrollback buffer.
2. The Terminal SHALL implement at least: `help`, `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `echo`, `clear`, `pwd`, and `whoami`, operating against the shared VFS.
3. WHEN a user enters an unknown command THEN the Terminal SHALL print a recognizable error message and SHALL continue accepting input.
4. The Terminal SHALL maintain a command history navigable with the Up and Down arrow keys.
5. The Terminal SHALL operate entirely offline and SHALL NOT execute arbitrary host code.

### Requirement 9: Music player with visualization

**User Story:** As a user, I want a local music player with an audio visualizer, so that I
can play my own audio files with retro flair.

#### Acceptance Criteria

1. WHEN a user adds a local audio file THEN the player SHALL store it in the VFS/IndexedDB and SHALL list it in a playlist.
2. The player SHALL support play, pause, stop, next, previous, and seek.
3. WHILE audio is playing THE player SHALL render a visualization driven by the Web Audio API analyser.
4. IF the Web Audio API is unavailable THEN the player SHALL still play audio and SHALL hide the visualization without error.
5. The player SHALL honor the global mute setting.

### Requirement 10: Optional AI assistant

**User Story:** As a user, I want a helpful assistant that works offline by default and can
optionally use a real AI model, while the rest of GhostOS still works fully offline.

#### Acceptance Criteria

1. The assistant SHALL provide an offline, rule-based help mode by default that requires no API key or internet, answering questions about GhostOS features, apps, keyboard shortcuts, filesystem operations, terminal commands, settings, and workspace restoration from local documentation.
2. The offline help mode SHALL be clearly labeled as an offline help assistant (not a generative AI model), SHALL offer clickable suggested questions, and SHALL give a helpful fallback when a question is not recognized.
3. The online AI mode SHALL be disabled by default and SHALL require the user to opt in and supply an endpoint and (optionally) an API key before it contacts any network.
4. The online AI mode SHALL support provider presets for OpenAI, Google Gemini, and custom OpenAI-compatible endpoints, with configurable endpoint, model, and API key, and SHALL format requests/parse responses correctly for each provider's API shape.
5. The assistant SHALL provide a Test Connection action with clear success and error messages, and SHALL offer direct navigation to its Settings section.
6. IF an online request fails (invalid credentials, unavailable model, CORS, rate limit, network failure, or timeout) THEN the assistant SHALL show a specific, graceful error and SHALL NOT break the desktop.
7. The system SHALL keep the API key in session memory only and SHALL exclude it from persistence, workspace exports, logs, error messages, and sample configurations.
8. WHEN the user switches provider or endpoint THEN the system SHALL clear the stored API key.
9. The system SHALL NOT send an API key to a non-HTTPS endpoint, and SHALL send only the user's conversation — never virtual files or personal notes — to the provider.
10. WHILE online AI is disabled or offline THE system SHALL keep all other apps (including the offline help mode) fully functional.

### Requirement 11: Visual theme and CRT effects

**User Story:** As a user, I want a retro gothic look with CRT effects, so that the
experience feels authentically nostalgic.

#### Acceptance Criteria

1. The UI SHALL apply a cohesive retro gothic theme via Tailwind design tokens (colors, fonts, borders).
2. The system SHALL offer a toggleable CRT effect layer (scanlines/glow/flicker).
3. Icons SHALL be original assets authored for this project (no third-party icon packs for app/desktop icons).
4. WHEN the user enables "reduced motion" (via setting or OS preference) THEN the system SHALL disable flicker and non-essential animation.

### Requirement 12: Accessibility and responsiveness

**User Story:** As a user relying on the keyboard or a small screen, I want accessible and
responsive controls, so that GhostOS is usable for me.

#### Acceptance Criteria

1. All interactive controls SHALL be reachable and operable by keyboard, with visible focus indicators.
2. Windows and menus SHALL expose appropriate ARIA roles/labels and SHALL manage focus when opened and closed.
3. WHEN the viewport is narrow (mobile) THEN the system SHALL adapt the layout (e.g., stacked/full-screen windows) while keeping apps usable.
4. The system SHALL respect `prefers-reduced-motion` and the global sound setting.

### Requirement 13: Sound effects

**User Story:** As a user, I want optional retro sound effects, so that interactions feel
tactile, without being forced on me.

#### Acceptance Criteria

1. The system SHALL play short sound effects for key interactions (e.g., open/close window, click) WHEN sound is enabled.
2. Sound SHALL be disabled by default until the user enables it, and the setting SHALL persist.
3. WHILE sound is disabled THE system SHALL play no audio cues.

### Requirement 14: Offline-first operation

**User Story:** As a user, I want GhostOS to work offline, so that I can rely on it without
a network.

#### Acceptance Criteria

1. The core application (WM, desktop, Notes, File Explorer, Calculator, Terminal, Music Player) SHALL function with no network connection.
2. The build SHALL not require any runtime third-party API for core features.
3. All assets required for core features SHALL be bundled with the application.

### Requirement 15: Quality — modularity, strictness, and testing

**User Story:** As a maintainer, I want modular, strictly-typed, well-tested code, so that
GhostOS is reliable and extensible.

#### Acceptance Criteria

1. The codebase SHALL compile under TypeScript `strict` mode with no type errors.
2. Apps SHALL be registered through a common app-registry interface so that new apps can be added without modifying the window manager core.
3. The project SHALL include unit tests for pure logic (calculator, VFS operations, WM reducers) and integration tests for store/app behavior.
4. The project SHALL include property-based tests asserting invariants of window state (e.g., focus uniqueness, bounds clamping) and of the VFS (e.g., single-parent, acyclic, delete-subtree).
5. CI-equivalent checks (type-check, lint, test) SHALL be runnable via documented npm scripts.
