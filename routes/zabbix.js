var express = require('express');
var router = express.Router();

var zabbixAPI = 'http://zabbix.ieil.net/api_jsonrpc_nimit.php';
var slackAPI = "https://slack.com/api/";
var token = 'xoxb-80729628515-VHeQ532HWhwMg9BCpHVL5kCO';

/* POST apache server status. */
router.get('/apache', function(req, res, next) {
    var request = require('request');
    var slackResp = "";
    var user = req.body.userId;
    //Athenticate user
    var postheaders = {
        'Content-Type' : 'application/json'
    };

    var zabbixAPI = {
        host: zabbixAPI,
	method: 'POST',
        headers: postHeaders
        body: '{"jsonrpc": "2.0","method": "user.login",	"params": {"user": "watcher","password": "watcher@"	, "auth": null,"id": 0}';
    }; 
    request(zabbixAPI, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            slackResp = body;
       //     console.log(body) // Print the google web page.
        } else {
            slackResp = error;
        }
    });

    //request to get status
    request(zabbixAPI, function (error, response, body) {
        if (!error && response.statusCode == 200) {
	    slackResp = body;
       //     console.log(body) // Print the google web page.
        } else {
	    slackResp = error;
	} 
    });

    //send response to slack api
    request(slackAPI + "chat.postMessage", function (error, response, body) {
        if (!error && response.statusCode == 200) {
        } else {
        }
    }); 
});


module.exports = router;
