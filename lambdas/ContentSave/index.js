"use strict"
var AwsRec = require('lib-awsrec');
var Q = require('q');
var uuid = require('node-uuid');
var request = require('request');

var accessToken = 'Your Access Token';
var apiUrl = "https://api.contentful.com/spaces/xxxxxxx/content_types"

var getContentType = function(contentTypeId){
  var deferred = Q.defer();
  var options = {
    uri: apiUrl + '/' + contentTypeId + '?access_token=' + accessToken
  };
  request.get(options, function(err, res, body){
    if (res.statusCode !== 200) return deferred.reject(err);
    var contentType = JSON.parse(body).name;
    deferred.resolve(contentType);
  });
  return deferred.promise;
}

var buildBatchParams = function(contentType, event) {
  var timeFactors = ['Morning', 'Afternoon'];
  var items = timeFactors.map(function(whenToSend) {
    return {
      "ContentId":{ "S": uuid.v4() },
      "ContentRepositoryId" : {"S": event.sys.id.toString()},
      "Channel":{ "S": contentType },
      "WhenToSend":{ "S": whenToSend },
      "tags":{ "S": event.fields.tags["en-US"] },
      "CreatedAt": { "S": new Date().toISOString() }
    }
  });
  return Q(items);
};

module.exports.handler = function(event, context) {
  console.log('Creating event:', JSON.stringify(event, null, 2));
  var typeOfEvent = event.sys.type;
  if (typeOfEvent !== 'Entry') return context.succeed();

  var contentTypeId = event.sys.contentType.sys.id;
  var searchOptions = {
    "KeyConditions": {
      "ContentRepositoryId": {
        "AttributeValueList": [{"S": event.sys.id.toString()}],
        "ComparisonOperator": "EQ"}
    }
  };

  getContentType(contentTypeId)
    .then(function(contentType){
      return buildBatchParams(contentType, event);
    })
    .then(function(items) {
      return AwsRec.runEventHandler({
        type: 'content',
        action: 'save',
        handler: AwsRec.createOrUpdateBatchItems,
        handler_args: ['Content', searchOptions, items]
      });
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

