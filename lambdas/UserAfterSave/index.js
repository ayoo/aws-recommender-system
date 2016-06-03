"use strict"
var Q = require('q');
var _ = require('lodash');
var request = require('request');
var AwsRec = require('lib-awsrec');
var accessToken = '71d5c7a925c5d6cf240f4abb4ce08f7b1a976032180d71e27803aea202885d8c';
var apiUrl = "https://api.contentful.com/spaces/f3y661pzn9i1/entries";


var getAllEntries = function(){
  var deferred = Q.defer();
  var options = {
    uri: apiUrl + '?access_token=' + accessToken
  };
  request.get(options, function(err, res, body){
    if (res.statusCode !== 200) return deferred.reject(err);
    deferred.resolve(JSON.parse(body));
  });
  return deferred.promise;
}

var handleEachMessage = function(message){
  var header = message.header;
  var body = message.body;

  // Doing some work
  return getAllEntries()
    .then(function(result){
      console.log('Contentful entries: ', result);
      if (!result) return Q.reject(new Error('No result from Contentful'));
      var contents = result.items;
      if(contents.length === 0) return Q.reject(new Error('No contents are available'));
      return Q(_.sample(contents).sys.id);
    })
    .then(function(contentId){
      console.log('Selected contentId', contentId);
      if (header.rpc) {
        return AwsRec.replyToClient(header, 200, "Recommended content id: " + contentId);
      } else {
        return Q('No Reply');
      }
    })
    .catch(function(err){
      if (header.rpc) {
        return AwsRec.replyToClient(header, 500, err);
      } else {
        return Q('No Reply');
      }
    });
}

module.exports.handler = function(event, context) {
  console.log('After Save event:', JSON.stringify(event, null, 2));
  var handles = event.Records.map(function(record){
    return handleEachMessage(JSON.parse(record.Sns.Message));
  });
  Q.allSettled(handles)
    .done(function(result){
      console.log('All Settled: ' + JSON.stringify(result, null, 2));
      context.succeed('Done');
    });
};
