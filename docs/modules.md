## Modules already decideded:
- Use a framework for both the frontend and backend.
    - Use a frontend framework.
    - Use a backend framework.
    - Full-stack frameworks count as both if you use
    both their frontend and backend capabilities.
- Implement real-time features using WebSockets or similar technology.
    - Real-time updates across clients.
    - Handle connection/disconnection gracefully.
    - Efficient message broadcasting.
- Allow users to interact with other users. The minimum requirements are:
    - A basic chat system (send/receive messages between users).
    - A profile system (view user information).
    - A friends system (add/remove friends, see friends list).
- A public API to interact with the database with a secured API key, rate
limiting, documentation, and at least 5 endpoints:
    - GET /api/{something}
    - POST /api/{something}
    - PUT /api/{something}
    - DELETE /api/{something}.
- Standard user management and authentication.
    - Users can update their profile information.
    - Users can upload an avatar (with a default avatar if none provided).
    - Users can add other users as friends and see their online status.
    - Users have a profile page displaying their information
- Advanced permissions system:
    - View, edit, and delete users (CRUD).
    - Roles management (admin, user, guest, moderator, etc.).
    - Different views and actions based on user role.
- File upload and management system. **Done** — see
docs/mad/20260819-file-uploads.md for the decisions and their trade-offs.
    - Support multiple file types: images (JPEG/PNG/WebP), audio (MP3/M4A) and
    video (MP4). PDF/`document` is deliberately out of scope for now, and SVG
    is excluded on purpose — it is executable XML.
    - Client-side and server-side validation (type, size). Both check the
    *declared* type and the size against a per-type cap; neither inspects the
    bytes. The response headers are what contain that risk, and the reasoning
    is written down rather than left implied.
    - Secure file storage: bytes live in a named Docker volume, never in the
    working tree, and one module (`src/lib/storage.ts`) is the only thing that
    touches the directory. Access control is by unguessable id — `visibility`
    governs discovery, not retrieval, which is a real property of the design
    and is documented as such.
    - File preview: `<img>`, `<audio>` and `<video>`, served with HTTP Range so
    a video actually seeks.
    - Progress indicators for uploads (XHR `upload.onprogress`; `fetch` cannot
    report upload progress at all).
    - Ability to delete uploaded files, including cleaning up the bytes when a
    whole account is deleted.
 
## Modules we will probably use:
- Use an ORM for the database.
- Implement advanced search functionality with filters, sorting, and pagination.
- Support for multiple languages (at least 3 languages).
    - Implement i18n (internationalization) system.
    - At least 3 complete language translations.
    - Language switcher in the UI.
    - All user-facing text must be translatable.
- Support for additional browsers.
    - Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge,
    etc.).
    - Test and fix all features in each browser.
    - Document any browser-specific limitations.
    - Consistent UI/UX across all supported browsers.
- Implement remote authentication with OAuth 2.0 (Google, GitHub, 42,
etc.).
 
## Modules to consider add later:
- A complete notification system for all creation, update, and deletion actions.
- Server-Side Rendering (SSR) for improved performance and SEO.
- Progressive Web App (PWA) with offline support and installability.
- Custom-made design system with reusable components, including a proper
color palette, typography, and icons (minimum: 10 reusable components).
- Major: Monitoring system with Prometheus and Grafana.
    - Set up Prometheus to collect metrics.
    - Configure exporters and integrations.
    - Create custom Grafana dashboards.
    - Set up alerting rules.
    - Secure access to Grafana
