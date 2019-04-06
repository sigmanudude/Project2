// Main javascript file that will invoke all the function to populate the dashboard

// ########### Declare global variables
var submitBtn = d3.select("#filter-btn"); 
var clearBtn = d3.select("#clear-filter-btn"); 
// Grab a reference to the dropdown select element
var yrSel = d3.select("#years");
var distSel = d3.select("#district");
var catSel = d3.select("#category");

// grab instance of div to display data
var tblDiv = d3.select("#dataTbl");
var dataBtn = d3.select("#data-btn");
var pElement = d3.select("#pageDetails");
var prev = d3.select("#data-btn-prev");
var next = d3.select("#data-btn-next");
var last = d3.select("#data-btn-last");
var first = d3.select("#data-btn-first");
var distSumElement = d3.select("#distSum");

var startpg = 1, totalpg = 36, currpg = 1;

// default filter values
var _yr = 0, _cat = "all", _dist = 0;

// default values for district summary
distSummary = "<table class = 'table table-striped'><thead><tr><th>District #</th><th>Name</th><th>Violation Count</th></tr></thead>"

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
    dataBtn.on("click", function(){displayData(_yr,_cat,_dist,tblDiv, currpg);});
    prev.on("click", function(){displayData(_yr,_cat,_dist,tblDiv,currpg-1);});
    next.on("click", function(){displayData(_yr,_cat,_dist,tblDiv,currpg+1);});
    first.on("click", function(){displayData(_yr,_cat,_dist,tblDiv,startpg);});
    last.on("click", function(){displayData(_yr,_cat,_dist,tblDiv,totalpg);});

    //display leaflet map
    createMap(_yr,_cat,_dist);

    // Build all static plots
    YoY(); //YOY plot
    boxPlot_byYr();   //box plot    
    buildCharts();// contribution of district vs YOY change

    // Dashboard plots and data
    // Create bar plot of the violation by district and further dynamically filtered by year, district and category
    
    dynBarPlots(_yr,_cat,_dist,'violationByDist', "distSpread","Districts");
    dynBarPlots(_yr,_cat,_dist,'violationByCat', "violationCat","Categories");
   
}

init();

// Helper functions
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
            autosize: true,
            height:200,
            margin: {
                l: 5,
                r: 5,
                b: 20,
                t: 10,
                pad: 4
            },
            font:{size:10},
            
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
    dynBarPlots(yr,cat,dist, 'violationByDist', "distSpread", "Districts");
    dynBarPlots(yr,cat,dist,'violationByCat', "violationCat", "Categories");
    // dynBarPlots(yr,cat,dist,'violationByType', "violationType");
};

function resetFilters(){
    d3.event.preventDefault();
    yrSel.selectAll("option").property("selected",function(d){ return d === 0; })
    catSel.selectAll("option").property("selected",function(d){ return d === "all"; })
    distSel.selectAll("option").property("selected",function(d){ return d === 0; })
    
    // redraw map features layer All data
    addEdit_MapLayers(_yr,_cat,_dist, "update");

    // reset all barplots
    dynBarPlots(_yr,_cat,_dist, 'violationByDist', "distSpread", "Districts");
    dynBarPlots(_yr,_cat,_dist,'violationByCat', "violationCat","Categories");
    // dynBarPlots(_yr,_cat,_dist,'violationByType', "violationType");
};

function createMap(y,c,d){
    // Creating map object
        map = L.map("map", {
            center: [39.1547, -77.2405],
            zoom: 9,
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
            // reset the dist summary
            distSummary = "<table class = 'table table-striped'><thead><tr><th>District #</th><th>Name</th><th>Violation Count</th></tr></thead>"
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
                  fillOpacity: 0.9
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
                distSummary += `<tr><th>${feature.properties.distID}</th><td>${feature.properties.name}</td><td>${feature.properties.total_traffic_violations}</td></tr>`
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
            //    add html table for display summary
            console.log(distSummary);
            distSumElement.node().innerHTML ="";
               distSumElement.node().innerHTML = `<tbody>${distSummary}</tbody></table>`;
        });
  
}
function buildCharts() {
    d3.json(`/distContribYOY`).then((data) => {
 
        layout = {
            barmode: 'relative',
            autosize: true,
            height:330,
            margin: {
                l: 5,
                r: 5,
                b: 150,
                t: 10,
                pad: 4
            },
            font:{size:10},
            
            showlegend:true,
            legend:{x:0.2, y:-0.3, orientation:"h"},
            xaxis: {title:"Period", tickangle : -45}
        };
        Plotly.newPlot('boxPlot', data, layout, {displayModeBar: false, responsive: true}
        );


// Plotly.newPlot('boxPlot', data, layout);
  
    //   Plotly.plot("boxPlot", bubbleData, bubbleLayout);
    });
}

