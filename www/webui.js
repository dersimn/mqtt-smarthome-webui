// Page Switching
$(window).on('hashchange',function(){ 
    gotToPage(location.hash || '#mainpage');
});
function gotToPage(pageHash) {
    console.log('gotToPage', pageHash);
    $(".sh-page").each(function() {
        if ($(this).is(pageHash)) {
            $(this).css('left','0%').css('position', 'static');
        } else {
            $(this).css('left','100%').css('position', 'fixed');
        }
    });
}

// Page Layout
function dynamicListGroup() {
    if ($(this).width() < 575) {
      $('.list-group').addClass('list-group-flush');
    } else {
      $('.list-group').removeClass('list-group-flush');
    }
}
$(window).resize(dynamicListGroup);

// Data loading
$.getJSON('data.json', function(data) {
    console.log('Data loaded');
    let topics = [];

    // Preflight data
    $.each(data.pages, function(i, page) {
        if (page.pageid == 'mainpage') { data.pages[i].mainpage = true; }

        $.each(page.sections, function(j, section) {
            $.each(section.items, function(k, item) {
                // Create boolean values for Mustache
                data.pages[i].sections[j].items[k]['itemtype_'+item.type] = true;

                // Type specific changes
                if (item.type == 'switch') { data.pages[i].sections[j].items[k].switchId = 'switch_'+shortId(); };
                if (item.type == 'button') { data.pages[i].sections[j].items[k].switchId = 'switch_'+shortId(); };

                // Handle meta-data
                if (/[\/]{2}/.test(item.topic)) { // foo//bar
                    if (!('topicSet' in item)) {
                        item.topicSet = item.topic.replace('//', '/set/');
                    }
                    item.topic = item.topic.replace('//', '/status/');
                }
                data.pages[i].sections[j].items[k].meta = JSON.stringify(item);

                if ('topic' in item) { topics.push(item.topic); }
            });
        });
    });


    $(function() {
        // Mustache create UI
        var template = $('#pageTemplate').html();
        var rendered = Mustache.render(template, data);
        $('body').append(rendered);
        $(dynamicListGroup);
        gotToPage(window.location.hash || '#mainpage');

        // MQTT
        console.log(location.port);
        let ssl = location.protocol == 'https:';
        let mqttUrl = 'ws'+ ((ssl)?'s':'') +'://'+location.hostname+((location.port != '') ? ':' : '')+location.port+'/mqtt';
        console.log('MQTT conenct to', mqttUrl);
        client = new Paho.MQTT.Client(mqttUrl, 'webui_'+shortId());
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
                    var valTransformed = Function('topic', 'message', 'value', meta.transform)(topic, message, val);
                }
                switch (meta.type) {
                    case 'text':
                        element.text(valTransformed || val);
                        break;
                    case 'switch':
                        $('#'+meta.switchId).prop('checked', valTransformed || val);
                        break;
                    case 'button':
                        if (element.data('mqtt-value') == (valTransformed || val)) {
                            element.addClass('active');
                        } else {
                            element.removeClass('active');
                        }
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

        // Assign user-action events
        $("[id^=switch]").each(function(i, elem) {
            $(elem).click(function() {
                let element = $(elem);
                let meta = element.data('meta');
                let topic = meta.topicSet;
                let input = $(this).prop('checked');
                if ('transformSet' in meta) {
                    var inputTransformed = Function('input', meta.transformSet)(input);
                }

                let message = String( inputTransformed || input );

                console.log(topic, message);
                client.send(topic, message);
                return false;
            });
        });

        $("button").each(function(i, elem) {
            $(elem).click(function() {
                let element = $(elem);
                let meta = element.data('meta');
                let topic = meta.topicSet;
                let input = element.data('mqtt-value');
                if ('transformSet' in meta) {
                    var inputTransformed = Function('input', meta.transformSet)(input);
                }

                let message = String( inputTransformed || input );

                console.log(topic, message);
                client.send(topic, message);
            });
        });
    });
});
