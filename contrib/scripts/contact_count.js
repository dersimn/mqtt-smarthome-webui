const contacts = [
    'hm/status/XYZ0000003/1/STATE',
    'hm/status/XYZ0000004/1/STATE',
    'hm/status/XYZ0000005/1/STATE',
    'hm/status/XYZ0000006/1/STATE',
    'hm/status/XYZ0000007/1/STATE'
];

subscribe(contacts, () => {
    let count = 0;

	contacts.forEach(contact => {
		if (getValue(contact)) {
			count++;
		}
	});

	setValue('$contacts/count', count);
});
