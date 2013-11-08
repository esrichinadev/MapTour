
/***
 * 目前这个是最完整的版本，对任何Web地图中的图层，都可以自动检测含有图片的字段，然后以图片地图联动的方式展示出来：
 * 1、对于真正由arcgis server 托管的要素服务，在地图初始化的时候，只是读取服务属性信息，要素信息是异步加载的，对这种数据，在初始化的时候就开始查询
 * 以保证能够在初始化的时候获取到数据
 * 2、对于其他非arcgis server 托管的要素服务。比如csv，gpx图层，或者用户自定义的可编辑图层。数据是直接存储在response.item.itemData里的，
 * 而且map._layers里对应的子图层在初始化的时候就已经有要素信息了，对这种数据，直接就可以获取。
 * 3、网络kml文件，目前Online支持度不够 ，使用API无法加载Web地图中的KML文件
 * 
 */
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.map");
dojo.require("esri.arcgis.utils");
dojo.require("esri.tasks.query")
dojo.require("esri.dijit.Legend");
dojo.require("esri.dijit.Scalebar");

/******************************************************
***************** 配置参数 ****************
*******************************************************/

var TITLE = "A Walk on the High Line";
var BYLINE= "An early spring walking tour of New York City's popular new aerial park.";
//第一张图片
// var INTRO_PICTURE = "http://farm8.staticflickr.com/7062/6855356176_f7f5801fd5_b.jpg";
var INTRO_PICTURE = "";
var INTRO_NAME = "";

var INTRO_DESCRIPTION = "";  
var CSV_FILE = "locations.csv";
var BASEMAP_URL = "http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer";

var INITIAL_EXTENT = new esri.geometry.Extent({"xmin":-8573621,"ymin":4705444,"xmax":-8572546,"ymax":4706442,"spatialReference":{"wkid":102100}})

/******************************************************
***************** 配置参数结束 ******************
*******************************************************/

var LOADING_IMAGE = "images/ajax-loader_white.gif";

var _carousel;
var _crossFader;

var _dojoReady = false;
var _jqueryReady = false;

var _locations;
var _selected;

var _firstTime = true;
var _isLegacyIE = (navigator.appVersion.indexOf("MSIE 7.0") > -1) || (navigator.appVersion.indexOf("MSIE 8.0") > -1);

var configOptions;

var map;
var imgPath;
var imgName;
var imgDescription;


//确认Dojo和Jquery都加载后开始执行init
dojo.addOnLoad(function() {
	_dojoReady = true;
	if(_jqueryReady == true){
		init();	
		}
	});
	
  jQuery(document).ready(function() {
  	_jqueryReady = true;
  	if(_dojoReady){
		init();
  	}
  	});
 
function init() {
	 configOptions = {
      webmap : "dbd1c6d52f4e447f8c01d14a691a70fe",
      appid:'',
      theme:'chrome',
      title : "",
      subtitle : "",
      description:"",
      bingmapskey : bingmapskey,
      proxyurl:"",
      geometryserviceurl:"http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",
      sharingurl : portalDomain + "/sharing/content/items"
    };
	
	if(!configOptions.sharingurl){
		configOptions.sharingurl = "http://www.arcgis.com/sharing/contens/items";
	}
	esri.arcgis.utils.arcgisUrl = configOptions.sharingurl;
	
	var hrefObject = esri.urlToObject(document.location.href);
	if(hrefObject.query){
		var query = hrefObject.query;
		configOptions.webmap = query.webmap;
	} 
	if((!hrefObject.query) || (!configOptions.webmap)){
		alert("无法创建地图，没有web地图");
	}
	
	var mapDeferred = esri.arcgis.utils.createMap(configOptions.webmap,"map",{
		mapOptions:{
			wrapRound180:true,
			nav:false,
			slider:true
		},
		bingMapsKey:configOptions.bingmapskey,
		ignorePopups:false,
		geometryServiceURL:configOptions.geometryserviceurl
	});
	
	var resizeTimer;
	mapDeferred.addCallback(function(resp){
		map = resp.map;
		//在页面上显示基本的WebMap的信息
		showItemInfo(resp.itemInfo.item);
		//解析webmap中的图层，主要是有图像信息的图层
		initLayers(resp.map);
		// dojo.connet(resp.map,"onLayersAddResult",function(){
			// alert(theMap._layers.length);
			// alert(theMap.layerIds.length);
		// });
		
		// dojo.connect(map,"onLoad",function(theMap){
			// dojo.connect(dijit.byId("map"),"resize",function(){
				// clearTimeout(resizeTimer);
				// resizeTimer = setTimeout(function(){
					// map.resize();
					// map.rePostion();
				// },500);
			// });
		// });
		
		 dojo.connect(map,'onLoad', function(map) {
         	dojo.connect(dijit.byId('map'), 'resize', map,map.resize);
         });
		
		
	});
	
	
	
	
	mapDeferred.addErrback(function(error){
//		alert("加载地图失败！");
	});
	
 	if (!_jqueryReady) return;
	if (!_dojoReady) return;
	
	// _map = new esri.Map("map");
	// _map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(BASEMAP_URL));

	_crossFader = new CrossFader($("#cfader"),LOADING_IMAGE);
	return;	
	 
}

