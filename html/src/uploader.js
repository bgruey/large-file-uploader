

window.BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;
var kb_size = 1024;
var mb_size = kb_size * kb_size;
var chunksize = 1 * mb_size; 
// arguing with php docker containter settings
// 2mb is default

// Do the POST for a chunk
async function upload_data(data, checksum, filename, file_version, finished) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let xhr = new XMLHttpRequest();
        let send_data = new FormData();

        send_data.append("chunk", data);
        send_data.append("filename", filename);
        send_data.append("file_version", file_version);
        send_data.append("finished", finished);

        send_data.append("checksum", checksum);

        xhr.open("POST", "http://localhost/upload.php");

        xhr.onload = function () {
            if (this.status == 200) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };

        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send(send_data);

      }, 200);
    });
}

// Do when button clicked
async function upload_in_chunks() {
    console.log("Starting upload");
    let file = document.getElementById("fileToUpload").files[0];
    let filesize = file.size;
    let filename = file.name;

    let file_version = document.getElementById("file-version").innerHTML

    let pos = 0;
    
    let chunk, checksum, start, speed, ratio_done, time_left, percent;

    while (pos < filesize) {
        chunk = file.slice(pos, pos+chunksize);
        // console.log(await chunk.text());
        // checksum = crc32(await chunk.text());
        checksum = "pass";

        start = Date.now();
        await upload_data(chunk, checksum, filename, file_version, false);
        // in seconds
        speed = chunksize / ((Date.now() - start) / 1000.0);

        ratio_done = pos / filesize;
        time_left = filesize * (1.0 - ratio_done) / speed;
        percent = Math.round(1000 * ratio_done) / 10;
        
        update_progress(percent, time_left, Math.round(speed / mb_size));
        
        pos += chunksize;
        
        // console.log("Break in the while loop to upload for testing");
        // break;
    }
    let r = await upload_data("", "", filename, file_version, true);
    update_progress(100, 0, "zoom!");
}

// Tell user things are occuring
function update_progress(percent, time_left, mb_speed) {
    // one decimal point, in minutes
    document.getElementById("remaining").innerHTML = (Math.round(10 * time_left / 60.0) / 10).toString() + " minutes";
    document.getElementById("progress").innerHTML = percent.toString() + " %";
    document.getElementById("upload-speed").innerHTML = mb_speed.toString();
}

// Hold horses and get some info
async function update_file_info() {
    let upload_button = document.getElementById("submit-btn");
    upload_button.disabled = true;
    upload_button.innerHTML = "checking file";

    let file = document.getElementById("fileToUpload").files[0];
        
    if (file) {
        // get a checksum-ish value for 5kb of ever 10mb of file.
        let file_version = await crc32_file(file, 5 * kb_size, 10 * mb_size);
        // round to 2 decimal points
        let fileSize = (Math.round(file.size * 100 / mb_size) / 100).toString() + 'MB';
        
        document.getElementById("filename").innerHTML = file.name;
        document.getElementById("filesize").innerHTML = fileSize;
        document.getElementById("file-version").innerHTML = file_version.toString();
    }
    upload_button.innerHTML =  "Upload";
    upload_button.disabled = false;
}


/*
    Checksum code taken from: https://stackoverflow.com/a/18639999
    It does match php's crc32 function for the string "hello world".

    However, this requires blobs to be strings, so we need a similar call on the
    server side to do the same transformation of blob/binary/data to string, in order
    for the checksums to match.

    They do not.
*/

var makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

var crc32 = function(str) {
    var crcTable = window.crcTable || (window.crcTable = makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

/*
    Create a crc32 for the entire file by reading read_size,
    then skipping forward skip_size.

    The crc32 of the read bytes is alternately added to or subtracted
    from the total, which starts at zero.
*/
async function crc32_file(file, read_size, skip_size) {
    let pos = 0;
    let end = file.size;
    let total = 0;
    let add = true;
    cur = 0;
    while(pos < end) {
        cur = crc32(await file.slice(pos, pos + read_size).text());
        // console.log(cur, pos/mb_size, end/mb_size, read_size, skip_size)
        if (add) {
            total += cur
        }
        else {
            total -= cur;
        }
        pos += skip_size;
        add = !add;
    }
    return total;
}