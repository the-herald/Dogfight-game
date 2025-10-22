// skyace-v3.js — SkyAce v3 (Phaser 3)
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player, cursors;
let bullets, missiles, rockets, bombs, vortexShots;
let groundTargets, enemies;
let lastMissileTime = 0, lastRocketTime = 0, lastVortexTime = 0;
let scrollSpeed = 0.7, score = 0, enemySpawnTimer = 0, startTime = 0;
let uiText, playerGraphic;

function preload() {
  // No external assets — everything drawn at runtime
}

function create() {
  const scene = this;
  startTime = this.time.now;

  // Background gradient drawn to a fixed camera layer (doesn't move with world scroll)
  const bg = this.add.graphics().setScrollFactor(0);
  drawGradient(bg, config.width, config.height);

  // Player (physics body) — fixed to bottom area; only move left/right
  player = this.physics.add.sprite(config.width / 2, config.height - 70, null);
  player.setCollideWorldBounds(true);
  player.body.allowGravity = false;
  player.setImmovable(true);

  // Visual for player (drawn each frame to follow the physics body)
  playerGraphic = this.add.graphics().setDepth(5).setScrollFactor(0);

  // Weapon / entity groups
  bullets = this.physics.add.group();
  missiles = this.physics.add.group();
  rockets = this.physics.add.group();
  bombs = this.physics.add.group();
  vortexShots = this.physics.add.group();
  groundTargets = this.physics.add.group();
  enemies = this.physics.add.group();

  // Spawn initial ground targets along the first screen
  spawnGroundTargets(this, this.cameras.main.scrollY + config.height);

  // Controls
  cursors = this.input.keyboard.createCursorKeys();
  this.keyM = this.input.keyboard.addKey('M');
  this.keyR = this.input.keyboard.addKey('R');
  this.keyB = this.input.keyboard.addKey('B');
  this.keyV = this.input.keyboard.addKey('V');
  this.keySpace = cursors.space;

  // Collisions/overlaps
  this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
  this.physics.add.overlap(missiles, enemies, hitEnemy, null, this);
  this.physics.add.overlap(rockets, enemies, hitEnemy, null, this);
  this.physics.add.overlap(vortexShots, enemies, hitEnemyVortex, null, this);
  this.physics.add.overlap(bombs, groundTargets, hitGround, null, this);

  // Simple UI
  uiText = this.add.text(8, 8, 'Score: 0', { font: '18px monospace', fill: '#ffffff' }).setScrollFactor(0);

  // Camera initial position (we will scroll upward over time)
  this.cameras.main.setBounds(0, -100000, config.width, 100000 + config.height);

  // Small instructions
  this.add.text(config.width - 220, 8, '← → Move  Space Fire\nM Homing  R Rocket\nB Bomb  Space+V Vortex', { font: '12px monospace', fill: '#fff' }).setScrollFactor(0);
}

// Draw a vertical gradient into a Graphics object (works well and is fast)
function drawGradient(graphics, w, h) {
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    // interpolate SkyBlue (135,206,235) -> DodgerBlue (30,144,255)
    const r = Math.round(135 + (30 - 135) * t);
    const g = Math.round(206 + (144 - 206) * t);
    const b = Math.round(235 + (255 - 235) * t);
    graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
    graphics.fillRect(0, y, w, 1);
  }
}

