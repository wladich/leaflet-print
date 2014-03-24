"use strict";
var Mosaic = L.Class.extend({
    initialize: function(width, height, progress) {
        this.canvas = L.DomUtil.create('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.images = [];
        this.images_xy = [];
        this.progress = progress;
    },
    
    putImage: function(href, x, y, size) {
        var this_ = this;
        this.images.push(loadImage(href).then(
            function(res){
                this_.progress(1, 0);
                return res;
            }
        ));
        this.images_xy.push([x, y, size]);
    },
    
    getData: function() {
        return Promise.all(this.images).then(
            function(images){
                var ctx = this.canvas.getContext('2d');
                console.log('Received images', images.length);
                for (var i=0; i < images.length; i++){
                    var image = images[i];
                    if (image != null) {
                        console.log('Image complete', image.complete);
                        var xy = this.images_xy[i];
                        ctx.drawImage(image, xy[0], xy[1], xy[2], xy[2]);
                    } else {
                        console.log('Image null');
                    }
                }
                return this.canvas;
            }.bind(this)
        );
    }
    //FIXME: remove canvas from DOM
}); 

