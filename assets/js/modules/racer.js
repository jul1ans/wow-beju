/*globals GLOBALS, THREE, Stats, performance*/

var App = App || {};

App.Racer = (function (undefined) {

    var gameSpeed = 1;
    var renderer, scene, camera, dirLight, stats, animation, finishFunction, colladaLoader,
        players = [], barriers = [], powerUps = [],
        finished = false, gameStarted = false, destroyed = true;

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
            END: 4000,
            HEIGHT: 30,
            BARRIERS: 110,
            POWER_UPS: 20,
            SAVE_AREA: {
                START: 100,
                END: 50
            },
            MAX_DISTANCE_BETWEEN_PLAYERS: 136,
            START_TIMEOUT: 3000 // in ms
        },
        PLAYER: {
            COLORS: [
                '#3d31c4',
                '#bc5218',
                '#9731c4',
                '#31c43d',
                '#fff200'
            ],
            START_X_POSITION: [
                15,
                -15,
                32,
                -32,
                0
            ],
            DRONE_OBJECT: '/public/objects/drone.dae',
            MAX_AMOUNT: 1,
            SIZE: 7,
            TURN_TIME: 10,
            TURN_SCALE_FACTOR: 0.08,
            QUICK_TURN_SCALE_FACTOR: 1.5,
            MIN_TURN: -0.5,
            MAX_TURN: 0.5,
            SPEED_X: 0.7,
            SPEED_Z: 1,
            PLAYER_COLLISION_FORCE: 0.3,
            BARRIER_COLLISION_VALUE: 0.15,
            MIN_SPEED: 0.3, // minimal player speed
            MAX_SPEED: 1.6, // max player speed
            COLLISION_TIMEOUT: 1000 ,// in ms
            POWER_UP_VALUE: 0.15,
            POWER_UP_TIMEOUT: 1200 // in ms
        }
    };

    var WORLD_WIDTH = Math.abs(SETTINGS.WORLD.LEFT - SETTINGS.WORLD.RIGHT);
    var SAVE_END = SETTINGS.WORLD.END - SETTINGS.WORLD.SAVE_AREA.END;
    var SAVE_START = SETTINGS.WORLD.START + SETTINGS.WORLD.SAVE_AREA.START;


    var _doForEachChild = function (object, cb, additionalParam) {
        for (var i in object.children) {
            if (!object.children.hasOwnProperty(i)) continue;
            cb(object.children[i], additionalParam);
        }
    };

    /**
     * Activate shadow for each children
     * @param object
     * @private
     */
    var _activateShadowForChildren = function (object) {

        // ignore following elements
        if (object.name === 'Camera') return;

        object.castShadow = true;
        object.receiveShadow = true;

        if (!object.children || object.children.length === 0) return;

        _doForEachChild(object, _activateShadowForChildren);
    };

    /**
     * Get all children
     * @param object
     * @param {{name: string, objectArray: *[]}} config
     * @private
     */
    var _findChildrenObjectsByName = function (object, config) {

        if (object.name === config.name) {
            config.objectArray.push(object);
        }

        _doForEachChild(object, _findChildrenObjectsByName, config);
    };

    /**
     * Box class which creates a new barrier object
     * @param x
     * @param y
     * @param z
     * @param size
     * @param material
     * @param geometryType
     * @constructor
     */
    var Box = function (x, y, z, size, material, geometryType) {

        var radius = size / 2;

        this.geometry = new geometryType(radius * 1.2);

        this.material = material;

        this.boxSize = {
            x1: x - (radius),
            x2: x + (radius),
            y1: y - (radius),
            y2: y + (radius),
            z1: z - (radius),
            z2: z + (radius)
        };

        this.destroyed = false;

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.receiveShadow = true;
        this.object.position.set(x, y, z);
        scene.add(this.object);
    };

    /**
     * Animate box
     */
    Box.prototype.animate = function () {
        if (this.object.z < camera.position.x) return;

        // hide box
        if (this.destroyed && this.object.scale.x > 0.01) {
            this.object.scale.y -= 0.1 * gameSpeed;
            this.object.scale.x -= 0.1 * gameSpeed;
            this.object.scale.z -= 0.1 * gameSpeed;
        }

        // rotate box
        if (this.object.scale.x > 0.01) {
            this.object.rotation.y += 0.02 * gameSpeed;
        }
    };

    /**
     * Destroy object
     * -> reduce y value until object is hidden
     * -> set destroyed if element fully disappeared
     */
    Box.prototype.destroy = function () {
        this.destroyed = true;
    };

    /**
     * Check if given player collides with barrier
     * @param player
     */
    Box.prototype.checkCollision = function (player) {

        if (this.destroyed) return false;

        // destroy element if position is less then player position
        if (this.object.position.z < camera.position.z) {
            this.destroy();
            return false;
        }

        // check if box and player collide
        var collision = _checkCollision(this.boxSize, player.boxSize);

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
     * @param socket
     * @constructor
     */
    var Player = function (index, color, x, socket) {
        this.index = index;

        this.ready = false;
        this.color = color;
        this.currentTurn = 0;
        this.currentSpeed = 0; // value between 0 - 1
        this.powerUps = 0; // amount of power ups (for acceleration)
        this.socket = socket;

        colladaLoader.load(SETTINGS.PLAYER.DRONE_OBJECT, function (collada) {
            this.object = collada.scene;
            this.object.position.set(x, SETTINGS.PLAYER.SIZE / 2, 0);
            _activateShadowForChildren(this.object);


            // find all blades
            this.blades = [];
            _findChildrenObjectsByName(this.object, {
                objectArray: this.blades,
                name: 'Propeller'
            });

            // find top (colored area)
            var topElements = [];
            _findChildrenObjectsByName(this.object, {
                objectArray: topElements,
                name: 'Top'
            });
            this.top = topElements[0];

            if (this.top !== undefined) {
                // set color
                this.top.material.color.set(this.color);
            }

            var box = new THREE.Box3().setFromObject(this.object);

            this.size = {
                x: box.max.x - box.min.x,
                y: box.max.y - box.min.y,
                z: box.max.z - box.min.z
            };

            var scaleFactor = SETTINGS.PLAYER.SIZE / this.size.x + (SETTINGS.PLAYER.SIZE * 0.05);

            this.object.scale.x *= scaleFactor;
            this.object.scale.y *= scaleFactor;
            this.object.scale.z *= scaleFactor;

            scene.add(this.object);

            this.ready = true;
        }.bind(this));
    };

    Player.prototype.vibrate = function (time) {
        if (!this.socket) return;
        this.socket.emit('vibrate', {
            index: this.index,
            time: time
        });
    };

    /**
     * Animate drone (blade movement, up- / down-movement
     */
    Player.prototype.animate = function () {

        // move blades
        for (var i in this.blades) {
            this.blades[i].rotation.y += 0.5 * gameSpeed;
        }

        // move up and down
        if (this.moveUp === true) {
            this.object.position.y += 0.005 * gameSpeed;
        } else {
            this.object.position.y -= 0.005 * gameSpeed;
        }

        // calculate move up / down
        if (this.object.position.y < SETTINGS.PLAYER.SIZE / 2 - 0.3) {
            this.moveUp = true;
        } else if (this.object.position.y > SETTINGS.PLAYER.SIZE / 2 + 0.3) {
            this.moveUp = false;
        }
    };

    /**
     * Accelerate player for a certain time
     */
    Player.prototype.usePowerUp = function () {
        if (this.powerUps === 0) return;

        var value = SETTINGS.PLAYER.POWER_UP_VALUE;

        // check if max speed is reached
        if (this.currentSpeed + value > SETTINGS.PLAYER.MAX_SPEED) {
            value = SETTINGS.PLAYER.MAX_SPEED - this.currentSpeed;
        }

        // don't use a power up if player can not accelerate
        if (value < SETTINGS.PLAYER.POWER_UP_VALUE / 2) return;

        // reduce power up
        this.powerUps -= 1;
        App.RacerHud.removePowerUp(this.index);

        this.currentSpeed += value;

        // reset speed after timeout
        this.powerUpTimeout = window.setTimeout(function () {
            window.requestAnimationFrame(function () {
                this.currentSpeed -= value;
            }.bind(this));
        }.bind(this), SETTINGS.PLAYER.POWER_UP_TIMEOUT);
    };

    /**
     * Slow down player (reset after a delay)
     * @param value
     */
    Player.prototype.slowDown = function (value) {
        // slow down player until min speed is reached
        if (this.currentSpeed - value < SETTINGS.PLAYER.MIN_SPEED) {
            value = this.currentSpeed - SETTINGS.PLAYER.MIN_SPEED;
        }

        // reduce current speed
        this.currentSpeed -= value;

        // reset speed after a specific timeout
        this.slowDownTimeout = window.setTimeout(function () {
            window.requestAnimationFrame(function () {
                this.currentSpeed += value;
            }.bind(this));
        }.bind(this), SETTINGS.PLAYER.COLLISION_TIMEOUT);
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
        this.object.position.z += this.currentSpeed * SETTINGS.PLAYER.SPEED_Z * gameSpeed;

        // check for maximum left / right movement
        if ((this.object.position.x > SETTINGS.WORLD.LEFT + SETTINGS.PLAYER.SIZE ||
            this.currentTurn < 0) &&
            (this.object.position.x < SETTINGS.WORLD.RIGHT - SETTINGS.PLAYER.SIZE ||
                this.currentTurn > 0))
            this.object.position.x -= SETTINGS.PLAYER.SPEED_X * this.currentTurn * gameSpeed;

        this.checkCollision();
        this.animate();

        return this.object.position.z;
    };

    /**
     * Check if player object collides with a barrier
     */
    Player.prototype.checkCollision = function () {
        var barrierCollision = false;

        var halfPlayerSize = SETTINGS.PLAYER.SIZE / 2;

        this.boxSize = {
            x1: this.object.position.x - halfPlayerSize,
            x2: this.object.position.x + halfPlayerSize,
            z1: this.object.position.z - halfPlayerSize,
            z2: this.object.position.z + halfPlayerSize
        };

        // check collision with barriers
        for (var i in barriers) {
            var barrier = barriers[i];

            if (barrier.destroyed) continue;

            if (
                barrier.checkCollision(this)
            ) barrierCollision = true;
        }

        // check collision with power ups
        for (var j in powerUps) {
            var powerUp = powerUps[j];

            if (powerUp.destroyed) continue;

            if (
                powerUp.checkCollision(this)
            ) {
                this.powerUps += 1;
                this.vibrate(100);
                App.RacerHud.addPowerUp(this.index);
            }
        }

        // check collision with other players
        for (var p in players) {
            if (players[p] === this) continue;

            // todo: add sparkling effect on collision, see: https://stemkoski.github.io/Three.js/Particles.html

            if (_checkCollision(this.boxSize, players[p].boxSize)) {
                if (this.object.position.x <= players[p].object.position.x) {
                    this.turn(Math.abs(this.currentTurn) * SETTINGS.PLAYER.PLAYER_COLLISION_FORCE);
                    players[p].turn(Math.abs(this.currentTurn) * SETTINGS.PLAYER.PLAYER_COLLISION_FORCE * -1);
                    players[p].object.position.x += SETTINGS.PLAYER.PLAYER_COLLISION_FORCE * 2;
                } else {
                    this.turn(Math.abs(this.currentTurn) * SETTINGS.PLAYER.PLAYER_COLLISION_FORCE * -1);
                    players[p].turn(Math.abs(this.currentTurn) * SETTINGS.PLAYER.PLAYER_COLLISION_FORCE);
                    players[p].object.position.x -= SETTINGS.PLAYER.PLAYER_COLLISION_FORCE * 2;
                }
                this.vibrate(400);
            }
        }

        if (barrierCollision) {
            this.slowDown(SETTINGS.PLAYER.BARRIER_COLLISION_VALUE);
            this.vibrate(300);
        }
    };

    /**
     * Check if corner of a is inside b
     * @param boxSizeA
     * @param boxSizeB
     * @param last
     * @private
     */
    var _checkCollision = function (boxSizeA, boxSizeB, last) {
        if (boxSizeA === undefined || boxSizeB === undefined) return false;
        return (
                // collision X
                (boxSizeA.x1 <= boxSizeB.x1 && boxSizeA.x2 >= boxSizeB.x1) ||
                (boxSizeA.x1 <= boxSizeB.x2 && boxSizeA.x2 >= boxSizeB.x2)
            ) &&
            (
                // collision Z
                (boxSizeA.z1 <= boxSizeB.z1 && boxSizeA.z2 >= boxSizeB.z1) ||
                (boxSizeA.z1 <= boxSizeB.z2 && boxSizeA.z2 >= boxSizeB.z2)
            ) || (!last && _checkCollision(boxSizeB, boxSizeA, true));
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

        // move player
        for (var pIndex in players) {
            var currentPlayer = players[pIndex];

            if (!currentPlayer.ready) return;

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

        // animate barriers
        for (var bIndex in barriers) {
            barriers[bIndex].animate();
        }

        // animate power ups
        for (var powerIndex in powerUps) {
            powerUps[powerIndex].animate();
        }

        if (maxZ > SETTINGS.WORLD.END ||
            (maxZ - minZ) > SETTINGS.WORLD.MAX_DISTANCE_BETWEEN_PLAYERS) {
            _finishGame();
        }

        dirLight.position.z = minZ + SETTINGS.SCENE.LIGHT_POSITION.z;
        dirLight.target.position.z = minZ;
        camera.position.z = (maxZ + minZ * 3) / 4 + SETTINGS.SCENE.CAMERA_DISTANCE.z;
    };

    /**
     * Box generator
     * @param material
     * @param spaceBetween
     * @param amounts
     * @param boxArray
     * @param geometryType
     * @private
     */
    var _addBoxes = function (material, spaceBetween, amounts, boxArray, geometryType) {

        var boxSize = 4;
        var y = 2.5;
        var worldWidth = WORLD_WIDTH - boxSize;

        for (var i = 0; i < amounts; i++) {

            var x = Math.floor(Math.random() * worldWidth) - worldWidth / 2;
            var z = i * spaceBetween + (Math.floor(Math.random() * spaceBetween) / spaceBetween - spaceBetween / 2);

            // don't position barriers on start and end
            if (z > SAVE_END || z < SAVE_START) continue;

            boxArray.push(new Box(
                // 0,
                x,
                y + (Math.floor(Math.random() * 100) / 5 - 4) / 10,
                z,
                boxSize,
                material,
                geometryType
            ));
        }
    };

    /**
     * Add barriers to world which can collide with the players
     * @private
     */
    var _addBarriers = function () {
        _addBoxes(new THREE.MeshPhongMaterial({
            color: 0x101015,
            emissive: 0xffffff,
            emissiveIntensity: 0.01,
            beta: 0,
            shininess: 0.2
        }), (SETTINGS.WORLD.END - SETTINGS.WORLD.START) / SETTINGS.WORLD.BARRIERS,
            SETTINGS.WORLD.BARRIERS, barriers, THREE.DodecahedronBufferGeometry);
    };

    /**
     * Add barriers to world which can collide with the players
     * @private
     */
    var _addPowerUps = function () {
        _addBoxes(new THREE.MeshPhongMaterial({
            color: 0xfcfafa,
            emissive: 0xffffff,
            emissiveIntensity: 0.01,
            beta: 0,
            shininess: 0.1
        }), (SETTINGS.WORLD.END - SETTINGS.WORLD.START) / SETTINGS.WORLD.POWER_UPS,
            SETTINGS.WORLD.POWER_UPS, powerUps, THREE.IcosahedronBufferGeometry);
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

        var fps = stats.getFPS();

        if (fps === 0) {
            gameSpeed = 1;
        } else {
            gameSpeed = 60 / fps;
        }

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

        for (var i in players) {
            // check until all players are ready
            if (!players[i].ready) {
                window.requestAnimationFrame(_startRace);
                return;
            }
        }

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

        var player = players[data.playerIndex];

        if (!player) return;

        // do action depending on data
        if (data.powerUp) {
            player.usePowerUp();
        } else {
            var value = data.tiltFB / 90 * SETTINGS.PLAYER.TURN_SCALE_FACTOR;

            if ((player.currentTurn < 0 && value > 0) || (player.currentTurn > 0 && value < 0)) {
                value *= SETTINGS.PLAYER.QUICK_TURN_SCALE_FACTOR;
            }

            player.turn(value);
        }
    };

    /**
     * Create new player and add it to the scene
     * @param socket
     * @returns {boolean|*} return false if failed or return player data
     */
    var addPlayer = function (socket) {
        var index = players.length;
        if (index === SETTINGS.PLAYER.MAX_AMOUNT) return false;

        App.RacerHud.addPlayer(index, SETTINGS.PLAYER.COLORS[index]);

        // create new player
        var newPlayer = new Player(
            index,
            SETTINGS.PLAYER.COLORS[index],
            SETTINGS.PLAYER.START_X_POSITION[index],
            socket);

        players.push(newPlayer);

        if (index + 1 === SETTINGS.PLAYER.MAX_AMOUNT) _startRace();

        return {
            index: index,
            color: newPlayer.color
        };
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

        // init collada loader (for objects)
        colladaLoader = new THREE.ColladaLoader();

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

        destroyed = false;
    };

    /**
     * Reset all data and cancel animation frame
     */
    var destroy = function () {
        // check if racer is already destroyed
        if (destroyed) return;
        window.cancelAnimationFrame(animation);
        renderer.domElement.parentNode.removeChild(renderer.domElement);

        for (var pIndex in players) {
            // clear animation
            window.cancelAnimationFrame(players[pIndex].turnAnimation);
            // clear timeouts
            window.clearTimeout(players[pIndex].powerUpTimeout);
            window.clearTimeout(players[pIndex].slowDownTimeout);
        }

        // reset variables
        players = [];
        barriers = [];
        powerUps = [];
        gameStarted = false;
        finished = false;

        destroyed = true;
        App.RacerHud.destroy();
    };

    /**
     * Check if max amount of players are reached
     * @returns {boolean}
     */
    var maxAmountReached = function () {
        return this.players.length === SETTINGS.PLAYER.MAX_AMOUNT;
    };

    /**
     * Get max amount of allowed players
     * @returns {number}
     */
    var getMaxAmount = function () {
        return SETTINGS.PLAYER.MAX_AMOUNT;
    };

    /**
     * Return if racer is destroyed (not init)
     * @returns {boolean}
     */
    var isDestroyed = function () {
        return destroyed;
    };

    return {
        updatePlayer: updatePlayer,
        destroy: destroy,
        init: init,
        registerFinishFunction: registerFinishFunction,
        addPlayer: addPlayer,
        maxAmountReached: maxAmountReached,
        getMaxAmount: getMaxAmount,
        isDestroyed: isDestroyed
    };
})();