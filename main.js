
const WIDTH = 1024;
const HEIGHT = 640;

class PlayScene extends Phaser.Scene {
  constructor() { super('PlayScene'); }
  preload(){}
  create(){
    // Draw a stylized jet texture (player)
    const g = this.make.graphics({x:0,y:0,add:false});
    // body
    g.fillStyle(0x2b65ec,1);
    g.beginPath();
    g.moveTo(0,-24);
    g.lineTo(18,0);
    g.lineTo(8,6);
    g.lineTo(-8,6);
    g.lineTo(-18,0);
    g.closePath();
    g.fillPath();
    // cockpit
    g.fillStyle(0x99d6ff,1);
    g.fillEllipse(0,-6,10,6);
    // left wing
    g.fillStyle(0x2b65ec,1);
    g.beginPath();
    g.moveTo(-8,6);
    g.lineTo(-28,18);
    g.lineTo(-6,10);
    g.closePath();
    g.fillPath();
    // right wing
    g.beginPath();
    g.moveTo(8,6);
    g.lineTo(28,18);
    g.lineTo(6,10);
    g.closePath();
    g.fillPath();
    // tail
    g.fillStyle(0x1f4f9a,1);
    g.fillRect(-6,-28,12,6);
    g.generateTexture('jet', 64, 64);
    g.clear();

    // enemy jet (red)
    g.fillStyle(0xff4444,1);
    g.beginPath();
    g.moveTo(0,-14);
    g.lineTo(12,0);
    g.lineTo(6,4);
    g.lineTo(-6,4);
    g.lineTo(-12,0);
    g.closePath();
    g.fillPath();
    g.generateTexture('enemyJet', 48, 48);
    g.clear();

    // bullet
    g.fillStyle(0xfff266,1);
    g.fillRect(0,0,8,3);
    g.generateTexture('bullet', 8, 3);
    g.clear();

    // cloud
    g.fillStyle(0xffffff,0.9);
    g.fillCircle(32,32,30);
    g.generateTexture('cloud', 64, 64);
    g.clear();

    this.cameras.main.setBackgroundColor('#87CEEB');

    // player
    this.player = this.physics.add.sprite(WIDTH/2, HEIGHT-140, 'jet');
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.95);
    this.player.setMaxVelocity(420);
    this.player.health = 5;
    this.player.setOrigin(0.5,0.5);
    this.player.scale = 0.9;

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyV = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    this.input.mouse.capture = true;

    // bullets
    this.playerBullets = this.physics.add.group({classType: Phaser.GameObjects.Sprite, runChildUpdate:true});
    this.enemyBullets = this.physics.add.group({classType: Phaser.GameObjects.Sprite, runChildUpdate:true});

    // enemies
    this.enemies = this.physics.add.group();
    this.currentLevel = 1;
    this.score = 0;

    // spawn wave timer (will be adjusted per level)
    this.spawnTimer = this.time.addEvent({ delay: 1500, callback: this.spawnEnemy, callbackScope: this, loop: true });

