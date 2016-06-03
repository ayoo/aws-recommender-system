import os
from flask import Flask, request, Response
import json
#from recsys.algorithm.factorize import SVD
from awsrec import recommender


application = Flask(__name__)
application.debug = True

'''
    AWS EB Worker tier - waiting for SQS message
'''
@application.route("/start", methods=['POST'])
def start():
    app_root_dir = './'#os.path.dirname(__file__)
    event = request.json
    print "Incoming event: ", event

    aws_region = event['aws_region']
    s3_bucket = event['s3_bucket']
    filename = event['filename']
    sep = event['sep']
    col_index = str(event['col_index'])
    row_index = str(event['row_index'])
    value_index = str(event['value_index'])
    ids_type = event['ids_type']

    args = [aws_region, s3_bucket, filename, sep, col_index, row_index, value_index, ids_type]
    os.system('nohup python -u '+app_root_dir+'/awsrec/computer.py ' + ' '.join(args) + ' &')
    return "OK"


'''
    AWS EB Web Server tier - waiting for SNS message
'''
@application.route("/compute", methods=['POST'])
def compute():
    print 'Incoming message: ', json.loads(request.data)
    app_root_dir = os.path.dirname(__file__)
    event = json.loads(json.loads(request.data)['Message'])['body']
    aws_region = event['aws_region']
    s3_bucket = event['s3_bucket']
    filename = event['filename']
    sep = event['sep']
    col_index = str(event['col_index']) # user
    row_index = str(event['row_index']) # item or content
    value_index = str(event['value_index'])
    ids_type = event['ids_type']

    print "Spawning a new process to build a model"
    args = [aws_region, s3_bucket, filename, sep, col_index, row_index, value_index, ids_type]
    os.system('source /opt/python/run/venv/bin/activate && ' +
              'nohup python -u '+app_root_dir+'/awsrec/computer.py ' + ' '.join(args) + ' &')
    return "OK"


@application.route("/recommend/users/<user_id>")
def recommend_for_users(user_id):
    print "Recommending for user id: ", user_id
    recommendations = recommender.recommend_for_user(int(user_id))
    return json.dumps({'recommendations': recommendations})


@application.route("/recommend/items/<item_id>")
def recommend_for_items(item_id):
    print "Recommending for item id: ", item_id
    recommendations = recommender.recommend_for_content(int(item_id))
    return json.dumps({'recommendations': recommendations})


@application.route("/recommend/all/users")
def recommend_for_all_users():
    print "Recommending for all: "
    #recommendations = awsrec.recommender.recommend_for_user(int(user_id))
    return json.dumps({'recommendations': []})


if __name__ == "__main__":
    application.debug = True
    application.run()


