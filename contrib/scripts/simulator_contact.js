schedule('*/3 * * * * *', () => {
    publish('hm/status/XYZ000000'+getRandomInt(3,7)+'/1/STATE', Math.random() > 0.5);
});

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}