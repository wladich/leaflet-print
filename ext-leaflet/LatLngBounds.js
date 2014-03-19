L.LatLngBounds.prototype.getCenter = 
    function(){
        return L.latLng((this.getNorth() + this.getSouth()) / 2, 
                        (this.getEast() + this.getWest()) / 2 );
    }
