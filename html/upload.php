<?php
/*
    Expected Response codes:
    * 204: the chunk was uploaded as expected
    * 201: the last chunk was uploaded 
        and the file on the server renamed--all done!
    * 422: The checksums did not match
        error in data transmission
*/

if($_SERVER["REQUEST_METHOD"] != "POST") {
    http_response_code(400);
    die("post only.");
}

error_log("POST: " . print_r($_POST, true));

// This should be handled by the size/length of data,
// but I haven't gotten around to sorting out how js and php deal with
// zero length.
$finished = $_POST["finished"];


// To be implemented
$checksum = $_POST["checksum"];
$chunk = 0;
if($finished == "0") {
    // Read and checksum chunk
    $chunk_name = $_FILES["chunk"]["tmp_name"];
    if ($_FILES["chunk"]["size"] > 0) {
        $chunk = file_get_contents($chunk_name);
    }
    //$my_checksum = crc32($chunk);
    $my_checksum = "pass";

    if ($checksum !== $my_checksum) {
        http_response_code(422);
        echo "Checksums did not match. Retry.";
        exit(0);
    }
}


// file version is a cheap hash of the file, which should allow simultaneous
// uploads of filenames, such as Library.zip. Unless collsiion on the
// very sketchy implementation of crc32 on some of the file bits.
// See client js.
$file_version = $_POST["file_version"];
$filename = $file_version . "-" . $_POST['filename'];
$part_filename = $filename . ".part";

$upload_dir = "/tmp/uploads/";
// Create target dir
if (!file_exists($upload_dir)) {
	@mkdir($upload_dir);
}

$filepath = $upload_dir . $filename;
$part_filepath = $upload_dir . $part_filename;

error_log("Finished is type " . gettype($finished) . " with value " . $finished . ": " . print_r($finished == "1", true));
if($finished == "1") {
    error_log("Renaming now.");
    $ret = rename($part_filepath, $filepath);
    http_response_code(201);
    exit(0);
}
else {
    error_log("Writing chunk.");
    $ret = file_put_contents($part_filepath, $chunk, FILE_APPEND);
    http_response_code(204);
    exit(0);
}
