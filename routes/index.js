var express = require('express');
var router = express.Router();
var request = require('request');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

var zabbixAPI = 'http://zabbix.ieil.net/api_jsonrpc_nimit.php';
var slackAPI = "https://slack.com/api/";
var token = 'xoxb-80729628515-VHeQ532HWhwMg9BCpHVL5kCO';
var postHeaders = {
        'Content-Type' : 'application/json-rpc'
    };
var zabbix = {
        host: zabbixAPI,
        uri: zabbixAPI,
        'method': 'POST',
        headers: postHeaders,
    };

var getLas15IssuesForAuthenticUser = function(error, response, body) {
    zabbix.body = '{"jsonrpc": "2.0","method": "user.login", "params": {"user": "watcher","password": "watcher@"},"id": 1}';
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            return getLast15Issues(JSON.parse(body).result);
        } else {
            return error;
        }
    });
}

var getLast15Issues = function(authToken) {
     zabbix.body = '{"jsonrpc": "2.0","method": "trigger.get","params": { "output": [ "triggerid", "description", "priority" ], "filter": {"value": 1 }, "sortfield": "priority",  "sortorder": "DESC", "limit": 15},  "auth": "' + authToken +'",     "id": 1}';

     //request to get status
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
	console.log(JSON.parse(body).result);

            return JSON.parse(body).result;
        } else {
	console.log(41);

            return error;
        }
    });
}
/* POST apache server status. */
router.get('/apache', function(req, res, next) {
    var request = require('request');
    var slackResp = "";
    var user = req.body.userId;
    //Athenticate user
    var issuesList = getLas15IssuesForAuthenticUser();
    //send response to slack api
    request(slackAPI + "chat.postMessage", function (error, response, body) {
        if (!error && response.statusCode == 200) {
        } else {
        }
    });
})

module.exports = router;
