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

var slackResponse = {
    'method': 'POST',
    headers : { 'Content-Type' : 'application/json' }
}
var getLas15IssuesForAuthenticUser = function(user) {
    zabbix.body = '{"jsonrpc": "2.0","method": "user.login", "params": {"user": "watcher","password": "watcher@"},"id": 1}';
    var x = '';
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            getLast15Issues(JSON.parse(body).result, user);
        } else {
        }
    });
}

var getLast15Issues = function(authToken, user) {
     zabbix.body = '{"jsonrpc": "2.0","method": "trigger.get","params": { "output": [ "triggerid", "hostids", "host", "description", "priority" ], "expandData": "hostname", "filter": {"value": 1 }, "sortfield": "priority",  "sortorder": "DESC", "limit": 15},  "auth": "' + authToken +'",     "id": 1}';
     var respString = "";
     //request to get status
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var issuesList = JSON.parse(body).result;
	    respString = "Below is the list of issues (in the order of most critical first)" + "\n";
	    for (var i = 0, len = issuesList.length; i < len; i++) {
	        var d = issuesList[i].description;
		respString += d.replace("{HOSTNAME}", issuesList[i].hostname) + "\n";
 	    }
            sendMessageToSlack(respString, user);
        } else {
            respString = error;
        }
    });
}

var sendMessageToSlack = function(text, userId) {
        slackResponse.body = '{"text": "' + text + '" }';
        slackResponse.url = userId;
console.log(slackResponse);
//        var url = slackAPI + 'chat.postMessage?token=' + token + "&text=" + text + "&channel=" + userId + "&type=message";
        request(slackResponse, function(error, response, body) {});
}

/* POST apache server status. */
router.post('/apache', function(req, res, next) {
    var request = require('request');
    var slackResp = "";
    var user = req.body.user_id;
    var token = req.body.token;
    var respUrl = req.body.response_url;//'https://hooks.slack.com/commands/T25JQQMNV/80832884099/rxUcuwPARiKPg4AiuvEMKMQX';//req.body.response_url;
    if(token != "QI3OZmyCwtYiu9bc14ay9DMm") {
        res.sendStatus(403);
    }
    //Athenticate user
    var issuesList = getLas15IssuesForAuthenticUser(respUrl);
    res.send(issuesList);
   // res.sendStatus(200);
/*    //send response to slack api
    request(slackAPI + "chat.postMessage", function (error, response, body) {
        if (!error && response.statusCode == 200) {
        } else {
        }
    });*/
})

module.exports = router;
