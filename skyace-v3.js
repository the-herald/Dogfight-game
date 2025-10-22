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

function preload() {}

function create() {
  const scene = this;
  startTime = this.time.now;

  const bg = this.add.graphics().setScrollFactor(0);
  drawGradient(bg, config.width, config.height);

  // Create runtime textures
  createTextures(scene);

  // Player setup
  player = this.physics.add.sprite(config.width / 2, config.height - 70, null);
  player.setSize(32, 32);
  player.displayWidth = 32;
  player.displayHeight = 32;
  player.setCollideWorldBounds(true);
  player.body.allowGravity = false;
  player.setImmovable(true);

  playerGraphic = this.add.graphics().setDepth(5).setScrollFactor(0);

  // Entity groups
  bullets = this.physics.add.group();
  missiles = this.physics.add.group();
  rockets = this.physics.add.group();
  bombs = this.physics.add.group();
  vortexShots = this.physics.add.group();
  groundTargets = this.physics.add.group();
  enemies = this.physics.add.group();

  spawnGroundTargets(this, this.cameras.main.scrollY + config.height);

  cursors = this.input.keyboard.createCursorKeys();
  this.keyM = this.input.keyboard.addKey('M');
  this.keyR = this.input.keyboard.addKey('R');
  this.keyB = this.input.keyboard.addKey('B');
  this.keyV = this.input.keyboard.addKey('V');
  this.keySpace = cursors.space;

  this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
  this.physics.add.overlap(missiles, enemies, hitEnemy, null, this);
  this.physics.add.overlap(rockets, enemies, hitEnemy, null, this);
  this.physics.add.overlap(vortexShots, enemies, hitEnemyVortex, null, this);
  this.physics.add.overlap(bombs, groundTargets, hitGround, null, this);

  uiText = this.add.text(8, 8, 'Score: 0', { font: '18px monospace', fill: '#ffffff' }).setScrollFactor(0);

  this.cameras.main.setBounds(0, -100000, config.width, 100000 + config.height);

  this.add.text(config.width - 220, 8, '← → Move  Space Fire\nM Homing  R Rocket\nB Bomb  Space+V Vortex', { font: '12px monospace', fill: '#fff' }).setScrollFactor(0);
}

function update(time, delta) {
  const scene = this;
  const speed = 320;
  player.body.setVelocityX(0);
  if (cursors.left.isDown) player.body.setVelocityX(-speed);
  else if (cursors.right.isDown) player.body.setVelocityX(speed);

  const cam = this.cameras.main;
  const screenBottomWorldY = cam.scrollY + config.height - 70;
  player.y = screenBottomWorldY;
  const pw = 32;
  player.x = Phaser.Math.Clamp(player.x + player.body.velocity.x * delta / 1000, pw / 2, config.width - pw / 2);
  player.body.x = player.x - pw / 2;

  drawPlayerGraphic(playerGraphic, player.x, player.y);

  if (this.keySpace.isDown) {
    if (!player.lastBulletTime || time - player.lastBulletTime > 200) {
      fireBullet(scene, player.x, player.y - 18);
      player.lastBulletTime = time;
    }
  }

  if (this.keyM.isDown && time - lastMissileTime > 1000) {
    fireMissile(scene);
    lastMissileTime = time;
  }

  if (this.keyR.isDown && time - lastRocketTime > 1500) {
    fireRocketSalvo(scene);
    lastRocketTime = time;
  }

  if (Phaser.Input.Keyboard.JustDown(this.keyB)) {
    dropBomb(scene);
  }

  if (this.keySpace.isDown && this.keyV.isDown && time - lastVortexTime > 1200) {
    fireVortexShots(scene);
    lastVortexTime = time;
  }

  missiles.children.iterate(m => {
    if (!m || !m.active) return;
    const target = findNearestEnemy(m);
    if (target) this.physics.moveToObject(m, target, 240);
  });

  rockets.children.iterate(r => {
    if (!r) return;
    r.lifespan -= delta;
    if (r.lifespan <= 0) r.destroy();
  });

  vortexShots.children.iterate(v => {
    if (!v) return;
    v.body.velocity.x *= 0.995;
  });

  const elapsed = (time - startTime) / 1000;
  scrollSpeed = 0.7 + Math.min(3, elapsed * 0.01);
  cam.scrollY -= scrollSpeed;

  if (groundTargets.countActive(true) < 6) {
    spawnGroundTargets(this, cam.scrollY + config.height + 40);
  }

  enemySpawnTimer += delta;
  const baseInterval = Math.max(150, 900 - Math.floor(score / 25) - Math.floor(elapsed * 2));
  if (enemySpawnTimer > baseInterval) {
    const count = Phaser.Math.Between(2, Math.min(6, 2 + Math.floor(elapsed / 10)));
    spawnEnemies(this, count);
    enemySpawnTimer = 0;
  }

  enemies.children.iterate(e => {
    if (!e) return;
    if (e.y > cam.scrollY + config.height + 100) e.destroy();
    if (e.update) e.update();
  });

  bombs.children.iterate(b => {
    if (!b) return;
    if (b.y > cam.scrollY + config.height + 200) b.destroy();
  });

  uiText.setText('Score: ' + score);
}

function drawGradient(graphics, w, h) {
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const r = Math.round(135 + (30 - 135) * t);
    const g = Math.round(206 + (144 - 206) * t);
    const b = Math.round(235 + (255 - 235) * t);
    graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
    graphics.fillRect(0, y, w, 1);
  }
}

function drawPlayerGraphic(graphic, x, y) {
  graphic.clear();
  graphic.fillStyle(0xffffff, 1);
  graphic.fillTriangle(x - 18, y + 10, x + 18, y + 10, x, y - 12);
  graphic.fillStyle(0x00ff00, 1);
  graphic.fillCircle(x, y - 12, 4);
}

function createTextures(scene) {
  const makeRect = (key, color, w, h) => {
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  const makeCircle = (key, color, r) => {
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  };

  makeRect('bullet', 0xffff66, 6, 10);
  makeRect('missile', 0xffaa55, 8, 14);
  makeRect('rocket', 0xff5533, 6, 12);
  makeRect('bomb', 0xff3366, 8, 12);
  makeCircle('vortex', 0x66ffff, 7);
  makeRect('enemy', 0x00ccff, 28, 18);
  makeRect('ground', 0x00cc66, 36, 16);
}

function fireBullet(scene, x, y) {
  const b = bullets.create(x, y, 'bullet');
  b.body.allowGravity = false;
  b.setVelocityY(-520);
  scene.time.addEvent({ delay: 2000, callback: () => b.destroy() });
}

