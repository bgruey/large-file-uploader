
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

/*
    Create a crc32 for the entire file by reading read_size,
    then skipping forward skip_size.

    The crc32 of the read bytes is alternately added to or subtracted
    from the total, which starts at zero.
*/
async function crc32_file(file, read_size, skip_size) {
    let pos = 0;
    let total = 0;
    let add = true;
    cur = 0;
    
    for await (const bytes of read_file_bytes(file, read_size, skip_size)) {
        cur = crc32Bytes(bytes);

        if (add) {
            total += cur
        } else {
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
