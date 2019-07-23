// Page Switching
$(window).on('hashchange',function(){ 
    gotToPage(location.hash || '#mainpage');
});
function gotToPage(pageHash) {
    console.log('gotToPage', pageHash);
    $(".sh-page").each(function() {
        if ($(this).is(pageHash)) {
            $(this).removeClass('sh-page-hidden').addClass('sh-page-active');
        } else {
            $(this).removeClass('sh-page-active').addClass('sh-page-hidden');
            $(this).find('nav').removeClass('shadow');
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

$(window).scroll(function() {
    if ($(this).scrollTop() > 0) {
        $('div.sh-page-active nav').addClass('shadow');
    } else {
        $('nav').removeClass('shadow');
    }
});

// Data loading
$.get('data.yaml', function(yamlfile) {
    var data = jsyaml.load(yamlfile);
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
                if (item.type == 'switch') { data.pages[i].sections[j].items[k].switchId = 'switch_'+shortId(); }
                if (item.type == 'slider') {
                    data.pages[i].sections[j].items[k].sliderId = 'slider_'+shortId();
                    data.pages[i].sections[j].items[k].sliderMinValue = ('sliderMinValue' in item) ? item.sliderMinValue : 0.0;
                    data.pages[i].sections[j].items[k].sliderMaxValue = ('sliderMaxValue' in item) ? item.sliderMaxValue : 1.0;
                    data.pages[i].sections[j].items[k].sliderStepValue = ('sliderStepValue' in item) ? item.sliderStepValue : 'any';
                }
                if (item.type == 'select') { data.pages[i].sections[j].items[k].selectId = 'select_'+shortId(); }
                if (item.type == 'button') { data.pages[i].sections[j].items[k].buttonId = 'button_'+shortId(); }

                // Handle meta-data
                if (typeof item.topic == 'string') {
                    const tmp = item.topic;
                    item.topic = {};
                    if (/[\/]{2}/.test(tmp)) { // foo//bar
                        item.topic.get = tmp.replace('//', '/status/');
                        item.topic.set = tmp.replace('//', '/set/');
                    } else {
                        item.topic.get = tmp;
                        item.topic.set = null;
                    }
                }
                data.pages[i].sections[j].items[k].meta = JSON.stringify(item);

                if ('topic' in item) { topics.push(item.topic.get); }
            });
        });
    });


    $(function() {
        // Mustache create UI
        var template = $('#pageTemplate').html();
        var rendered = Mustache.render(template, data);
        $('body').append(rendered);
        $(dynamicListGroup);
        feather.replace();
        gotToPage(window.location.hash || '#mainpage');

        // MQTT
        console.log(location.port);
        let ssl = location.protocol == 'https:';
        let mqttUrl = 'ws'+ ((ssl)?'s':'') +'://'+location.hostname+((location.port != '') ? ':' : '')+location.port+'/mqtt';
        console.log('MQTT conenct to', mqttUrl);
        client = new Paho.Client(mqttUrl, 'webui_'+shortId());
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
                    if (typeof meta.transform == 'string') {
                        var valTransformed = Function('topic', 'message', 'value', meta.transform)(topic, message, val);
                    }
                    if (typeof meta.transform == 'object') {
                        if ('get' in meta.transform) {
                            var valTransformed = Function('topic', 'message', 'value', meta.transform.get)(topic, message, val);
                        }
                    }
                }
                switch (meta.type) {
                    case 'text':
                        element.text((valTransformed !== undefined) ? valTransformed : val);
                        break;
                    case 'switch':
                        $('#'+meta.switchId).prop('checked', (valTransformed !== undefined) ? valTransformed : val);
                        break;
                    case 'button':
                        if (element.data('mqtt-value') == ((valTransformed !== undefined) ? valTransformed : val) {
                            element.addClass('active');
                        } else {
                            element.removeClass('active');
                        }
                        break;
                    case 'slider':
                        $('#'+meta.sliderId).val((valTransformed !== undefined) ? valTransformed : val);
                        $('#'+meta.sliderId).data('last-mqtt-value', (valTransformed !== undefined) ? valTransformed : val);
                        $('#'+meta.sliderId).get(0).style.setProperty("--c",0);
                        break;
                    case 'select':
                        $('#'+meta.selectId).val((valTransformed !== undefined) ? valTransformed : val);
                        $('#'+meta.selectId).data('last-mqtt-value', (valTransformed !== undefined) ? valTransformed : val);
                        $('#'+meta.selectId+'_loader').removeClass('loader');
                        break;
                }
            });
        };

        // Handle connect / disconnect
        client.onConnectionLost = function() {
            // Handle online/offline Button
            $('[data-mqtt-state]')
                .removeClass('btn-outline-success')
                .addClass('btn-outline-secondary')
                .html(
                    feather.icons['wifi-off'].toSvg()
            );

            setTimeout(client.connect, 500);
        };

        client.onConnected = function(reconnect) {
            // Handle online/offline Button
            $('[data-mqtt-state]')
                .removeClass('btn-outline-secondary')
                .addClass('btn-outline-success')
                .html(
                    feather.icons['wifi'].toSvg()
            );

            // Subscribe
            $.each(topics, function(i, topic) {
                client.subscribe(topic);
            });
        };
        client.connect();

        $(window).focus(function() {
            if (!client.isConnected()) {
                setTimeout(client.connect, 500);
            }
        });

        // Assign user-action events
        $("[id^=switch]").each(function(i, elem) {
            $(elem).click(function() {
                let element = $(elem);
                let meta = element.data('meta');
                let topic = meta.topic.set;
                if (topic == null) return false;

                let input = $(this).prop('checked');
                if ('transform' in meta) {
                    if (typeof meta.transform == 'object') {
                        if ('set' in meta.transform) {
                            var inputTransformed = Function('input', meta.transform.set)(input);
                        }
                    }
                }

                let message = String((inputTransformed !== undefined) ? inputTransformed : input);

                console.log(topic, message);
                client.send(topic, message);
                return false;
            });
        });

        $('[id^=button]').each(function(i, elem) {
            $(elem).click(function() {
                let element = $(elem);
                let meta = element.data('meta');
                let topic = meta.topic.set;
                if (topic == null) return;

                let input = element.data('mqtt-value');
                if ('transform' in meta) {
                    if (typeof meta.transform == 'object') {
                        if ('set' in meta.transform) {
                            var inputTransformed = Function('input', meta.transform.set)(input);
                        }
                    }
                }

                let message = String((inputTransformed !== undefined) ? inputTransformed : input);

                console.log(topic, message);
                client.send(topic, message);
            });
        });

        $('[id^=slider]').on('input', function() {
            $(this).get(0).style.setProperty("--c",
                ($(this).data('last-mqtt-value') - $(this).val()) /
                ($(this).attr('max')-$(this).attr('min')) *
                ($(this).width() - 20) +'px' /*width of wrapper - width of thumb*/
            );
        });
        $('[id^=slider]').on('change', function() {
            let element = $(this);
            let meta = element.data('meta');
            let topic = meta.topic.set;
            if (topic == null) return;

            let input = element.val();
            if ('transform' in meta) {
                if (typeof meta.transform == 'object') {
                    if ('set' in meta.transform) {
                        var inputTransformed = Function('input', meta.transform.set)(input);
                    }
                }
            }

            let message = String((inputTransformed !== undefined) ? inputTransformed : input);

            console.log(topic, message);
            client.send(topic, message);
        });

        $('[id^=select]').on('change', function() {
            let meta = $(this).data('meta');
            let topic = meta.topic.set;
            if (topic == null) return;

            let input = $(this).val();
            if ('transform' in meta) {
                if (typeof meta.transform == 'object') {
                    if ('set' in meta.transform) {
                        var inputTransformed = Function('input', meta.transform.set)(input);
                    }
                }
            }

            let message = String((inputTransformed !== undefined) ? inputTransformed : input);

            console.log(topic, message);
            client.send(topic, message);

            $(this).val($(this).data('last-mqtt-value')); // Reset to last known state
            $('#'+$(this).attr('id')+'_loader').addClass('loader'); // Show loader
        });
    });
});
