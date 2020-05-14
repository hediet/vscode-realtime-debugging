window.onmousemove = (data) => {
	console.log(`mouse pos: ${data.x} ${data.y}`);

	if (data.x > 400) {
		myFunction();
	} else {
		console.log("x <= 400");
	}

function myFunction() {}
