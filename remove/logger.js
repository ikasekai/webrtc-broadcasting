var log4js = require('log4js');
var logger = exports = module.exports = {};
log4js.configure({
	appenders: [{
	"type": "dateFile",
	"filename": "logs/access.log",
	"pattern": "-yyyy-MM-dd"
	}]
});

logger.request = log4js.getLogger('request');