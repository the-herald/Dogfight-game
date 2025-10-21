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
let scrollSpeed = 1, score = 0, enemySpawnTimer = 0;

function preload() {}

function create() {
    // Background gradient
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(
        { x: 0, y: 0, colorTop: 0x87CEEB, colorBottom: 0x1E90FF }
    );
    graphics.fillRect(0, 0, config.width, config.height);

    // Player
    player = this.physics.add.sprite(config.width / 2, config.height - 80, null);
    player.setSize(40, 20).setCollideWorldBounds(true);
    player.setDamping(true).setDrag(0.95).setMaxVelocity(300);

    // Groups
    bullets = this.physics.add.group();
    missiles = this.physics.add.group();
    rockets = this.physics.add.group();
    bombs = this.physics.add.group();
    vortexShots = this.physics.add.group();
    groundTargets = this.physics.add.group();
    enemies = this.physics.add.group();

    // Initial ground targets
    spawnGroundTargets(this, config.height);

    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKeys({ M: 'M', R: 'R', B: 'B', V: 'V' });

    // Colliders
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
    this.physics.add.overlap(missiles, enemies, hitEnemy, null, this);
    this.physics.add.overlap(rockets, enemies, hitEnemy, null, this);
    this.physics.add.overlap(bombs, groundTargets, hitGround, null, this);
    this.physics.add.overlap(vortexShots, enemies, hitEnemyVortex, null, this);

    // Score
    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });
}

function update(time, delta) {
    // Player movement
    if (cursors.left.isDown) player.setAccelerationX(-600);
    else if (cursors.right.isDown) player.setAccelerationX(600);
    else player.setAccelerationX(0);
    if (cursors.up.isDown) player.setAccelerationY(-600);
    else if (cursors.down.isDown) player.setAccelerationY(600);
    else player.setAccelerationY(0);

    // Auto-fire bullets
    if (cursors.space.isDown) {
        if (!player.lastBulletTime || time - player.lastBulletTime > 200) {
            const bullet = bullets.create(player.x, player.y - 20, null);
            bullet.setSize(5, 10).setTint(0xffff00).setVelocityY(-400);
            player.lastBulletTime = time;
        }
    }

    // Homing missiles
    if (this.input.keyboard.keys[77].isDown && time - lastMissileTime > 1000) {
        fireMissile(this);
        lastMissileTime = time;
    }

    // Rocket salvo
    if (this.input.keyboard.keys[82].isDown && time - lastRocketTime > 1500) {
        fireRocketSalvo(this);
        lastRocketTime = time;
    }

    // Bombs
    if (this.input.keyboard.keys[66].isDown) {
        const bomb = bombs.create(player.x, player.y, null);
        bomb.setSize(8, 16).setTint(0xff0000).setVelocityY(300);
    }

    // Vortex shots (Space + V)
    const vKey = this.input.keyboard.keys[86];
    if (cursors.space.isDown && vKey.isDown && time - lastVortexTime > 1200) {
        fireVortexShots(this);
        lastVortexTime = time;
    }

    // Homing missile logic
    missiles.children.iterate(m => {
        if (!m) return;
        const nearest = findNearestEnemy(m);
        if (nearest) this.physics.moveToObject(m, nearest, 200);
    });

    // Rocket lifespan
    rockets.children.iterate(r => { if (r) r.lifespan -= delta; if (r && r.lifespan <= 0) r.destroy(); });

    // Scroll camera upward
    this.cameras.main.scrollY -= scrollSpeed;

    // Continuous ground targets
    if (groundTargets.countActive(true) < 5) {
        spawnGroundTargets(this, this.cameras.main.scrollY + config.height);
    }

    // Spawn multiple enemies progressively faster
    enemySpawnTimer += delta;
    const spawnInterval = Math.max(200, 1000 - Math.floor(score / 50)); // faster with higher score
    if (enemySpawnTimer > spawnInterval) {
        spawnEnemies(this, Phaser.Math.Between(1, 3)); // 1–3 enemies per wave
        enemySpawnTimer = 0;
    }

    // Update score
    this.scoreText.setText('Score: ' + score);
}

// Helpers
function spawnEnemies(scene, count = 1) {
    for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(50, config.width - 50);
        const y = scene.cameras.main.scrollY - 50;
        const speed = Phaser.Math.Between(50, 100 + Math.floor(score / 50));
        const enemy = scene.physics.add.sprite(x, y, null);
        enemy.setSize(30, 20).setTint(0xff00ff).setVelocityY(speed);
        enemies.add(enemy);
    }
}

function spawnGroundTargets(scene, yPosition) {
    for (let i = 0; i < 5; i++) {
        const x = Phaser.Math.Between(50, config.width - 50);
        const y = yPosition - Phaser.Math.Between(20, 40);
        const target = scene.physics.add.sprite(x, y, null);
        target.setSize(40, 20).setTint(0x00ff00);
        groundTargets.add(target);
    }
}

function fireMissile(scene) {
    const missile = missiles.create(player.x, player.y - 20, null);
    missile.setSize(8, 16).setTint(0xffa500).setVelocityY(-100);
}

function fireRocketSalvo(scene) {
    for (let i = 0; i < 10; i++) {
        const offset = (i - 5) * 30;
        const rocket = rockets.create(player.x + offset, player.y - 20, null);
        rocket.setSize(6, 12).setTint(0xff4500);
        rocket.lifespan = 1000;
        rocket.setVelocityY(-400);
    }
}

function fireVortexShots(scene) {
    for (let i = -2; i <= 2; i++) {
        const shot = vortexShots.create(player.x + i * 15, player.y - 20, null);
        shot.setSize(12, 12).setTint(0x00ffff);
        shot.setVelocityY(-300);
        shot.setVelocityX(i * 50);
    }
}

function hitEnemy(projectile, enemy) {
    projectile.destroy();
    enemy.destroy();
    score += 10;
}

function hitGround(bomb, target) {
    bomb.destroy();
    target.destroy();
    score += 5;
}

function hitEnemyVortex(vortex, enemy) {
    enemy.destroy();
}

function findNearestEnemy(missile) {
    let nearest = null, minDist = Infinity;
    enemies.children.iterate(e => {
        if (!e) return;
        const dist = Phaser.Math.Distance.Between(missile.x, missile.y, e.x, e.y);
        if (dist < minDist) { minDist = dist; nearest = e; }
    });
    return nearest;
}
