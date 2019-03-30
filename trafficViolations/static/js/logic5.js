// Creating map object
var map = L.map("map", {
  center: [40.7128, -74.0059],
  zoom: 4
});

// Adding tile layer
L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.streets",
  accessToken: API_KEY
}).addTo(map);

var link = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

// // Function that will determine the color of a neighborhood based on the borough it belongs to
function chooseColor(density) {
  // switch (+density) {
  // case (density > 200):
  //   return "yellow";
  // case (density > 150):
  //   return "red";
  // case (density > 100):
  //   return "orange";
  // case (density > 75):
  //   return "green";
  // case (density > 50):
  //   return "purple";
  // default:
  //   return "black";
  // }
  // console.log(+density);
  density = +density;
  if(density > 200){
    return "yellow";
  }
  else if(density >100)
  {
    return "red";
  }
  else if(density >75)
  {
    return "orange";
  }
  else
  {
    return "purple";
  }
}

// // 
d3.json(link, function(data) {
  // 
  L.geoJson(data, {
    //
    style: function(feature) {
      return {
        color: "white",
        // 
        fillColor: chooseColor(feature.properties.density),
        fillOpacity: 0.5,
        weight: 1.5
      };
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
        // 
        click: function(event) {
          map.fitBounds(event.target.getBounds());
        }
      });
      //
      layer.bindPopup("<h1> State" + feature.properties.name + "</h1> <hr> <h2> Population Density:" + feature.properties.density + "</h2>");

    }
  }).addTo(map);
});
