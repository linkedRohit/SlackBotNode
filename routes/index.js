var express = require('express');
var router = express.Router();
var request = require('request');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

var zabbixAPI = 'http://monitor.ieil.net/api_jsonrpc_nimit.php';
var slackAPI = "https://slack.com/api/";
var token = 'xoxb-80729628515-VHeQ532HWhwMg9BCpHVL5kCO';
var scale = ['Bytes','KB','MB','GB','TB'];
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

var getServerStatus = function(authToken, user, server, type) {
    var token = "";
    zabbix.body = '{"jsonrpc": "2.0","method": "user.login", "params": {"user": "watcher","password": "watcher@"},"id": 1}';
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
	    token = JSON.parse(body).result;
	    zabbix.body = ' {    "jsonrpc": "2.0",    "method": "hostinterface.get",    "params": {  "search": {            "ip": ["' + server + '"]        }    },    "auth": "' + token +'", "id": 1}';


    var respString = "";
    request(zabbix, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var serverList = JSON.parse(body).result;
            if(serverList.length == 0 ) return sendMessageToSlack("Oops! Server not found", user);
	    var hostid =serverList[0].hostid;
	    var ipaddr = serverList[0].ip;
	    zabbix.body = ' {    "jsonrpc": "2.0",    "method": "item.get", "params": {"hostids":"'+hostid+'"},    "auth": "' + token +'", "id": 1}';
            request(zabbix, function (error, response, body) {
		if (!error && response.statusCode == 200) {
    	  	var itemList = JSON.parse(body).result;
            sendPowerfulAttachments( type, user, itemList, ipaddr );
	    }
	});
        } else {
            respString = error;
        }
   });
        } else {
        }
    });
};

var sendPowerfulAttachments = function(type, user, itemList, ipaddr){
    var respString = "Sorry! There is nothing like this exists :("
    if(type=='apache'){
        respString = getApacheString( itemList, ipaddr );
    }
    if(type == 'disk'){
        respString = getDiskString( itemList, ipaddr );
    }
    if(type == 'mysql'){
        respString = getMysqlString( itemList, ipaddr );
    }
    respString.response_type = 'in_channel';
    sendAttachmentToSlack(JSON.stringify(respString), user);
}

var getMysqlString = function(itemList, ipaddr){
    var fields = [];
    for (var i = 0, len = itemList.length; i < len; i++) {
        if( itemList[i]['key_'].startsWith('custom.mysql.replication') )
        {
            var did = itemList[i]['key_'].substring(25).split(",");
            var port = did[0];
            var type = did[1].split("]")[0];

            if(typeof(fields[port]) == 'undefined') fields[port] = [];
            fields[port][type] = itemList[i]['lastvalue'];
        }
        else if( itemList[i]['key_'].startsWith('custom.mysql.status') )
        {
            var did = itemList[i]['key_'].substring(20).split(",");
            var port = did[0];
            var type = did[1].split("]")[0];

            if(typeof(fields[port]) == 'undefined') fields[port] = [];
            fields[port][type] = itemList[i]['lastvalue'];
        }
        else if ( itemList[i]['key_'].startsWith('custom.mysql.processlist') )
        {
            var did = itemList[i]['key_'].substring(25).split(",");
            var port = did[0].split("]")[0];
            if(typeof(fields[port]) == 'undefined') fields[port] = [];
            fields[port]['processlist'] = itemList[i]['lastvalue'];
        }
        else if ( itemList[i]['key_'].startsWith('custom.mysql.sleep_processlist') )
        {
            var did = itemList[i]['key_'].substring(31).split(",");
            var port = did[0].split("]")[0];
            if(typeof(fields[port]) == 'undefined') fields[port] = [];
            fields[port]['sleep_process'] = itemList[i]['lastvalue'];
        }
    }

    var json = {
        "text": "Disk Space on "+ipaddr,
        "attachments": []
    };

    for(obj in fields){
        json.attachments.push({
            "color": "good",
            "title": "Running Port : "+obj,
            "fields": [{
                "title": "Process List",
                "value": fields[obj]['processlist'],
                "short": true
                },{
                    "title": "Sleeping Process",
                    "value": fields[obj]['sleep_process'],
                    "short": true
                },{
                    "title": "Replication Running",
                    "value": fields[obj]['Slave_SQL_Running'],
                    "short": true
                },{
                    "title": "Replication Delay",
                    "value": fields[obj]['Seconds_Behind_Master']+" seconds delay",
                    "short": true
                },{
                    "title": "Connection Refused",
                    "value": fields[obj]['Aborted_connects'],
                    "short": true
                },{
                    "title": "Queries per Second",
                    "value": fields[obj]['Queries'],
                    "short": true
                }]
        });
    }

    return json;
};


