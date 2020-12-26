subscribe('hue/set/+', (topic, val, obj) => {
    const splits = topic.split('/');
    setTimeout(() => {
        publish('hue/status/'+splits[2], obj);
    }, 500);
});
