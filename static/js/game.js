//iniciamos el juego con una configuracion base
var game = new Phaser.Game(800, 600, Phaser.AUTO, "myGame", {preload: preload, create: create, update: update});

var socket;
var ship;
var otherPlayers;
var cursors;
var speed = 0;
var bullets = [];
var bulletsTime = 0;
var spaceBar;
var healText;

var heart = "\uf004 "

//todos los recursos que vamos a usar (imagenes)
function preload(){

	this.load.image("1", "assets/ship_blue.png");
	this.load.image("2", "assets/ship_orange.png");
	this.load.image("3", "assets/ship_black.png");
	this.load.image("4", "assets/ship_green.png");

	this.load.image("bullet", "assets/bullet.png");
	this.load.image("space", "assets/space.png");

}


//creacion de objetos y conexiones con sockets al servidor
function create(){

	//escogemos la fisica que vamos a usar en el juego
	game.physics.startSystem(Phaser.Physics.ARCADE);

	//imagen de fondo
	game.add.tileSprite(0, 0, 1600, 1200, 'space');	

	//limites del mundo del juego
	game.world.setBounds(0, 0, 1600, 1200);

	//creamos un socket para la conexion con el servidor
  socket = io.connect();

	//iniciamos el juego con un menu
	
	//grupo que contiene a los otros jugadores
	otherPlayers = game.add.group();
	otherPlayers.enableBody = true;
	otherPlayers.physicsBodyType = Phaser.Physics.ARCADE;

	healthText = game.add.text(15, 15, "\n" + heart.repeat(2) + heart, {font: "20px fontAwesome", fill: "#ff6666"})

	healthText.fixedToCamera = true;

	initGameMenu(socket);
	
	//recibimos los datos de las usuarios conectados
  socket.on('currentPlayers', function (players) {

    for(id in players){

      if (id === socket.id) {

        addPlayer(players[id]);

      }else{

				addOtherPlayers(players[id]);	
			}
    };

  });

	//si un nuevo jugador ingresa al juego recibimos su informacion		
	socket.on("newPlayer", function(playerInfo){

		addOtherPlayers(playerInfo);	
	});

	//recibimos un evento cuando un jugador se desconecta
	socket.on("disconnect", function(playerId){

		//eliminamos al jugador desconectado
		otherPlayers.forEach(function(otherPlayer){
			if(playerId === otherPlayer.playerId){
				otherPlayer.destroy();
			}
		});
	});
	

	//teclas de movimiento
	cursors = game.input.keyboard.createCursorKeys();
		
	//tecla para disparar 
	spaceBar = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
	
	game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);

	//recibimos los datos del movimiento de los otros jugadores
	socket.on("playerMoved", function(playerInfo){
		
		//actualizamos los datos de los otros jugadores  
		otherPlayers.forEach(function(otherPlayer){

			if (playerInfo.playerId === otherPlayer.playerId){
				
				otherPlayer.rotation = playerInfo.rotation;
				otherPlayer.position.x = playerInfo.x;
				otherPlayer.position.y = playerInfo.y;
			}
		});
	});

	//recibimos los datos de las balas 
	socket.on("bulletsUpdate", function(bulletsInfo){
		
		for(var i=0; i < bulletsInfo.length; i++){
			
			var bullet = bulletsInfo[i];
				
			//agregamos una nueva bala o actualizamos sus datos
			if(bullets[i] === undefined){
				//creamos la bala
				bullets[i] = game.add.sprite(bullet.x, bullet.y, "bullet");	
				bullets[i].rotation = bullet.rotation;

			}else{
				//actulizamos los datos de la bala 
				bullets[i].x = bullet.x;	
        bullets[i].y = bullet.y;
			}
		}
	
		//las balas para las cuales no enviaron informacion del servidor
		//seran eliminadas
		for(var i = bulletsInfo.length; i < bullets.length; i++){
				bullets[i].destroy();
				bullets.splice(i,1);
				i--;
		}
		
	});
	
	//recibimos el evento del impacto de la bala en un jugador
	socket.on("playerHit", function(id){
			
		//si la bala impacta en nuestra nave 
		if(id === socket.id){

			ship.damage(1);	

			healthText.setText("\n" + heart.repeat(ship.health) );

			game.camera.flash(0xff6666, 250);
			game.camera.shake(0.01, 250, true, Phaser.Camera.SHAKE_BOTH, true);

		} else {

			//si la bala impacta en las otras naves	
				
			otherPlayers.forEach(function(otherPlayer){
						
				if(otherPlayer.playerId == id){

					otherPlayer.damage(1);
					
				}


			});

		}
		
	});

}

