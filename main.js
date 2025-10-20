
const WIDTH = 1024;
const HEIGHT = 640;

class PlayScene extends Phaser.Scene {
  constructor() { super('PlayScene'); }
  preload(){}
  create(){
    // create player texture (triangle)
    const gfx = this.make.graphics({x:0,y:0,add:false});
    gfx.fillStyle(0xffffff,1);
    gfx.beginPath();
    gfx.moveTo(0,-18);
    gfx.lineTo(12,12);
    gfx.lineTo(-12,12);
    gfx.closePath();
    gfx.fillPath();
    gfx.generateTexture('player', 48, 48);
    gfx.clear();

    // enemy texture (simple rectangle plane)
    gfx.fillStyle(0xff3333,1);
    gfx.fillRect(0,0,28,14);
    gfx.generateTexture('enemy', 28, 14);
    gfx.clear();

    // bullet texture
    gfx.fillStyle(0xffff66,1);
    gfx.fillRect(0,0,6,2);
    gfx.generateTexture('bullet', 6, 2);
    gfx.clear();

    // background tile (clouds) - simple circle
    gfx.fillStyle(0xffffff,0.9);
    gfx.fillCircle(32,32,30);
    gfx.generateTexture('cloud', 64, 64);
    gfx.clear();

    this.cameras.main.setBackgroundColor('#87CEEB');

    // groups
    this.player = this.physics.add.sprite(WIDTH/2, HEIGHT-120, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.95);
    this.player.setMaxVelocity(300);
    this.player.health = 5;

    this.player.rotation = -Math.PI/2;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // bullets
    this.playerBullets = this.physics.add.group({classType: Phaser.GameObjects.Sprite, runChildUpdate: true});
    this.enemyBullets = this.physics.add.group({classType: Phaser.GameObjects.Sprite, runChildUpdate: true});

    // enemies
    this.enemies = this.physics.add.group();
    this.spawnTimer = this.time.addEvent({ delay: 1500, callback: this.spawnEnemy, callbackScope: this, loop: true });

    // collisions
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.onBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerCollideEnemy, null, this);

    // UI
    this.score = 0;
    this.scoreText = this.add.text(12,12, 'Score: 0', { font:'18px Arial', fill:'#002' }).setScrollFactor(0).setDepth(10);
    this.healthText = this.add.text(12,36, 'Health: 5', { font:'18px Arial', fill:'#002' }).setScrollFactor(0).setDepth(10);
    this.infoText = this.add.text(WIDTH/2, 16, 'Arrow keys to fly • Space to fire', { font:'16px Arial', fill:'#003' }).setOrigin(0.5,0).setScrollFactor(0).setDepth(10);

    // cloud background objects
    this.clouds = [];
    for(let i=0;i<12;i++){
      const x = Phaser.Math.Between(50, WIDTH-50);
      const y = Phaser.Math.Between(30, HEIGHT-200);
      const s = Phaser.Math.FloatBetween(0.4,1.2);
      const c = this.add.image(x,y,'cloud').setScale(s).setAlpha(0.65);
      this.clouds.push(c);
      c.setDepth(-1);
    }

    // respawn flag
    this.isAlive = true;

    // make world bounds
    this.physics.world.setBounds(0,0,WIDTH,HEIGHT);
    this.cameras.main.setBounds(0,0,WIDTH,HEIGHT);
  }

  update(time,delta){
    if(!this.isAlive) return;

    // controls - thrust forward/up and rotate
    if(this.cursors.left.isDown){
      this.player.angle -= 2.8;
    } else if(this.cursors.right.isDown){
      this.player.angle += 2.8;
    }
    if(this.cursors.up.isDown){
      this.physics.velocityFromRotation(Phaser.Math.DegToRad(this.player.angle-90), 240, this.player.body.acceleration);
    } else {
      this.player.setAcceleration(0);
    }

    // firing
    if(Phaser.Input.Keyboard.JustDown(this.keySpace)){
      this.firePlayerBullet();
    }

    // update clouds (parallax)
    for(let i=0;i<this.clouds.length;i++){
      const c = this.clouds[i];
      c.x += (i%2===0?0.2:0.5) * (this.player.body.velocity.x/200);
      c.y += 0.02 * (this.player.body.velocity.y/200);
      if(c.x < -100) c.x = WIDTH + 100;
      if(c.x > WIDTH + 100) c.x = -100;
    }

    // AI enemy simple behavior
    this.enemies.getChildren().forEach(enemy=>{
      if(!enemy.active) return;
      // move horizontally and slowly home toward player
      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const spd = enemy.speed;
      this.physics.velocityFromRotation(angleToPlayer, spd, enemy.body.velocity);
      enemy.rotation = angleToPlayer + Math.PI/2;

      // occasional shooting
      if(time > enemy.nextShot){
        this.fireEnemyBullet(enemy);
        enemy.nextShot = time + Phaser.Math.Between(700, 1500);
      }

      // despawn off-screen
      if(enemy.y > HEIGHT + 80 || enemy.y < -80 || enemy.x < -80 || enemy.x > WIDTH + 80){
        enemy.destroy();
      }
    });
  }

  spawnEnemy(){
    const x = Phaser.Math.Between(50, WIDTH-50);
    const y = -30;
    const enemy = this.enemies.create(x,y,'enemy');
    enemy.setCollideWorldBounds(false);
    enemy.speed = Phaser.Math.Between(40,110);
    enemy.nextShot = 0;
    enemy.health = 1 + Phaser.Math.Between(0,2);
    enemy.setOrigin(0.5,0.5);
    enemy.setAngle(90);
    enemy.body.setVelocity(Phaser.Math.Between(-30,30), Phaser.Math.Between(30,100));
  }

  firePlayerBullet(){
    if(!this.isAlive) return;
    const b = this.playerBullets.create(this.player.x, this.player.y, 'bullet');
    const rot = Phaser.Math.DegToRad(this.player.angle-90);
    this.physics.velocityFromRotation(rot, 600, b.body.velocity);
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
    this.physics.velocityFromRotation(angle, 250, b.body.velocity);
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
      // explode effect
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
    this.isAlive = false;
    this.player.setVisible(false);
    this.spawnExplosion(this.player.x, this.player.y);
    this.add.text(WIDTH/2, HEIGHT/2-12, 'YOU WERE SHOT DOWN', { font:'30px Arial', fill:'#300' }).setOrigin(0.5);
    const restart = this.add.text(WIDTH/2, HEIGHT/2+28, 'Click to restart', { font:'18px Arial', fill:'#030' }).setOrigin(0.5);
    this.input.once('pointerdown', ()=> {
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
