getTempMap = function(width, height, center, zoom) {
    var container = L.DomUtil.create('div', 'offscreen-map', document.body);
    container.style.width = width + 'px';
    container.style.height = height + 'px'; 
    var map = new L.Map(container, {fadeAnimation: false, zoomAnimation: false, inertia: false});
    map.setView(center, zoom, {animate: false});
    return new Promise(
        function(resolve){
            map.whenReady(function(){resolve(map)});
        });
}

disposeMap = function(map){
    var container = map.getContainer();
    container.parentNode.removeChild(container);
}

layerSupportsMosaicing = function(layer) {
    return layer.getTilesInfo !== undefined;
}


makeLayerRectangleImage = function(layer, ll_bounds, zoom, progress){
    var src_pixel_size = layer._map.latLngBoundsToSizeInPixels(ll_bounds, zoom);
    var center = ll_bounds.getCenter();
    console.log('Using zoom ', zoom);
    return getTempMap(src_pixel_size.x, src_pixel_size.y, center, zoom).then(
        function(temp_map){
            var layer_copy = layer.clone();
            temp_map.addLayer(layer_copy);
            return layer_copy.getTilesInfo().then(
                function(tiles){
                    disposeMap(temp_map);
                    var tile_progress = function(n){
                        progress(n / tiles.length);
                    }
                    var mosaic = new Mosaic(src_pixel_size.x, src_pixel_size.y, tile_progress);
                    for (var i=0; i < tiles.length; i++) {
                        var tile = tiles[i];
                        var url = tile[0];                
                        var x = tile[1];
                        var y = tile[2];
                        var tile_size = tile[3];
                        if (x > -tile_size && y > -tile_size && x < src_pixel_size.x && y < src_pixel_size.y) {
                            if (layer.options.noCors) {
                                url = 'http://proxy.wladich.tk/' + url.replace(/^https?:\/\//, '');
                            };
                            mosaic.putImage(url, x, y, tile_size);
                        }
                    };
                    return mosaic.getData();
                }
            );
        }
    )
};

combineImages = function(images, width, height) {
    var canvas = L.DomUtil.create('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.rect(0, 0, width, height);
    ctx.fillStyle="white";
    ctx.fill();       
    for (var i=0; i < images.length; i++) {
        ctx.drawImage(images[i], 0, 0, width, height);                
    }
    return canvas
}

canvasToData = function(canvas){
    var data = canvas.toDataURL("image/jpeg");
    data = data.substring(data.indexOf(',') + 1);
    data = atob(data);
    return data;
};

calcLayerDisplayedZooms = function(layer, ll_bounds, requested_zoom){
    var probes = [
         ll_bounds.getCenter(), 
         ll_bounds.getNorthEast(), 
         ll_bounds.getNorthWest(), 
         ll_bounds.getSouthEast(), 
         ll_bounds.getSouthWest()].map(layer.getMaxZoomAtPoint.bind(layer));
    return Promise.all(probes).then(
        function(res){
            console.log('Available zooms: ', res);
            var displayed_zooms = {};
            res.forEach(function(zoom){
                var zoom2 = Math.min(zoom, requested_zoom);
                displayed_zooms[zoom2] = true;
            })
            displayed_zooms = Object.keys(displayed_zooms).sort();
            console.log(displayed_zooms);
            return displayed_zooms;
        })
}

makeMapRectangleImage = function(map, ll_bounds, zooms, strict_zoom, target_width, target_height, progress){
    var layers = [];
    var layer_ids = Object.keys(map._layers).sort();
    for (var i=0; i<layer_ids.length; i++){
        var layer = map._layers[layer_ids[i]];
        if (layerSupportsMosaicing(layer)){
            var zoom = layer.options.scaleDependent ? zooms[1] : zooms[0];
            progress(null, 1);
            var layer_promise;
            if (strict_zoom)
                layer_promise = Promise.from([zoom]);
            else
                layer_promise = calcLayerDisplayedZooms(layer, ll_bounds, zoom);
            layer_promise = layer_promise.then(
                function(){
                    var layer_ = layer;
                    return function(displayed_zooms){
                        var layer_levels = [];
                        for (var j=0; j < displayed_zooms.length; j++){
                            layer_levels.push(makeLayerRectangleImage(layer_, ll_bounds, displayed_zooms[j], progress));
                        }
                        return Promise.all(layer_levels);
                    }
                }()
            );
            layers.push(layer_promise);
        }
    }
    return Promise.all(layers).then(
        function(layer_groups){
            var images = layer_groups.reduce(function(a, b){return a.concat(b)});
            var data = canvasToData(combineImages(images, target_width, target_height));
            return {width: target_width, height: target_height, data: data}
        }
    );
}

