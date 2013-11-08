function CrossFader(div,loading_image) {

	var _container = div;
	var _current;
	var _other;	
	var _img1;
	var _img2;
	var _spin;
	
	_img1 = document.createElement("img");
	$(_img1).addClass("member-image");
	
	_img2 = document.createElement("img");
	$(_img2).addClass("member-image");
	
	_spin = document.createElement("img");
	$(_spin).addClass("spinner");
	$(_spin).attr("src",loading_image);

	$(_container).append(_img2);
	$(_container).append(_img1);
	$(_container).append(_spin);		
	
	$(_img1).load(fade);
	$(_img2).load(fade);
	
	_current = _img1;	
	
	this.setSource = function(value) {
		
		var foo = value;  /* IE requires that we do something with the 
							 value -- anything, really -- in order for 
							 it to evaluate correctly. */
		if (_current.src == value) return;
		
		_current = (_current == _img1) ? _img2 : _img1;
		_other = (_current == _img1) ? _img2 : _img1;

		if (_current.src == value) {
			fade();
		} else {
			_current.src = value;
			$(_spin).toggle(true);
		}
	}
	
	function fade() {
		$(_spin).toggle(false);
		$(_current).fadeTo("slow",1);
		$(_other).fadeTo("slow",0);
	}
	
	
}