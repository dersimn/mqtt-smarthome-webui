function parsePayload(payload) {
    try {
        return JSON.parse(payload);
    } catch (err) {
        return String(payload);
    }
}