var hasImageName =false;
var fLayerNames = new Array();//存储Featurelayer的名称
var ctmfLyrNames = new Array();//自定义的featureLayer,只那些实际为csv,gpx等图层要素服务，他们没有Url
var currentIndex = 0;
var query = null;
	
function initLayers(theMap){
	var layer = null;
	for(var layerName in theMap._layers){
		layer = theMap._layers[layerName];
		//真实的要素服务，而 不是csv,gpx等，如果是CSV，GPX等图层，会直接加载，而有url 地址的，会延迟加载。
		if(layer instanceof esri.layers.FeatureLayer && layer.url){
			fLayerNames.push(layerName);
		}else if(layer instanceof esri.layers.FeatureLayer && !layer.url){
			ctmfLyrNames.push(layerName);
		}
	}
	
	if(fLayerNames.length>0){
		var currentLyrName = fLayerNames[currentIndex];
		query = new esri.tasks.Query();
		query.where = "1=1";
		//查询数量的目的在于确保每个要素都已经加载了。因为初始化的时候有可能FeatureLayer中的graphic还都没有加载
		theMap._layers[currentLyrName].queryFeatures(query,function(featureSet){
			console.log("layerName的 长度是"+featureSet.features.length);
			parseLayer(theMap._layers[currentLyrName],featureSet.features,true);
		});
		return;
	}
	if(ctmfLyrNames.length>0){
		var currentLyrName = ctmfLyrNames[currentIndex];
		parseLayer(theMap._layers[currentLyrName],theMap._layers[currentLyrName].graphics,false);
	}
	
	
}

