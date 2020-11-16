var config = {
    type: Phaser.AUTO,
    width: 320,
    height: 320,
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    zoom: 2, //This zoom will scale everything up
    /* START PLAYER */
    /* NEED PHYSIC CONFIG WHEN ADD PLAYER */
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0},
        }
    },
    pixelArt: true,
    antialias: false,
    roundedPixels: true  //problem with tile edges
    /* END PLAYER */
};
const unitSize = 16;
const speed = unitSize*3;
var game = new Phaser.Game(config);
let player;
let enemies = [];
let data;
let cursor;
let layer;
var matrix;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 50;
let playerSprite;
let enemySprite;
let physics; //Catch local physic
let camera;
//For the connection
var socket;



function preload ()
{
    /* START MAP */
    this.load.image('tiles-image','assets/images/tiles_extrude.png');
    this.load.tilemapCSV('map', 'assets/images/map.csv');
    /* END MAP */

    /* START PLAYER */
    // playerSprite = this.load.spritesheet('player','assets/images/player1.png',{ frameWidth:14,frameHeight:14});
    // enemySprite = this.load.spritesheet('enemy','assets/images/player1.png',{ frameWidth:14,frameHeight:14});
    playerSprite = this.load.image('player','assets/images/main.png');
    enemySprite = this.load.image('enemy','assets/images/other.png');
    /* END PLAYER */

    /* RANDOM MAP DATA */
    /* START MAP PART */
    // matrix = [
    //     [0,1,2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    //     [0,0,1,0,2,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    //     [0,2,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    //     [0,0,1,1,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0],
    //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  
    //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    // ];

}



function create ()
{
    //Io is import to html file
    socket = io.connect()
    
    // socket.on('map',function(data){
    //     console.log('Get it from server')
    //     matrix = data['map'];
    //     console.log(matrix)
    // })

    // const map = this.make.tilemap({data:map,tileWidth:16,tileHeight:16});
    const map = this.make.tilemap({key:"map",tileWidth:16,tileHeight:16});
    const tiles = map.addTilesetImage(map,"tiles-image",16,16,1,2);
    //map data, tile image cache, tile width, tile height, margin, spacing
    // const tiles = map.addTilesetImage(matrix,'tiles-image',16,16,1,2);
    layer = map.createStaticLayer(0,tiles,0,0);
    map.setCollisionBetween(2,3); //Collision with map values
    // map.setCollision(1);
    /* END MAP PART */

    /* START CAMERA */
    camera = this.cameras.main;
    cursor = this.input.keyboard.createCursorKeys(); //cursor is key
    controls = new Phaser.Cameras.Controls.FixedKeyControl({
        camera: camera,
        left: cursor.left,
        right: cursor.right,
        up:cursor.up,
        down: cursor.down,
        speed:0.5
    })
    camera.setBounds(0,0,map.widthInPixels,map.heightInPixels);
    console.log(camera)
    // camera.roundPixels = true; //problem with tile edges
    /* END CAMERA */

    
    /* START PLAYER */
    // playerSprite.scaleX = 1;
    // playerSprite.scaleY = 1;
    player = this.physics.add.sprite(2*unitSize,2*unitSize,'player')
    // charaterAnimation.call(this);
    camera.startFollow(player);
    /* Collision detect */
    this.physics.add.collider(player,layer)
    //Access player coordinate
    // console.log(player.x);
    // console.log(player.y);

    /* END PLAYER */

    /* START TEXT/SCORE BOARD */
    this.add.text(0,0, "Press arrow keys to move", {
        font: "11px monospace",
        fill: "#ffffff",
        padding: { x: 20, y: 10 },
        // backgroundColor: "#000000"
    })
    .setScrollFactor(0);

    //Try to add text on top of player (does not work)
    // playerName = this.add.text(player.x-unitSize/2,player.y-unitSize,"P1", {
    //     font: "11px monospace",
    //     fill: "#00ff00",
    //     padding: {x:0,y:0},
    // })
    // .setScrollFactor(0);
    /* END TEXT/SCORE BOARD */

    /* LISTEN FROM SERVER*/ 
    physics = this.physics;
    //Listen to server here to avoid loop
    socket.on('broadcast', function (allplayers) {
        allplayers.forEach(element => {
            if(element.id!=socket.id) {
                if(!getEnemy(element.id)) {
                    var enemy = physics.add.sprite(element.x,element.y,'enemy')
                    enemies.push({id: element.id,x: element.x,y:element.y,enemy: enemy})
                } else {
                    enemies.forEach(
                        (e) => {
                            if(e['id']==element.id) {
                                e.x = element.x;
                                e.y = element.y;
                            }
                        }
                    )

                }
            } 
        });
    })
    socket.on('remove', function (enemyID) {
        for(let i=0;i<enemies.length;i++){
            if(enemies[i]['id']==enemyID) {
                console.log('remove')
                enemies[i]['enemy'].destroy();
                enemies.splice(i,1)
            }
        }
    })
}

function getEnemy(id){
    for(let i=0;i<enemies.length;i++){
        if(enemies[i]['id']==id) {
            return true;
        }
    }
    return false;
}

function update (time,delta)
{
    controls.update(delta);
    
    /* START PLAYER */
    player.body.setVelocity(0);
    if(cursor.up.isDown){
        player.body.setVelocityY(-speed);
        socket.emit('playerMoved', { x: player.x, y: player.y})
        // player.anims.play('down', true)
    } else if (cursor.down.isDown){
        player.body.setVelocityY(speed);
        socket.emit('playerMoved', { x: player.x, y: player.y})
        // player.anims.play('up', true)
    } else if(cursor.left.isDown){
        player.body.setVelocityX(-speed);
        socket.emit('playerMoved', { x: player.x, y: player.y})
        // player.anims.play('left', true)
        ///player.flipX = true; //Flip the sprite when turning left, because original image only on right side
    } else if (cursor.right.isDown) {
        player.body.setVelocityX(speed);
        socket.emit('playerMoved', { x: player.x, y: player.y})
        // player.anims.play('right', true)
        //player.flipX = false;
    } else {
        // player.anims.play('idle', true)
    }
    // playerName.x = player.body.position.x-unitSize/2;
    // playerName.y = player.body.position.y-unitSize;

    // console.log(player.x);
    // console.log(player.y);
    // Send data to server
    // socket.emit('playerMoved', { x: player.x, y: player.y})
    
    //Update enemy

    enemies.forEach(
        (e) => {
            if(e['id']!=socket.id) {
                // e.enemy.setX(e.x);
                // e.enemy.setY(e.y);
                e.enemy.setPosition(e.x,e.y);
                // e.enemy.update();
            }
        }
    )
    // console.log(enemies)

    // for (var i = 0; i < enemies.length; i++) {
    //     if (enemies[i].alive) {
    //       enemies[i].update()
    //       game.physics.arcade.collide(player, enemies[i].player)
    //     }
    // }

    // console.log(socket.id)
    /* END PLAYER */
}

var charaterAnimation = function (){
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
        frameRate: unitSize,
        repeat: -1,
    });

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { start: 2, end: 3 }),
        frameRate: unitSize,
        repeat: -1,
    });

  
    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { start: 4, end: 5 }),
        frameRate: unitSize,
        repeat: -1
    });

    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { start: 6, end: 7}),
        frameRate: unitSize,
        repeat: -1
    });
   
   
    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('player', { start: 8, end: 9 }),
        frameRate: 2,
        repeat: 2
    });
}


