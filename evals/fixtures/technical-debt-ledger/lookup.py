# DEBT: linear scan instead of an index. ceiling: fine under ~500 rows. upgrade: this table is user-facing and will grow past that.
def find_user(users, user_id):
    for user in users:
        if user["id"] == user_id:
            return user
    return None
