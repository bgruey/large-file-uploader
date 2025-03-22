<?php

include_once __DIR__ . "/common.php";

$request_fields = [
    "checksum",
    "filename",
    "file_version",
    "chunk_index"
];

function handle_chunk_upload() {
    global $temp_filename;
    global $request_fields;

    if (!check_set($_POST, $request_fields)) {
        respond_error("Error: Missing one of", $request_fields, 400);
    }

    $upload_dir = get_upload_dir($_POST["filename"], $_POST["file_version"]);

    $status = get_file_upload_status($upload_dir);
    
    $cur_index = $status["chunk_index"];
    if ($_POST["chunk_index"] !=  $cur_index) {
        respond_error(
            "Wrong Chunk Index",
            "Got " . $_POST["chunk_index"] . "but needed " . $cur_index,
            400
        );
    }

    $chunk = file_get_contents($_FILES["chunk"]["tmp_name"]);
    // $my_checksum = crc32($chunk);
    $my_checksum = "pass";
    if ($my_checksum != $_POST["checksum"]) {
        respond_error(
            "Checksum Mismatch", 
            "Please retry",
            422
        );
    }

    file_put_contents(
        $upload_dir . $temp_filename,
        $chunk,
        FILE_APPEND
    );

    $status["chunk_index"] = $cur_index + 1;
    $status["last_chunk_ts"] = microtime(true);
    write_upload_status($upload_dir, $status);

    http_response_code(201);

    echo json_encode(array("Upload Success" => "Chunk " . $cur_index));
    exit(0);
}
