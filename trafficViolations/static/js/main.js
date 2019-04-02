// Main javascript file that will invoke all the function to populate the dashboard

// ########### Declare global variables
var submitBtn = d3.select("#filter-btn"); 
var clearBtn = d3.select("#clear-filter-btn"); 
// Grab a reference to the dropdown select element
var yrSel = d3.select("#years");
var distSel = d3.select("#district");
var catSel = d3.select("#category");

// default filter values
var _yr = 0, _cat = "all", _dist = 0;

var geoJsonlink = "static/db/geoLoc_alldist.json";

var map, mapTile, mapFeatures, legend;

// function that initiliazes the page
function init(){
    // populate the dropdown filters
    populateFilters();
    //attach event to submit buttons
    // associate event to the buttons
    submitBtn.on("click", function(){filterData();});
    clearBtn.on("click", function(){resetFilters();});

    //display leaflet map
    createMap(_yr,_cat,_dist);

    // Create 
}

init();

// Helper functions
function populateFilters() {    
    // Use the list of sample names to populate the select options
    d3.json("/filterData").then((filtData) => {
        console.log(filtData['Category']);
        filtData['Category'].forEach((item) => {
        catSel
          .append("option")
          .text(`${item['ViolationCategory']}`)
          .property("value", item['ViolationCategory']);
      });
      filtData['District'].forEach((item) => {
        distSel
          .append("option")
          .text(`${item['SubAgency']}`)
          .property("value", item['PoliceDistrictID']);
      });
      filtData['Year'].forEach((item) => {
        yrSel
          .append("option")
          .text(`${item['Year']}`)
          .property("value", item['Year']);
      });      
      
    });
  };

function filterData(){
    d3.event.preventDefault();
    var yr = yrSel.property("value");
    var cat = catSel.property("value");
    var dist = distSel.property("value");
    
    console.log(`${yr}, ${cat},${dist}`);

    
    // # call display map using filtered data
    addEdit_MapLayers(yr,cat,dist, "update");
};

function resetFilters(){
    d3.event.preventDefault();
    yrSel.selectAll("option").property("selected",function(d){ return d === 0; })
    catSel.selectAll("option").property("selected",function(d){ return d === "all"; })
    distSel.selectAll("option").property("selected",function(d){ return d === 0; })
    
    // redraw map features layer All data
    addEdit_MapLayers(_yr,_cat,_dist, "update");
};

function createMap(y,c,d){
    // Creating map object
        map = L.map("map", {
            center: [39.1547, -77.2405],
            zoom: 8.75
            // maxBounds:[[39.0000, -77.000],[40.1547, -79.2405]]
        });
        
        // Adding tile layer
        mapTile = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
            attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
            // bounds : [[39.1547, -77.2405],[39.1547, -77.2405]],
            maxZoom: 18,
            id: "mapbox.light",
            accessToken: API_KEY
        }).addTo(map);

        // Add a feature layer with grey outline of all the district
        d3.json(geoJsonlink).then(function(data) {
            
            mapFeatures = L.geoJson(data, {
            //
                style: function(feature) {
                    return {
                    fillcolor: "#0099cc",
                    color:"#999999",
                    // 
                    //   fillColor: chooseColor(feature.properties.density),
                    fillOpacity: 0.5,
                    weight: 1.5
                    };
                }
            }).addTo(map);
            
            
            })

        addEdit_MapLayers(y,c,d, "add");

}

function addEdit_MapLayers(y, c, d, mode="add"){
    //    If updating the map, remove the layer before update
        if(mode === "update"){
            map.removeLayer(mapFeatures);
            legend.remove();
        }
        // // 
        d3.json(`/distMap/${y}/${c}/${d}`).then(function(data) {
             
            data.features.map( d => {
                d.properties.total_traffic_violations = +d.properties.total_traffic_violations;
            });
            console.log(data); 
            mapFeatures = L.choropleth(data, {

                // Define what  property in the features to use
                valueProperty: "total_traffic_violations",
            
                // Set color scale
                scale: ["#ffffb2", "#0099cc"],
            
                // Number of breaks in step range
                steps: 7,
            
                // q for quartile, e for equidistant, k for k-means
                mode: "q",
                style: {
                  // Border color
                  color: "#fff",
                  weight: 1,
                  fillOpacity: 0.8
                },
            // 
            onEachFeature: function(feature, layer) {
                // 
                layer.on({
                // 
                mouseover: function(event) {
                    layer = event.target;
                    layer.setStyle({
                    fillOpacity: 0.9
                    });
                },
                // 
                mouseout: function(event) {
                    layer = event.target;
                    layer.setStyle({
                    fillOpacity: 0.5
                    });
                },
                
                });
                //
                layer.bindPopup(feature.properties.name + "<br> Violation count:" + 
                feature.properties.total_traffic_violations);
        
            }
            }).addTo(map);
            
            if(data.features.length !== 1){
                    // Set up the legend
                    legend = L.control({ position: "topright" });
                    legend.onAdd = function() {
                        var div = L.DomUtil.create("div", "legend");
                        var limits = mapFeatures.options.limits;
                        var colors = mapFeatures.options.colors;
                        var labels = [];

                        // Add min & max
                        var legendInfo = "";

                        div.innerHTML = legendInfo;
                        labels.push(`<li class = "labels min">${limits[0]}</li>`)
                        limits.forEach(function(limit, index) {
                        labels.push("<li style=\"background-color: " + colors[index] + "\"></li>");
                        });
                        labels.push(`<li class = "labels max">${limits[limits.length - 1]}</li>`)
                        
                        div.innerHTML += "<ul>" + labels.join("") + "</ul>";
                        // div.innerHTML += 
                        // "<div>" +
                        //     "<span class=\" labels min\">" + limits[0] + "</span>" +
                        //     "<ul>" + labels.join("") + "</ul>" +
                        //     "<span class=\"labels max\">" + limits[limits.length - 1] + "</span>" +
                        // "</div>";
                        return div;
                    };

                    // Adding legend to the map
                    legend.addTo(map);
                    // legend.bringToBack();
            }
            
        });
  
}