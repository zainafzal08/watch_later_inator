async function start() {
	await gapi.client.init({
		'apiKey': 'AIzaSyBzYj-oMJJLIyXBs0g5SmbJtP-KlZ6sPxE',
		'discoveryDocs': ['https://youtube.googleapis.com/$discovery/rest'],
		// clientId and scope are optional if auth is not required.
		'clientId': '428583190973-iifjdvdvvond48kvs9d2c6ot7cbp6pb8.apps.googleusercontent.com',
		'scope': 'https://www.googleapis.com/auth/youtube',
	});
    const r = await gapi.client.youtube.channels.list({
        "part": ["id"],
        "mine": true
      });
    console.log(r);
};

gapi.load('client', start);