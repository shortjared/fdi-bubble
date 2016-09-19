

/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
function bubbleChart() {

  // Constants for sizing
  var width = 940;
  var height = 600;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 2 };

  var regionCenters = {
    "Americas": { x: width / 3, y: height / 2.5 },
    "Europe": { x: width / 2, y: height / 2.5 },
    "Asia": { x: 2 * width / 3, y: height / 2.5 },
    "Africa": { x: width / 3 - 40, y: height / 1.5 },
    "Oceania": { x: 2 * width / 3 + 30, y: height / 1.5 }
  };

  // X locations of the year titles.
  var regionsTitleX = {
    "Americas": width / 3 - 100,
    "Europe": width / 2,
    "Asia": 2 * width / 3 + 100,
    "Africa": width / 3 - 100,
    "Oceania": 2 * width / 3 + 100
  };

  var regionsTitleY = {
    "Americas": 40,
    "Europe": 40,
    "Asia": 40,
    "Africa": height / 1.4,
    "Oceania": height / 1.4
  };

  // Used when setting up force and
  // moving around nodes
  var damper = 0.102;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  // Charge is negative because we want nodes to repel.
  // Dividing by 8 scales down the charge to be
  // appropriate for the visualization dimensions.
  function charge(d) {
    return -Math.pow(d.radius, 2.0) / 8;
  }

  // Here we create a force layout and
  // configure it to use the charge function
  // from above. This also sets some contants
  // to specify how the force layout should behave.
  // More configuration is done below.
  var force = d3.layout.force()
    .size([width, height])
    .charge(charge)
    .gravity(-0.01)
    .friction(0.9);


  // Nice looking colors - no reason to buck the trend
  var fillColor = d3.scale.ordinal()
    .domain(['Americas', 'Europe', 'Asia', 'Africa', 'Oceania'])
    .range(['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494']);

  // Sizes bubbles based on their area instead of raw radius
  var radiusScale = d3.scale.pow()
    .exponent(0.5)
    .range([2, 85]);

  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    
    var myNodes = rawData.map(function (d) {
      return {
        id: d.id,
        radius: radiusScale(+d.value),
        value: d.value,
        name: d.country,
        group: d.region,
        year: d.year,
        region: d.region,
        world_bank: d.group,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    d3.select(selector).select("svg").remove();
    // Use the max value in the data as the max in the scale's domain
    // note we have to ensure the value is a number by converting it
    // with `+`.
    // 

    var maxAmount = d3.max(rawData, function (d) { return +d.value; });
    radiusScale.domain([0, maxAmount]);

    nodes = createNodes(rawData);
    // Set the force's nodes to our newly created nodes array.
    force.nodes(nodes);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)
      .attr('fill', function (d) { return fillColor(d.group); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set initial layout to single group.
    if(currentState == "split") {
      splitBubbles();
    }
    else {
      groupBubbles();
    }
  };

  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    hideYears();

    force.on('tick', function (e) {
      bubbles.each(moveToCenter(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();

    currentState = "grouped";
  }

  /*
   * Helper function for "single group mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it toward the center of
   * the visualization.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToCenter(alpha) {
    return function (d) {
      d.x = d.x + (center.x - d.x) * damper * alpha;
      d.y = d.y + (center.y - d.y) * damper * alpha;
    };
  }

  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubbles() {
    showYears();

    force.on('tick', function (e) {
      bubbles.each(moveToRegions(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();

    currentState = "split";
  }

  /*
   * Helper function for "split by year mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it the year center for that
   * node.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToRegions(alpha) {
    return function (d) {
      var target = regionCenters[d.region];
      d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
      d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
    };
  }

  /*
   * Hides Year title displays.
   */
  function hideYears() {
    svg.selectAll('.year').remove();
  }

  /*
   * Shows Year title displays.
   */
  function showYears() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var yearsData = d3.keys(regionsTitleX);
    var years = svg.selectAll('.year')
      .data(yearsData);

    years.enter().append('text')
      .attr('class', 'year')
      .attr('x', function (d) { return regionsTitleX[d]; })
      .attr('y', function (d) { return regionsTitleY[d]; })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }


  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content = '<span class="name">Country: </span><span class="value">' +
                  d.name +
                  '</span><br/>' +
                  '<span class="name">Amount: </span><span class="value">$' +
                  addCommas(d.value) +
                  ' million</span><br/>' +
                  '<span class="name">Year: </span><span class="value">' +
                  d.year +
                  '</span>';
    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.group)).darker());

    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   * displayName is expected to be a string and either 'year' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'region') {
      splitBubbles();
    } else {
      groupBubbles();
    }
  };

  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function displayIn(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('#toolbar .button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Toggle between in and out stock
 */
function setupTypeButtons() {
  d3.select('#type')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('#type .button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      // 
      

      if(buttonId == "out") {
        dataset = datasetOut;
      }
      else {
        dataset = datasetIn;
      }
      currentDataset = dataset;

      myBubbleChart('#vis', dataset[currentYear]);
    });
}

/*
 * Toggle between years
 */
function setupYearButtons() {
  d3.select('#years')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('#years .button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var year = button.attr('id');

      dataset = currentDataset;
      currentYear = year;
      myBubbleChart('#vis', dataset[year]);

    });
}

/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }

  return x1 + x2;
}

// Load the data.
// d3.csv('data/fdi-in.csv', display);

// var datasetIn, datasetOut, dataset;

// Stock in is our default data set
// d3.csv("data/fdi-in.csv", function(data) {
//   datasetIn = data;
//   dataset = datasetIn;
//   console.log(dataset);
//   myBubbleChart('#vis', datasetIn);
// });

// d3.csv("data/fdi-out.csv", function(data) {
//   datasetOut = data;
// });


// Define our global dataset variables.
var dataset;
var datasetIn = {2000:[], 2005:[], 2010:[], 2014:[]};
var datasetOut = {2000:[], 2005:[], 2010:[], 2014:[]};
var defaultDataset = datasetOut;
var currentDataset = datasetOut;
var defaultYear = 2014;
var currentYear = 2014;
var currentState = "grouped";

// Get our google spreadsheet
var public_spreadsheet_url = 'https://docs.google.com/spreadsheets/d/1pVWQNwnHbEex4ycocZ_GqvDHY77l4slytcGaTpWwraE/pubhtml?gid=1343412411&single=true';
$(document).ready( function() {
  Tabletop.init( { key: public_spreadsheet_url,
                   callback: showInfo,
                   wanted: [ "In-stock", "Out-stock" ],
                   debug: true } )
});

function showInfo(data, tabletop) {
  
  $.each( tabletop.sheets("In-stock").all(), function(i, row) {
    Object.keys(datasetIn).forEach(function(key){
      if(row.value) {
        datasetIn[key].push({
          region: row.region,
          id: row.id,
          country: row.country,
          value: row.value,
          group: row.group,
          year: key,
          gni: row.gni
        });
      }
    });
  });

  $.each( tabletop.sheets("Out-stock").all(), function(i, row) {
    Object.keys(datasetOut).forEach(function(key){
      if(row.value) {
        datasetOut[key].push({
          region: row.region,
          id: row.id,
          country: row.country,
          value: row.value,
          group: row.group,
          year: key,
          gni: row.gni
        });
      }
    });
  });

  dataset = defaultDataset;
  myBubbleChart('#vis', dataset[defaultYear]);
}


// setup the buttons.
setupButtons();
setupTypeButtons();
setupYearButtons();