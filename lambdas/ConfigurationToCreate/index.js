"use strict"
var AwsRec = require('lib-awsrec');
var uuid = require('node-uuid');

module.exports.handler = function(event, context) {
  console.log('Creating event:', JSON.stringify(event, null, 2));

  var items = event.configurations.map(function(entry){
    return {
      "ConfigName":{ "S": entry.name },
      "Value":{ "S": JSON.stringify(entry.value) },
      "CreatedAt": { "S": new Date().toISOString() }
    };
  })

  AwsRec.runEventHandler({
    type: 'configuration',
    action: 'create',
    handler: AwsRec.createBatchItems,
    handler_args: ['Configuration', items]
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

