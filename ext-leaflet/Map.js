L.Map.prototype.latLngBoundsToSizeInPixels = function(bounds, zoom) {
    var p1 = this.project(bounds.getSouthWest(), zoom);
    var p2 = this.project(bounds.getNorthEast(), zoom);
    var pixel_width = p2.x - p1.x;
    var pixel_height = p1.y - p2.y;
    return L.point(pixel_width, pixel_height, true);
}


