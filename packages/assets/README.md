# @quicklogo/assets

Canonical brand assets shared by the QuickLogo frontends.

- Import logos through the package exports. Vite and Next.js fingerprint these
  files and emit them with the application bundle, allowing the deployment CDN
  to cache them safely.
- Serve `public/favicon.ico` at `/favicon.ico`. Vite applications point their
  `publicDir` at this directory; the Next.js application imports the same file
  through its metadata configuration.
- Keep source files here rather than copying them into individual applications.