function parseLayer(layer,graphics,isTrueFeatureLyr){
	var hasImage = false;
		/**GPX和CSV文件都以Feature Layer的方式存在，而且有graphics属性，就是地图上所显示的GraphicsLayer
		 * 
		 *以下至需要找到CSV格式的文件中的数据进行处理,暂时只处理第一个
		 * 
		 */
		// if(layer instanceof esri.layers.GraphicsLayer && layerName.indexOf("csv")>=0){
		// alert("layer.graphics.length="+layer.graphics.length+ "加载了吗"+layer.loaded);hasImage = false;
		console.log("layer.graphics.length="+graphics.length);
		_locations = graphics;
		if(graphics.length>0 && graphics[0].attributes){
			_selected = graphics[0];
			var attr = graphics[0].attributes;
			//判断这个图层里是否有属性是网络图片，确定网络图片的字段
			for(var attrName in attr){
				if((typeof attr[attrName] =="string" || attr[attrName] instanceof String) && attr[attrName].indexOf("http") ==0 && (attr[attrName].toLowerCase().indexOf("jpg")>0 || attr[attrName].toLowerCase().indexOf("png")>0 || attr[attrName].toLowerCase().indexOf("gif")>0)){
					INTRO_PICTURE = attr[attrName];
					imgPath = attrName;
					_crossFader.setSource(INTRO_PICTURE);
					hasImage = true;
					break;
				}
			}
			
			//找到图片名称的字段,也可能没有名称,那样的话就不显示了
			for(var attrName in attr){
				if((typeof attr[attrName] =="string" || attr[attrName] instanceof String) && (attrName.toLowerCase() == "name" || attrName == "名称" || (attr[attrName].indexOf("http") < 0 && (attr[attrName].toLowerCase().indexOf("jpg")>0 || attr[attrName].toLowerCase().indexOf("png")>0 || attr[attrName].toLowerCase().indexOf("gif")>0)))){
					imgName = attrName;
					imgDescription = attrName;
					_crossFader.setSource(INTRO_PICTURE);
					INTRO_NAME = INTRO_DESCRIPTION = attr[attrName];
					hasImageName = true;
					setPlacard(INTRO_NAME,INTRO_DESCRIPTION);
					break;
				}
			}
			
			//找到描述字段
			for(var attrName in attr){
				if((typeof attr[attrName] =="string" || attr[attrName] instanceof String) && (attrName.toLowerCase() == "description" || attrName == "描述")){
					imgDescription = attrName;
					INTRO_DESCRIPTION = attr[attrName];
					INTRO_NAME = INTRO_NAME || "";
					setPlacard(INTRO_NAME,INTRO_DESCRIPTION);
					break;
				}
			}
				
			if(hasImage){
				dojo.connect(layer, "onMouseOver", layer_onMouseOver);
				dojo.connect(layer, "onMouseOut", layer_onMouseOut);
				dojo.connect(layer, "onClick", layer_onClick);
				
				jQuery('#mycarousel').jcarousel({
					scroll:5,
					itemLoadCallback: function(carousel, state) {
						
						if (state != 'init')
							return;
						
						_carousel = carousel;
						
						$(_locations).each(function(index,element){
							if(hasImageName){
								_carousel.add(index+1,createTag(index+1,element.attributes[imgName],element.attributes[imgPath],"B"));
							}else{
								_carousel.add(index+1,createTag(index+1,"",element.attributes[imgPath],"B"));
							}
						});
						
						_carousel.size(_locations.length);
						$(".tile").click(tile_onClick);	
						$(".tile").mouseover(tile_onMouseOver);
						$(".tile").mouseout(tile_onMouseOut);
						_crossFader.setSource(INTRO_PICTURE);
						  if(hasImageName){
							setPlacard(INTRO_NAME,INTRO_DESCRIPTION);
						  }
						
					}
				});	
				return;
			}
				// break;
		}
			
			//继续查询下一个Featurelayer
		if(isTrueFeatureLyr && currentIndex<fLayerNames.length){
			currentIndex++;
			var currentLyrName = fLayerNames[currentIndex];
			map._layers[currentLyrName].queryCount(query,function(count){
				console.log("layerName的 长度是"+count);
				console.log("map._layers[currentLyrName].graphics.length"+map._layers[currentLyrName].graphics.length);
				parseLayer(map._layers[currentLyrName]);
			});
		}
		if(isTrueFeatureLyr && currentIndex == fLayerNames.length){
			currentIndex = 0;
			var currentLyrName = ctmfLyrNames[currentIndex];
			parseLayer(map._layers[currentLyrName],false);
		}
		if(!isTrueFeatureLyr && currentIndex<ctmfLyrNames.length){
			currentIndex++;
			var currentLyrName = ctmfLyrNames[currentIndex];
			parseLayer(map._layers[currentLyrName],map._layers[currentLyrName].graphics,false);
		}
			
	// for(var i=0;i<theMap._layers.length;i++){
		// var layer = theMap.getlayer(i);
	// }
	// alert("theMap._layers.length="+theMap._layers.length);
	// alert("theMap.layerIds.length="+theMap.layerIds.length);
	// for(var i=0;i<theMap.layerIds.length;i++){
// 		
	// }
}
  