function dynBarPlots(y,c,d, route, plotDiv, xaxisLbl = ""){
    d3.json(`/${route}/${y}/${c}/${d}`).then(function(data){
        // console.log(data);
        
        var xVal = data.map(x => x.XValue).filter(onlyUnique);

        // Yvalue is based on the issue type
        //get uniq issue type
        var typ = data.map(r => r.Type);
        var unqType = typ.filter(onlyUnique);
        // console.log(unqType);

        // declare the trace_data
        var trace_data = [];

        unqType.map(function(t){
            // console.log(data.filter(d => {return d.Type === t}).map(c => c.YValue))
            trace_data.push({
                "x": xVal,
                "y": data.filter(d => {return d.Type === t}).map(c => Math.log2(+c.YValue)),
                "type":"bar",
                // "text" : data.filter(d => {return d.Type === t}).YValue.toString(),
                "width":0.3,
                "name":t
            })
        });

        console.log(trace_data);
        
        var lyt = {
            // title : "Violations by District",
            barmode: "stack",
            xaxis : {title : xaxisLbl, tickangle : -45},
            yaxis : {title : "Violation Count (log scale)"},
            font: {size: 10},
            autosize : true,
            height:300,
            width:375,
            margin :{
                l: 40,
                r: 5,
                b: 100,
                t: 50,
                pad: 4
            },
            showlegend:true,
            legend:{
                x:-0.1, y:-0.5, orientation:"h"
            }
        };
        Plotly.newPlot(plotDiv, trace_data, lyt,{displayModeBar: false, responsive: true});

    });
};


function YoY(){
    d3.json(`/YOYchange`).then(function(data){
         console.log(data);
        var xVal = data.map(x => x.Qtr + "-" + x.Year);
        var yVal = data.map(y => +y.Total_ViolationCount);
        var yVal2 = data.map(y => +y.YOY_Change_PCT);
        
        var trace1 = {
            x : xVal,
            y : yVal,
            text: yVal.map(y => y.toString()),
            textposition: 'auto',
            type : "line",
            name:"# of Violation ",
            opacity:1
        };

          var trace2 = {
            x : xVal,
            y : yVal2,
            yaxis: 'y2',
            text: yVal2.map(y => `${y.toString()} %`),
            textposition: 'auto',
            type : "bar",
            name:"YOY Change% ",
            opacity:0.8
        };

        data = [trace1, trace2];
        var lyt = {
            // title : "Traffic Violations and YoY growth",
            xaxis : {title : "Quarter", tickangle : -45, showline:true},
            yaxis : {title : "Traffic Violations", showline:true},
            yaxis2: {title : "YoY Change %", side: 'right', overlaying:"y", showline:true,
                     },
            font: {size: 10},
            autosize:true,
            height:300,
            margin:{
                l: 45,
                r: 45,
                b: 70,
                t: 0,
                pad: 4
            },
            showlegend:true,
            legend:{
                x:0.3, y:1.1, orientation:"h"
            }
            
        };
        Plotly.newPlot("YOYchange", data, lyt,{displayModeBar: false, responsive: true});

    });
};

function displayData(y,c,d,divElement,pg){
    d3.event.preventDefault();
    pg <= 0? pg = 1: pg > 36 ? pg = 36 : pg = pg;

    d3.json(`/dashboardData/${y}/${c}/${d}/${pg}`).then(function(data){
        // console.log(data.html);
        pElement.node().innerHTML = `Displaying page ${pg} of ${totalpg}`
        divElement.node().innerHTML = "";
        divElement.node().innerHTML = data.html;

    }); // end of JSON
};

