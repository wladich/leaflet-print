L.Map.prototype.boundsToSizeInPixels = function(bounds, zoom) {
    var p1 = this.project(bounds[0], zoom);
    var p2 = this.project(bounds[1], zoom);
    var pixel_width = p2.x - p1.x;
    var pixel_height = p1.y - p2.y;
    return [pixel_width, pixel_height];
}

L.Map.prototype.makeRectangleImage = function(width_px, height_px, center, zoom, target_width, target_height, progress){
    //// Get tile urls
    var container = L.DomUtil.create('div', 'offscreen-map', document.body);
    container.style.width = width_px + 'px';
    container.style.height = height_px + 'px'; 
    var temp_map = new L.Map(container, {fadeAnimation: false, zoomAnimation: false, inertia: false});
    temp_map.setView(center, zoom, {animate: false});
    var mosaic = new Mosaic(width_px, height_px, progress);

    var layers_tiles_urls = [];
    var layers_support_cors = [];
    
    Object.keys(this._layers).sort().forEach(
        function(k){
            var layer = this._layers[k];
            if (layer.clone && layer.getTilesInfo){
                var layer_copy = layer.clone();
                temp_map.addLayer(layer_copy);
                var layer_tiles = layer_copy.getTilesInfo()
                layers_tiles_urls.push(layer_tiles);
                layers_support_cors.push(layer.options.supports_cors);
            }
        }.bind(this));
    return Promise.all(layers_tiles_urls).then(
        function(layers_tiles_urls){
            document.body.removeChild(container);
            for (var i=0; i < layers_tiles_urls.length; i++) {
                var tile_urls = layers_tiles_urls[i];
                console.log(tile_urls);
                if (tile_urls) {
                    tile_urls.forEach(function(tile_info){
                        var url = tile_info[0];                
                        var x = tile_info[1];   
                        var y = tile_info[2];
                        var tile_size = tile_info[3];
                        if (x > -tile_size && y > -tile_size && x < width_px && y < height_px) {
                            if (!layers_support_cors[i]) {
                                url = 'http://www.corsproxy.com/' + url.replace(/^https?:\/\//, '');
                            }
                            console.log(url);
                            progress(0, 1);
                            mosaic.putImage(url, x, y, tile_size);
                        }
                    });
                }
            };
            return mosaic.getData(target_width, target_height);
    });
}

