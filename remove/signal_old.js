// S01. 必要なモジュールを読み込む
var https = require('https');
var fs = require('fs');
// S02. HTTPサーバを生成する
var Peer = require('simple-peer')

const server = https.createServer({
    key: fs.readFileSync ('/etc/letsencrypt/live/stream.ikasekai.com/privkey.pem'),
    cert: [fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/cert.pem')],
    ca:   [fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/chain.pem'), fs.readFileSync('/etc/letsencrypt/live/stream.ikasekai.com/fullchain.pem')]
},
function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync(__dirname + '/webrtc.html', 'utf-8'));
}
).listen(3000);  // ポート競合の場合は値を変更



// S03. HTTPサーバにソケットをひも付ける（WebSocket有効化）
var io = require('socket.io')(server);


const signalServer = require('simple-signal-server')(io)
const allIDs = new Set()

signalServer.on('discover', (request) => {
  const clientID = request.socket.id // clients are uniquely identified by socket.id
  allIDs.add(clientID) // keep track of all connected peers
  request.discover(Array.from(allIDs)) // respond with id and list of other peers
})

signalServer.on('disconnect', (socket) => {
  const clientID = socket.id
  allIDs.delete(clientID)
})

signalServer.on('request', (request) => {
  request.forward() // forward all requests to connect
})
