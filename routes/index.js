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
    var x = '';
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            x = getLast15Issues(JSON.parse(body).result);
        } else {
            x = error;
        }
    });
    return x;
}

var getLast15Issues = function(authToken) {
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
        } else {
            respString = error;
        }
    });
    sendMessageTOSlack(respString, 12);
}

var sendMessageTOSlack = function(text, userId) {
        var data = {'token': token , 'text':text };
        var url = slackAPI + 'chat.postMessage?token=' + token + ", text=" + text;
        request(url);
}

/* POST apache server status. */
router.post('/apache', function(req, res, next) {
console.log(req.body);
    var request = require('request');
    var slackResp = "";
    var user = req.body.userId;
    //Athenticate user
    var issuesList = getLas15IssuesForAuthenticUser();
    console.log(issuesList); 
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
