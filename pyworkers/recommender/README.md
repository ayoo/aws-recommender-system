### 1. To setup virtualenv
$ cd recommender/

$ pip install virtualenv

$ virtualenv venv

$ virtualenv -p /usr/bin/python2.7 venv

$ source venv/bin/activate

### 2. Download python recsys and manually put it in site-packages dir
$ wget https://github.com/ocelma/python-recsys/archive/master.zip

$ cp -R master/ venv/lib/python2.7/site-packages/