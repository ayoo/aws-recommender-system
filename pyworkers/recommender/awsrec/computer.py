from recsys.algorithm.factorize import SVD
from boto import s3
import sys
from time import gmtime, strftime
import numpy as np
import scipy.sparse as sp
from operator import itemgetter
from numpy import linalg as la

# Hardcoded for now
AWS_ACCESS_KEY_ID = ''
AWS_SECRET_ACCESS_KEY = ''

def compute(aws_region, s3_bucket, filename, sep, col_index, row_index, value_index, ids_type):
    download_from_s3(aws_region, s3_bucket, filename)
    svd = SVD()

    print 'Loading data to SVD module'
    svd.load_data(filename='./data/' + filename,
                  sep=sep,
                  format={'col':int(col_index), 'row':int(row_index), 'value':int(value_index), 'ids': ids_type})

    k = derive_latent_dimensions(svd, energy_level=0.6)

    print 'Stating to compute SVD at ', strftime("%Y-%m-%d %H:%M:%S", gmtime())
    svd.compute(k=k,
                min_values=10,
                pre_normalize=None,
                mean_center=True,
                post_normalize=True,
                savefile='./models/recommender')
    print "SVD model saved at ", strftime("%Y-%m-%d %H:%M:%S", gmtime())
    sys.exit() # to make sure that process finishes at the end


def download_from_s3(aws_region, s3_bucket, filename):
    print 'Downloading data..'
    conn = s3.connect_to_region(aws_region,
                                aws_access_key_id=AWS_ACCESS_KEY_ID,
                                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                                is_secure=False)
    bucket = conn.get_bucket(s3_bucket)
    key = bucket.get_key(filename)
    key.get_contents_to_filename('./data/' + filename)
    print 'Downloading finished..'


'''
 Todo - Deduce the Kth latent dimensions using the evaluation with RMSE
'''
def derive_latent_dimensions(svd, energy_level=0.9):
    print "Energey level :", 100 * energy_level, "%"

    data = svd._data
    vals = map(itemgetter(0), data)
    rows = map(itemgetter(1), data)
    cols = map(itemgetter(2), data)

    sparse_matrix = sp.coo_matrix((vals, (rows, cols))).todense()
    U, Sigma, VT = la.svd(np.mat(sparse_matrix))
    non_neg_sig = Sigma ** 2
    total_energy = sum(non_neg_sig) * energy_level
    current_energy = 0.0
    dim_steps = 50 # for now
    cur_dim = dim_steps

    while True:
        current_energy = sum(non_neg_sig[:cur_dim])
        if current_energy > total_energy:
            cur_dim -= dim_steps
            break
        cur_dim += dim_steps

    print "Derived dimension size #", cur_dim
    return cur_dim # 100 for now


if __name__ == "__main__":
    aws_region = sys.argv[1]
    s3_bucket = sys.argv[2]
    filename = sys.argv[3]
    sep = sys.argv[4]
    col_index = sys.argv[5]
    row_index = sys.argv[6]
    value_index = sys.argv[7]
    ids_type = sys.argv[8]
    compute(aws_region, s3_bucket, filename, sep, col_index, row_index, value_index, ids_type)