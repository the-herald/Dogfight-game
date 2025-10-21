
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    }
  },
  scene: { preload, create, update }
};

let player, cursors, bullets, lastFired = 0;
let missiles, missileCooldown = 0;
let enemies, bombs, score = 0;
let level = 1;
let missileAmmo = 3;
let bombAmmo = 2;
let canFireMissile = true;

const game = new Phaser.Game(config);

function preload() {}

function create() {
  this.cameras.main.setBackgroundColor('#87ceeb');
  player = this.physics.add.sprite(400, 500, null).setOrigin(0.5, 0.5);
  player.displayWidth = 40;
  player.displayHeight = 40;
  drawJet(this, player, 0xcccccc);

  bullets = this.physics.add.group();
  missiles = this.physics.add.group();
  enemies = this.physics.add.group();

  cursors = this.input.keyboard.createCursorKeys();
  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

  spawnEnemies(this, level);
}

function update(time) {
  handlePlayerMovement(this, time);
  handleShooting(this, time);
  handleMissiles(this, time);
}

function handlePlayerMovement(scene, time) {
  const speed = 200;
  if (cursors.left.isDown) player.setAngularVelocity(-200);
  else if (cursors.right.isDown) player.setAngularVelocity(200);
  else player.setAngularVelocity(0);

  if (cursors.up.isDown) scene.physics.velocityFromRotation(player.rotation - Math.PI / 2, speed, player.body.acceleration);
  else if (cursors.down.isDown) scene.physics.velocityFromRotation(player.rotation - Math.PI / 2, -speed / 2, player.body.acceleration);
  else player.setAcceleration(0);

  wrapObject(player);
}

function handleShooting(scene, time) {
  const space = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  const vKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
  const mKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

  const fireRate = vKey.isDown ? 25 : 200;
  if (space.isDown && time > lastFired) {
    const bullet = scene.physics.add.sprite(player.x, player.y, null);
    drawBullet(scene, bullet);
    scene.physics.velocityFromRotation(player.rotation - Math.PI / 2, 400, bullet.body.velocity);
    bullets.add(bullet);
    lastFired = time + fireRate;
  }

  if (mKey.isDown && missileAmmo > 0 && canFireMissile) {
    fireMissile(scene);
    missileAmmo--;
    canFireMissile = false;
    scene.time.delayedCall(500, () => canFireMissile = true);
  }
}

function handleMissiles(scene, time) {
  missiles.children.each(missile => {
    if (!missile.target || !missile.target.active) {
      missile.destroy();
      return;
    }
    const angle = Phaser.Math.Angle.Between(missile.x, missile.y, missile.target.x, missile.target.y);
    const speed = 600;
    scene.physics.velocityFromRotation(angle, speed, missile.body.velocity);
  });
}

function fireMissile(scene) {
  const target = getNearestEnemy(scene);
  if (!target) return;
  const missile = scene.physics.add.sprite(player.x, player.y, null);
  drawMissile(scene, missile);
  missile.target = target;
  missiles.add(missile);
}

function getNearestEnemy(scene) {
  let nearest = null;
  let nearestDist = Infinity;
  enemies.children.each(enemy => {
    const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
    if (dist < nearestDist) {
      nearest = enemy;
      nearestDist = dist;
    }
  });
  return nearest;
}

function spawnEnemies(scene, level) {
  for (let i = 0; i < level * 3; i++) {
    const x = Phaser.Math.Between(100, 700);
    const y = Phaser.Math.Between(50, 300);
    const enemy = scene.physics.add.sprite(x, y, null);
    drawJet(scene, enemy, 0xff3333);
    enemies.add(enemy);
  }
}

function wrapObject(obj) {
  if (obj.x < 0) obj.x = 800;
  else if (obj.x > 800) obj.x = 0;
  if (obj.y < 0) obj.y = 600;
  else if (obj.y > 600) obj.y = 0;
}

function drawJet(scene, sprite, color) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.beginPath();
  g.moveTo(0, -20);
  g.lineTo(10, 10);
  g.lineTo(-10, 10);
  g.closePath();
  g.fillPath();
  const textureKey = 'jet' + color;
  g.generateTexture(textureKey, 40, 40);
  g.destroy();
  sprite.setTexture(textureKey);
}

function drawBullet(scene, bullet) {
  const g = scene.add.graphics();
  g.fillStyle(0xffff00, 1);
  g.fillRect(0, 0, 3, 10);
  const textureKey = 'bullet';
  g.generateTexture(textureKey, 3, 10);
  g.destroy();
  bullet.setTexture(textureKey);
}

function drawMissile(scene, missile) {
  const g = scene.add.graphics();
  g.fillStyle(0xaaaaaa, 1);
  g.fillRect(0, 0, 5, 15);
  const textureKey = 'missile';
  g.generateTexture(textureKey, 5, 15);
  g.destroy();
  missile.setTexture(textureKey);
}
