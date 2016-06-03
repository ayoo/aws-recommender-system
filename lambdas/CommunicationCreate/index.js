"use strict"
var AwsRec = require('lib-awsrec');
var uuid = require('node-uuid');

module.exports.handler = function(event, context) {
  console.log('Creating event:', JSON.stringify(event, null, 2));
  var data = {
    "UserHash":{ "S": event.user_hash ? event.user_hash : uuid.v4() },
    "ScoreGeneralWellnessAspect":{ "N": event.score_general_wellness_aspect.toString() },
    "ScoreWeightManagement":{ "N": event.score_weight_management.toString() },
    "ScoreChronicCondition":{ "N": event.score_chronic_condition.toString() },
    "ScoreHealthConcern": { "N": event.score_health_concerns.toString() },
    "MainChronicCondition": {"S": event.main_chronic_condition },
    "CreatedAt": { "S": new Date().toISOString() }
  }

  AwsRec.runEventHandler({
    type: 'survey',
    action: 'create',
    handler: AwsRec.createItem,
    handler_args: ['Survey', data]
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

