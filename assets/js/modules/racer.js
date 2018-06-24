/*globals GLOBALS, THREE, Stats, performance*/

var App = App || {};

App.Racer = (function (undefined) {


    var renderer, scene, camera, dirLight, stats, players = [], animation, barriers = [], finished = false, finishFunction;

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
            // BARRIERS: 500,
            SAVE_AREA: {
                START: 100,
                END: 50
            }
        },
        PLAYER: {
            COLORS: [
                0xd12a0c,
                0x0bd15e
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
            COLLISION_TIMEOUT: 800 // in ms
        }
    };

    /**
     * Barrier class which creates a new barrier object
     * @param x
     * @param y
     * @param z
     * @param width
     * @param height
     * @param depth
     * @param material
     * @constructor
     */
    var Barrier = function (x, y, z, width, height, depth, material) {
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

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.receiveShadow = true;
        this.object.position.set(x, y, z);
        scene.add(this.object);
    };

    /**
     * Destroy object
     * -> reduce y value until object is hidden
     */
    Barrier.prototype.destroy = function () {
        if (this.object.position.y > -5) {
            this.object.position.y -= 0.08;

            window.requestAnimationFrame(this.destroy.bind(this));
        }
    };

    /**
     * Check if given player collides with barrier
     * @param player
     */
    Barrier.prototype.checkCollision = function (player) {

        var halfPlayerSize = SETTINGS.PLAYER.SIZE / 2;
        var playerX1 = player.object.position.x - halfPlayerSize;
        var playerX2 = player.object.position.x + halfPlayerSize;
        // var playerY1 = player.object.position.y - halfPlayerSize;
        // var playerY2 = player.object.position.y + halfPlayerSize;
        var playerZ1 = player.object.position.z - halfPlayerSize;
        var playerZ2 = player.object.position.z + halfPlayerSize;

        var collision = (
                        // collision X
                            (playerX1 >= this.boxSize.x1 && playerX1 <= this.boxSize.x2) ||
                            (playerX2 >= this.boxSize.x1 && playerX2 <= this.boxSize.x2)
                        ) &&
                        (
                        // collision Z
                            (playerZ1 >= this.boxSize.z1 && playerZ1 <= this.boxSize.z2) ||
                            (playerZ2 >= this.boxSize.z1 && playerZ2 <= this.boxSize.z2)
                        );

        if (collision) {
            this.destroy();
        }

        return collision;
    };

    /**
     * Player class which controls the player object handling
     * @param color
     * @param x
     * @constructor
     */
    var Player = function (color, x) {
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
        this.currentSpeed = 1; // value between 0 - 1

        scene.add(this.object);
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

            if (
                barrier.checkCollision(this)
            ) collision = true;
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

        if (maxZ > SETTINGS.WORLD.END) {
            _finishGame();
        }

        dirLight.position.z = minZ + SETTINGS.SCENE.LIGHT_POSITION.z;
        dirLight.target.position.z = minZ;
        camera.position.z = minZ + SETTINGS.SCENE.CAMERA_DISTANCE.z;
    };


    /**
     * Add barriers to world which can collide with the players
     * @private
     */
    var _addBarriers = function () {

        var barrierZ = (SETTINGS.WORLD.END - SETTINGS.WORLD.START) / SETTINGS.WORLD.BARRIERS;
        var worldWidth = Math.abs(SETTINGS.WORLD.LEFT - SETTINGS.WORLD.RIGHT);

        var saveEnd = SETTINGS.WORLD.END - SETTINGS.WORLD.SAVE_AREA.END;
        var saveStart = SETTINGS.WORLD.START + SETTINGS.WORLD.SAVE_AREA.START;

        var material = new THREE.MeshPhongMaterial({
            color: 0x0212cc,
            emissive: 0xffffff,
            emissiveIntensity: 0.01,
            beta: 0,
            shininess: 0.1
        });

        for (var i = 0; i < SETTINGS.WORLD.BARRIERS; i++) {

            var x = Math.floor(Math.random() * worldWidth) - worldWidth / 2;
            var z = i * barrierZ + (Math.floor(Math.random() * barrierZ) / barrierZ - barrierZ / 2);

            // don't position barriers on start and end
            if (z > saveEnd || z < saveStart) continue;

            barriers.push(new Barrier(
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
    };

    var _render = function () {
        animation = window.requestAnimationFrame(_render);

        stats.begin();

        if (finished === false) _movePlayer();
        renderer.render(scene, camera);

        stats.end();
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
     * @param playerIndex
     * @param data
     */
    var updatePlayer = function (playerIndex, data) {
        if (finished) return;
        var value = data.tiltFB / 90 * SETTINGS.PLAYER.TURN_SCALE_FACTOR;
        players[playerIndex].turn(value);
    };

    /**
     * Create new player and add it to the scene
     * @returns {boolean} add success or failed
     */
    var addPlayer = function () {
        if (players.length === SETTINGS.PLAYER.MAX_AMOUNT) return false;

        players.push(
            new Player(SETTINGS.PLAYER.COLORS[players.length], SETTINGS.PLAYER.START_X_POSITION[players.length])
        );
    };

    /**
     * Create scene, renderer, light and call create world function
     */
    var init = function () {
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

    var destroy = function () {
        window.cancelAnimationFrame(animation);
        renderer.domElement.parentNode.removeChild(renderer.domElement);

        for (var pIndex in players) {
            window.cancelAnimationFrame(players[pIndex].turnAnimation);
        }

        players = [];
    };

    return {
        updatePlayer: updatePlayer,
        destroy: destroy,
        init: init,
        registerFinishFunction: registerFinishFunction,
        addPlayer: addPlayer
    };
})();