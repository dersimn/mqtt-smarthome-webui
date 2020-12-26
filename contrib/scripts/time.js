schedule('*/1 * * * * *', () => {
    publish('time', Date.now());
});
