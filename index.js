require('dotenv').config({ path: require('find-config')('.env') })
const express = require('express');
const { Server } = require('socket.io');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const fs = require('fs');
const port = process.env.PORT || 80;

app.use(express.static(__dirname + '/public'));

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('fetchWords', () => {
        var words = fs.readFileSync('./words.txt', 'utf8').replaceAll('\r', '').split('\n');
        for (var i = 0; i < words.length; i++) {
            if (words[i].length === 0) {
                words.splice(i, 1);
            }
        }

        socket.emit('words', words);
    })
});