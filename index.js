var express = require('express');
var exphbs = require('express-handlebars');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

var hbs = exphbs.create({
    layoutsDir: path.join(__dirname + '/views/layouts'),
    defaultLayout: 'main'
});

app.use(express.static(path.join(__dirname + '/static')));
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
    res.render(path.join(__dirname + '/views/app'), { isMobile: false });
});

app.get('/mobile/:guid', function(req, res) {
    var guid = req.params.guid;
    res.render(path.join(__dirname + '/views/app'), { isMobile: true, guid: guid });
});

var clients = { };
var clientIndex = 0;
var numClients;

// todo: check it's not in use already
var getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

io.on('connection', function(socket) {

    // todo: check for uniques
    var guid = getRandomInt(1000, 9999);
    socket.guid = guid;
    clients[guid] = socket;
    numClients = Object.keys(clients).length;

    clients[guid].emit('guid-assigned', guid);
    io.emit('user-joined', numClients);

    console.log('user ' + guid + ' has joined');

    socket.on('disconnect', function() {
        delete(clients[socket.guid]);
        numClients = Object.keys(clients).length;
        // todo: better name for this event
        io.emit('user-joined', numClients);
    });

    // when a mobile user joins with a guid
    socket.on('mobile-connect', function(guid) {
        console.log('connection to ' + guid);
        var c = clients[guid];
        if (c) {
            socket.matchedClient = c;
            // tell the desktop they have a match
            socket.matchedClient.emit('desktop-connect', guid);
        }
    });

    // mobile user has clicked something
    socket.on('mobile-button-click-sent', function() {
        socket.matchedClient.emit('mobile-button-click-received');
    });

});

http.listen(process.env.PORT || 5000, function() {
    console.log('listening on *:5000');
});
