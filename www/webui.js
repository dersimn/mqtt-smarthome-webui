const $ = require('jquery');
require('popper.js');
require('bootstrap');

const Mustache = require('mustache');
const feather = require('feather-icons');
const esprima = require('esprima');
const yaml = require('js-yaml');
const shortid = require('shortid');
const MqttSmarthome = require('mqtt-smarthome-connect');
const localforage = require('localforage');
const {format: timeago} = require('timeago.js');
const pretty_ms = require('pretty-ms');

const ssl = location.protocol == 'https:';


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
(async function() {
    // Get saved instanceId from local storage, or generate new
    await localforage.ready();
    const instanceId = await localforage.getItem('instanceId') || shortid.generate();
    localforage.setItem('instanceId', instanceId);

    // Request Cookie for Websocket SSL workaround
    if (ssl) {
        try {
            await $.get('/cookie', {instanceId: instanceId});
        } catch (e) {
            // could not collect auth cookies
            // workaround for Safari with SSL client auth might not working
        }
    }

    // Get content file
    const yamlfile = await $.get({url: 'data.yaml', cache: false});
    let data = yaml.load(yamlfile);
    let topics = ['time'];

    // Preflight data
    for (let [i, page] of Object.entries(data.pages)) {
        if (page.pageid == 'mainpage') { data.pages[i].mainpage = true; }

        for (let [j, section] of Object.entries(page.sections)) {
            for (let [k, item] of Object.entries(section.items)) {
                // Create boolean values for Mustache
                data.pages[i].sections[j].items[k]['itemtype_'+item.type] = true;

                // Type specific changes
                data.pages[i].sections[j].items[k][item.type+'Id'] = item.type + '_' + shortid.generate();
                if (item.type == 'slider') {
                    data.pages[i].sections[j].items[k].sliderMinValue = ('sliderMinValue' in item) ? item.sliderMinValue : 0.0;
                    data.pages[i].sections[j].items[k].sliderMaxValue = ('sliderMaxValue' in item) ? item.sliderMaxValue : 1.0;
                    data.pages[i].sections[j].items[k].sliderStepValue = ('sliderStepValue' in item) ? item.sliderStepValue : 'any';
                }

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
            }
        }
    }

    // Mustache create UI
    let template = $('#pageTemplate').html();
    let rendered = Mustache.render(template, data);
    $('body').append(rendered);
    $(dynamicListGroup);
    feather.replace();
    gotToPage(window.location.hash || '#mainpage');

    // MQTT
    const mqttUrl = 'ws'+ ((ssl)?'s':'') +'://'+location.hostname+((location.port != '') ? ':'+location.port : '')+'/mqtt';
    console.log('MQTT conenct to', mqttUrl);
    const mqtt = new MqttSmarthome(mqttUrl, {
        will: {topic: 'webui/maintenance/'+instanceId+'/online', payload: 'false', retain: true},
        clientId: 'webui_'+instanceId,
        logger: console
    });
    mqtt.on('connect', () => {
        mqtt.publish('webui/maintenance/'+instanceId+'/online', true, {retain: true});

        // Publish device info if available
        try {
            mqtt.publish('webui/maintenance/'+instanceId+'/deviceInfo', {
                val: FRUBIL.status.value != 0,
                client: FRUBIL.client,
                device: FRUBIL.device,
                ts: Date.now()
            }, {retain: true});
        } catch (e) {
            mqtt.publish('webui/maintenance/'+instanceId+'/deviceInfo', {val: false});
        }

        // Handle online/offline Button
        $('[data-mqtt-state]')
            .removeClass('btn-outline-secondary')
            .addClass('btn-outline-success')
            .html(
                feather.icons['wifi'].toSvg()
        );
    });
    mqtt.on('offline', () => {
        // Handle online/offline Button
        $('[data-mqtt-state]')
            .removeClass('btn-outline-success')
            .addClass('btn-outline-secondary')
            .html(
                feather.icons['wifi-off'].toSvg()
        );
    });
    mqtt.connect();

    mqtt.subscribe(topics, (topic, message) => {
        const val = (typeof message === 'object' && 'val' in message) ? message.val : message;

        $('[data-mqtt-topic="'+topic+'"]').each(function(i, elem) {
            const element = $(elem);
            const meta = element.data('meta');
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
            const usedValue = (valTransformed !== undefined) ? valTransformed : val;

            switch (meta.type) {
                case 'text':
                    element.text(usedValue);
                    break;
                case 'switch':
                    $('#'+meta.switchId).prop('checked', usedValue);
                    break;
                case 'button':
                    if (element.data('mqtt-value') == (usedValue)) {
                        element.addClass('active');
                    } else {
                        element.removeClass('active');
                    }
                    break;
                case 'slider':
                    $('#'+meta.sliderId).val(usedValue);
                    $('#'+meta.sliderId).data('last-mqtt-value', usedValue);
                    $('#'+meta.sliderId).get(0).style.setProperty("--c",0);
                    break;
                case 'select':
                    $('#'+meta.selectId).val(usedValue);
                    $('#'+meta.selectId).data('last-mqtt-value', usedValue);
                    $('#'+meta.selectId+'_loader').removeClass('loader');
                    break;
            }
        });
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

            mqtt.publish(topic, message);
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

            mqtt.publish(topic, message);
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

        mqtt.publish(topic, message);
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

        mqtt.publish(topic, message);

        $(this).val($(this).data('last-mqtt-value')); // Reset to last known state
        $('#'+$(this).attr('id')+'_loader').addClass('loader'); // Show loader
    });
})();
