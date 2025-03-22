<?php 
//
$kb_size = 1024;
$mb_size = $kb_size * $kb_size;
$chunk_size = 32 * $mb_size;

$temp_filename = "data.part";

$prefix_token = "___";
$suffix_token = "---";

// System settings for uploading files
function get_base_upload_dir() {
    $base_dir = getenv("UPLOAD_DIR");
    if ($base_dir == false) {
        $base_dir = "/tmp/uploads/";
    }

    if (!str_ends_with($base_dir, "/")) {
        $base_dir .= "/";
    }
    // Create target dir
    if (!file_exists($base_dir)) {
        mkdir($base_dir);
    }

    return $base_dir;
}


// The file_version is considered a uniqueness hash of the data in the file,
// so two files of the same name can be uploaded.
// Collisions are a client issue, since there is no concept of a user in this project.
function get_upload_dir($filename, $file_version) {
    global $prefix_token;
    global $suffix_token;

    $base_dir = get_base_upload_dir();
    $upload_dir = $base_dir . $file_version . $prefix_token . $filename . $suffix_token . $file_version . "/";

    if (!file_exists($upload_dir)) {
        mkdir($upload_dir);
    }
    error_log("Upload dir: " . $upload_dir);
    return $upload_dir;
}


// see function name.
function get_status_filename($upload_dir) {
    return $upload_dir . "settings.json";
}


// Exclusive shouldn't be needed, but how bad of an idea could it be?
function write_upload_status($upload_dir, $status) {
    file_put_contents(
        get_status_filename($upload_dir),
        json_encode($status),
        LOCK_EX
    );
}


// Load previous status if it exists, or start a new one.
function get_file_upload_status($upload_dir) {
    global $chunk_size;

    $status_filename = get_status_filename($upload_dir);
    $status = array();
    if (file_exists($status_filename)) {
        $status = json_decode(file_get_contents($status_filename), true);
    } else {
        // Next expected chunk index is 0, the first one.
        $status["chunk_index"] = 0;
        $status["chunk_size"] = $chunk_size;
        $status["last_chunk_ts"] = 0.0;
        write_upload_status($upload_dir, $status);
    }

    return $status;
}


// Get GET out of here!
function verify_post() {
    global $prefix_token;
    global $suffix_token;

    if ($_SERVER["REQUEST_METHOD"] != "POST") {
        http_response_code(400);
        echo json_encode(array("Error" => "POST methods only."));
        exit(0);
    }

    if (
        isset($_POST["filename"]) 
        && (
            str_contains($_POST["filename"], $prefix_token) 
            || str_contains($_POST["filename"], $suffix_token)
        )
    ) {
        respond_error(
            "Filename Error", 
            "Cannot contain " . $prefix_token . " or " . $suffix_token, 
            400
        );
    }
}

function check_set($_array, $fields) {
    // error_log("Checking if " . print_r($fields, true) . " are in " . print_r($_array, true));
    foreach($fields as $field) {
        if (!isset($_array[$field])) {
            return false;
        }
    }
    return true;
}

function respond_error($key, $value, $code) {
    http_response_code($code);
    echo json_encode(array(
        $key => $value
    ));

    exit(0);

}