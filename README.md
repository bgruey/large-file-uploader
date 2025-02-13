# Large File Uploader

I got tired of failing to get pluploader to work.

## Running container

First make sure the `./uploads` folder is writable by anyone. Else,
PHP on the server can't write to the host via the volume mount.
`chmod -R a+rw ./uploads/`.

After that, have docker installed and run ` docker compose up --build`
and then navigate to `http://localhost/index.html`.

## Future Development

Largely academic in that this works as needed (probably).

### Cancel and resume and musing questions

Some of the background work is done for this, but it's not used yet.

The main loop would need to check if the `cancel` button was pressed, and stop
if so.

We'd also need to check if only part of a chunk was written to the appending file,
else we get corrupted data. Maybe make this call during the start step and
truncate any remainder data? Or maybe PHP doesn't stop a script if a request is 
canceled/reloaded, so it might not be an issue. It would still complete the
`file_put_contents` action.

If someone hits reload on the browser during a request, would some of the 
chunk data get lost, and would the server recognize that? Maybe the first
check is to tell the server expected chunk length--although shouldn't that be
handled by content-length headers?

### Checksum each chunk

In the `upload_in_chenks` loop, we want to take a checksum of the chunk,
rather than the text representation of it. Then, on the server/php side
we take a checksum of the POSTed chunk, and compare the two. If they don't
match, then there was an issue in transit such as a neutrino flipping a
couple bits. Retrying should solve the issue.

I forget the original thread I was on that talked about the numbers,
but the chance of a bit getting flipped on a packet is like 1 in
12 million. But with large files, there's gonna be a lot of packets.
[Minor Answer](https://superuser.com/a/1520514)

### Parallelize the uploads

There isn't really a need to do this sequentially if the backend can
store all the chunks then re-assemble them. Save each chunk as
`<chunk number>-<file checksum>-<filename>.<file extension>` or something
similar. Still need a way for the client to know all are finished, to
tell the backend to go ahead and reassemble. 