function update(time, delta) {
  const scene = this;
  // Move player left/right only (player sprite is on screen coordinates; body uses world but we constrain by camera bottom)
  const speed = 320;
  player.body.setVelocityX(0);
  if (cursors.left.isDown) player.body.setVelocityX(-speed);
  else if (cursors.right.isDown) player.body.setVelocityX(speed);

  // Keep player at bottom of the view (so world camera scroll doesn't move the player's visual position)
  const cam = this.cameras.main;
  const screenBottomWorldY = cam.scrollY + config.height - 70;
  // lock player's world y so player visually stays near bottom of screen
  player.y = screenBottomWorldY;
  player.body.x = Phaser.Math.Clamp(player.x - player.displayWidth / 2, 0, config.width - player.displayWidth);

  // Draw player decal (triangle)
  drawPlayerGraphic(playerGraphic, player.x, player.y);

  // Auto-fire bullets (space held)
  if (this.keySpace.isDown) {
    if (!player.lastBulletTime || time - player.lastBulletTime > 200) {
      fireBullet(scene, player.x, player.y - 18);
      player.lastBulletTime = time;
    }
  }

  // Homing missiles (M) - 1/sec
  if (this.keyM.isDown && time - lastMissileTime > 1000) {
    fireMissile(scene);
    lastMissileTime = time;
  }

  // Rocket salvo (R) - fires 10 at once
  if (this.keyR.isDown && time - lastRocketTime > 1500) {
    fireRocketSalvo(scene);
    lastRocketTime = time;
  }

  // Bombs (B) - drops straight down
  if (Phaser.Input.Keyboard.JustDown(this.keyB)) {
    dropBomb(scene);
  }

  // Vortex (Space + V) - 50 rpm -> ~1200ms delay
  if (this.keySpace.isDown && this.keyV.isDown && time - lastVortexTime > 1200) {
    fireVortexShots(scene);
    lastVortexTime = time;
  }

  // Missile homing behavior
  missiles.children.iterate(m => {
    if (!m || !m.active) return;
    const target = findNearestEnemy(m);
    if (target) this.physics.moveToObject(m, target, 240);
  });

  // Rocket lifespan update
  rockets.children.iterate(r => {
    if (!r) return;
    r.lifespan -= delta;
    if (r.lifespan <= 0) r.destroy();
  });

  // Move vortex shells slowly and let them pass through multiple targets (handled in overlap)
  vortexShots.children.iterate(v => {
    if (!v) return;
    // optional: dampen x over time
    v.body.velocity.x *= 0.995;
  });

  // Scroll camera upward slowly to create infinite upward flight
  const elapsed = (time - startTime) / 1000;
  // accelerate scroll very slightly over time
  scrollSpeed = 0.7 + Math.min(3, elapsed * 0.01);
  cam.scrollY -= scrollSpeed;

  // Ensure ground targets are present ahead
  if (groundTargets.countActive(true) < 6) {
    spawnGroundTargets(this, cam.scrollY + config.height + 40);
  }

  // Spawn waves of enemies; spawn rate increases with score/time
  enemySpawnTimer += delta;
  const baseInterval = Math.max(150, 900 - Math.floor(score / 25) - Math.floor(elapsed * 2));
  if (enemySpawnTimer > baseInterval) {
    const count = Phaser.Math.Between(2, Math.min(6, 2 + Math.floor(elapsed / 10)));
    spawnEnemies(this, count);
    enemySpawnTimer = 0;
  }

  // Clean up offscreen enemies/ground targets and bombs
  enemies.children.iterate(e => {
    if (!e) return;
    if (e.y > cam.scrollY + config.height + 100) e.destroy();
  });
  bombs.children.iterate(b => {
    if (!b) return;
    // if bomb fell off bottom, destroy
    if (b.y > cam.scrollY + config.height + 200) b.destroy();
  });
  // update UI
  uiText.setText('Score: ' + score);
}

// --- Helpers and entity behaviours ---

function drawPlayerGraphic(graphic, x, y) {
  graphic.clear();
  // small white triangle pointing up
  graphic.fillStyle(0xffffff, 1);
  const size = 18;
  graphic.fillTriangle(x - size, y + 10, x + size, y + 10, x, y - 12);
}

function fireBullet(scene, x, y) {
  const b = bullets.create(x, y, null);
  b.setSize(6, 10);
  b.body.allowGravity = false;
  b.setVelocityY(-520);
  b.setTint(0xffff66);
  // small life
  scene.time.addEvent({ delay: 2000, callback: () => b.destroy() });
}

