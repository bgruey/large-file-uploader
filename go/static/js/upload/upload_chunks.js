

function get_token() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    let file_version = document.getElementById("file-version").innerHTML;
    let filename = document.getElementById("fileToUpload").files[0].name;

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/token");

    let data = {
        "username": username,
        "password": password,
        "file_version": file_version,
        "file_name": filename
    };

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            xhr.onload = async function () {
                if (this.status == 201) {
                    resolve(this.response);
                } else {
                    reject({
                        status: this.status,
                        statusText: this.statusText,
                        response: this.response
                    });
                }
            };

            xhr.onerror = function() {
                reject({
                    status: this.status,
                    response: this.response
                });
            };

            xhr.send(JSON.stringify(data));
        }, 30);
    }).then(
        (resonse) => {
            return JSON.parse(resonse)
        }
    ).catch(
        (error) => {
            console.log(error)
        }
    );
}

// Do when button clicked
async function upload_in_chunks() {

    reset_progres();

    let r = await get_token();
    let token = r["token"];

    let file = document.getElementById("fileToUpload").files[0];
    let filename = file.name;

    let file_version = document.getElementById("file-version").innerHTML

    let chunk_index = 0;
    let chunk_size = 5 * mb_size;
    var bytes_so_far = 0;
    let q = new biQ();
    let n_uploaders = 5;
    let max_messages = 25;
    for (i = 0; i < n_uploaders; i++) {
        uploader(q, filename, file_version, token);
    }

    for await (const chunk of read_file_bytes(file, chunk_size, 0)) {
        q.putin({
            "chunk": chunk,
            "index": chunk_index
        })
        chunk_index += 1;

        while (q.in.length > max_messages) {
            console.log("sleeping 0.05 s")
            await new Promise(r => setTimeout(r, 50));
        }
        bytes_so_far += bytes.length;
        update_progress_promises(bytes.length)
    }

    for (i = 0; i < n_uploaders; i++) {
        // wait for all to finish and send sentinals
        q.putin(SENTINAL);
    }

    for (i = 0; i < n_uploaders; i++) {
        // wait for all to finish and send sentinals
        await q.getout()
    }

    // Trigger server to assemble file
    let data = {
        "filename": filename,
        "file_version": file_version,
        "total_chunks": chunk_index,
        "token": token,
    }
    r = await upload_data(data);
}