//将WebMap的基本面信息显示到页面的相应位置
function showItemInfo(item){
		//标题
	TITLE = item.title;
	document.title = item.title;
		//摘要
	INTRO_NAME = item.snippet;
	
	var snippet = item.snippet;
		//标签（数组）
	var tags = item.tags;
		//描述
	// INTRO_DESCRIPTION = item.description;
		//作者
	var author = item.accessInformation;
	
	BYLINE = item.description;
	situateFrame();
	// jQuery event assignment
	
	$(this).resize(situateFrame);
	$("#toggle").click(function(e) {
		if ($("#placard").css('display')=='none'){
		  $("#toggle").html('&#x25BC;');
		}
		else{
		  $("#toggle").html('&#x25B2;');
		}
		$("#placard").slideToggle();
    });
	$("#arrowPrev").click(prevPicture);			
	$("#arrowNext").click(nextPicture);
			
	
	$("#title").append(TITLE);
	$("#subtitle").append(BYLINE);	
}
function situateFrame() {
	 map.resize();
	viewportDim = getViewportDimensions();
	
	var widthViewport = parseInt(viewportDim[0]);
	var heightViewport = parseInt(viewportDim[1]);
	var heightHeader = parseInt($("#header").css("height"));
	var heightBottom = parseInt($("#bottom").css("height"));
	var heightMiddle = heightViewport - (heightHeader + heightBottom);
	
	$("#middle").css("height",heightMiddle);
	
	var height = calcAllottedHeight(widthViewport - 450,heightMiddle);
	$("#frame").css("height",height);
	$("#frame").css("width",height * 1.5);
	
	$("#left").css("width",parseInt($("#frame").css("width")) + 100);
	$("#left").css("height",heightMiddle); // legacy IE's require explicit calculation of height.	
	$("#right").css("width",parseInt($("#middle").css("width")) - parseInt($("#left").css("width")));
	$("#right").css("height",heightMiddle); // legacy IE's require explicit calculation of height.		
	
	$("#map").css("width",parseInt($("#right").css("width")));
	$("#map").css("height",parseInt($("#right").css("height")));
	
	$("#frame").css("top",(parseInt($("#left").css("height")) - parseInt($("#frame").css("height"))) / 2) - 2;
	$("#frame").css("left",47);
	
	// arrow dimensions 50 x 85
	$("#arrowNext").css("top",(parseInt($("#left").css("height")) - 85) / 2);
	$("#arrowPrev").css("top",(parseInt($("#left").css("height")) - 85) / 2);
	
	if (_carousel) _carousel.options.scroll = parseInt(widthViewport / parseInt($(".tile").css("width"))) - 1;

	if (_selected) map.centerAt(_selected.geometry);	
	
}

function calcAllottedHeight(width,height) {
	width = width - 100;
	height = height - 40;
	for (var i = 0; i < height; i++)
	{
		height = height - 1;
		if (width >= height * 1.5) break;
	}
	return height;
}

function tile_onMouseOver() {
	if ($(this).hasClass("tile-selected")) {
		return;
	}
	$(".tile").removeClass("tile-hover");
	$(this).addClass("tile-hover");	
}

function tile_onMouseOut() {
	$(".tile").removeClass("tile-hover");
}

function tile_onClick() {
	$(".tile").removeClass("tile-hover");
	$(".tile").removeClass("tile-selected");
	$(this).addClass("tile-selected");
	var index = $(".tile").index($(this));
	_selected = _locations[index];
	postSelection();
}

function nextPicture() {
	var index = 0;
	if (_selected) {
		index = $.inArray(_selected,_locations);
		if (index == (_locations.length - 1)) return;
		index++;
	}
	_selected = _locations[index];
	_carousel.scroll(index);
	// add style class to the 'selected' element
	$(".tile").removeClass("tile-selected");
	$(".tile:eq("+index+")").addClass("tile-selected");
	postSelection();
}

function prevPicture() {
	if (!_selected) {
		return;
	}
	var index = $.inArray(_selected,_locations);
	if (index == 0) return;
	index--;
	_selected = _locations[index];
	_carousel.scroll(index);
	// add style class to the 'selected' element
	$(".tile").removeClass("tile-selected");
	$(".tile:eq("+index+")").addClass("tile-selected");
	postSelection();
}

function layer_onClick(event)
{
	_selected = event.graphic;
	var index = $.inArray(_selected,_locations);
	_carousel.scroll(index);
	// add style class to the 'selected' element
	$(".tile").removeClass("tile-selected");
	$(".tile:eq("+index+")").addClass("tile-selected");
	postSelection();
	map.infoWindow.hide();
}

