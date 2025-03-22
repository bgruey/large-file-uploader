<?php

include_once __DIR__ . "/common.php";


function handle_finish_upload() {
    global $temp_filename;
    global $suffix_token;
    global $prefix_token;

    if (!check_set($_POST, ["filename", "file_version"])) {
        echo json_encode(array(
            "Error" => "Missing filename or file_version when starting upload."
        ));
        exit(0);
    }
    $filename = $_POST["filename"];
    $file_version = $_POST["file_version"];

    $upload_dir = get_upload_dir($filename, $file_version);
    $final_filepath = explode($suffix_token, $upload_dir)[0];
    $temp_filepath = $upload_dir . $temp_filename;

    if (!file_exists($temp_filepath)) {
        respond_error(
            "Server Error",
            "No data uploaded",
            500
        );
    }

    rename($upload_dir . $temp_filename, $final_filepath);
    unlink(get_status_filename($upload_dir));
    rmdir($upload_dir);

    http_response_code(201);
    echo json_encode(array("Upload Finished" => $file_version . $prefix_token . $filename));
    exit(0);
}