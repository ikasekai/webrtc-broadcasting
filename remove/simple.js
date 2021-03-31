// S01. 必要なモジュールを読み込む
var https = require('https');
var fs = require('fs');
// S02. HTTPサーバを生成する
//var Peer = require('simple-peer')
const allIDs = new Set();

const server = https.createServer({
    key: fs.readFileSync ('/etc/letsencrypt/live/stream.ikasekai.com/privkey.pem'),
    cert: [fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/cert.pem')],
    ca:   [fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/chain.pem'), fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/fullchain.pem')]
},
function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync(__dirname + '/index.html', 'utf-8'));
}
).listen(3000);  // ポート競合の場合は値を変更


// S03. HTTPサーバにソケットをひも付ける（WebSocket有効化）
var io = require('socket.io')(server);
// S04. connectionイベントを受信する
io.sockets.on('connection', function(socket) {
    var room = '';
    var name = '';
    const clientID = socket.id // clients are uniquely identified by socket.id
    allIDs.add(clientID);


    // roomへの入室は、「socket.join(room名)」
    socket.on('client_to_server_join', function(data) {
        room = data.room;
        console.log(room);
        socket.join(room);
    });

    // S05. client_to_serverイベント・データを受信する
    socket.on('client_to_server', function(data) {
        console.log(data);
        // S06. server_to_clientイベント・データを送信する
        io.to(room).emit('server_to_client', {clientId:clientID, data:data});
    });
    // S07. client_to_server_broadcastイベント・データを受信し、送信元以外に送信する
    socket.on('client_to_server_broadcast', function(data) {
        socket.broadcast.to(room).emit('server_to_client', {clientId:clientID, data:data});
    });
    // S08. client_to_server_personalイベント・データを受信し、送信元のみに送信する
    socket.on('client_to_server_personal', function(data) {
        var id = socket.id;
        name = data.value;
        var personalMessage = "あなたは、" + name + "さんとして入室しました。";
        var data = {value : personalMessage};
        io.to(id).emit('server_to_client', {clientId:clientID, data:data});
    });
    socket.on('client_to_server_to', function(sendTo, data) {
        var id = sendTo;
        console.log(id);
        console.log(data);
        io.to(id).emit('server_to_client', {clientId:clientID, data:data});
    });
    // S09. dicconnectイベントを受信し、退出メッセージを送信する
    socket.on('disconnect', function() {
        allIDs.delete(clientID);

        if (name == '') {
            console.log("未入室のまま、どこかへ去っていきました。");
        } else {
            var endMessage = name + "さんが退出しました。"
            var data = {value : endMessage};
            io.to(room).emit('server_to_client', {clientId:clientID, data:data});
        }
        io.to(room).emit('server_to_client', {clientId:clientID, data:{type:'leave'}});
    });
});