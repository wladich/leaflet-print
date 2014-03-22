L.Mixin.HashState = {
    enableHashState: function(key, defaults) {
        this._hash_state_key = key;
        var obj = this._eventsSource ? this[this._eventsSource] : this;
        for (var i=0; i < this.hashStateChangeEvents.length; i++)
            obj.on(this.hashStateChangeEvents[i], this._updateHashState, this);
        window.hashState.on(key, this._updateObjectState.bind(this));
        var state = window.hashState.getState(key);
        if (!this._unserializeState(state)){
            this._unserializeState(defaults);
            this._updateHashState();
        };
        
    },
    
    _updateObjectState: function(values){
        if (!this._unserializeState(values))
            this._updateHashState()
    },
    
    _updateHashState: function(e){
        if (this._updating_state)
            return
        var state = this._serializeState(e);
        window.hashState.updateState(this._hash_state_key, state);
    },
}

L.Map.include(L.Mixin.HashState);

L.Map.include({
    hashStateChangeEvents: ['moveend'],
    
    _serializeState: function() {
        var center = this.getCenter();
        var zoom = this.getZoom();
        var precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));
        state = [
            zoom,
            center.lat.toFixed(precision),
            center.lng.toFixed(precision),
        ];
       return state;
    },
    
    _unserializeState: function(values) {
        if (!values || values.length != 3)
            return false;
        var zoom = parseInt(values[0]),
            lat  = parseFloat(values[1]),
            lng  = parseFloat(values[2]);
        if (isNaN(zoom) || isNaN(lat) || isNaN(lng))
            return false;
        this._updating_state = true;
        this.setView([lat, lng], zoom);
        this._updating_state = false;        
        return true;
    }
});

L.Control.Layers.include(L.Mixin.HashState);

L.Control.Layers.include({
    hashStateChangeEvents: ['baselayerchange', 'overlayadd', 'overlayremove'],
    _eventsSource: '_map',
    
    _serializeState: function(e){
        state = [];
        for (var layer_id in this._map._layers){
            var layer = this._map._layers[layer_id];
            var isControlled = layer_id in this._layers;
            var isOverlay = isControlled && this._layers[layer_id].overlay;
            var isStale = isControlled && e && e.type == 'baselayerchange' && !isOverlay && layer != e.layer;
            if (isControlled && !isStale)
                state.push(layer_id);
        };
        return state;
    },
    
    _unserializeState: function(values){
        if (!values || values.length == 0)
            return false
        var new_layers = [];
        for (var i=0; i < values.length; i++){
            var layer_id = parseInt(values[i]);
            if (layer_id in this._layers) 
                new_layers.push(layer_id);
            };
        if (new_layers.length) {
            for (var layer_id in this._map._layers)
                this._map.removeLayer(this._map._layers[layer_id])
            for (var i=0; i < new_layers.length; i++)
                this._map.addLayer(this._layers[new_layers[i]].layer)
            return true;
        };
    }
});
