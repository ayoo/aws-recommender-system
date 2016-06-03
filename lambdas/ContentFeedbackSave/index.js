"use strict"
var AwsRec = require('lib-awsrec');
var Q = require('q');
var uuid = require('node-uuid');

module.exports.handler = function(event, context) {
  console.log('Creating event:', JSON.stringify(event, null, 2));

  var items = event.content_feedbacks.map(function(entry){
    return {
      "UserHash":{ "S": entry.user_hash },
      "ContentId": {"S": entry.content_id.toString() },
      "Duration":{ "N": entry.duration.toString() },
      "Rate":{ "N": entry.rate.toString() },
      "CreatedAt": { "S": new Date().toISOString() }
    };
  })

  AwsRec.runEventHandler({
    type: 'content-feedback',
    action: 'save',
    handler: AwsRec.createBatchItems,
    handler_args: ['ContentFeedback', items]
    })
    .then(function(response){
      console.log('AwsRec.runEventHandler returned:' + response.header.status);
      context.succeed(response.body.message);
    })
    .catch(function(err) {
      console.log('Error in putting an item: ', err);
      context.fail(err);
    });
};

