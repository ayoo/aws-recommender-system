"use strict"
var AwsRec = require('lib-awsrec');
var uuid = require('node-uuid');

module.exports.handler = function(event, context) {
  console.log('Creating event:', JSON.stringify(event, null, 2));

  var data = event.Records[0];
  var awsRegion = data.awsRegion;
  var s3Bucket = data.s3.bucket.name;
  var fileName = data.s3.object.key;
  var primaryKey = {"ConfigName": { "S": "content_feedback_files"}};

  AwsRec.runEventHandler({
    type: 'content-feedback',
    action: 'train',
    handler: AwsRec.readItem,
    handler_args: ["Configuration", primaryKey],
    handler_result_func: function(result) {
      var val = JSON.parse(result.Item.Value.S);
      var body = {
        aws_region: awsRegion,
        s3_bucket: s3Bucket,
        filename: fileName,
        sep: val[fileName].delimiter,
        ids_type: val[fileName].ids_type,
        col_index: val[fileName].columns['user'].index,
        row_index: val[fileName].columns['content'].index,
        value_index: val[fileName].columns['value'].index
      };
      console.log('body:' , body);
      return body;
    }
  })
  .then(function(result) {
    context.succeed('Done');
  })
  .catch(function(err){
    console.log('Error in reading item ', err);
    context.fail(err);
  });
};