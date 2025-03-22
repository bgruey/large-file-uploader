

window.BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;
var kb_size = 1024;
var mb_size = kb_size * kb_size;

var success_codes = [200, 201, 202];

class biQ {
    // from the handler's perspective
    in = []
    out = []

    async getin() {
        while(true) {
            let e = this.in.shift()
            // console.log("get in", e)
            if (e == null) {
                await new Promise(r => setTimeout(r, 200));
                continue
            }
            return e
        }

    }

    async getout() {
        while(true) {
            let e = this.out.shift()
            // console.log("Sleeping for getout")
            if (e == null) {
                await new Promise(r => setTimeout(r, 200));
                continue
            }
            return e
        }
    }

    putin(e) {
        this.in.push(e)
    }

    putout(e) {
        this.out.push(e)
    }
}

var SENTINAL = "SENTINAL"


async function uploader(q, filename, file_version, ) {
    let data = {
        "filename": filename,
        "file_version": file_version,
    }

    while (true) {
        e = await q.getin()
        if (e == SENTINAL) {
            // console.log("Sending sentinal")
            q.putout(SENTINAL)
            break
        }
        
        data["chunk"] = e["chunk"]
        data["index"] = e["index"]
        data["checksum"] = crc32Bytes(e["chunk"]);

        await upload_data(data, "chunk");
    }

}

// Do the POST for a chunk
async function upload_data(data, action) {

    var xhr_cached = new XMLHttpRequest();
    xhr_cached.open("POST", "/upload");

    return new Promise((resolve, reject) => {
      setTimeout(() => {

        xhr_cached.onload = async function () {
            if (success_codes.includes(this.status)) {
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
    ).catch(
        (error) => {
            console.log(error);
        }
    );
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
    let filename = file.name;

    let file_version = document.getElementById("file-version").innerHTML

    
    let chunk_index = 0;
    let chunk_size = 1 * mb_size;
    var bytes_array = []
    var bytes_so_far = 0;
    // console.log("Streaming file now");
    let q = new biQ();
    let n_uploaders = 20;
    let max_messages = 50;
    for (i = 0; i < n_uploaders; i++) {
        uploader(q, filename, file_version);
    }

    for await (const chunk of file.stream()) {
        bytes_array = bytes_array.concat(Array.from(chunk))
        if (bytes_array.length < chunk_size) {
            continue
        }
        // console.log("placing chunk ", chunk_index, " in q with length ", q.in.length);

        q.putin({
            "chunk": bytes_array,
            "index": chunk_index
        })
        chunk_index += 1;

        while (q.in.length > max_messages) {
            // console.log("sleeping 0.05 s")
            await new Promise(r => setTimeout(r, 50));
        }
        bytes_so_far += bytes_array.length;
        update_progress_promises(bytes_array.length)
        bytes_array = [];
    }

    q.putin({
        "chunk": bytes_array,
        "index": chunk_index
    })
    update_progress_promises(bytes_array.length)
    chunk_index += 1;
    // console.log("Sending sentinals")
    for (i = 0; i < n_uploaders; i++) {
        // wait for all to finish and send sentinals
        q.putin(SENTINAL);
    }

    for (i = 0; i < n_uploaders; i++) {
        // wait for all to finish and send sentinals
        await q.getout()
    }

    let data = {
        "filename": filename,
        "file_version": file_version,
        "total_chunks": chunk_index
    }
    r = await upload_data(data, "finish");
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

async function update_progress_promises(len_bytes) {

    let file_size_td = document.getElementById("filesize"); 
    let uploaded_td = document.getElementById("uploaded-mb");

    let file_size_mb = Number(file_size_td.innerHTML);
    let uploaded_mb = Number(uploaded_td.innerHTML) + len_bytes / mb_size
    uploaded_td.innerHTML = String(uploaded_mb);

    percent = Math.round(1000.0 * uploaded_mb / file_size_mb) / 10;

    document.getElementById("progress").innerHTML = percent.toString() + " %";
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
        document.getElementById("filesize").innerHTML = file.size / mb_size;
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
