

var success_codes = [200, 201, 202];

class biQ {
    // from the handler's perspective
    in = []
    out = []

    async getin() {
        while(true) {
            let e = this.in.shift()
            if (e == null) {
                await new Promise(r => setTimeout(r, 50));
                continue
            }
            return e
        }

    }

    async getout() {
        while(true) {
            let e = this.out.shift()
            if (e == null) {
                await new Promise(r => setTimeout(r, 50));
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

    await new Promise(r => setTimeout(r, 500));

    while (true) {
        e = await q.getin()
        if (e == SENTINAL) {
            q.putout(SENTINAL)
            break
        }
        
        data["chunk"] = e["chunk"]
        data["index"] = e["index"]
        data["checksum"] = crc32Bytes(e["chunk"]);

        await upload_data(data);
    }

}

// Do the POST for a chunk
async function upload_data(data) {

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
