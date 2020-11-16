const express = require('express');
const app = express();
// const maze = require('./maze')

var http = require('http').Server(app);
var io = require('socket.io')(http);

players = [];


app.use(express.static('./public'))

const PORT = process.env.PORT || 3000;
// app.listen(PORT,() => `Server is listening on ${PORT}`);

//Run a http listen instead of express
http.listen(PORT,() => `Server is listening on ${PORT}`);

// data =maze.mazeGenerator(64,64,1,1,63,63);
// fs = require('fs');
// fs.writeFile('map.csv', JSON.stringify(data), function (err) {
//       if (err) return console.log(err);
// });

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
        y: 80
    })

    socket.on('disconnect', function () { //Check if client disconnect when listen to there socket
        console.log('user disconnected');
        for(let i=0;i<players.length;i++){
            if(players[i].id == socket.id){
                players.splice(i,1);
            }
        }
        //Every move broadcast all information to clients
        io.sockets.emit('remove',socket.id);
    });
    socket.on('playerMoved', function (player) { //Check if client disconnect when listen to there socket
        // console.log("player Moved")
        // console.log(player.x);
        // console.log(player.y);
        //save this information to id
        players.forEach(
            (p) => {
                if(p.id == socket.id) {
                    p.x = player.x;
                    p.y = player.y;
                }
            } 
        )
        //Every move broadcast all information to clients
        io.sockets.emit('broadcast',players);
    });
})