    // collisions
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.onBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerCollideEnemy, null, this);

    // UI
    this.scoreText = this.add.text(12,12, 'Score: 0', { font:'18px Arial', fill:'#002' }).setScrollFactor(0).setDepth(10);
    this.healthText = this.add.text(12,36, 'Health: 5', { font:'18px Arial', fill:'#002' }).setScrollFactor(0).setDepth(10);
    this.levelText = this.add.text(WIDTH/2, 10, '', { font:'20px Arial', fill:'#003' }).setOrigin(0.5,0).setDepth(10);

    // clouds
    this.clouds = [];
    for(let i=0;i<12;i++){
      const x = Phaser.Math.Between(50, WIDTH-50);
      const y = Phaser.Math.Between(30, HEIGHT-200);
      const s = Phaser.Math.FloatBetween(0.4,1.2);
      const c = this.add.image(x,y,'cloud').setScale(s).setAlpha(0.65);
      this.clouds.push(c);
      c.setDepth(-1);
    }

    // firing control
    this.isFiring = false;
    this.lastFired = 0;
    this.normalFireRate = 12; // shots per second when holding space (tap or hold)
    // Overdrive rate: using 40 shots per SECOND (very rapid). If you meant 40 per minute, set overdriveRate = 40/60.
    this.overdriveRate = 40; // shots per second during V+Space
    this.fireIntervalNormal = 1000 / this.normalFireRate;
    this.fireIntervalOverdrive = 1000 / this.overdriveRate;

    // pointer
    this.pointer = this.input.activePointer;

    // level flow
    this.isPausedForLevel = false;
    this.showLevelIntro(this.currentLevel);

    // world bounds
    this.physics.world.setBounds(0,0,WIDTH,HEIGHT);
    this.cameras.main.setBounds(0,0,WIDTH,HEIGHT);
  }

  update(time,delta){
    if(this.isPausedForLevel) return;

    // pointer-follow: plane turns toward pointer and accelerates
    const targetX = this.pointer.worldX;
    const targetY = this.pointer.worldY;
    const angleToPointer = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
    const desiredDegree = Phaser.Math.RadToDeg(angleToPointer) + 90; // adjust because sprite pointing up
    // rotate smoothly toward pointer
    const diff = Phaser.Math.Angle.WrapDegrees(desiredDegree - this.player.angle);
    this.player.angle += Phaser.Math.Clamp(diff, -4.0, 4.0);

    // thrust forward continuously to keep plane flying
    const speed = 260;
    this.physics.velocityFromRotation(Phaser.Math.DegToRad(this.player.angle-90), speed, this.player.body.velocity);

    // fire handling
    const holdingSpace = this.keySpace.isDown;
    const holdingV = this.keyV.isDown;
    if(holdingSpace){
      const interval = holdingV ? this.fireIntervalOverdrive : this.fireIntervalNormal;
      if(time > this.lastFired + interval){
        this.firePlayerBullet();
        this.lastFired = time;
      }
    }

    // enemy AI
    this.enemies.getChildren().forEach(enemy=>{
      if(!enemy.active) return;
      // home toward player with some jitter; speed depends on level
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      this.physics.velocityFromRotation(angle, enemy.speed, enemy.body.velocity);
      enemy.rotation = angle + Math.PI/2;

      if(time > enemy.nextShot){
        this.fireEnemyBullet(enemy);
        enemy.nextShot = time + Phaser.Math.Between(enemy.shootDelayMin, enemy.shootDelayMax);
      }

      if(enemy.y > HEIGHT + 80 || enemy.y < -80 || enemy.x < -80 || enemy.x > WIDTH + 80){
        enemy.destroy();
      }
    });

    // level up condition: score thresholds
    const nextThreshold = 100 * this.currentLevel;
    if(this.score >= nextThreshold){
      this.currentLevel++;
      this.pauseForLevelIntro(this.currentLevel);
    }
  }

  showLevelIntro(level){
    this.isPausedForLevel = true;
    const big = this.add.text(WIDTH/2, HEIGHT/2 - 20, 'LEVEL ' + level, { font:'36px Arial', fill:'#012' }).setOrigin(0.5).setDepth(20);
    const sub = this.add.text(WIDTH/2, HEIGHT/2 + 22, 'Click to start', { font:'18px Arial', fill:'#013' }).setOrigin(0.5).setDepth(20);
    this.input.once('pointerdown', ()=> {
      big.destroy(); sub.destroy();
      this.isPausedForLevel = false;
      // increase difficulty parameters
      this.adjustDifficultyForLevel(level);
    });
  }

  pauseForLevelIntro(level){
    // clear enemies and bullets and show level text briefly
    this.enemies.clear(true,true);
    this.enemyBullets.clear(true,true);
    this.playerBullets.clear(true,true);
    this.isPausedForLevel = true;
    const big = this.add.text(WIDTH/2, HEIGHT/2 - 20, 'LEVEL ' + level, { font:'36px Arial', fill:'#012' }).setOrigin(0.5).setDepth(20);
    const sub = this.add.text(WIDTH/2, HEIGHT/2 + 22, 'Click to continue', { font:'18px Arial', fill:'#013' }).setOrigin(0.5).setDepth(20);
    this.input.once('pointerdown', ()=> {
      big.destroy(); sub.destroy();
      this.isPausedForLevel = false;
      this.adjustDifficultyForLevel(level);
    });
  }

  adjustDifficultyForLevel(level){
    // modify spawn rate and enemy stats
    const spawnDelay = Math.max(350, 1500 - (level-1)*120); // faster spawns each level
    this.spawnTimer.reset({ delay: spawnDelay, callback: this.spawnEnemy, callbackScope: this, loop: true });
  }

  spawnEnemy(){
    const x = Phaser.Math.Between(50, WIDTH-50);
    const y = -30;
    const enemy = this.enemies.create(x,y,'enemyJet');
    enemy.setCollideWorldBounds(false);
    const baseSpeed = 60 + (this.currentLevel-1)*12;
    enemy.speed = Phaser.Math.Between(baseSpeed, baseSpeed+90);
    enemy.nextShot = 0;
    enemy.health = 1 + Math.floor((this.currentLevel-1)/2);
    enemy.shootDelayMin = Math.max(500, 1200 - this.currentLevel*60);
    enemy.shootDelayMax = Math.max(900, 2000 - this.currentLevel*80);
    enemy.setOrigin(0.5,0.5);
  }

  firePlayerBullet(){
    const b = this.playerBullets.create(this.player.x, this.player.y - 6, 'bullet');
    b.setDepth(5);
    const rot = Phaser.Math.DegToRad(this.player.angle-90);
    this.physics.velocityFromRotation(rot, 820, b.body.velocity);
    b.rotation = rot;
    b.lifespan = 1400;
    b.update = function(time,delta){
      this.lifespan -= delta;
      if(this.lifespan <= 0) this.destroy();
    };
  }

  fireEnemyBullet(enemy){
    const b = this.enemyBullets.create(enemy.x, enemy.y, 'bullet');
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    this.physics.velocityFromRotation(angle, 260, b.body.velocity);
    b.rotation = angle;
    b.lifespan = 4000;
    b.update = function(time,delta){
      this.lifespan -= delta;
      if(this.lifespan <= 0) this.destroy();
    };
  }

  onBulletHitEnemy(bullet, enemy){
    bullet.destroy();
    enemy.health -= 1;
    if(enemy.health <= 0){
      this.spawnExplosion(enemy.x, enemy.y);
      enemy.destroy();
      this.score += 10;
      this.scoreText.setText('Score: ' + this.score);
    }
  }

  onBulletHitPlayer(player, bullet){
    bullet.destroy();
    this.player.health -= 1;
    this.healthText.setText('Health: ' + this.player.health);
    this.cameras.main.shake(150, 0.01);
    if(this.player.health <= 0){
      this.onPlayerDeath();
    }
  }

  onPlayerCollideEnemy(player, enemy){
    this.spawnExplosion(enemy.x, enemy.y);
    enemy.destroy();
    this.player.health -= 1;
    this.healthText.setText('Health: ' + this.player.health);
    if(this.player.health <= 0) this.onPlayerDeath();
  }

  spawnExplosion(x,y){
    const e = this.add.circle(x,y,2,0xffcc33,1);
    this.tweens.add({
      targets: e,
      radius: 48,
      alpha: {from:1, to:0},
      duration: 450,
      onComplete: ()=> e.destroy()
    });
  }

  onPlayerDeath(){
    this.isPausedForLevel = true;
    this.player.setVisible(false);
    this.spawnExplosion(this.player.x, this.player.y);
    const t = this.add.text(WIDTH/2, HEIGHT/2-12, 'YOU WERE SHOT DOWN', { font:'30px Arial', fill:'#300' }).setOrigin(0.5);
    const restart = this.add.text(WIDTH/2, HEIGHT/2+28, 'Click to restart', { font:'18px Arial', fill:'#030' }).setOrigin(0.5);
    this.input.once('pointerdown', ()=> {
      // reset
      this.scene.restart();
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

window.onload = function(){
  const game = new Phaser.Game(config);
};
