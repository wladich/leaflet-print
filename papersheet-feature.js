L.PaperSheet = L.FeatureGroup.extend({
    initialize: function(latlng, options){
        this.options = options;
        this._rect = L.rectangle([[0,0], [1,1]], {color: "#ff7800", weight: 1});
        var icon = L.divIcon({className: "paper-sheet-label", html: options.label});
        this._marker = L.marker(latlng, {icon: icon,  draggable: true,
            contextmenu: true,
            contextmenuItems: [
            {
                text: 'Rotate',
                callback: this.rotate.bind(this)
            }, {separator: 1, text: 'Hi'}, {
                text: 'Delete',
                callback: this.remove.bind(this)
            }]
        });
        this._marker.on('drag', this._updatePositionFromMarker, this);
        this._marker.on('click', this.rotate, this)
        L.FeatureGroup.prototype.initialize.call(this, [this._rect, this._marker]);
    },

    
    addTo: function(map){
        this._map = map;
        map.addLayer(this);
        this._map.on('zoomend', this._updatePositionFromMarker, this);        
        this._updatePositionFromMarker();
    },
    
    
    remove: function() {
        this.fire('remove', {target: this});
    }, 
    
    removeFrom: function() {
        this._map.off('zoomend', this._updatePositionFromMarker);
        this._map.removeLayer(this);
        this._map = undefined;
    },
    
    setLabel: function(label){
        this._marker._icon.innerHTML = label;
    },
    
    rotate: function(){
        this.options.rotated = !this.options.rotated;
        this._updatePositionFromMarker();
    },
    
    setPaperSize: function(width, height){
        this.options.paper_width = width;
        this.options.paper_height = height;
        this._updatePositionFromMarker();
    },
  
    setMapScale: function(scale){
        this.options.map_scale_denominator = scale;
        this._updatePositionFromMarker();
    },
    
    getLatLngBounds: function() {
        var latlng = this.getCenter();
        var x = latlng.lng;
        var y = latlng.lat;
        var paper_width = this.options.rotated ? this.options.paper_height : this.options.paper_width;
        var paper_height = this.options.rotated ? this.options.paper_width : this.options.paper_height;
        var width = paper_width * this.options.map_scale_denominator / 1000 / 111319.49 / Math.cos(y * Math.PI / 180);
        var height = paper_height * this.options.map_scale_denominator / 1000 / 111319.49;
        var latlng_sw = [y - height / 2, x - width / 2];
        var latlng_ne = [y + height / 2, x + width / 2];
        return L.latLngBounds([latlng_sw, latlng_ne]);
    },

    _updatePositionFromMarker: function(){
        if (this._map) {
            var sheet_lat_lng_bounds = this.getLatLngBounds();
            this._rect.setBounds(sheet_lat_lng_bounds);
            var pixel_size = this._map.latLngBoundsToSizeInPixels(sheet_lat_lng_bounds);
            var label = this._marker._icon;
            label.style.width = pixel_size.x + 'px';
            label.style.marginLeft = -pixel_size.x/2 + 'px';
            label.style.height = pixel_size.y + 'px';
            label.style.marginTop = -pixel_size.y / 2 + 'px';
            label.style.lineHeight = pixel_size.y  + 'px';
            label.style.fontSize = Math.min(pixel_size.y / 2, 250) + 'px';
            return
        }
    },

    getCenter: function() {
        return this._marker.getLatLng();
    },

    getSizeInPixels: function(zoom) {
        var sheet_lat_lng_bounds = this.getLatLngBounds();        
        var pixel_size = this._map.boundsToSizeInPixels(sheet_lat_lng_bounds, zoom);
        return pixel_size;
    },
    
    isRotated: function(){
        return !!this.options.rotated;
    }
});

