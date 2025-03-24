

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

    async get_all_out() {
        var e = this.out.shift();
        let ret = [];
        while (e != null) {
            ret.push(e)
            e = this.out.shift();
        }
        return ret;
    }

    putin(e) {
        this.in.push(e)
    }

    putout(e) {
        this.out.push(e)
    }

    put_n_sentinals(n) {
        for (i = 0; i < n; i++) {
            this.putin(SENTINAL);
        }
    }
}

var SENTINAL = "SENTINAL"


async function uploader(q, filename, file_version, token) {
    let data = {
        "filename": filename,
        "file_version": file_version,
        "token": token,
    };

    await new Promise(r => setTimeout(r, 500));
    let ret = ""

    while (true) {
        e = await q.getin()
        if (e == SENTINAL) {
            q.putout(SENTINAL)
            break
        }
        
        data["chunk"] = e["chunk"]
        data["index"] = e["index"]
        data["checksum"] = crc32Bytes(e["chunk"]) + 1;

        ret = await upload_data(data, 0);
        console.log(" upload response ", ret);
        if (ret != "ok") {
            q.putout(ret);
        }
    }

}

// Do the POST for a chunk
async function upload_data(data, retries) {

    var xhr_cached = new XMLHttpRequest();
    xhr_cached.open("POST", "/upload");
    let max_retries = 3;

    return new Promise((resolve, reject) => {
      setTimeout(() => {

        xhr_cached.onload = async function () {
            if (success_codes.includes(this.status)) {
                resolve(this.response);
            } else if(this.status == 422) {
                if (retries < max_retries) {
                    console.log("Retrying ", retries);
                    return upload_data(data, retries + 1);
                } else {
                    console.log("Checksum mistmatch, out of retries");
                    reject({
                        status: this.status,
                        statusText: this.statusText,
                        response: this.response
                    });
                }

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
            console.log("then", response);
            return "ok";
        }
    ).catch(
        (error) => {
            console.log("catch", error);
            return "error";
        }
    );
}
