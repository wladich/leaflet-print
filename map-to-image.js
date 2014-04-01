"use strict";
/* global L,Promise, Mosaic*/
function getTempMap(width, height, center, zoom) {
    var container = L.DomUtil.create('div', '', document.body);
    container.style.position = 'absolute';
    container.style.left = '20000px';
    container.style.width = width + 'px';
    container.style.height = height + 'px';
    var map = new L.Map(container, {fadeAnimation: false, zoomAnimation: false, inertia: false});
    map.setView(center, zoom, {animate: false});
    return new Promise(
        function(resolve){
            map.whenReady(function(){resolve(map);});
        });
}

function disposeMap(map){
    var container = map.getContainer();
    container.parentNode.removeChild(container);
}

function layerSupportsMosaicing(layer) {
    return layer.getTilesInfo !== undefined;
}


function makeLayerRectangleImage(layer, ll_bounds, zoom, progress){
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
                    };
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
                            }
                            mosaic.putImage(url, x, y, tile_size);
                        }
                    }
                    return mosaic.getData();
                }
            );
        }
    );
}

function combineImages(images, width, height) {
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
    return canvas;
}

function canvasToData(canvas){
    var data = canvas.toDataURL("image/jpeg");
    data = data.substring(data.indexOf(',') + 1);
    data = atob(data);
    return data;
}

function calcLayerDisplayedZooms(layer, ll_bounds, requested_zoom){
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
            });
            displayed_zooms = Object.keys(displayed_zooms).sort();
            console.log(displayed_zooms);
            return displayed_zooms;
        });
}

function makeMapRectangleImage(map, ll_bounds, zooms, strict_zoom, target_width, target_height, progress){
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
                        var layer_level_progress = function(n){
                            progress(n / displayed_zooms.length);
                        };
                        for (var j=0; j < displayed_zooms.length; j++){
                            layer_levels.push(makeLayerRectangleImage(layer_, ll_bounds, displayed_zooms[j], layer_level_progress));
                        }
                        return Promise.all(layer_levels);
                    };
                }()
            );
            layers.push(layer_promise);
        }
    }
    return Promise.all(layers).then(
        function(layer_groups){
            var images = layer_groups.reduce(function(a, b){return a.concat(b);});
            return combineImages(images, target_width, target_height);
        }
    );
}

function blendCanvas(src, dest) {
    var s_data = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    var d_image_data = dest.getContext('2d').getImageData(0, 0, src.width, src.height);
    var d_data = d_image_data.data;
    var data_length = s_data.length,
        sr, sg, sb, sa,
        dr, dg, db, da,
        l;
    for (var i=0; i < data_length; i += 4) {
        sa = s_data[i+3];
        if (sa) {
            sr = s_data[i];
            sg = s_data[i+1];
            sb = s_data[i+2];
            dr = d_data[i];
            dg = d_data[i+1];
            db = d_data[i+2];

            l = (dr + dg + db) / 3;
            l = l / 255 * 192 + 63;
            dr = sr / 255 * l;
            dg = sg / 255 * l;
            db = sb / 255 * l;

            d_data[i] = dr;
            d_data[i+1] = dg;
            d_data[i+2] = db;
        }
    }
    dest.getContext('2d').putImageData(d_image_data, 0, 0);
}

function drawTracks(width, height, ll_bounds, tracks, map, dpi) {
    var width_mm = 1,
        width_px = width_mm / 25.4 * dpi;
    var tracks_canvas = L.DomUtil.create('canvas');
    tracks_canvas.width = width;
    tracks_canvas.height = height;
    var ctx = tracks_canvas.getContext('2d');

    function draw_track(track){
        if (track.visible) {
            track.segments.forEach(
                function(segment){
                    draw_segment(segment, track.color);
                });
        }
    }
    function draw_segment(segment, color){
        var q = width / map.latLngBoundsToSizeInPixels(ll_bounds, 16).x;
        var origin = map.project(ll_bounds.getNorthWest(), 16);
        function trackPointToCanvasPixel(p){
            return map.project(p, 16)
                .subtract(origin)
                .multiplyBy(q);
        }
        if (segment.length > 1) {
            segment = segment.map(trackPointToCanvasPixel);
            var ctx = tracks_canvas.getContext('2d');
            ctx.globalAlpha = 1;
            ctx.lineWidth = width_px;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(segment[0].x, segment[0].y);
            for (var i=1; i < segment.length; i++) {
                ctx.lineTo(segment[i].x, segment[i].y);
            }
            ctx.stroke();
        }

        console.log(segment);
    }

    tracks.forEach(draw_track);
    var t = new Date().getTime();
    t = new Date().getTime() - t;
    return tracks_canvas;
}