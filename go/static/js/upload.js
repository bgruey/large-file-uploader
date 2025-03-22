

window.BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;
var kb_size = 1024;
var mb_size = kb_size * kb_size;
// var chunksize = 1 * mb_size; 

var success_codes = [200, 201, 202];

// Not sure if the cached request object helped at all.
// Might need to look into pipelining and server config
// to use a persistent connection, else network congestion dips
var xhr_cached = null;

// Do the POST for a chunk
async function upload_data(chunk, checksum, filename, file_version, action, chunk_index) {
    if (!xhr_cached) {
        xhr_cached = new XMLHttpRequest();
        xhr_cached.abort();
    }
    xhr_cached.open("POST", "/upload");
    //xhr_cached.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let data = {
            "chunk": chunk,
            "checksum": checksum,
            "index": chunk_index,
            "filename": filename,
            "file_version": file_version,
        };

        if (action == "finish") {
            data["total_chunks"] = chunk_index
        }
        

        xhr_cached.onload = function () {
            if (success_codes.includes(this.status)) {
                // Success
                resolve(this.response);
            } else if(this.status == 422) {
                console.log("Checksum mistmatch, implement retry");
                reject({
                    status: this.status,
                    statusText: this.statusText,
                    response: this.response
                });
            } else {
                console.log("Error");
                console.log(data);
                let d = {
                    status: this.status,
                    statusText: this.statusText,
                    response: this.response
                };
                console.log(d);
                reject(d);
            }
        };

        xhr_cached.onerror = function () {
            reject({
                status: this.status,
                statusText: this.statusText
            });
        };
        xhr_cached.send(JSON.stringify(data));

      }, 30);
    }).then(
        (response) => {
            return JSON.parse(response);
        }
    ).catch(error => {
        console.log(error);
    });
}

async function get_bytes(chunk) {
    var bytes = []
    for await (const ch of chunk.stream()) {
        bytes = bytes.concat(Array.from(ch));
    }
    return bytes
}

// Do when button clicked
async function upload_in_chunks() {
    let file = document.getElementById("fileToUpload").files[0];
    let filesize = file.size;
    let filename = file.name;

    let file_version = document.getElementById("file-version").innerHTML

    let chunk, checksum, start, speed, ratio_done, time_left, percent;

    
    let chunk_index = 0;
    let chunk_size = 1 * mb_size;
    let pos = chunk_index * chunk_size;

    while (pos < filesize) {

        // chunk = await file.slice(pos, pos+chunk_size);
        bytes_array = await get_bytes(file.slice(pos, pos+chunk_size));
        console.log(chunk_size, bytes_array.length);
        
        checksum = crc32Bytes(bytes_array);

        start = Date.now();
        r = await upload_data(bytes_array, checksum, filename, file_version, "chunk", chunk_index);
        //console.log(chunk_index, r)
        chunk_index += 1;
        // in seconds
        speed = chunk_size / ((Date.now() - start) / 1000.0);

        ratio_done = pos / filesize;
        time_left = filesize * (1.0 - ratio_done) / speed;
        percent = Math.round(1000 * ratio_done) / 10;
        
        update_progress(percent, time_left, Math.round(speed / mb_size));
        
        pos += chunk_size;
        
    }
    r = await upload_data("", 0, filename, file_version, "finish", chunk_index);
    update_progress(100, 0, "zoom!");
}

// Tell user things are occuring
function update_progress(percent, time_left, mb_speed) {
    // one decimal point
    let unit = " minutes";
    let rounded_time_left = Math.round(10 * time_left / 60.0) / 10;
    if (rounded_time_left < 1.0) {
        rounded_time_left *= 60;
        unit = " seconds";
    }
    document.getElementById("remaining").innerHTML = rounded_time_left.toString() + unit;
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
        // get a checksum-ish value for 5kb of every 10mb of file.
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

var crc32Bytes = function(bytes) {
    var crcTable = window.crcTable || (window.crcTable = makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < bytes.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

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
        if (add) {
            total += cur
        }
        else {
            total -= cur;
        }
        pos += skip_size;
        add = !add;
    }

    if (total < 0) {
        total = -total;
    }
    return total;
}
