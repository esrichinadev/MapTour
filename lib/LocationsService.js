LocationsService.prototype = new EventTarget();
LocationsService.prototype.constructor = LocationsService;

function LocationsService() {

	var _arr = [];
	EventTarget.call(this);	

	// **********
	// methods...
	// **********

	this.process = function(csv) {
		var that = this;
		$.ajax({
		  type: 'GET',
		  url: csv,
		  cache: false,
		  success: function(text){ 
			parseCSV(text);	
			that.fire("complete")
		  }
		});	
		
	}

	this.getLocations = function() {
		return _arr;
	}
	
	// *****************
	// private functions
	// *****************

	parseCSV = function(text) {
		
	
		var name,thumbURL,url,description,color,pt,pms,attr,graphic;
		
		var lines = CSVToArray(text)
		var fields = lines[0];
		
		var values;
		
		for (var i = 1; i < lines.length; i++) {
			
			values = lines[i];
			if (values.length == 1) {
				break;
			}
	
			name = values[fields.indexOf("Name")];
			thumbURL = values[fields.indexOf("Thumb_URL")];
			url = values[fields.indexOf("URL")];
			description = values[fields.indexOf("Description")];
			color = values[fields.indexOf("Icon_color")];	
			pt = esri.geometry.geographicToWebMercator(
				new esri.geometry.Point(
					[values[fields.indexOf("Long")],values[fields.indexOf("Lat")]],
					new esri.SpatialReference({ wkid:4326}))
			);	
			if (color == 'B')
				pms = new esri.symbol.PictureMarkerSymbol("images/icons/blue/NumberIconB"+(i)+".png",22,28);			
			else
				pms = new esri.symbol.PictureMarkerSymbol("images/icons/red/NumberIcon"+(i)+".png",22,28);
				
			pms.setOffset(3,8);
			attr = {name:name,thumbURL:thumbURL,url:url,description:description,color:color};
			graphic = new esri.Graphic(pt,pms,attr);		
	
			_arr.push(graphic);
	
		}
		
	}
	
	
	// This will parse a delimited string into an array of
	// arrays. The default delimiter is the comma, but this
	// can be overriden in the second argument.
	// courtesy of Ben Nadel www.bennadel.com

	function CSVToArray( strData, strDelimiter ){
		// Check to see if the delimiter is defined. If not,
		// then default to comma.
		strDelimiter = (strDelimiter || ",");
		 
		// Create a regular expression to parse the CSV values.
		var objPattern = new RegExp(
		(
		// Delimiters.
		"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
		 
		// Quoted fields.
		"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
		 
		// Standard fields.
		"([^\"\\" + strDelimiter + "\\r\\n]*))"
		),
		"gi"
		);
		 
		 
		// Create an array to hold our data. Give the array
		// a default empty first row.
		var arrData = [[]];
		 
		// Create an array to hold our individual pattern
		// matching groups.
		var arrMatches = null;
		 
		 
		// Keep looping over the regular expression matches
		// until we can no longer find a match.
		while (arrMatches = objPattern.exec( strData )){
		 
		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[ 1 ];
		 
		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (
		strMatchedDelimiter.length &&
		(strMatchedDelimiter != strDelimiter)
		){
		 
		// Since we have reached a new row of data,
		// add an empty row to our data array.
		arrData.push( [] );
		 
		}
		 
		 
		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if (arrMatches[ 2 ]){
		 
		// We found a quoted value. When we capture
		// this value, unescape any double quotes.
		var strMatchedValue = arrMatches[ 2 ].replace(
		new RegExp( "\"\"", "g" ),
		"\""
		);
		 
		} else {
		 
		// We found a non-quoted value.
		var strMatchedValue = arrMatches[ 3 ];
		 
		}
		 
		 
		// Now that we have our value string, let's add
		// it to the data array.
		arrData[ arrData.length - 1 ].push( strMatchedValue );
		}
		 
		// Return the parsed data.
		return( arrData );
	}
 	
}

