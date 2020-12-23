const express = require('express');
const app = express();
// const maze = require('./maze')

var http = require('http').Server(app);
var io = require('socket.io')(http);

players = [];
bullets = [];

app.use(express.static('./public'))

const PORT = process.env.PORT || 3000;
//Run a http listen instead of express
http.listen(PORT,() => `Server is listening on ${PORT}`);

//socket.emit - This method is responsible for sending messages. 
//socket.on - This method is responsible for listening for incoming messages.
//io here for this server
//socket it is from client
io.on("connection", (socket) =>{

    console.log("A user is connected!")
    //emit back the map
    // socket.emit('map',{map:data});
    //Using socket id at user id
    console.log("with id: " +  socket.id)
    //Save it in id 
    players.push({
        id: socket.id,
        x: 80, //Initial x and y
        y: 80,
        name: ''
    })
    // for(let i=0;i<5;i++) {
    //     bullets.push({
    //         id: socket.id + i,
    //         x: 0, 
    //         y: 0,
    //         status: false
    //     })
    // }

    socket.on('disconnect', function () { //Check if client disconnect when listen to there socket
        console.log('user disconnected');
        for(let i=0;i<players.length;i++){
            if(players[i].id == socket.id){
                players.splice(i,1);
            }
        }
        //Send information to let client remove another client
        io.sockets.emit('remove',socket.id);
    });
    socket.on('playerMoved', function (player) { //Check if client disconnect when listen to there socket
        players.forEach(
            (p) => {
                if(p.id == socket.id) {
                    p.x = player.x;
                    p.y = player.y;
                    p.name = player.name;
                }
            } 
        )
        //Every move broadcast all information to clients
        io.sockets.emit('broadcast',players);
    });
    socket.on('bulletShot',function(bullet){
        bullets.push({      
            id: bullet.id,
            x: bullet.x, 
            y: bullet.y
        })
    });
    socket.on('bulletMoved', function (bullet) { 
        bullets.forEach(
            (b) => {
                if(b.id == bullet.id) {
                    b.x = bullet.x;
                    b.y = bullet.y;
                }
            } 
        )
        //Every move broadcast all information to clients
        io.sockets.emit('broadcastbullet',bullets);
        
    });
    socket.on('destroybullet', function (bulletId) { 
        for(let i=0;i<bullets.length;i++){
            if(bullets[i].id == bulletId.bulletId){
                bullets.splice(i,1);
            }
        }
        //Send information to let client remove bullet from another client
        io.sockets.emit('removebullet',bulletId);
    });
})

