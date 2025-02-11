<?php


if($_SERVER["REQUEST_METHOD"] != "POST") {
    die("post only.");
}

$chunk_name = $_FILES["chunk"]["tmp_name"];
$chunk = 0;
if ($_FILES["chunk"]["size"] > 0) {
    $chunk = file_get_contents($chunk_name);
}

// file version is a cheap hash of the file, which should allow simultaneous
// uploads of filenames, such as Library.zip. Unless collsiion on the
// very sketchy implementation of crc32 on some of the file bits.
// See client js.
$checksum = $_POST["checksum"];
$file_version = $_POST["file_version"];
$filename = $file_version . "-" . $_POST['filename'];

// This should be handled by the size/length of data,
// but I haven't gotten around to sorting out how js and php deal with
// zero length.
$finished = $_POST["finished"];

$part_filename = $filename . ".part";

$upload_dir = "/tmp/uploads/";
// Create target dir
if (!file_exists($upload_dir)) {
	@mkdir($upload_dir);
}

$filepath = $upload_dir . $filename;
$part_filepath = $upload_dir . $part_filename;

if($finished == "true") {
    $ret = rename($part_filepath, $filepath);
}
else {
    $ret = file_put_contents($part_filepath, $chunk, FILE_APPEND);
}
