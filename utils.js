"use strict";
function get(url, responseType){
    return new Promise(function(resolve){
        var xhr = new XMLHttpRequest();
        xhr.timeout = 30000;
        xhr.open('GET', url);
        xhr.responseType = responseType;
        xhr.onreadystatechange = function(e){
            if (this.readyState == 4){
                resolve(this);
            }
        }
        xhr.send();
    });
}

function arrayBufferToString(arBuf) {
    var arr = new Uint8Array(arBuf);
    arr = Array.prototype.slice.call(arr);
    var s = [];
    var chunk;
    for (var i = 0; i < arr.length; i+=4096) {
        chunk = arr.slice(i, i + 4096);
        chunk = String.fromCharCode.apply(null,chunk);
        s.push(chunk);
    }
            
    return s.join('');
}


function readFile(file) {
     return new Promise(function(resolve){
         var reader = new FileReader();
         reader.onload = function (e) {
            resolve({name: file.name, data: e.target.result, isLocal: true});
         };
         reader.readAsArrayBuffer(file);
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
    return get(url, 'arraybuffer').then(function(req){
        if (req.status == 200) {
            if (req.response.length === 0) {
                console.log('Retrying', url);
                return loadImage(url);
            }
            var raw = arrayBufferToString(req.response);
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
    var blob = new Blob([array], {type: mimeType});
    saveAs(blob, fileName);
}