var getDiskString = function(itemList, ipaddr){
    var fields = [];
    for (var i = 0, len = itemList.length; i < len; i++) {
        if( itemList[i]['key_'].startsWith('vfs.fs.size') )
        {
            var did = itemList[i]['key_'].substring(12).split(",");
            var name = did[0];
            var type = did[1].split("]")[0];

            if(typeof(fields[name]) == 'undefined') fields[name] = [];
            fields[name][type] = itemList[i]['lastvalue'];
        }
    }

    var json = {
        "text": "Disk Space on "+ipaddr,
        "attachments": []
    };

    for(obj in fields){
        json.attachments.push({
            "color": getColor(fields[obj]['pused']),
            "title": "Mounted on "+obj,
            "fields": [{
                "title": "Free  ("+rnd(fields[obj]['pfree'])+")%",
                "value": gb(fields[obj]['free'],0),
                "short": true
                },{
                    "title": "Used ("+rnd(fields[obj]['pused'])+")%",
                    "value": gb(fields[obj]['used'],0),
                    "short": true
                }]
        });
    }

    return json;
};

var getColor = function(p){
    if(p>82) return 'danger';
    if(p>65) return 'warning';
    return 'good';
}

var gb = function(val,c){
    return val;
    var f = 1024*(c==0?8:1);
    if(val > 1024 && c<5) return gb(val/f, c+1);
    return rnd(val)+" "+scale[c];
}

var rnd = function(val){
    return Math.round(val*100)/100;
}

var getApacheString = function(itemList, ipaddr){
    var bw = 'NA';
    var iw = 'NA';
    var load = 'NA';
    var rqs = 'NA';
    for (var i = 0, len = itemList.length; i < len; i++) {
        if(itemList[i]['key_'] == 'apache[localhost,BusyWorkers]') bw = itemList[i].lastvalue;
        else if(itemList[i]['key_'] == 'apache[localhost,IdleWorkers]') iw = itemList[i].lastvalue;
        else if(itemList[i]['key_'] == 'apache[localhost,CPULoad]' ) load = itemList[i].lastvalue;
        else if(itemList[i]['key_'] == 'apache[localhost,ReqPerSec]' ) rqs = itemList[i].lastvalue;
        else if(itemList[i]['key_'].startsWith('custom.mysql') ) console.log(itemList[i]['key_'], itemList[i]['name'],  itemList[i]['lastvalue']);
    }
   return {
"attachments": [
    {
        "fallback": "Apache Status for "+ipaddr,
        "color": "#3AA3E3",
        "pretext": "Apache Status for "+ipaddr,
        "fields": [
            {
                "title": "Busy Workers",
                "value": bw+" workers",
                "short": true
            },
            {
                "title": "Idle Workers",
                "value": iw+" workers",
                "short": true
            },
            {
                "title": "CPU Load",
                "value": load,
                "short": true
            },
            {
                "title": "Requests Per Second",
                "value": rqs,
                "short": true
            }

        ]
/*    },
    {
        "color": "#8bc34a",
        "title": "View Available Graphs",
        "actions": [
            {
                "name": "view-graph",
                "text": "View Busy Wokers",
                "type": "button",
                "value": "chess"
            },
            {
                "name": "view-graph",
                "text": "View Req/Sec",
                "type": "button",
                "value": "chess"
            }
        ] */
    }
]
};
}

var sendMessageToSlack = function(text, userId) {
        slackResponse.body = '{"text": "' + text + '" , "mrkdwn": true}';
        slackResponse.url = userId;
//        var url = slackAPI + 'chat.postMessage?token=' + token + "&text=" + text + "&channel=" + userId + "&type=message";
        request(slackResponse, function(error, response, body) {});
}

var sendAttachmentToSlack = function(text, userId) {
	slackResponse.body = text;
	slackResponse.url = userId;
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
    var x = getServerStatus(token, respUrl, server, 'apache');
    res.send(x);
} catch(err) {
console.log(err);
    res.sendStatus(400);
}
});

/* POST disk space server status. */
router.post('/disk', function(req, res, next) {
try {
    var slackResp = "";
console.log(req.body);
    var user = req.body.user_id;
    var token = req.body.token;
    var server = req.body.text;
    var respUrl = req.body.response_url;//'https://hooks.slack.com/commands/T25JQQMNV/80832884099/rxUcuwPARiKPg4AiuvEMKMQX';//req.body.response_url;
    if(token != "aiQ1061vAZAnrXSiatr5xOef") {
        res.sendStatus(403);
    }
    var x = getServerStatus(token, respUrl, server, 'disk');
    res.send(x);
} catch(err) {
console.log(err);
    res.sendStatus(400);
}
});

/* POST mysql server status. */
router.post('/mysql', function(req, res, next) {
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
    var x = getServerStatus(token, respUrl, server, 'mysql');
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