function fireMissile(scene) {
  const m = missiles.create(player.x, player.y - 20, null);
  m.setSize(8, 14);
  m.body.allowGravity = false;
  m.setTint(0xffaa55);
  m.setVelocityY(-120);
  // small smoke trail could be added here in future
  scene.time.addEvent({ delay: 8000, callback: () => { if (m) m.destroy(); } });
}

function fireRocketSalvo(scene) {
  for (let i = 0; i < 10; i++) {
    const offset = (i - 4.5) * 28;
    const r = rockets.create(player.x + offset, player.y - 18, null);
    r.setSize(6, 12);
    r.body.allowGravity = false;
    r.setTint(0xff5533);
    r.setVelocityY(-480);
    r.lifespan = 1200;
  }
}

function dropBomb(scene) {
  const b = bombs.create(player.x, player.y - 6, null);
  b.setSize(8, 12);
  b.body.allowGravity = false;
  b.setVelocityY(360);
  b.setTint(0xff3366);
  // remove after some time
  scene.time.addEvent({ delay: 6000, callback: () => { if (b) b.destroy(); } });
}

function fireVortexShots(scene) {
  // fire 5 flak-like shells in a short spread; high damage (one-shot enemy)
  for (let i = -2; i <= 2; i++) {
    const shot = vortexShots.create(player.x + i * 16, player.y - 20, null);
    shot.setSize(14, 14);
    shot.body.allowGravity = false;
    shot.setTint(0x66ffff);
    shot.setVelocityY(-360);
    shot.setVelocityX(i * 70);
    // linger a bit so it can hit multiple enemies nearby
    scene.time.addEvent({ delay: 1600, callback: () => { if (shot) shot.destroy(); } });
  }
}

function spawnEnemies(scene, count = 1) {
  for (let i = 0; i < count; i++) {
    const x = Phaser.Math.Between(40, config.width - 40);
    const y = scene.cameras.main.scrollY - Phaser.Math.Between(40, 240);
    const speed = Phaser.Math.Between(80, 160) + Math.floor(score / 40);
    const e = scene.physics.add.sprite(x, y, null);
    e.setSize(28, 18);
    e.body.allowGravity = false;
    e.setVelocityY(speed);
    // small wobble
    e.originalX = x;
    e.update = function() {
      // sinusoidal horizontal sway based on world y
      this.x += Math.sin(this.y / 30) * 0.5;
    };
    enemies.add(e);
  }
}

function spawnGroundTargets(scene, yPos) {
  // create clusters of ground targets (tanks / turrets)
  const clusterCount = Phaser.Math.Between(3, 6);
  for (let c = 0; c < clusterCount; c++) {
    const x = Phaser.Math.Between(40, config.width - 40);
    const y = yPos - Phaser.Math.Between(12, 48);
    const t = scene.physics.add.sprite(x, y, null);
    t.setSize(36, 16);
    t.body.allowGravity = false;
    t.setTint(0x00cc66);
    groundTargets.add(t);
  }
}

function hitEnemy(projectile, enemy) {
  try { if (projectile && projectile.destroy) projectile.destroy(); } catch(e) {}
  try { if (enemy && enemy.destroy) enemy.destroy(); } catch(e) {}
  score += 10;
}

function hitGround(bomb, target) {
  try { if (bomb && bomb.destroy) bomb.destroy(); } catch(e) {}
  try { if (target && target.destroy) target.destroy(); } catch(e) {}
  score += 7;
}

function hitEnemyVortex(vortex, enemy) {
  // vortex shells are powerful: they destroy the enemy but persist (optionally)
  try { if (enemy && enemy.destroy) enemy.destroy(); } catch(e) {}
  score += 12;
}

function findNearestEnemy(missile) {
  let nearest = null, minD = Infinity;
  enemies.children.iterate(e => {
    if (!e || !e.active) return;
    const d = Phaser.Math.Distance.Between(missile.x, missile.y, e.x, e.y);
    if (d < minD) { minD = d; nearest = e; }
  });
  return nearest;
}
