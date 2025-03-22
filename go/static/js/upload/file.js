
window.BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;
var kb_size = 1024;
var mb_size = kb_size * kb_size;

async function readSliceBytes(slice) {
    bytes = []
    for await (const chunk of slice.stream()) {
        bytes = bytes.concat(Array.from(chunk));
    }
    return bytes
}

async function* read_file_bytes(file, chunk_size, skip_size) {
    pos = 0;
    end = file.size;
    
    if (skip_size == 0) {
        skip_size = chunk_size;
    }

    var bytes = [];
    while (pos < end) {
        bytes = await readSliceBytes(file.slice(pos, pos + chunk_size));
        yield bytes;
        pos += skip_size;
    }

}
