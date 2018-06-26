/*globals GLOBALS, THREE, Stats, performance*/

var App = App || {};

App.Racer = (function (undefined) {


    var renderer, scene, camera, dirLight, stats, animation, finishFunction,
        players = [], barriers = [], powerUps = [],
        finished = false, gameStarted = false;

    var SETTINGS = {
        // SCENE
        SCENE: {
            FOV: 70,
            NEAR: 1,
            FAR: 1000,
            CAMERA_DISTANCE: {
                y: 25,
                z: -40
            },
            LIGHT_POSITION: {
                x: -5,
                y: 30,
                z: -15
            }
        },
        WORLD: {
            LEFT: -40,
            RIGHT: 40,
            START: -30,
            END: 500,
            // END: 10000,
            HEIGHT: 30,
            BARRIERS: 30,
            // BARRIERS: 300,
            POWER_UPS: 20,
            // BARRIERS: 500,
            SAVE_AREA: {
                START: 100,
                END: 50
            },
            MAX_DISTANCE_BETWEEN_PLAYERS: 115,
            START_TIMEOUT: 3000 // in ms
        },
        PLAYER: {
            COLORS: [
                '#d12a0c',
                '#0bd15e'
            ],
            START_X_POSITION: [
                15,
                -15
            ],
            MAX_AMOUNT: 2,
            SIZE: 5,
            TURN_TIME: 30,
            TURN_SCALE_FACTOR: 0.1,
            MIN_TURN: -0.5,
            MAX_TURN: 0.5,
            SPEED_X: 0.7,
            SPEED_Z: 1,
            COLLISION_SPEED: 0.7, // value between 0 - 1
            COLLISION_TIMEOUT: 1000 ,// in ms
            POWER_UP_VALUE: 0.1,
            POWER_UP_TIMEOUT: 1000 // in ms
        }
    };

    var WORLD_WIDTH = Math.abs(SETTINGS.WORLD.LEFT - SETTINGS.WORLD.RIGHT);
    var SAVE_END = SETTINGS.WORLD.END - SETTINGS.WORLD.SAVE_AREA.END;
    var SAVE_START = SETTINGS.WORLD.START + SETTINGS.WORLD.SAVE_AREA.START;

    /**
     * Box class which creates a new barrier object
     * @param x
     * @param y
     * @param z
     * @param width
     * @param height
     * @param depth
     * @param material
     * @constructor
     */
    var Box = function (x, y, z, width, height, depth, material) {
        this.geometry = new THREE.BoxGeometry(width, height, depth);
        this.material = material;

        this.boxSize = {
            x1: x - (width / 2),
            x2: x + (width / 2),
            y1: y - (height / 2),
            y2: y + (height / 2),
            z1: z - (depth / 2),
            z2: z + (depth / 2)
        };

        this.destroyed = false;

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.receiveShadow = true;
        this.object.position.set(x, y, z);
        scene.add(this.object);
    };

    /**
     * Destroy object
     * -> reduce y value until object is hidden
     * -> set destroyed if element fully disappeared
     */
    Box.prototype.destroy = function () {

        this.destroyed = true;

        if (this.object.position.y > -4) {
            this.object.position.y -= 0.08;

            window.requestAnimationFrame(this.destroy.bind(this));
        }
    };

    /**
     * Check if given player collides with barrier
     * @param player
     */
    Box.prototype.checkCollision = function (player) {

        var halfPlayerSize = SETTINGS.PLAYER.SIZE / 2;
        var playerX1 = player.object.position.x - halfPlayerSize;
        var playerX2 = player.object.position.x + halfPlayerSize;
        // var playerY1 = player.object.position.y - halfPlayerSize;
        // var playerY2 = player.object.position.y + halfPlayerSize;
        var playerZ1 = player.object.position.z - halfPlayerSize;
        var playerZ2 = player.object.position.z + halfPlayerSize;

        // check if box and player collide
        var collision = (
                        // collision X
                            (this.boxSize.x1 <= playerX1 && this.boxSize.x2 >= playerX1) ||
                            (this.boxSize.x1 <= playerX2 && this.boxSize.x2 >= playerX2)
                        ) &&
                        (
                        // collision Z
                            (this.boxSize.z1 <= playerZ1 && this.boxSize.z2 >= playerZ1) ||
                            (this.boxSize.z1 <= playerZ2 && this.boxSize.z2 >= playerZ2)
                        );

        if (collision) {
            this.destroy();
        }

        return collision;
    };

    /**
     * Player class which controls the player object handling
     * @param index
     * @param color
     * @param x
     * @constructor
     */
    var Player = function (index, color, x) {
        this.index = index;
        this.geometry = new THREE.BoxGeometry(
            SETTINGS.PLAYER.SIZE,
            SETTINGS.PLAYER.SIZE,
            SETTINGS.PLAYER.SIZE
        );

        this.material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: 0xffffff,
            emissiveIntensity: 0.1,
            beta: 0,
            shininess: 0.4
        });

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.receiveShadow = true;
        this.object.castShadow = true;
        this.object.position.set(x, SETTINGS.PLAYER.SIZE / 1.2, 0);
        this.currentTurn = 0;
        this.currentSpeed = 0; // value between 0 - 1
        this.powerUps = 0; // amount of power ups (for acceleration)

        scene.add(this.object);
    };

    /**
     * Accelerate player for a certain time
     */
    Player.prototype.usePowerUp = function () {
        if (this.powerUps === 0) return;

        this.powerUps -= 1;
        App.RacerHud.removePowerUp(this.index);

        this.currentSpeed += SETTINGS.PLAYER.POWER_UP_VALUE;

        window.setTimeout(function () {
            window.clearTimeout(function () {
                this.currentSpeed -= SETTINGS.PLAYER.POWER_UP_VALUE;
            }.bind(this));
        }.bind(this), SETTINGS.PLAYER.POWER_UP_TIMEOUT);
    };

    /**
     * Turn left / right
     * @param {number} value (-1 up to 1)
     * @param {number} (counter)
     */
    Player.prototype.turn = function (value, counter) {
        if (counter === undefined) counter = SETTINGS.PLAYER.TURN_TIME;

        if ((this.currentTurn < SETTINGS.PLAYER.MAX_TURN || value < 0) &&
            (this.currentTurn > SETTINGS.PLAYER.MIN_TURN || value > 0))
            this.currentTurn += value / SETTINGS.PLAYER.TURN_TIME;

        this.object.rotation.z = this.currentTurn;

        if (counter > 1)
            this.turnAnimation = window.requestAnimationFrame(this.turn.bind(this, value, counter - 1));
    };

    /**
     * Move player depending on turn and speed value and return z value
     * @returns {number}
     */
    Player.prototype.move = function () {
        this.object.position.z += this.currentSpeed * SETTINGS.PLAYER.SPEED_Z;

        // check for maximum left / right movement
        if ((this.object.position.x > SETTINGS.WORLD.LEFT + SETTINGS.PLAYER.SIZE ||
            this.currentTurn < 0) &&
            (this.object.position.x < SETTINGS.WORLD.RIGHT - SETTINGS.PLAYER.SIZE ||
                this.currentTurn > 0))
            this.object.position.x -= SETTINGS.PLAYER.SPEED_X * this.currentTurn;

        this.checkCollision();

        return this.object.position.z;
    };

    /**
     * Check if player object collides with a barrier
     */
    Player.prototype.checkCollision = function () {
        var collision = false;

        for (var i in barriers) {
            var barrier = barriers[i];

            if (barrier.destroyed) continue;

            if (
                barrier.checkCollision(this)
            ) collision = true;
        }

        for (var j in powerUps) {
            var powerUp = powerUps[j];

            if (powerUp.destroyed) continue;

            if (
                powerUp.checkCollision(this)
            ) {
                this.powerUps += 1;
                App.RacerHud.addPowerUp(this.index);
            }
        }

        if (!collision) return;

        window.clearTimeout(this.resetCollisionTimeout);
        this.currentSpeed = SETTINGS.PLAYER.COLLISION_SPEED;

        // reset speed after a specific timeout
        this.resetCollisionTimeout = window.setTimeout(function () {
            window.requestAnimationFrame(function () {
                this.currentSpeed = 1;
            }.bind(this));
        }.bind(this), SETTINGS.PLAYER.COLLISION_TIMEOUT);
    };

    var _windowResize = function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    /**
     * Stop moving and inform about winner
     * @private
     */
    var _finishGame = function () {
        finished = true;
        var winnerIndex;

        // check which player has the highest z value
        for (var i in players) {
            if (winnerIndex === undefined ||
                players[winnerIndex].object.position.z < players[i].object.position.z) {
                winnerIndex = i;
            }
        }

        // 0 = draw; 1 = player 1; 2 = player 2
        var winner = parseInt(winnerIndex) + 1;

        if (players.length === 2 && players[0].object.position.z === players[1].object.position.z) {
            winner = 0;
        }

        finishFunction(winner);
    };

    /**
     * Move all players and move camera depending on slowest player
     * @private
     */
    var _movePlayer = function () {
        var minZ, maxZ;

        for (var pIndex in players) {
            var currentPlayer = players[pIndex];
            var currentPlayerZValue = currentPlayer.move();

            // set min value
            if (minZ === undefined || minZ > currentPlayerZValue) {
                minZ = currentPlayerZValue;
            }

            // set max value
            if (maxZ === undefined || maxZ < currentPlayerZValue) {
                maxZ = currentPlayerZValue;
            }
        }

        if (maxZ > SETTINGS.WORLD.END ||
            (maxZ - minZ) > SETTINGS.WORLD.MAX_DISTANCE_BETWEEN_PLAYERS) {
            _finishGame();
        }

        dirLight.position.z = minZ + SETTINGS.SCENE.LIGHT_POSITION.z;
        dirLight.target.position.z = minZ;
        camera.position.z = (maxZ + minZ * 2) / 3 + SETTINGS.SCENE.CAMERA_DISTANCE.z;
    };
    
    var _addBoxes = function (material, spaceBetween, boxArray) {
        for (var i = 0; i < SETTINGS.WORLD.BARRIERS; i++) {

            var x = Math.floor(Math.random() * WORLD_WIDTH) - WORLD_WIDTH / 2;
            var z = i * spaceBetween + (Math.floor(Math.random() * spaceBetween) / spaceBetween - spaceBetween / 2);

            // don't position barriers on start and end
            if (z > SAVE_END || z < SAVE_START) continue;

            boxArray.push(new Box(
                // 0,
                x,
                2,
                z,
                4,
                4,
                4,
                material
            ));
        }
    };

    /**
     * Add barriers to world which can collide with the players
     * @private
     */
    var _addBarriers = function () {
        _addBoxes(new THREE.MeshPhongMaterial({
            color: 0x0212cc,
            emissive: 0xffffff,
            emissiveIntensity: 0.01,
            beta: 0,
            shininess: 0.1
        }), (SETTINGS.WORLD.END - SETTINGS.WORLD.START) / SETTINGS.WORLD.BARRIERS, barriers);
    };

    /**
     * Add barriers to world which can collide with the players
     * @private
     */
    var _addPowerUps = function () {
        _addBoxes(new THREE.MeshPhongMaterial({
            color: 0x2ef72e,
            emissive: 0xffffff,
            emissiveIntensity: 0.01,
            beta: 0,
            shininess: 0.1
        }), (SETTINGS.WORLD.END - SETTINGS.WORLD.START) / SETTINGS.WORLD.POWER_UPS, powerUps);
    };

    /**
     * Create random world
     * @private
     */
    var _createWorld = function () {
        // create geometry
        var floorLength = SETTINGS.WORLD.END - SETTINGS.WORLD.START;
        var positionZ = (SETTINGS.WORLD.END + SETTINGS.WORLD.START) / 2;
        var floorGeo = new THREE.BoxGeometry(
            SETTINGS.WORLD.RIGHT - SETTINGS.WORLD.LEFT,
            0.1,
            floorLength
        );
        var wallGeo = new THREE.BoxGeometry(0.1, SETTINGS.WORLD.HEIGHT, floorLength);

        // create material
        var material = new THREE.MeshPhongMaterial({
            color: 0x3e424c,
            beta: 0,
            shininess: 0.5
        });

        // create objects and set position
        var floorObj = new THREE.Mesh(floorGeo, material);
        var leftObj = new THREE.Mesh(wallGeo, material);
        var rightObj = new THREE.Mesh(wallGeo, material);
        floorObj.receiveShadow = true;
        leftObj.receiveShadow = true;
        rightObj.receiveShadow = true;
        floorObj.position.set(0, 0, positionZ);
        leftObj.position.set(SETTINGS.WORLD.LEFT, SETTINGS.WORLD.HEIGHT / 2, positionZ);
        rightObj.position.set(SETTINGS.WORLD.RIGHT, SETTINGS.WORLD.HEIGHT / 2, positionZ);

        // add objects to scene
        scene.add(floorObj);
        scene.add(leftObj);
        scene.add(rightObj);

        _addBarriers();
        _addPowerUps();
    };

    var _render = function () {
        animation = window.requestAnimationFrame(_render);

        stats.begin();

        if (finished === false) _movePlayer();
        renderer.render(scene, camera);

        stats.end();
    };

    /**
     * Start countdown and turn up player speed after countdown
     * @private
     */
    var _startRace = function () {

        console.log('GAME STARTS IN ' + SETTINGS.WORLD.START_TIMEOUT / 1000 + 'SECONDS');

        window.setTimeout(function () {

            console.log('GAME STARTS');

            gameStarted = true;

            // set player speed after a delay
            for (var i in players) {
                players[i].currentSpeed = 1;
            }
        }, SETTINGS.WORLD.START_TIMEOUT);
    };


    /////////
    // PUBLIC
    /////////

    /**
     * Register a function which is called on finish
     * @param func
     */
    var registerFinishFunction = function (func) {
        finishFunction = func;
    };

    /**
     * Update player movement
     * @param data
     */
    var updatePlayer = function (data) {
        if (finished || !gameStarted) return;

        // do action depending on data
        if (data.powerUp) {
            players[data.playerIndex].usePowerUp();
        } else {
            var value = data.tiltFB / 90 * SETTINGS.PLAYER.TURN_SCALE_FACTOR;
            players[data.playerIndex].turn(value);
        }
    };

    /**
     * Create new player and add it to the scene
     * @returns {boolean} add success or failed
     */
    var addPlayer = function () {
        if (players.length === SETTINGS.PLAYER.MAX_AMOUNT) return false;

        App.RacerHud.addPlayer(players.length, SETTINGS.PLAYER.COLORS[players.length]);

        players.push(
            new Player(players.length, SETTINGS.PLAYER.COLORS[players.length], SETTINGS.PLAYER.START_X_POSITION[players.length])
        );

        if (players.length === SETTINGS.PLAYER.MAX_AMOUNT) _startRace();
    };

    /**
     * Create scene, renderer, light and call create world function
     */
    var init = function () {

        // init hud
        App.RacerHud.init();

        // create camera
        camera = new THREE.PerspectiveCamera(
            SETTINGS.SCENE.FOV,
            window.innerWidth / window.innerHeight,
            SETTINGS.SCENE.NEAR,
            SETTINGS.SCENE.FAR
        );

        camera.position.set(0, SETTINGS.SCENE.CAMERA_DISTANCE.y, SETTINGS.SCENE.CAMERA_DISTANCE.z);
        camera.lookAt(0, 0, 0);

        // init scene
        scene = new THREE.Scene();

        // create renderer
        renderer = new THREE.WebGLRenderer({antialias: false});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;
        document.body.appendChild(renderer.domElement);

        window.addEventListener('resize', _windowResize, false);

        // add light
        var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.8);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(SETTINGS.SCENE.LIGHT_POSITION.x,
                              SETTINGS.SCENE.LIGHT_POSITION.y,
                              SETTINGS.SCENE.LIGHT_POSITION.z);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        var d = 50;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.near = SETTINGS.SCENE.NEAR;
        dirLight.shadow.camera.far = SETTINGS.SCENE.FAR;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);
        scene.add(dirLight.target);

        // add fog
        scene.fog = new THREE.Fog(0x000000, SETTINGS.SCENE.NEAR, SETTINGS.SCENE.FAR);

        // add stats
        stats = new Stats();
        document.body.appendChild(stats.domElement);

        // start render loop
        _render();

        _createWorld();
    };

    /**
     * Reset all data and cancel animation frame
     */
    var destroy = function () {
        window.cancelAnimationFrame(animation);
        renderer.domElement.parentNode.removeChild(renderer.domElement);

        for (var pIndex in players) {
            window.cancelAnimationFrame(players[pIndex].turnAnimation);
        }

        players = [];

        App.RacerHud.destroy();
    };

    var maxAmountReached = function () {

    };

    return {
        updatePlayer: updatePlayer,
        destroy: destroy,
        init: init,
        registerFinishFunction: registerFinishFunction,
        addPlayer: addPlayer
    };
})();