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
    let topics = [];

    // Preflight data
    $.each(data.pages, function(i, page) {
        if (page.pageid == 'mainpage') { data.pages[i].mainpage = true; }

        $.each(data.pages[i].items, function(j, item) {
            // Create boolean values for Mustache
            data.pages[i].items[j]['itemtype_'+item.type] = true;

            // Type specific changes
            if (item.type == 'switch') { data.pages[i].items[j].switchId = shortId(); };

            // Handle meta-data
            data.pages[i].items[j].meta = JSON.stringify(data.pages[i].items[j]);
            if ('topic' in item) { topics.push(item.topic); }
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
        client.onMessageArrived = function(recv) {
            let topic = recv.destinationName;
            let message = parsePayload(recv.payloadString);
            let val = message;
            if (typeof message == 'object') {
                val = message.val;
            }

            console.log(topic, val, message);

            $('[data-mqtt-topic="'+topic+'"]').each(function(i, elem) {
                let element = $(elem);
                let meta = element.data('meta');
                if ('transform' in meta) {
                    var valTransformed = Function('topic', 'msg', 'val', meta.transform)(topic, message, val);
                }
                switch (meta.type) {
                    case 'text':
                        element.text(valTransformed || val);
                        break;
                    case 'switch':
                        $('#'+meta.switchId).prop('checked',val);
                        break;
                }
            });
        };
        client.onConnectionLost = function() {
            // Handle online/offline Button
            $('[data-mqtt-state]').removeClass('btn-outline-success').addClass('btn-outline-secondary').text('Offline');
        };
        client.connect({onSuccess:function() {
            // Handle online/offline Button
            $('[data-mqtt-state]').removeClass('btn-outline-secondary').addClass('btn-outline-success').text('Online');

            // Subscribe
            $.each(topics, function(i, topic) {
                client.subscribe(topic);
            });
        }});
    });
});
