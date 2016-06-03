"use strict"
var AwsRec = require('lib-awsrec');

module.exports.handler = function(event, context) {
  console.log('Updating with event:', JSON.stringify(event, null, 2));
  var key = {
    'UserHash': {'S': event.user_hash}
  };
  var data = {
    'Age':        {'Value': {'S': event.age.toString() },'Action':'PUT'},
    'Gender':     {'Value': {'S': event.gender },'Action':'PUT'},
    'EnrolledAt': {'Value': {'S': event.enrolled_at },'Action':'PUT'},
    'UpdatedAt':  {'Value': {'S': new Date().toISOString() },'Action':'PUT'}
  };

  AwsRec.runEventHandler({
    type: 'survey',
    action: 'update',
    handler: AwsRec.updateItem,
    handler_args: ['Survey', key, data]
  })
  .then(function(response){
    console.log(response.header.status);
    context.succeed(response.body.message);
   })
  .catch(function(err) {
    console.log('Error in updating an item: ', err);
    context.fail(err);
  });

};

