Dogfight - Phaser 3 (Single-player)
=================================

This is a single-player 2D dogfighting game built with Phaser 3 suitable for static hosting (Vercel, Netlify, GitHub Pages).

How to deploy to Vercel
-----------------------
1. Create a Git repository with these files at the project root.
2. In Vercel, import the repository and set the framework preset to "Other".
3. Set the build command to empty and the output directory to `/` (or leave defaults for static).
4. Deploy — Vercel will serve `index.html`.

Files included
--------------
- index.html     → main HTML file
- styles.css     → small CSS for the page
- main.js        → Phaser game code
- README.md

Notes
-----
- Uses Phaser v3 via CDN. Make sure the host can reach cdn.jsdelivr.net.
- No external assets are required — all visuals are drawn programmatically.
- If you want to make the game multiplayer later, add a WebSocket service hosted elsewhere and connect from `main.js`.
