// Page Switching
$(window).on('hashchange',function(){ 
	gotToPage(location.hash || '#mainpage');
});
function gotToPage(pageHash) {
	console.log('gotToPage', pageHash);
	$(".sh-page").each(function() {
		if ($(this).is(pageHash)) {
			$(this).css('left','0%');
		} else {
			$(this).css('left','100%');
		}
	});
}

// Data loading
$.getJSON("data.json", function(data) {
    console.log("Data loaded");

	$(function() {
		var template = $('#pageTemplate').html();
		var rendered = Mustache.render(template, data);
    	$('body').append(rendered);

    	gotToPage(window.location.hash || '#mainpage');
    });
});
