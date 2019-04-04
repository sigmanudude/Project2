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

    // Create bar plot of the violation by district and further dynamically filtered by year, district and category
    plotViolByDist(_yr,_cat,_dist);

    boxPlot_byYr();

    buildCharts();
}

init();

// Helper functions
function plotViolByDist(y,c,d){
    d3.json(`/violationByDist/${y}/${c}/${d}`).then(function(data){
        // console.log(data);
        var xVal = data.map(x => x.XValue);
        var yVal = data.map(y => +y.YValue);
        
        var trace1 = {
            x : xVal,
            y : yVal,
            text: yVal.map(y => y.toString()),
            textposition: 'auto',
            type : "bar"
        };
        data = [trace1];
        var lyt = {
            // title : "Violations by District",
            xaxis : {title : "District ID", tickangle : -45},
            yaxis : {title : "Violation Count", 
                    range:[Math.min.apply( Math, yVal), Math.max.apply( Math, yVal )]},
            font: {size: 10}
        };
        Plotly.newPlot("distSpread", data, lyt,{displayModeBar: false, responsive: true});

    });
};

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function boxPlot_byYr(){
    d3.json(`/boxPlot`).then(function(pltdata){
        // console.log(pltdata)
        var yr = pltdata.map(r => +r.Year)
        var unqYr = yr.filter( onlyUnique )
        // console.log(unqYr);
        // declare data array for box plots
        data = [];
        unqYr.map(yr => {
            data.push({"y" : pltdata.filter(function(r){
                            return +r.Year === yr;
                        }).map(c => +c.Cnt), 
                        "type": "box",
                        "name" : yr.toString()
                });
        });
        console.log(data);

        var layout = {
            // title: 'Variance of Mean of Violation over years',
            autosize: false,
            margin: {
                l: 5,
                r: 5,
                b: 100,
                t: 50,
                pad: 4
            },
            font:{size:10},
            // autosize:true,
            showlegend:false
          };
        Plotly.newPlot("boxWhisker", data, layout,{displayModeBar: false, responsive: true});
    });
};

function populateFilters() {    
    // Use the list of sample names to populate the select options
    d3.json("/filterData").then((filtData) => {
        // console.log(filtData['Category']);
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
    //redo the plot
    plotViolByDist(yr,cat,dist);
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
            zoom: 9
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
            console.log(data)
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
            // console.log(data); 
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
function buildCharts() {
    d3.json(`/distContribYOY`).then((data) => {
      var SubAgency = data.map(sub => sub.Qtr + "-" + sub.Year);
      var ViolationCount = data.map(total => +total.Total_ViolationCount);
      var Year = data.map(y => +y.Year);
  console.log(data);
      // Build a Bubble Chart
trace1 = {
    x: SubAgency,
    y: ViolationCount,
    opacity: 0.75,
    type: 'bar'
};

data = [trace1];
layout = {barmode: 'overlay'};
Plotly.plot('boxPlot', {
  data: data,
  layout: layout
});


// Plotly.newPlot('boxPlot', data, layout);
  
    //   Plotly.plot("boxPlot", bubbleData, bubbleLayout);
    });
}

