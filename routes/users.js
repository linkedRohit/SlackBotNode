var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/check', function(req, res, next) {  
   getfetchRosterInfo('naukri_alerts','',function(data){ console.log(data); });
   res.send();	
});

module.exports = router;

var mysql = require("mysql");
var currentWeekNumber = require('current-week-number');

var con = mysql.createConnection({
       host: "192.168.2.116",
       user: "root",
       password: "Km7Iv80l",
       database: "roster",
       port: "3306"
   });

var getRosterInfo = function(week,cb) {
   con.connect(function(err){
       if(err){
           console.log(err, 'Error connecting to Db');
           return;
       }
       console.log('Connection established');
   });
   con.query('select * from roster r,application a where a.applicationId=r.applicationId and r.week=?',[week],function(err,rows){
       con.end();
       if (err) return cb(err,null);
       cb(null,rows);
   });
};
var getRosterDetail = function(week,application,cb){
   getApplicationIds(application,function(err,rows){
       if(!err){
           var applicationIds = [];
           for (var i = 0; i < rows.length; i++) {
               applicationIds.push(rows[i].applicationId);
           }

          con.connect(function(err){
          if(err){
           	console.log('Error connecting to Db');
           	return;
       		}
       		console.log('Connection established');

/*		con.query('select * from roster r,application a where a.applicationId=r.applicationId and a.applicationId in '+getInQueryBindStatement(count(applicationIds))+' and week='+week,function(err,rows){
       con.end();
       if (err) return cb(err);
       cb(null,rows);
   }); */		
    	 });

       }
   });
};

var getApplicationIds = function(application,cb) {
   con.connect(function (err) {
       if (err) {
           console.log('Error connecting to Db');
           return;
       }
       console.log('Connection established');
   });
   con.query('select * from application where MATCH(applicationName) AGAINST( ? IN BOOLEAN MODE)', [application], function (err, rows) {
       con.end();
       if (err) return cb(err);
       cb(null, rows);
   })
};

var getfetchRosterInfo = function getfetchRosterInfo(channel,app, callback){
  var week = currentWeekNumber();
   if(!app){
     getRosterInfo(week,function (err,data){
           if(!err)
               var res = data;
	      callback( generateRoster(res) );
       });
   }
   else {
     getRosterDetail(week,app,function (err,data){
           if(!err)
               var res = data;
	       callback( generateRoster(res) );
       });
   }
}

var generateRoster = function(res){
    var text='';
    var noRecord = true;
    if(res){
       for (var i = 0; i < res.length; i++) {
           text = text+'Application : '+res[i].applicationName+"\n"+' Engineer : '+res[i].engineer+"\n"+' Escalation : '+res[i].escalation+"\n";
           noRecord = false;
       };
   }
   if(noRecord == true){
       text = 'Roster record not found. Make sure application names are correct and space separated';
   }
   return text;
}
