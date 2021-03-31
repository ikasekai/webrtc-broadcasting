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



const io = require('socket.io')(server) // create a socket.io server
const signal = require('simple-signal-server')(io)

// here we hardcode some fixed rooms, but you could easily create them dynamically
const rooms = {
	'Room One' : new Set(),
	'Room Two' : new Set(),
	'Room Three' : new Set()
}

// when a peer starts, it will request a list of rooms
// after that, it will request peers in a specific room
signal.on('discover', (request) => {
	if (!request.discoveryData) { // return list of rooms
		request.discover({
			rooms: Object.keys(rooms)
		})
	} else { // return peers in a room
		const roomID = request.discoveryData
		request.discover({
			roomResponse: roomID, // return the roomID so client can correlate discovery data
			peers: Array.from(rooms[roomID])
		})
		if (request.socket.roomID) { // if peer was already in a room
			console.log(request.socket.id, 'left room', request.socket.roomID)
			rooms[request.socket.roomID].delete(request.socket.id) // remove peer from that room
		}
		if (request.socket.roomID !== roomID) { // if peer is joining a new room
			request.socket.roomID = roomID // track the current room in the persistent socket object
			console.log(request.socket.id, 'joined room', roomID)
			rooms[roomID].add(request.socket.id) // add peer to new room
		}
	}
})

console.log('Running lobbys demo! Open http://localhost:8000')


