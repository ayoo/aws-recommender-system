from recsys.algorithm.factorize import SVD

def recommend_for_user(user_id):
    print 'Loading SVD model'
    svd = SVD(filename='./models/recommender.zip')
    return svd.recommend(user_id, is_row=False)

def recommend_for_content(content_id):
    svd = SVD(filename='./models/recommender.zip')
    return svd.recommend(content_id)

def recommend_for_all_user():
    return ""