function layer_onMouseOver(event)
{
	map.setMapCursor("pointer");
	var graphic = event.graphic;
	var index = $.inArray(graphic,_locations);
	// graphic.setSymbol(graphic.symbol.setHeight(30).setWidth(24));
	// $("#hoverInfo").html(graphic.attributes[imgName]);
	$("#hoverInfo").html(index+1);
	// $("#hoverInfo").html(graphic.attributes.name);
	var pt = map.toScreen(graphic.geometry);
	hoverInfoPos(pt.x,pt.y);	
}

function layer_onMouseOut(event)
{
	map.setMapCursor("default");
	var graphic = event.graphic;	
	// graphic.setSymbol(graphic.symbol.setHeight(28).setWidth(22));
	$("#hoverInfo").hide();	
}

function postSelection() {
	_crossFader.setSource(_selected.attributes[imgPath]);
	// setPlacard(_selected.attributes[imgName],_selected.attributes.Detail?_selected.attributes.Detail:"");
	var des = _selected.attributes[imgDescription]||"";
	if(hasImageName){
		setPlacard(_selected.attributes[imgName],des);
	}else{
		setPlacard("",des);
	} 
	showInfoWindow(_selected.geometry,_selected.attributes[imgName]);
	var index = $.inArray(_selected,_locations)
	$("#arrowNext").attr("src","images/picture_right.png");
	$("#arrowNext").css("cursor","pointer");	
	$("#arrowPrev").attr("src","images/picture_left.png");	
	$("#arrowPrev").css("cursor","pointer");	
	if (index == 0) {
		$("#arrowPrev").attr("src","images/picture_left_disabled.png");	
		$("#arrowPrev").css("cursor","default");
	} else if (index == _locations.length - 1) {
		$("#arrowNext").attr("src","images/picture_right_disabled.png");	
		$("#arrowNext").css("cursor","default");
	} else {
		// nothing
	}
}

function createTag(number,name,url,color) {
	if (color == "B") 
		return '<div class="tile"><div class="number number-blue">'+number+'</div><img src="' + url + '" class="thumb"><div>'+name+'</div></div>';
	else
		return '<div class="tile"><div class="number">'+number+'</div><img src="' + url + '" class="thumb"><div>'+name+'</div></div>';
}

function showInfoWindow(pt,name) {
	
	if (!map.extent.contains(_selected.geometry)) {
		map.centerAt(_selected.geometry);
	}
	$("#sizer p").remove();
	$("#sizer").append("<p>"+name+"</p>");
	
	map.infoWindow.setTitle(name);
	map.infoWindow.setContent(_selected.getContent());

	// if (!_isLegacyIE) {
		// map.infoWindow.resize($("#sizer").attr("clientWidth")+14,20);	
	// } else {
		// // infoWindow.resize() breaks the legacy IE's if height is less than 40px.
		// map.infoWindow.resize($("#sizer").attr("clientWidth")+14,40);	
	// }
	// $(".infowindow .title").css("width",$("#sizer").attr("clientWidth")+14);
	
	
	if (_firstTime) {
		if (!_isLegacyIE) { 
			// this breaks the legacy IE's
			$(".infowindow .title").css("font","Verdana, Geneva, sans-serif");
		}
		$(".infowindow .title").css("font-size",10);
		$(".infowindow .window").css("color","#666");
		$(".infowindow .hide").css("margin-left",0);		
		$(".claro .infowindow .sprite").css("background-image","url(images/infowindow.png)");
		_firstTime = false;
	}
	
	map.infoWindow.show(pt);
	
}

function setPlacard(name,text) {
	$("#placard div").remove();
	$("#placard").append("<div class='name'>"+name+"<div/>");	
	$("#placard").append("<div class='description'>"+text+"<div/>");	
}

function hoverInfoPos(x,y){
	if (x <= ($("#map").width())-230){
		$("#hoverInfo").css("left",x+15);
	}
	else{
		$("#hoverInfo").css("left",x-25-($("#hoverInfo").width()));
	}
	if (y >= ($("#hoverInfo").height())+50){
		$("#hoverInfo").css("top",y-35-($("#hoverInfo").height()));
	}
	else{
		$("#hoverInfo").css("top",y-15+($("#hoverInfo").height()));
	}
	$("#hoverInfo").show();
}