//eventos y animacion del juego
function update(){

	if (ship && ship.alive) {

		//teclas de movimiento de rotacion
		if (cursors.left.isDown){

			ship.body.angularVelocity = -250;	

		}	else if (cursors.right.isDown){

			ship.body.angularVelocity = 250;

		} else {

			ship.body.angularVelocity = 0;

		}
			
		//teclas para avanzar
		if(cursors.up.isDown){
			
			//avanzar y rotar	
			game.physics.arcade.accelerationFromRotation(ship.rotation, 200, ship.body.acceleration);

		} else {
			//sino apretamos la tecla para avanzar nos detemos		
			ship.body.acceleration.set(0);

		} 
		
		//tecla para disparar
		if(spaceBar.isDown && !ship.shoot && bullets.length < 4){
				
			//velocidad del movimiento de la bala
			var speed_x = Math.cos(ship.rotation) * 10;
			var speed_y = Math.sin(ship.rotation) * 10;
			
			//bandera para saber si estamos disparando
			ship.shoot = true;
			
			//emitimos el evento del disparo al servidor 
			socket.emit("shootBullet", {x: ship.x, y: ship.y, rotation: ship.rotation, speed_x: speed_x, speed_y: speed_y});
		}

		//para saber si no estamos disparando	
		if(!spaceBar.isDown) ship.shoot = false;
		
		//para que la nave no se escape del area de juego y aparezca al lado contrario 
		//game.world.wrap(ship, 5);
			
		//enviamos los datos de nuestro movieminto al servidor
		//si nos estamos movimendo

		var x = ship.x;
		var y = ship.y;
		var r = ship.rotation;

		if (ship.oldPosition && (x !== ship.oldPosition.x || y !== ship.oldPosition.y || r !== ship.oldPosition.rotation)){

			socket.emit("playerMovement", {x: ship.x, y: ship.y, rotation: ship.rotation});	
		}
			
		ship.oldPosition = {

			x: ship.x,
			y: ship.y,
			rotation: ship.rotation
		};	

	}
}


//guardamos los datos del jugador
function addPlayer(playerInfo) {

  ship = game.add.sprite(playerInfo.x, playerInfo.y, playerInfo.type);
		
	game.physics.enable(ship, Phaser.Physics.ARCADE);

	ship.anchor.set(0.5);
	ship.scale.setTo(0.5, 0.5);
  ship.body.drag.set(100);
  ship.body.maxVelocity.set(200);
	ship.alive = true;
	ship.health = 3;

	ship.body.collideWorldBounds = true;

	game.camera.follow(ship, Phaser.Camera.FOLLOW_LOCKON, 0.1, 0.1);
}

//guardamos los datos de los otros jugadores
function addOtherPlayers(playerInfo) {

  var otherPlayer = game.add.sprite(playerInfo.x, playerInfo.y, playerInfo.type);

	game.physics.enable(otherPlayer, Phaser.Physics.ARCADE);
	
	otherPlayer.anchor.set(0.5);
	otherPlayer.scale.setTo(0.5, 0.5);
	otherPlayer.playerId = playerInfo.playerId;
	otherPlayer.health = playerInfo.health;
	otherPlayer.alive = true;
  otherPlayers.add(otherPlayer);
}

