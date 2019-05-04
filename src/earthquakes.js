// *** On lit le dataset earthquake de l'USGS et on transforme les données en features
d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson", function(earthquakeData) {
    createFeatures(earthquakeData.features);
});


// *** Fonction permettant d'avoir des points visibles sur la carte (mise à l'échelle)
function getSize(mag) {
    if(mag >= 10)
        return mag*100000;
    else if(mag >= 9)
        return mag*90000;
    else if(mag >= 8)
        return mag*80000;
    else if(mag >= 7)
        return mag*70000;
    else if(mag >= 6)
        return mag*60000;
    else if(mag >= 5)
        return mag*50000;
    else if(mag >= 4)
        return mag*40000;
    else if(mag >= 3)
        return mag*30000;
    else if(mag >= 2)
        return mag*20000;
    else if(mag >= 1)
        return mag*10000;
    else
        return mag*5000;
};


// *** Fonction qui récupère le pays dans la chain de caractère obtenue via usgs.gov/earthquakes
function getPays(chaine)
{
    var pays = chaine.split(', ');
    return pays[pays.length - 1];
}


// *** Fonction permettant de créer les points sur la carte
function createFeatures(earthquakeData) {

    var earthquakes = L.geoJSON(earthquakeData,{
        // Requêtes SPARQL
        onEachFeature: function(feature, layer){
            var url = "http://dbpedia.org/sparql";
            var query = [
             "PREFIX dbo: <http://dbpedia.org/ontology/>",
             "SELECT DISTINCT ?label ?capital ?flag ?leader ?wiki",
             "WHERE {",
                "?country a dbo:Country.",
                "?country rdfs:label ?label.",
                "OPTIONAL { ?country dbo:capital ?capital. }",
                "OPTIONAL { ?country dbo:thumbnail ?flag. }",
                "OPTIONAL { ?country dbo:leader ?leader. }",
                "OPTIONAL { ?country foaf:isPrimaryTopicOf ?wiki. }",
                "FILTER NOT EXISTS { ?country dbo:dissolutionYear ?yearEnd }.",
                "FILTER langMatches(lang(?label), 'en').",
             "}"
            ].join(" ");

            // var query = [
            //  "PREFIX dbo: <http://dbpedia.org/ontology/>",
            //  "SELECT DISTINCT ?label ?capital ?flag ?governmentType ?leader ?governmentType ?leader ?wiki",
            //  "WHERE {",
            //     "?country a dbo:Country.",
            //     "?country rdfs:label ?label.",
            //     "?country dbo:capital ?capital.",
            //     "?country dbo:thumbnail ?flag.",
            //     "?country dbo:governmentType ?governmentType.",
            //     "?country dbo:leader ?leader.",
            //     "?country dbo:governmentType ?governmentType.",
            //     "?country dbo:leader ?leader.",
            //     "?country foaf:isPrimaryTopicOf ?wiki.",
            //     "FILTER NOT EXISTS { ?country dbo:dissolutionYear ?yearEnd.",
            //     "FILTER langMatches(lang(?label), 'en').",
            //  "}"
            // ].join(" ");

            var queryUrl = url+"?query="+ encodeURIComponent(query) +"&format=json";

            // Affichage des govups de description des lieux
            $.ajax({
                dataType: "json",
                url: queryUrl,
                success: function(data) {
                    let results = data.results.bindings;

                    var country; var cap; var flag; var gov; var leader; var wiki;
                    for (var i in results) {
                        country = results[i].label.value;
                        // Si le lieu récupéré via la requete SPARQL correspond au lieu sur la carte
                        if(country === getPays(feature.properties.place))
                        {
                            flag = results[i].flag.value;
                            wiki = results[i].wiki.value;
                            leader = results[i].leader.value.replace("http://dbpedia.org/resource/", "");
                            cap = results[i].capital.value.replace("http://dbpedia.org/resource/", "");
                            break;
                        }
                        // Cas des USA à part car getPays(feature.properties.place) renvoie le nom de l'état plutôt que celui du pays
                        else if(country === "United States") {
                            flag = results[i].flag.value;
                            wiki = results[i].wiki.value;
                            leader = results[i].leader.value.replace("http://dbpedia.org/resource/", "");
                            cap = results[i].capital.value.replace("http://dbpedia.org/resource/", "");
                        }
                    }

                    layer.bindPopup("<h3> Magnitude : "+ feature.properties.mag +
                    "</h3><h3>Location : " + feature.properties.place +
                    "</h3><h3><img src='" + flag + "' alt='flag' width='75' height='50' />"+
                    "</h3><h3>Country : " + country +
                    "</h3><h3>Capital : " + cap +
                    "</h3><h3>VIP : " + leader +
                    "</h3><h3><a href='"+ wiki +"'>" + wiki + "</a>" +
                    "</h3><hr /><h3>" + new Date(feature.properties.time) + "</h3>" );
                }
            });

        },

        // Création des points
        pointToLayer: function(feature, latlng){
            return new L.circle(latlng,
                { radius: 2*getSize(feature.properties.mag),
                    color: 'red',
                    fillColor: 'tomato',
                    fillOpacity: .8
                })
            }
        });

        // Création de la carte avec tous les points
        createMap(earthquakes);
    };


    // *** Fonction permettant la création de la carte
    function createMap(earthquakes) {

        // Chargement de la carte mapbox.run-bike-hike qui sera affichée en fond
        let mapboxUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
        let accessToken = 'pk.eyJ1IjoiY2FwMDE1NzAwIiwiYSI6ImNqZng1ZjBhbjQxMWozM21kZzkzNW1kdjAifQ.VdaKJu8FPaDob9yWS4kTSw';
        let outdoorsmap = L.tileLayer(mapboxUrl, {id: 'mapbox.run-bike-hike', maxZoom: 20, accessToken: accessToken});


        // Création de la carte (centrée sur la France)
        var myMap = L.map("map-id", {
            center: [48.866667, 2.333333],
            zoom: 2,
            layers: [outdoorsmap, earthquakes]
        });

    }
