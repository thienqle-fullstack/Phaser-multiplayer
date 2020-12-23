
//Using Class for a scene
var GamePlay = new Phaser.Class({ //syntax

    Extends: Phaser.Scene, //syntax

    initialize: function GamePlay () //syntax
    { //syntax
        Phaser.Scene.call(this, { key: 'GamePlay' }); //syntax
    }, //syntax

    //Copy all variables here
    unitSize: 16,
    speed: 16*3,
    // game: new Phaser.Game(config), Remove this
    player: null,
    enemies: [],
    enemiesName: [],
    cursor: null,
    layer: null,
    matrix: null,
    playerSprite: null,
    enemySprite: null,
    camera: null,
    character:0,
    playerName: 'P1',
    playerNameText: null,
    bullets:[],
    enemiesBullets: [],
    direction:1, //{0:up, 1:down, 2:left, 3:right}
    live:100,
    initPosition:null,
    socket:null,
    TOTAL_LIFE:10,

    init(data)
	{
        this.character = data.character; //data is object passed from other scene
        this.playerName = data.playerName;
    },

    preload: function() {

        this.live = this.TOTAL_LIFE;

         /* START MAP */
        this.load.image('tiles-image','assets/images/tiles_extrude.png');
        this.load.tilemapCSV('map', 'assets/images/map.csv');
        /* END MAP */

        /* START PLAYER */
        if(this.character['texture']['key']=='player1') {//access texture of original sprite and get the key out
            this.playerSprite = this.load.image('player','assets/images/main.png');
        } else if (this.character['texture']['key']=='player2') {
            this.playerSprite = this.load.image('player','assets/images/player2.png');
        } else if (this.character['texture']['key']=='player3'){
            this.playerSprite = this.load.image('player','assets/images/other.png');
        }
        this.enemySprite = this.load.image('enemy','assets/images/other.png');
        /* END PLAYER */

        /* Bullet create */
        this.load.image('bullet', 'assets/images/bullet.png');

        this.initPosition = {
            x: 2*this.unitSize - this.unitSize/2,
            y: 2*this.unitSize - this.unitSize/2
        }
    },

    create: function() {

        //Io is import to html file
        this.socket = io.connect()

        const map = this.make.tilemap({key:"map",tileWidth:16,tileHeight:16});
        const tiles = map.addTilesetImage(map,"tiles-image",16,16,1,2);
        //map data, tile image cache, tile width, tile height, margin, spacing
        // const tiles = map.addTilesetImage(matrix,'tiles-image',16,16,1,2);
        this.layer = map.createStaticLayer(0,tiles,0,0);
        map.setCollisionBetween(2,3); //Collision with map values
        /* END MAP PART */

        /* START CAMERA */
        this.camera = this.cameras.main;
        this.cursor = this.input.keyboard.createCursorKeys(); //cursor is key
        this.controls = new Phaser.Cameras.Controls.FixedKeyControl({
            camera: this.camera,
            left: this.cursor.left,
            right: this.cursor.right,
            up: this.cursor.up,
            down: this.cursor.down,
            speed:0.5
        })
        this.camera.setBounds(0,0,map.widthInPixels,map.heightInPixels);
        /* END CAMERA */

        
        /* START PLAYER */
        this.player = this.physics.add.sprite(this.initPosition.x,this.initPosition.y,'player')
        // charaterAnimation.call(this);
        this.camera.startFollow(this.player);
        /* Collision detect */
        this.physics.add.collider(this.player,this.layer)
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
        this.playerNameText = this.add.text(this.player.x-this.unitSize/2,this.player.y-this.unitSize,
                                    this.playerName + " " + this.live, {
            font: "11px monospace",
            fill: "#00ffff",
            padding: {x:0,y:0},
        })
        .setScrollFactor(0);
        
        /* Shot the bullets by mouse */
        this.input.on('pointerdown', (pointer) => {
            let bullet = this.physics.add.sprite(this.player.x,this.player.y,'bullet');
            bullet.body.setVelocityY(0);
            bullet.body.setVelocityX(0);
            bullet.setActive(true);
            bullet.setVisible(true);
            let bulletId = this.socket.id+this.bullets.length
            this.bullets.push({id: bulletId, bullet: bullet});
            //Base on direction shoot the bullet
            this.socket.emit('bulletShot',{id: bulletId, x: bullet.x, y: bullet.y});
            switch(this.direction) {
                case 0: 
                    bullet.setX(this.player.x);
                    bullet.setY(this.player.y-10);    
                    bullet.body.setVelocityY(-this.speed*2);
                    break;
                case 1:
                    bullet.setX(this.player.x);
                    bullet.setY(this.player.y+10);    
                    bullet.body.setVelocityY(this.speed*2);
                    break;
                case 2:
                    bullet.setX(this.player.x-10);
                    bullet.setY(this.player.y);    
                    bullet.body.setVelocityX(-this.speed*2);
                    break;
                case 3:
                    bullet.setX(this.player.x+10);
                    bullet.setY(this.player.y);    
                    bullet.body.setVelocityX(this.speed*2);
                    break;
                default:
                    break;
            }
            
            //Collision detect and using/writing call back function like hetBullet and playerGoHit to handle logic
            this.physics.add.collider(bullet,this.layer, this.hitBullet, null, this);
            this.enemies.forEach(
                (enemy) => {
                    this.physics.add.collider(bullet,enemy.enemy, this.hitBullet, null, this);
                }
            )
        });
        


        /* LISTEN FROM SERVER*/ 
        //Listen to server here to avoid loop
        this.socket.on('broadcast', (allplayers) => { //make sure using arrow function ES6 so you can access this context
            allplayers.forEach(element => {
                if(element.id!=this.socket.id) {
                    if(!this.getEnemy(element.id)) {
                        var enemy = this.physics.add.sprite(element.x,element.y,'enemy')
                        this.physics.add.collider(enemy,this.player)
                        /** Handle the name of each enemies */
                        let enemiesName = this.add.text(element.x-this.unitSize/2,element.y-this.unitSize,
                            element.name, {
                            font: "11px monospace",
                            fill: "#ff00ff",
                            padding: {x:0,y:0},
                        })
                        .setScrollFactor(0);
                        this.enemies.push({id: element.id,x: element.x,y:element.y,name: element.name,tag: enemiesName,enemy: enemy});
                    
                    } else {
                        this.enemies.forEach(
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
        });
        this.socket.on('remove', (enemyID) => {
            for(let i=0;i<this.enemies.length;i++){
                if(this.enemies[i]['id']==enemyID) {
                    this.enemies[i]['enemy'].destroy();
                    this.enemies.splice(i,1)
                }
            }
        });
        /* Only need to handle other bullet here */
       
        /* Start get Bullets infor from server */
        this.socket.on('broadcastbullet', (allBullets) => {
            allBullets.forEach(element => {
                if(!this.isActiveBullet(element,this.bullets)) {                   
                    if(!this.isActiveBullet(element,this.enemiesBullets)) {
                        let bullet = this.physics.add.sprite(element.x,element.y,'bullet');
                        bullet.body.setVelocityY(0);
                        bullet.body.setVelocityX(0);
                        bullet.setActive(true);
                        bullet.setVisible(true);
                        this.enemiesBullets.push({id: element.id, bullet: bullet});

                        //Detect enemies bullet with player
                        this.physics.add.collider(bullet,this.player,this.playerGotHit, null, this);
                    } else {
                        this.enemiesBullets.forEach(
                            (e) => {
                                if(e['id']==element.id) {
                                    e.bullet.x = element.x;
                                    e.bullet.y = element.y;
                                }
                            }
                        )
                    }
                }
            })
        });
        /* Detroy other bullet if they are deactivate */
        this.socket.on('removebullet', (bulletID) => {
            for(let i=0;i<this.enemiesBullets.length;i++){
                if(this.enemiesBullets[i]['id']==bulletID.bulletId) {
                    this.enemiesBullets[i]['bullet'].destroy();
                    this.enemiesBullets.splice(i,1)
                }
            }
        });

    },
    update: function(time,delta) {
        this.controls.update(delta);
        
        /* START PLAYER */
        this.player.body.setVelocity(0);
        if(this.cursor.up.isDown){
            this.player.body.setVelocityY(-this.speed);
            this.direction = 0;
            this.socket.emit('playerMoved', { x: this.player.x, y: this.player.y, name:this.playerName})
        } else if (this.cursor.down.isDown){
            this.player.body.setVelocityY(this.speed);
            this.direction = 1;
            this.socket.emit('playerMoved', { x: this.player.x, y: this.player.y, name:this.playerName})
        } else if(this.cursor.left.isDown){
            this.player.body.setVelocityX(-this.speed);
            this.direction = 2;
            this.socket.emit('playerMoved', { x: this.player.x, y: this.player.y, name:this.playerName})
        } else if (this.cursor.right.isDown) {
            this.direction = 3;
            this.player.body.setVelocityX(this.speed);
            this.socket.emit('playerMoved', { x: this.player.x, y: this.player.y, name:this.playerName})
        } 
        /* END PLAYER */
        this.playerNameText.x = this.player.body.position.x - this.camera.scrollX;
        this.playerNameText.y = this.player.body.position.y-16 - this.camera.scrollY;
        
        /* Update enemies */
        this.enemies.forEach(
            (e) => {
                if(e['id']!=this.socket.id) {
                    e.enemy.setPosition(e.x,e.y);
                    e.tag.x = (e.x-this.unitSize/2);
                    e.tag.y = (e.y-this.unitSize-2);
                }
            }
        );
        /* Update our bullets to server */
        this.bullets.forEach(
            (bullet) => {
                this.socket.emit('bulletMoved',{id: bullet.id, x: bullet.bullet.x, y: bullet.bullet.y});
            }
        );

    },
    hitBullet: function(bullet, target){
        if(bullet.active===true) {
            bullet.setActive(false);
            bullet.setVisible(false);
            bullet.setX(0);
            bullet.setY(0);
            let b = this.getBullet(bullet,this.bullets);
            if(b!=false) this.removeBulletOnServer(b);
            this.removeBulletsFromList(b,this.bullets);
            this.removeBulletsFromList(b,this.enemiesBullets);
        }
    },
    playerGotHit: function(bullet, player){
        if(bullet.active===true){
            this.live-=1;
            bullet.setActive(false);
            bullet.setVisible(false);
            bullet.setX(0);
            bullet.setY(0);
            let b = this.getBullet(bullet,this.bullets);
            if(b!=false) this.removeBulletOnServer(b);
            this.removeBulletsFromList(b,this.bullets);
            this.removeBulletsFromList(b,this.enemiesBullets);
            this.playerNameText.text = this.playerName + " " + this.live;
            if(this.live<=0){
                this.live=this.TOTAL_LIFE;
                player.setX(this.initPosition.x);
                player.setY(this.initPosition.y);
            }
        }
    },
    getEnemy: function (id){
        for(let i=0;i<this.enemies.length;i++){
            if(this.enemies[i]['id']==id) {
                return true;
            }
        }
        return false;
    },
    getBullet: function(bullet,bullets){
        for(let i=0;i<bullets.length;i++){
            if(bullets[i].bullet.x == bullet.x && bullets[i].bullet.y== bullet.y) {
                return bullets[i];
            }
        }
        return false;
    },
    getBulletByID: function(bullet,bullets){
        for(let i=0;i<bullets.length;i++){
            if(bullets[i].id == bullet.id) {
                return bullets[i];
            }
        }
        return false;
    },
    removeBulletOnServer: function(bullet) {
        this.socket.emit('destroybullet',{bulletId: bullet.id});
    },
    removeBulletsFromList: function(bullet,bullets) {
        for(let i=0;i<bullets.length;i++){
            if(bullets[i]['id']==bullet.id) {
                bullets[i]['bullet'].destroy();
                bullets.splice(i,1)
            }
        }
    },
    isActiveBullet: function(bullet,bullets) {
        for(let i=0;i<bullets.length;i++){
            if(bullets[i].id == bullet.id) {
                return true;
            }
        }
        return false;
    }
})

var CharacterScene = new Phaser.Class({

    Extends: Phaser.Scene,

    /* Handle username update */
    username: "P1",
    /* End Handle username update */
    
    CharacterList: [],
    CharacterPosition: [
        {x: 320/2-20, y:320/2},
        {x: 320/2, y:320/2},
        {x: 320/2+20, y:320/2},
    ],
    pressed: false, //Handle for button pressed one time

    initialize: function Background ()
    {
        Phaser.Scene.call(this, { key: 'CharacterScene', active: true });
    },

    preload: function ()
    {
        this.playerSprite = this.load.image('player1','assets/images/main.png');
        this.enemySprite = this.load.image('player2','assets/images/player2.png');
        this.enemySprite = this.load.image('player3','assets/images/other.png');

        /* Load the form that we can use to collect player name */
        this.load.html('playername', 'assets/forms/playername.html');

    },

    create: function ()
    {
        // this.mainPlayer = this.add.image(80,80, 'player'); //Not using physics
        // this.otherPlayer = this.add.image(100,80, 'enemy'); //Not using physics

        //Using physic instead
        //Get position from a list
        this.player1 = this.physics.add.sprite(this.CharacterPosition[0].x,this.CharacterPosition[0].y,'player1');
        this.player2 = this.physics.add.sprite(this.CharacterPosition[1].x,this.CharacterPosition[1].y,'player2');
        this.player3 = this.physics.add.sprite(this.CharacterPosition[2].x,this.CharacterPosition[2].y,'player3');

        this.CharacterList.push(this.player1);
        this.CharacterList.push(this.player2);
        this.CharacterList.push(this.player3);

        //Render rectangle in middle of the screen
        var rect = this.add.rectangle(this.CharacterPosition[1].x,this.CharacterPosition[1].y, 20,20);
        rect.setStrokeStyle(2, 0xff8800);
       
        this.cursor = this.input.keyboard.createCursorKeys(); //cursor is key

        this.add.text(20,20, "Click to start, arrow to select", {
            font: "11px monospace",
            fill: "#ffffff",
            padding: { x: 20, y: 10 },
        })
        .setScrollFactor(0);


        /** Working with form to collect name */
        var element = this.add.dom(320/2,400/2).createFromCache('playername');
     
        //Display palyername on top
        let userText = this.add.text(20,40,'Your name is: ' + this.username, {
            font: "11px monospace",
            fill: "#ffff00",
            padding: { x: 20, y: 10 },
        })
        .setScrollFactor(0);

        element.addListener('click');
        
    
        element.on('click', (event) => {
            if (event.target.name === 'playButton')
            {
                
                var inputText = element.getChildByName('name');
                if (inputText.value !== '')
                {
                    element.removeListener('click');
                    element.setVisible(false);
                    this.username = inputText.value;
                    userText.setText('Your name is: ' + this.username)
                }
            }
        });

        //Move to next scene when clicking
        this.input.on('pointerup', (pointer) => {
            this.scene.start('GamePlay',{character: this.CharacterList[1], playerName: this.username}); //Pass data to next scene, pass a middle character
        }, this);

    },

    update: function(time,delta){

        if(this.cursor.left.isDown){
            if(pressed==false) { //Catch press one time
                let temp = this.CharacterList.pop();
                this.CharacterList.unshift(temp);
                for(let i=0;i<this.CharacterList.length;i++){
                    this.CharacterList[i].x = this.CharacterPosition[i].x;
                    this.CharacterList[i].y = this.CharacterPosition[i].y;
                }
                pressed=true;
            }
        } else if (this.cursor.right.isDown){
            if(pressed==false) { //Catch press one time
                let temp = this.CharacterList[0];
                this.CharacterList.shift();
                this.CharacterList.push(temp);
                for(let i=0;i<this.CharacterList.length;i++){
                    this.CharacterList[i].x = this.CharacterPosition[i].x;
                    this.CharacterList[i].y = this.CharacterPosition[i].y;
                }
                pressed=true;
            }
        } else if (this.cursor.left.isUp && this.cursor.right.isUp) {
            pressed = false; //Return status of no button pressed
        }
    }

});




var config = {
    type: Phaser.AUTO,
    width: 320,
    height: 320,
    parent: 'game-container',
    scene: [CharacterScene,GamePlay], //**** CALL THE SCENE HERE / Scenes are loading by ordered. Put triggers to activate next scene 
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
    roundedPixels: true,  //problem with tile edges
    /* END PLAYER */
    backgroundColor: "#330033",
    dom: {
        createContainer: true
    },
};


var game = new Phaser.Game(config);