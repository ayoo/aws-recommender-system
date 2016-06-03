"use strict"
var AwsRec = require('lib-awsrec');
var uuid = require('node-uuid');

module.exports.handler = function(event, context) {
  console.log('Creating event:', JSON.stringify(event, null, 2));
  var data = {
    "UserHash":{ "S": event.user_hash ? event.user_hash : uuid.v4() },
    "Age": {"N": event.age.toString()},
    "Gender":{ "S": event.gender },
    "EnrolledAt":{ "S": event.enrolled_at },
    "CreatedAt": { "S": new Date().toISOString() }
  }

  AwsRec.runEventHandler({
    type: 'user',
    action: 'create',
    handler: AwsRec.createItem,
    handler_args: ['User', data],
    rpc: true
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

