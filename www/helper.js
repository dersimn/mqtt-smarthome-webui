function shortId() {
    return Math.random().toString(36).substring(2, 15);
}

function parsePayload(payload) {
    try {
        return JSON.parse(payload);
    } catch (err) {
        return String(payload);
    }
}
