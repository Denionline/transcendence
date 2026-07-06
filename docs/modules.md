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
 
## Modules we will probably use:
- Use an ORM for the database.
- Implement advanced search functionality with filters, sorting, and pagination.
- File upload and management system.
    - Support multiple file types (images, documents, etc.).
    - Client-side and server-side validation (type, size, format).
    - Secure file storage with proper access control.
    - File preview functionality where applicable.
    - Progress indicators for uploads.
    - Ability to delete uploaded files.
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
