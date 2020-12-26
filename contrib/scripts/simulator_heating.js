publish('hm/status/XYZ0000001/1/TEMPERATURE', 12.0); // Init

subscribe('hm/set/XYZ0000001/2/SET_TEMPERATURE', (topic, val) => {
    setTimeout(() => {
        publish('hm/status/XYZ0000001/2/SET_TEMPERATURE', val);
    }, 1000);
});

subscribe('var/status/control_mode_set', (topic, val) => {
    setTimeout(() => {
        publish('hm/status/XYZ0000001/2/CONTROL_MODE', val);
    }, 500);
});

schedule('*/1 * * * * *', () => {
    var power = 100 * (getValue('hm/status/XYZ0000001/2/SET_TEMPERATURE') - getValue('hm/status/XYZ0000001/1/TEMPERATURE')) / getValue('hm/status/XYZ0000001/1/TEMPERATURE');
    if (power > 100) power = 100;
    if (power <   0) power =   0;
    publish('hm/status/XYZ0000002/4/VALVE_STATE', power);

    publish('hm/status/XYZ0000001/1/TEMPERATURE', (getValue('hm/status/XYZ0000001/2/SET_TEMPERATURE') - getValue('hm/status/XYZ0000001/1/TEMPERATURE'))*0.1+getValue('hm/status/XYZ0000001/1/TEMPERATURE'));
});