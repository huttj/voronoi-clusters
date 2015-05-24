(function () {

    var log = function log() {
        var stack;
        try {
            throw new Error();
        } catch (e) {
            stack = e.stack.split('\n')[2].match(/\s+at\s+(.+)/)[1] + ':\n\t';
        }
        var args = Array.prototype.slice.call(arguments);
        args.unshift(stack);
        console.log.apply(console, args);
    };

    var map, layer;


    // Load data
    $.ajax({
        url: 'data.json',
        type: "get",
        success: decorateMap,
        dataType: "json"
    });

    // the map
    (function drawMap(data){

        map = L.map('map');

        // Use the setView method to set the lat/long and zoom of your map
        // syntax: VARIABLE.setView([LATITUDE, LONGITUDE], ZOOM)
        map.setView([47.6097, -122.3331], 10);

        // Create an OpenStreetMap tile layer variable using their url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
        // syntax: var LAYER_VARIABLE = L.tileLayer('URL')
        layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png').addTo(map);

    })();

    function decorateMap(data) {
        // generateClusters
        var markers = generateClusters(data);

        // addVoronoi
        addVoronoi(markers);
    }

    //
    function generateClusters(data) {

        var markers = new L.MarkerClusterGroup({
            maxClusterRadius: 100
        });

        var i = data.length - 1;
        while (i--) {
            markers.addLayer(new L.Marker(getLatLng(data[i])));
        }

        //... Add more layers ...
        map.addLayer(markers);

        function getLatLng(point) {
            return [point.latitude, point.longitude];
        }

        return markers;
    }

    function addVoronoi(markers) {

        map.on("viewreset moveend", update);

        // オーバーレイレイヤ追加
        map._initPathRoot();
        var svg = d3.select("#map").select("svg");
        var g = svg.append("g").attr("class", "leaflet-zoom-hide");;


        //ボロノイジェネレーター
        var voronoi = d3.geom.voronoi()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; });



        update();


        function update() {

            var data = getPointsFromClusters(markers);

            //ピクセルポジション情報保存用
            var positions = [];

            // 位置情報→ピクセルポジション変換
            // Location information → pixel position conversion
            data.forEach(function(d) {
                var latlng = new L.LatLng(d.latitude, d.longitude);
                positions.push({
                    x :map.latLngToLayerPoint(latlng).x,
                    y :map.latLngToLayerPoint(latlng).y
                });
            });


            // 前サークルを削除
            // Remove before Circle
            d3.selectAll('.AEDpoint').remove();

            // サークル要素を追加
            // Add Circle element
            var circle = g.selectAll("circle")
                .data(positions)
                .enter()
                .append("circle")
                .attr("class", "AEDpoint")
                .attr({
                    "cx":function(d, i) { return d.x; },
                    "cy":function(d, i) { return d.y; },
                    "r":2,
                    fill:"red"
                });


            // ボロノイ変換関数
            // Voronoi conversion function
            var polygons = voronoi(positions);

            polygons.forEach(function(v) { v.cell = v; });

            // 前ボロノイPathを削除
            // Before remove the Voronoi Path
            svg.selectAll(".volonoi").remove();

            // Add path element
            svg.selectAll("path")
                .data(polygons)
                .enter()
                .append("svg:path")
                .attr("class", "volonoi")
                .attr({
                    "d": function(d) {
                        if(!d) return null;
                        return "M" + d.cell.join("L") + "Z";
                    },
                    stroke:"black",
                    fill:"none"
                });

        }
    }

    function getPointsFromClusters(markers) {
        log(markers);

        var clusters = [];

        forIn(markers._gridClusters, function(cluster) {
            var verts = [];
            forIn(cluster._objectPoint, function(vert) {
                log(vert);
                verts.push([vert.x, vert.y]);
            });
            clusters.push(verts);
        });

        var points = clusters.map(getCenter);

        //forIn(markers._gridUnclustered, function(point) {
        //    point = point._objectPoint;
        //    points.push([point.x, point.y]);
        //});

        log(points);

        return points;
    }


    function forIn(obj, fn) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                fn(obj[key]);
            }
        }
    }

    function getCenter(arr){
        var minX, maxX, minY, maxY;
        for(var i=0; i< arr.length; i++){
            minX = (arr[i][0] < minX || minX == null) ? arr[i][0] : minX;
            maxX = (arr[i][0] > maxX || maxX == null) ? arr[i][0] : maxX;
            minY = (arr[i][1] < minY || minY == null) ? arr[i][1] : minY;
            maxY = (arr[i][1] > maxY || maxY == null) ? arr[i][1] : maxY;
        }
        return [(minX + maxX) /2, (minY + maxY) /2];
    }
}

)();