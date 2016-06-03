"use strict"

var express = require('express');
var bodyParser = require('body-parser');
var Q = require('q');
require('console-ten').init(console);
var app = express();
var appSettings = null;
var DynamoDBToCSV = require('./dynamo_db_to_csv');

app.use(bodyParser());
app.use(function(err, req, res, next) {
  if(err) {
    return res.status(err.status).json({error: 'Something went wrong in API'});
  }
  next();
});

app.use(function(req,res,next){
  req.settings = appSettings;
  next();
});

app.post('/start', function (req, res) {
  console.log('starting dynamo-to-s3 worker');
  res.json({message: 'Worker started at ' + new Date()});

  var sqsParam = req.body;
  var dbtocsv = new DynamoDBToCSV(req.settings);
  var query = {
    "TableName": 'ContentFeedback',
    "Limit": 1000
  };
  dbtocsv.scanDynamoDB(query)
    .then(function(result) {
      console.log('scanning DB is done and now writing to s3');
      return dbtocsv.writeToS3(query.TableName);
    })
    .then(function(result) {
      console.log(result);
    })
    .catch(function(err){
      console.log('Error: ', err);
    });
});

/* catch all */
app.all('*', function(req,res){
  res.send(404);
});


function start(settings) {
  var deferred = Q.defer();
  appSettings = settings;

  console.log('dynamo-to-s3 worker: ' + settings.env + ' environment');

  var server = app.listen(settings.services.localhost.port, function(){
    deferred.resolve({app: app, server: server});
    console.log('dynamo-to-s3 worker has started on port ' + settings.services.localhost.port);
  });

  return deferred.promise;
};


module.exports.start = start;
