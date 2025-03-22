
function round(num, digits) {
    tens = 1;
    for (i = 0; i < digits; i++) {
        tens *= 10;
    }

    return Math.round(tens * num) / tens;
}


async function update_progress_promises(len_bytes) {

    let file_size_td = document.getElementById("filesize"); 
    let uploaded_td = document.getElementById("uploaded-mb");

    let file_size_mb = Number(file_size_td.innerHTML);
    let uploaded_bytes = Number(uploaded_td.innerHTML) * mb_size + len_bytes;
    let uploaded_mb = round(uploaded_bytes / mb_size, 1);
    uploaded_td.innerHTML = String(uploaded_mb);

    percent = round(100.0 * uploaded_bytes / (file_size_mb * mb_size), 1);

    document.getElementById("progress").innerHTML = percent.toString() + " %";
}


// Hold horses and get some info
async function update_file_info() {
    let upload_button = document.getElementById("submit-btn");
    upload_button.disabled = true;
    upload_button.innerHTML = "checking file";

    let file = document.getElementById("fileToUpload").files[0];
        
    if (file) {
        // get a file id in case of name repeats on server
        // Read 10 kb of every 50 mb
        let file_version = await crc32_file(file, 10 * kb_size, 50 * mb_size);
        // round to 2 decimal points
        let file_size = round(file.size / mb_size, 1);
        
        document.getElementById("filename").innerHTML = file.name;
        document.getElementById("filesize").innerHTML = file_size;
        document.getElementById("file-version").innerHTML = file_version.toString();
    }
    upload_button.innerHTML =  "Upload";
    upload_button.disabled = false;
}
