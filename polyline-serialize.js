(function(window){
	"use strict";
	function sign(x) {
		return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
	}

	function quantize(x) {
		return Math.round(x * 10000);
	}

	function restore(x) {
		return x / 10000;
	}

	function packPolyline(points) {
		if (!points || !points.length) {
			return null;
		}
		var stream = [];
		var x, y, dx, dy, sx, sy, ddx, ddy;
		x = quantize(points[0].lng + 180);
		stream.push(x & 0xff);
		stream.push((x >> 8) & 0xff);
		stream.push((x >> 16) & 0xff);
		y = quantize(points[0].lat + 180);
		stream.push(y & 0xff);
		stream.push((y >> 8) & 0xff);
		stream.push((y >> 16) & 0xff);

		sx = quantize(points[0].lng);
		sy = quantize(points[0].lat);
		for (var i = 1; i < points.length; i++) {
			x = points[i].lng;
			y = points[i].lat;
			dx = quantize(x - restore(sx));
			dy = quantize(y - restore(sy));
			sx += dx;
			sy += dy;
			while (dx < -127 || dx > 127 || dy < -127 || dy > 127) {
				if (Math.abs(dx) > Math.abs(dy)) {
					ddx = sign(dx) * 127;
					ddy = ddy = dy * ddx / dx;
				} else {
					ddy = sign(dy) * 127;
					ddx = dx * ddy / dy;
				}
				dx -= ddx;
				dy -= ddy;
				stream.push(ddx + 127);
				stream.push(ddy + 127);
			}
			stream.push(dx + 127);
			stream.push(dy + 127);
		}
		var encoded = arrayToString(stream);
		return encodeSafeBase64(encoded);
	}

	function unpackPolyline(s) {
		var sx, sy, dx, dy, x, y;
		var points = [];
		try {
			s = decodeSafeBase64(s);
		} catch (e) {
			return null;
		}
		s = stringToArray(s);
		sx = s[0] + (s[1] << 8) + (s[2] << 16);
		sy = s[3] + (s[4] << 8) + (s[5] << 16);
		x = restore(sx) - 180;
		y = restore(sy) - 180;
		points.push({lat: y, lng: x});
		for (var i=6; i < s.length; i+=2) {
			dx = s[i];
			dy = s[i + 1];
			sx += dx - 127;
			sy += dy - 127;
			x = restore(sx) - 180;
			y = restore(sy) - 180;
			points.push({lat: y, lng: x});
		}
		return points;
	}

	window.packPolyline = packPolyline;
	window.unpackPolyline = unpackPolyline;

})(window);