"use strict"

var express = require('express');
var bodyParser = require('body-parser');
var Q = require('q');
require('console-ten').init(console);
var app = express();
var appSettings = null;

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
  console.log('starting user-to-manage worker');
  var sqsParam = req.body;

  var params = {
    QueueUrl: queueURL,
    MessageBody : JSON.stringify({
      task_id: task.id,
      task_description: task.task_description,
      participant_id: task.participant_id,
      task_content_1: task.task_content_1,
      task_content_2: task.task_content_2,
      timestamp: new Date().getTime()
    }),
    DelaySeconds: 0
  };

  console.log('Pushing the response to request-reply queue: ');
  console.log(params);
  req.settings.sqs.sendMessage(params, function(err, data) {
    if(err) console.log(err);
    self.updateTask(err, task, callback);
  });
});

/* catch all */
app.all('*', function(req,res){
  res.send(404);
});


function start(settings) {
  var deferred = Q.defer();
  appSettings = settings;

  console.log('user-to-manage worker: ' + settings.env + ' environment');

  var server = app.listen(settings.services.localhost.port, function(){
    deferred.resolve({app: app, server: server});
    console.log('user-to-manage worker has started on port ' + settings.services.localhost.port);
  });

  return deferred.promise;
};


module.exports.start = start;
