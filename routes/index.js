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
var getLas15IssuesForAuthenticUser = function(user, count) {
    zabbix.body = '{"jsonrpc": "2.0","method": "user.login", "params": {"user": "watcher","password": "watcher@"},"id": 1}';
    var x = '';
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            getLast15Issues(JSON.parse(body).result, user, count);
        } else {
        }
    });
}

var getLast15Issues = function(authToken, user, limit) {
     zabbix.body = '{"jsonrpc": "2.0","method": "trigger.get","params": { "output": [ "triggerid", "hostids", "host", "description", "priority" ], "expandData": "hostname", "filter": {"value": 1 }, "sortfield": "priority",  "sortorder": "DESC", "limit": ' + limit +'},  "auth": "' + authToken +'",     "id": 1}';
     var respString = "";
console.log(zabbix);
     //request to get status
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var issuesList = JSON.parse(body).result;
	    respString = "*Below is the list of issues (in the order of most critical first)*" + "\n";
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

var getServerStatus = function(authToken, user, server) {

    zabbix.body = '{"jsonrpc": "2.0","method": "user.login", "params": {"user": "watcher","password": "watcher@"},"id": 1}';
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
	    zabbix.body = ' {    "jsonrpc": "2.0",    "method": "host.get",    "params": {        "output": "extend",        "filter": {            "host": ["' + server + '"]        }    },    "auth": "' + JSON.parse(body).result +'", "id": 1}';


    var respString = "";
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var serverList = JSON.parse(body).result;
            respString = "*Below is the status of apache servers*" + "\n";
            for (var i = 0, len = serverList.length; i < len; i++) {
                respString += "Server : "  + serverList[i].host + " | Status : " + serverList[i].status + " | Last accessed on : " + serverList[i].lastaccess + " | Errors : " + serverList[i].error + "\n";
            }
        sendMessageToSlack(respString, user);
        } else {
            respString = error;
        }
    });
        } else {
        }
    });
};

var sendMessageToSlack = function(text, userId) {
        slackResponse.body = '{"text": "' + text + '" , "mrkdwn": true}';
        slackResponse.url = userId;
console.log(slackResponse);
//        var url = slackAPI + 'chat.postMessage?token=' + token + "&text=" + text + "&channel=" + userId + "&type=message";
        request(slackResponse, function(error, response, body) {});
}



/* POST apache server status. */
router.post('/apache', function(req, res, next) {
try {
    var slackResp = "";
console.log(req.body);
    var user = req.body.user_id;
    var token = req.body.token;
    var server = req.body.text;
    var respUrl = req.body.response_url;//'https://hooks.slack.com/commands/T25JQQMNV/80832884099/rxUcuwPARiKPg4AiuvEMKMQX';//req.body.response_url;
    if(token != "QI3OZmyCwtYiu9bc14ay9DMm") {
        res.sendStatus(403);
    }
    var x = getServerStatus(token, respUrl, server);
    res.send(x);
} catch(err) {
console.log(err);
    res.sendStatus(400);
}
});

router.post('/last15issues', function(req, res, next) {
try {
    var slackResp = "";
    var user = req.body.user_id;
    var token = req.body.token;
    var count = req.body.text ? req.body.text : 15;
    var respUrl = req.body.response_url;//'https://hooks.slack.com/commands/T25JQQMNV/80832884099/rxUcuwPARiKPg4AiuvEMKMQX';//req.body.response_url;
    if(token != "35FjIjFwgIOGt0alRIbVo5OU") {
        res.sendStatus(403);
    }
    //Athenticate user
    var issuesList = getLas15IssuesForAuthenticUser(respUrl, count);
    res.send(issuesList);
   // res.sendStatus(200);
/*    //send response to slack api
    request(slackAPI + "chat.postMessage", function (error, response, body) {
        if (!error && response.statusCode == 200) {
        } else {
        }
    });*/
} catch(err) {
    res.sendStatus(400);
}
});

router.post('/velocity', function(req, res, next) {
try {
        var channel_name = 'naukri_alerts';//req.body.channel_name;
   //var app = req.body.text;
   var token = req.body.token;
//   var respUrl = req.body.response_url;
   if(token == "Ke5000XFhczRFzckCcHEuWDo")
       res.sendStatus(403);
    var velocityApi = 'https://infoedge.atlassian.net/rest/greenhopper/1.0/rapid/charts/velocity.json?rapidViewId=299&_=1474163969452';
    request(velocityApi, function(error, response, body) {
	var iterations = JSON.parse(body).result;
	console.log(iterations, body);
        res.send(iterations);
    });
} catch(err) {
console.log(err);
    res.sendStatus(400);
}
});

router.post('/roster', function(req, res, next) {
try {
   if(req.body.channel_name == "directmessage") {
	var channel_name = req.body.user_id;
   } else {
        var channel_name = req.body.channel_name;
   }
   var app = req.body.text;
   var token = req.body.token;
   var respUrl = req.body.response_url;
   if(token != "Ke5000XFhczRFzckCcHEuWDo")
       res.sendStatus(403);
   var rosterApi = "http://test2.nfl.infoedge.com/api/v1/roster?channel_name=" + channel_name + "&app=" + app;
//        var url = slackAPI + 'chat.postMessage?token=' + token + "&text=" + text + "&channel=" + userId + "&type=message";
//showTyping(channel_name, respUrl);
       request(rosterApi, function(error, response, body) {});
	
	res.send('fetching ...');
       //res.sendStatus(200);
} catch(err) {
console.log(err);
    res.sendStatus(400);
}
});

showTyping = function(user, respUrl) {
var json = {
    "id": 1,
    "type": "typing",
    "channel": user
};
    slackResponse.body = json;
        slackResponse.url = respUrl;
console.log(slackResponse);
//        var url = slackAPI + 'chat.postMessage?token=' + token + "&text=" + text + "&channel=" + userId + "&type=message";
        request(slackResponse, function(error, response, body) {});
}

module.exports = router;
