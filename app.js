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
        addVoronoi(data);
    }

    //
    function generateClusters(data) {

        var clusterThreshold = 200;
        var clusters = [];

        data.forEach(addToCluster);

        return clusters;

        function addToCluster(point) {
            var converted = convert(point);
            findAndInsertNearCluster(converted);
        }

        function convert(point) {
            return {
                data: point,
                coords: map.latLngToLayerPoint([point.latitude, point.longitude])
            }
        }


        function findAndInsertNearCluster(point) {

            for (var i = 0; i < clusters.length; i++) {
                var clusterCenter = clusters[i].center;
                var distance = getDistance(clusterCenter, point.coords);

                if (isNaN(distance)) return;

                if (distance < (clusterThreshold - clusters[i].points.length * 2 )) {
                    clusters[i].points.push(point);
                    //clusters[i].center = getCenter(clusters[i].points);
                    return;
                }
            }

            clusters.push({
                points: [point],
                center: point.coords
            });
        }


    }

    function addVoronoi(sourceData) {

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

            var data = generateClusters(sourceData);

            log(data.length)

            //ピクセルポジション情報保存用
            var positions = [];

            // 位置情報→ピクセルポジション変換
            // Location information → pixel position conversion
            data.forEach(function(d) {
                //var latlng = new L.LatLng(d.latitude, d.longitude);
                positions.push(d.center);
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
            minX = (arr[i].coords.x < minX || minX == null) ? arr[i].coords.x : minX;
            maxX = (arr[i].coords.x > maxX || maxX == null) ? arr[i].coords.x : maxX;
            minY = (arr[i].coords.y < minY || minY == null) ? arr[i].coords.y : minY;
            maxY = (arr[i].coords.y > maxY || maxY == null) ? arr[i].coords.y : maxY;
        }
        return {
            x: (minX + maxX) /2,
            y: (minY + maxY) /2
        };
    }

    function getDistance(pt1, pt2) {
        return Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.x, 2));
    }
}

)();