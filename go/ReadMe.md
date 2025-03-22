# Go Implementation

## Authentication

Utilize a username and password that's shared. THen
1. First request is to get an auth token tied to a specific filename/file version.
2. All upload requests must include the proper auth token.
3. When the file is assembled, the auth token is deleted

Can probably just use a `map[string]string` on the server side to hold it
for now. DB would be better later for production.