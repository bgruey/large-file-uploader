<?php

include_once __DIR__ . "/common.php";

function handle_upload_start() {
    if (!check_set($_POST, ["filename", "file_version"])) {
        echo json_encode(array(
            "Error" => "Missing filename or file_version when starting upload."
        ));
        exit(0);
    }
    $filename = $_POST["filename"];
    $file_version = $_POST["file_version"];
    
    $upload_dir = get_upload_dir($filename, $file_version);
    $status = get_file_upload_status($upload_dir);

    echo json_encode($status);
    exit(0);
}