// S01. 必要なモジュールを読み込む
var https = require('https');
var fs = require('fs');
const url = require('url');
const cookie = require('cookie');
const log4js = require('log4js');

// ログ出力設定
log4js.configure({
    appenders: {
        system: {type: 'file', filename: './logs/system.log'}
    },
    categories: {
      default: {appenders: ['system'], level: 'debug'}
    }
  });
// ログカテゴリはdefaultを指定する
const logger = log4js.getLogger("default");


// S02. HTTPサーバを生成する
//var Peer = require('simple-peer')
const allIDs = new Set();

const pagePlay = fs.readFileSync(__dirname + '/play.html', 'utf-8');
const pageSend = fs.readFileSync(__dirname + '/send.html', 'utf-8');

const server = https.createServer(
    {
        key: fs.readFileSync ('/etc/letsencrypt/live/stream.ikasekai.com/privkey.pem'),
        cert: [fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/cert.pem')],
        ca:   [fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/chain.pem'), fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/fullchain.pem')]
    },
    function(req, res) {
        logger.info([
            req.headers['x-forwarded-for'] || req.client.remoteAddress,
            new Date().toLocaleString(),
            req.method,
            req.url,
            res.statusCode,
            req.headers.referer || '-',
            req.headers['user-agent'] || '-'
            ].join('\t')
        );
        const url_parts = url.parse(req.url);
//        var parsed_cookie = cookie.parse(req.headers.cookie);
//        console.log(parsed_cookie)
        var params = url_parts.pathname.split('/');
//        console.log(params);
        const action = params.length > 0 ? params[1] : 'top';
        switch (action) {
            case '':
            case 'play':
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(pagePlay);
                res.end();
                break;
            case 'send':
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(pageSend);
                res.end();
                break;
            case '/css/style.css':
                res.writeHead(200, {'Content-Type': 'text/css'});
                res.write(pagePlay);
                res.end();
                break;
            case '/js/script.js':
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.write(pagePlay);
                res.end();
                break;
            default:
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('お探しのページは見つかりません。');
                break;
        }
        //res.writeHead(200, {'Content-Type' : 'text/html'});
        //res.end(fs.readFileSync(__dirname + '/index.html', 'utf-8'));
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
        logger.debug(data);
        room = data.room;
        //console.log(room);
        socket.join(room);
    });

    // S05. client_to_serverイベント・データを受信する
    socket.on('client_to_server', function(data) {
        logger.debug(data);
        //console.log(data);
        // S06. server_to_clientイベント・データを送信する
        io.to(room).emit('server_to_client', {clientId:clientID, data:data});
    });
    // S07. client_to_server_broadcastイベント・データを受信し、送信元以外に送信する
    socket.on('client_to_server_broadcast', function(data) {
        socket.broadcast.to(room).emit('server_to_client', {clientId:clientID, data:data});
    });
    // S08. client_to_server_personalイベント・データを受信し、送信元のみに送信する
    socket.on('client_to_server_personal', function(data) {
        logger.debug(data);
        var id = socket.id;
        name = data.value;
        var personalMessage = "あなたは、" + name + "さんとして入室しました。";
        var data = {value : personalMessage};
        io.to(id).emit('server_to_client', {clientId:clientID, data:data});
    });
    socket.on('client_to_server_to', function(sendTo, data) {
        logger.debug(data);
        var id = sendTo;
        //console.log(id);
        //console.log(data);
        io.to(id).emit('server_to_client', {clientId:clientID, data:data});
    });
    // S09. dicconnectイベントを受信し、退出メッセージを送信する
    socket.on('disconnect', function() {
        allIDs.delete(clientID);

        if (name == '') {
            //console.log("未入室のまま、どこかへ去っていきました。");
        } else {
            var endMessage = name + "さんが退出しました。"
            var data = {value : endMessage};
            io.to(room).emit('server_to_client', {clientId:clientID, data:data});
        }
        io.to(room).emit('server_to_client', {clientId:clientID, data:{type:'leave'}});
    });
});









