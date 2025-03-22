<?php
/*
    Expected Response codes:
    * 204: the chunk was uploaded as expected
    * 201: the last chunk was uploaded 
        and the file on the server renamed--all done!
    * 422: The checksums did not match
        error in data transmission

    The initial goal for this rewrite was to enable restarts
    if there was an interruption. However, if the interruption happens
    while appending the the data, the whole file will get corrupted.

    The interruption restarts might need two things:
        * The parallel writes where each chunk is saved as a single file
            then the final call to assemble checks each chunk and sends
            back a request for invalid chunks from the client.
        * Back to the checksum problem, where the client and server
            need to be able to perform the same checksum.
*/

include_once "./src/upload_lib/common.php";
include_once "./src/upload_lib/chunk_upload.php";
include_once "./src/upload_lib/finish_upload.php";
include_once "./src/upload_lib/start_upload.php";

error_log("POST: " . print_r($_POST, true));

verify_post();

if (!check_set($_POST, ["action"])) {
    respond_error(
        "Error", "No `action` set.", 400
    );
}

$action = $_POST["action"];

if ($action == "start") {
    handle_upload_start();
} else if ($action == "chunk") {
    handle_chunk_upload();
} else if ($action == "finish") {
    handle_finish_upload();
} else {
    respond_error(
        "Invalid Action", "Expecting on of [start, chunk, finish].", 400
    );
}
