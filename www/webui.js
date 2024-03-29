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
const UAParser = require('ua-parser-js');

const ssl = location.protocol === 'https:';

// Page Switching
$(window).on('hashchange', () => {
    gotToPage(location.hash || '#mainpage');
});
function gotToPage(pageHash) {
    console.log('gotToPage', pageHash);
    $('.sh-page').each(function () {
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

$(window).scroll(function () {
    if ($(this).scrollTop() > 0) {
        $('div.sh-page-active nav').addClass('shadow');
    } else {
        $('nav').removeClass('shadow');
    }
});

// Data loading
(async function () {
    // Get saved instanceId from local storage, or generate new
    await localforage.ready();
    const instanceId = await localforage.getItem('instanceId') || shortid.generate();
    localforage.setItem('instanceId', instanceId);

    // Request Cookie for Websocket SSL workaround
    if (ssl) {
        try {
            await $.get('/cookie', {instanceId});
        } catch {
            // Could not collect auth cookies
            // workaround for Safari with SSL client auth might not working
        }
    }

    // Get content file
    const yamlfile = await $.get({url: 'data.yaml', cache: false});
    const data = yaml.load(yamlfile);
    const topics = new Set('time');

    // Preflight data
    for (const [i, page] of Object.entries(data.pages)) {
        if (page.pageid === 'mainpage') {
            data.pages[i].mainpage = true;
        }

        for (const [j, section] of Object.entries(page.sections)) {
            for (const [k, item] of Object.entries(section.items)) {
                // Create boolean values for Mustache
                data.pages[i].sections[j].items[k]['itemtype_' + item.type] = true;

                // Type specific changes
                data.pages[i].sections[j].items[k][item.type + 'Id'] = item.type + '_' + shortid.generate();
                if (item.type === 'slider') {
                    data.pages[i].sections[j].items[k].sliderMinValue = ('sliderMinValue' in item) ? item.sliderMinValue : 0;
                    data.pages[i].sections[j].items[k].sliderMaxValue = ('sliderMaxValue' in item) ? item.sliderMaxValue : 1;
                    data.pages[i].sections[j].items[k].sliderStepValue = ('sliderStepValue' in item) ? item.sliderStepValue : 'any';
                }

                // Handle meta-data
                if (typeof item.topic === 'string') {
                    const temporary = item.topic;
                    item.topic = {};
                    if (/\/{2}/.test(temporary)) { // Foo//bar
                        item.topic.get = temporary.replace('//', '/status/');
                        item.topic.set = temporary.replace('//', '/set/');
                    } else {
                        item.topic.get = temporary;
                        item.topic.set = null;
                    }
                }

                data.pages[i].sections[j].items[k].meta = JSON.stringify(item);

                if ('topic' in item) {
                    topics.add(item.topic.get);
                }
            }
        }
    }

    // Mustache create UI
    const template = $('#pageTemplate').html();
    const rendered = Mustache.render(template, data);
    $('body').append(rendered);
    $(dynamicListGroup);
    feather.replace();
    gotToPage(window.location.hash || '#mainpage');

    // MQTT
    const mqttUrl = 'ws' + ((ssl) ? 's' : '') + '://' + location.hostname + ((location.port === '') ? '' : ':' + location.port) + '/mqtt';
    console.log('MQTT conenct to', mqttUrl);
    const mqtt = new MqttSmarthome(mqttUrl, {
        will: {topic: 'dersimn/mqtt-smarthome-webui/' + instanceId + '/online', payload: 'false', retain: true},
        clientId: 'webui_' + instanceId,
        logger: console
    });
    mqtt.on('connect', () => {
        mqtt.publish('dersimn/mqtt-smarthome-webui/' + instanceId + '/online', true, {retain: true});
        if (pkgInfo) {
            mqtt.publish('dersimn/mqtt-smarthome-webui/' + instanceId + '/info/project', {
                name: pkgInfo.name,
                version: pkgInfo.version,
                build: {
                    'git-hash': pkgInfo.git.hash,
                    'git-tag': pkgInfo.git.tag || pkgInfo.git.branch,
                    'build-timestamp': pkgInfo.buildTime
                }
            }, {retain: true});
        }

        // Publish device info if available
        try {
            const parser = new UAParser();
            mqtt.publish('dersimn/mqtt-smarthome-webui/' + instanceId + '/info/device', parser.getResult(), {retain: true});
        } catch {
            mqtt.publish('dersimn/mqtt-smarthome-webui/' + instanceId + '/info/device', null, {retain: true});
        }

        // Handle online/offline Button
        $('[data-mqtt-state]')
            .removeClass('btn-outline-secondary')
            .addClass('btn-outline-success')
            .html(
                feather.icons.wifi.toSvg()
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

    mqtt.subscribe([...topics], (topic, message) => {
        const value = (typeof message === 'object' && message !== null && 'val' in message) ? message.val : message;

        $('[data-mqtt-topic="' + topic + '"]').each((i, element_) => {
            const element = $(element_);
            const meta = element.data('meta');

            let valueTransformed;
            if ('transform' in meta) {
                if (typeof meta.transform === 'string') {
                    try {
                        valueTransformed = new Function('topic', 'message', 'value', meta.transform)(topic, message, value);
                    } catch {
                        return;
                    }
                }

                if (typeof meta.transform === 'object') {
                    if ('get' in meta.transform) {
                        try {
                            valueTransformed = new Function('topic', 'message', 'value', meta.transform.get)(topic, message, value);
                        } catch {
                            return;
                        }
                    }
                }
            }

            if (valueTransformed === null) {
                return;
            }

            const usedValue = (valueTransformed === undefined) ? value : valueTransformed;

            switch (meta.type) {
                case 'text':
                    if (!(
                        typeof usedValue !== 'object' ||
                            usedValue instanceof String ||
                            usedValue instanceof Number ||
                            usedValue instanceof Boolean)
                    ) {
                        return;
                    }

                    element.text(usedValue);
                    break;
                case 'switch':
                    if (!(typeof usedValue === 'boolean' || usedValue instanceof Boolean)) {
                        return;
                    }

                    $('#' + meta.switchId).prop('checked', usedValue);
                    break;
                case 'button':
                    if (!(
                        typeof usedValue !== 'object' ||
                            usedValue instanceof String ||
                            usedValue instanceof Number ||
                            usedValue instanceof Boolean)
                    ) {
                        return;
                    }

                    if (element.data('mqtt-value') === (usedValue)) {
                        element.addClass('active');
                    } else {
                        element.removeClass('active');
                    }

                    break;
                case 'slider':
                    if (Number.isNaN(usedValue)) {
                        return;
                    }

                    $('#' + meta.sliderId).val(usedValue);
                    $('#' + meta.sliderId).data('last-mqtt-value', usedValue);
                    $('#' + meta.sliderId).get(0).style.setProperty('--c', 0);
                    break;
                case 'select':
                    if (!(
                        typeof usedValue !== 'object' ||
                            usedValue instanceof String ||
                            usedValue instanceof Number ||
                            usedValue instanceof Boolean)
                    ) {
                        return;
                    }

                    $('#' + meta.selectId).val(usedValue);
                    $('#' + meta.selectId).data('last-mqtt-value', usedValue);
                    $('#' + meta.selectId + '_loader').removeClass('loader');
                    break;
                case 'number':
                    if (Number.isNaN(usedValue)) {
                        return;
                    }

                    element.find('input').val(usedValue);
                    element.find('input').removeClass('working');
                    break;
                default:
                    // Do nothing
            }
        });
    });

    // Assign user-action events
    $('[id^=switch]').each((i, element_) => {
        $(element_).click(function () {
            const element = $(element_);
            const meta = element.data('meta');
            const topic = meta.topic.set;
            if (topic === null) {
                return false;
            }

            mqtt.publish(topic, transformMessage($(this).prop('checked'), meta), meta.options?.mqtt);
            return false;
        });
    });

    $('[id^=button]').each((i, element_) => {
        $(element_).click(() => {
            const element = $(element_);
            const meta = element.data('meta');
            const topic = meta.topic.set;
            if (topic === null) {
                return;
            }

            mqtt.publish(topic, transformMessage(element.data('mqtt-value'), meta), meta.options?.mqtt);
        });
    });

    $('[id^=slider]').on('input', function () {
        $(this).get(0).style.setProperty('--c',
            (($(this).data('last-mqtt-value') - $(this).val()) /
             ($(this).attr('max') - $(this).attr('min')) *
             ($(this).width() - 20)
            ) + 'px' /* Width of wrapper - width of thumb */
        );
    });
    $('[id^=slider]').on('change', function () {
        const element = $(this);
        const meta = element.data('meta');
        const topic = meta.topic.set;
        if (topic === null) {
            return;
        }

        mqtt.publish(topic, transformMessage(element.val(), meta), meta.options?.mqtt);
    });

    $('[id^=select]').on('change', function () {
        const meta = $(this).data('meta');
        const topic = meta.topic.set;
        if (topic === null) {
            return;
        }

        mqtt.publish(topic, transformMessage($(this).val(), meta), meta.options?.mqtt);

        $(this).val($(this).data('last-mqtt-value')); // Reset to last known state
        $('#' + $(this).attr('id') + '_loader').addClass('loader'); // Show loader
    });

    $('[id^=number]').each(function () {
        const meta = $(this).data('meta');
        const topic = meta.topic.set;
        if (topic === null) {
            return;
        }

        const input = $(this).find('input');
        const btnLeft = $(this).find('button.sh-number-left');
        const btnRight = $(this).find('button.sh-number-right');

        function getInputValue() {
            return Number($(input).val().replace(',', '.'));
        }

        $(input).change(() => {
            const inputValue = getInputValue();
            const transformedValue = transformMessage(inputValue, meta);

            mqtt.publish(topic, transformedValue, meta.options?.mqtt);
            $(input).addClass('working');
        });

        $(btnLeft).click(() => {
            const increment = meta.options?.['left-increment'] ?? -1;
            const inputValue = getInputValue();
            const transformedValue = transformMessage(inputValue + increment, meta);

            mqtt.publish(topic, transformedValue, meta.options?.mqtt);
            $(input).addClass('working');
        });

        $(btnRight).click(() => {
            const increment = meta.options?.['right-increment'] ?? 1;
            const inputValue = getInputValue();
            const transformedValue = transformMessage(inputValue + increment, meta);

            mqtt.publish(topic, transformedValue, meta.options?.mqtt);
            $(input).addClass('working');
        });
    });
})();

function transformMessage(input, meta) {
    if ('transform' in meta) {
        if (typeof meta.transform === 'object') {
            if ('set' in meta.transform) {
                try {
                    return new Function('input', meta.transform.set)(input);
                } catch {
                    return;
                }
            }
        }
    }

    return input;
}
