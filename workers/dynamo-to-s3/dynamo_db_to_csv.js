var Q = require('q');

var DynamoDBToCSV = function(settings){
  this.dynamoDB = settings.dynamodb;
  this.s3 = settings.s3;
  this.bucketName = settings.services.aws.s3_bucket;
  this.headers = [];
  this.dataToExport = [];
};

DynamoDBToCSV.prototype.getDataToExport = function(){
  return this.dataToExport;
}

DynamoDBToCSV.prototype.describeTable = function(tableName) {
  return Q.promise(function(resolve,reject){
    this.dynamoDB.describeTable({
      "TableName": tableName
    }, function(err, data) {
      if (err) {
        reject(err);
      } else resolve(data);
    });
  }.bind(this));
}

DynamoDBToCSV.prototype.scanDynamoDB = function(query) {
  var self = this;
  return Q.promise(function(resolve, reject) {
    self.dynamoDB.scan(query, function(err, data) {
      if(err) return reject(err);
      var temp = self.printout(data.Items);
      if(temp) self.dataToExport.push(temp);
      if (!data.LastEvaluatedKey) return resolve('Done');
      query.ExclusiveStartKey = data.LastEvaluatedKey;
      return resolve(self.scanDynamoDB(query));
    });
  });
};

DynamoDBToCSV.prototype.writeToS3 = function(fileName) {
  var fileName = fileName+'.csv';
  var params = {
    Bucket: this.bucketName,
    Key: fileName,
    Body: this.dataToExport.join('\r\n'),
    ContentType: 'text/csv',
    ContentDisposition: 'attachment;filename="'+fileName+'"',
    ACL: 'public-read' //for now
  };
  return Q.promise(function(resolve, reject){
    this.s3.putObject(params, function(err, data) {
      if(err) return reject(err);
      resolve(data);
    });
  }.bind(this));

}

DynamoDBToCSV.prototype.arrayToCSV = function(array_input) {
    var string_output = "";
    for (var i = 0; i < array_input.length; i++) {
        array_input[i] = array_input[i].replace(/\r?\n/g, "");
        string_output += ('"' + array_input[i].replace(/\"/g, '\\"') + '"')
        if (i != array_input.length - 1) string_output += ","
    };
    return string_output;
}

DynamoDBToCSV.prototype.printout = function(items) {
    var headersMap = {};
    var values;
    var header;
    var value;

    if (this.headers.length == 0) {
        if (items.length > 0) {
            for (var i = 0; i < items.length; i++) {
                for (var key in items[i]) {
                    headersMap[key] = true;
                }
            }
        }
        for (var key in headersMap) {
          this.headers.push(key);
        }
        console.log(this.arrayToCSV(this.headers))
    }

    for (index in items) {
        values = [];
        for (i = 0; i < this.headers.length; i++) {
            value = "";
            header = this.headers[i];
            // Loop through the header rows, adding values if they exist
            if (items[index].hasOwnProperty(header)) {
                if (items[index][header].N) {
                    value = items[index][header].N;
                } else if (items[index][header].S) {
                    value = items[index][header].S;
                } else if (items[index][header].SS) {
                    value = items[index][header].SS.toString();
                } else if (items[index][header].NS) {
                    value = items[index][header].NS.toString();
                } else if (items[index][header].B) {
                    value = items[index][header].B.toString('base64');
                } else if (items[index][header].M) {
                    value = JSON.stringify(items[index][header].M);
                } else if (items[index][header].L) {
                    value = JSON.stringify(items[index][header].L);
                } else if (items[index][header].BOOL) {
                    value = items[index][header].BOOL.toString();
                }
            }
            values.push(value)
        }
        return this.arrayToCSV(values);
    }
}

module.exports = DynamoDBToCSV;