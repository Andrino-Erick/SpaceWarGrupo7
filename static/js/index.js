var selectedShip = 1;

function initGameMenu(socket){

	$(document).ready( function(){

		$('#play').click( function(){
			playerName = $('#player-name').val();
			playGame(playerName, selectedShip, socket);
		});


		$('ul.ship-selection li').click( function(){
			$('.ship-selection li').removeClass('selected')
			$(this).addClass('selected');
			selectedShip = $(this).data('ship');
		});

	});
}


function playGame(playerName, shipType, socket){
	if(playerName != ''){
		$('#prompt').hide();
		socket.emit('newPlayer', {name: playerName, type: shipType});
	}
}
