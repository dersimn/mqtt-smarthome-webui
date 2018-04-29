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
$.getJSON('data.json', function(data) {
    console.log("Data loaded");

    // Preflight data
    $.each(data.pages, function(i, page) {
    	if (page.pageid == 'mainpage') { data.pages[i].mainpage = true; }

    	$.each(data.pages[i].items, function(j, item) {
    		data.pages[i].items[j]['itemtype_'+item.type] = true;

    		if (item.type == 'switch') { data.pages[i].items[j].switchId = shortId(); };
    	});
    });

	$(function() {
		// Mustache
		var template = $('#pageTemplate').html();
		var rendered = Mustache.render(template, data);
    	$('body').append(rendered);

    	gotToPage(window.location.hash || '#mainpage');


    	// MQTT
    	client = new Paho.MQTT.Client(location.hostname, Number(location.port), '/mqtt');
    	client.onConnectionLost = function() {
    		// Handle online/offline Button
    		$('[data-mqtt-state]').removeClass('btn-outline-success').addClass('btn-outline-secondary').text('Offline');
    	};
    	client.connect({onSuccess:function() {
    		// Handle online/offline Button
    		$('[data-mqtt-state]').removeClass('btn-outline-secondary').addClass('btn-outline-success').text('Online');
    	}});
    });
});
