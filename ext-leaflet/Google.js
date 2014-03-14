L.Google.include({

    clone: function(){
        return new L.Google(this._type, this.options);
    },

    getTilesInfo: function(){
        var container = this._container;
        function getUrls(){
            var tiles_info = [];
            var map_rect = container.getBoundingClientRect();
            var imgs = container.getElementsByTagName('img');
            
            for (var i=0; i < imgs.length; i++){
                var img = imgs[i];
                if (img.style && img.style.getPropertyValue('width') == '256px' && img.style.getPropertyValue('height') == '256px'){
                    var img_rect = img.getBoundingClientRect();
                    var img_rel_left = img_rect.left - map_rect.left;
                    var img_rel_top  = img_rect.top - map_rect.top;
                    var url = img.src;
                    if (url.indexOf('transparent.png') == -1){
                        tiles_info.push([url, img_rel_left, img_rel_top, 256]);
                    }
                }
            }
            return tiles_info;
        } 

        var this_ = this;
        return new Promise(
            function(resolve){
                google.maps.event.addListenerOnce(this_._google, "tilesloaded", function(){ 
                    console.log('GOOGLE READY');
                    resolve(getUrls()) 
                });
            }
        );
    },

    getMaxZoomAtPoint: function(latlng){
        if (this._type == 'SATELLITE' || this._type == 'HYBRID') {
            return new Promise(function(resolve, reject) {
                var maxZoomService = new google.maps.MaxZoomService();
                maxZoomService.getMaxZoomAtLatLng(
                    new google.maps.LatLng(latlng.lat, latlng.lng),
                    function(response){
                        if (response.status == google.maps.MaxZoomStatus.OK) {
                            resolve(response.zoom);
                        } else {
                            reject('Failed to get info about max zoom level for Google Sattelite layer');
                        }
                    });
                });
        } else {
            return Promise.from(18);
        }
    }

});
