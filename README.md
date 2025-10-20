Dogfight — Jet Edition (Phaser 3)
==================================

This is an upgraded single-player dogfighting game built with Phaser 3 and ready for static hosting (Vercel).

Features:
- Stylized jet sprites drawn procedurally (no external images).
- Plane steers smoothly toward your mouse cursor; move the mouse to direct the jet.
- Discrete levels: click to start Level 1, then click to move to next levels when thresholds are met.
- Normal fire: hold SPACE to fire rapidly (~12 shots/sec).
- Overdrive: hold V + SPACE together to enter overdrive (VERY rapid fire). Default overdrive is set to 40 shots/second (interpreted from your request). If you prefer 40 shots per minute instead, edit main.js and set overdriveRate = 40/60.
- Difficulty increases each level (spawn rate, faster enemies, tougher HP).

Deployment:
- Drop these files into a new Git repo (root) and import to Vercel as a static project. No build step required.

Controls:
- Move mouse to aim (plane turns toward cursor).
- SPACE: fire
- V + SPACE: overdrive fire (very fast)
- Click to start levels / restart after death

If you'd like the overdrive tuned (faster/slower), sounds, or a PNG sprite set instead of drawn jets, tell me and I'll produce an updated package.
