async function run() {
	for (let i = 0; i < 10; i++) {
		console.log("i is " + i);
		await wait();
		if (i % 2 === 0) {
			console.log(`i=${i} is even`);
			await wait();
		} else {
			await wait();
		}
	}
}

function wait() {
	return new Promise((res) => {
		setTimeout(res, 400);
	});
}

run();
