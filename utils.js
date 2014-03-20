function get(url){
    return new Promise(function(resolve){
        var xhr = new XMLHttpRequest();
        xhr.timeout = 10000;
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onreadystatechange = function(e){
            if (this.readyState == 4){
                resolve(this);
            }
        }
        xhr.send();
    });
}
function checkImage(s){
    return  (s.substring(0, 4) == '\x89PNG' && s.substring(s.length-8) == 'IEND\xae\x42\x60\x82') || 
            (s.substring(0, 2) == '\xff\xd8' && s.substring(s.length-2) == '\xff\xd9')
}

function later(time, f, ctx, args) {
    return new Promise(function(resolve){
        setTimeout(function(){
            resolve(f.apply(ctx, args));
        }, time)
    })
}

function loadImage(url){
    // TODO: handle errors other then 404 (500, 403)
    // TODO: Limit retries number
    return get(url).then(function(req){
        if (req.status == 200) {
            if (req.response.length === 0) {
                console.log('Retrying', url);
                return loadImage(url);
            }
            var arr = new Uint8Array(req.response);
            var raw = String.fromCharCode.apply(null,arr);
            if (!checkImage(raw)) {
                console.log('Retrying', url);
                return loadImage(url);
            } 
            var image = new Image();
            return new Promise(function(resolve){
                image.onload=function(){
                    resolve(image);
                };
                image.src = 'data:image/png;base64,' + btoa(raw);
            });
            return image;
        } else if (req.status == 404) {
            return null
        } else {
            console.log('Retrying', url);
            return later(1000, loadImage, null, [url]);
        }
    });
}

function format(tpl,o) {
    for(var key in o)
        {
            if(o.hasOwnProperty(key))// prevent iteration on any prototype inherited methods
                tpl = tpl.replace('{'+key+'}',o[key]);
        }
    return tpl;
}


function downloadFile(fileName, mimeType, data){
    var length = data.length;
    var array = new Uint8Array(new ArrayBuffer(length));
    for (var i = 0; i < length; i++) {
        array[i] = data.charCodeAt(i);
    };
    blob = new Blob([array], {type: mimeType});
    saveAs(blob, fileName);
}

