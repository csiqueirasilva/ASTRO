/* use com slimerjs 0.9.5 */

var page = require('webpage').create();
var args = phantom.args;

page.open("http://localhost:8084/" + args, function (status) {
	page.viewportSize = { width:640, height:384 };
	    
	setTimeout(function() {
	
		page.evaluate(function() {
			$('#exemplo-btn').click();
			$('#ver-fase-atual-lua').click();
			$('#buscar-eclipse-solar').click();
		});

		if(args == 'coordenadas-galacticas') {
			page.evaluate(function() {
				$('#referencia-add-plano-galactico').click();
			});
		} else if (args == 'coordenadas-supergalacticas') {
			page.evaluate(function() {
				$('#referencia-add-plano-supergalactico').click();
			});
		} else if (args == 'movimentos-da-terra') {
			page.evaluate(function() {
				$('#terra-prop-traj-sol').click();
			});
		}

		setTimeout(function () {
			page.render(args + '.png');
			page.close();
			phantom.exit();
		}, 10000);
	}, 10000);
});
