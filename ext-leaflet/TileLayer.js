L.TileLayer.include({
    clone: function(){
        return new L.TileLayer(this._url, this.options);
    },

    getTilesInfo: function(){
        var this_layer = this;
        function getUrls(){
            tile_urls = [];
            for (var k in this_layer._tiles) {
                var img = this_layer._tiles[k];
                tile_urls.push([img.src, img._leaflet_pos.x, img._leaflet_pos.y, img.width]);
            }
            return tile_urls;
        }
        
        return new Promise(
            function(resolve){
                this_layer.once('load', function(){
                    resolve(getUrls());
                });
            }
        );
    },

    getMaxZoomAtPoint: function(latlng) {
        return Promise.from(this.options.maxNativeZoom || this.options.maxZoom || this._map.options.maxZoom || 18);
    }
});
