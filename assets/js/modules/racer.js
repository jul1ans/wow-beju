/*globals GLOBALS, THREE, Stats*/

var App = App || {};

App.Racer = (function (undefined) {

    var renderer, scene, camera, stats, players = [];

    var SETTINGS = {
        FOV: 70,
        NEAR: 1,
        FAR: 1000
    };

    var _createPlayer = function (color, x) {
        var geometry = new THREE.BoxBufferGeometry(5, 5, 5);
        var material = new THREE.MeshPhongMaterial({
            color: color,
            beta: 0,
            shininess: 0.5
        });

        material.castShadow = true;
        material.receiveShadow = true;

        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 1, 0);
        scene.add(mesh);

        return mesh;
    };

    var _windowResize = function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    var _render = function () {
        window.requestAnimationFrame(_render);

        stats.begin();
        if (players[0]) {
            players[0].rotation.y += 0.01;
        }

        renderer.render(scene, camera);
        stats.end();
    };

    var init = function () {
        // create camera
        camera = new THREE.PerspectiveCamera(
            SETTINGS.FOV,
            window.innerWidth / window.innerHeight,
            SETTINGS.NEAR,
            SETTINGS.FAR
        );

        camera.position.set(0, 10, -10);
        camera.lookAt(0, 0, 0);

        // init scene
        scene = new THREE.Scene();

        // create renderer
        renderer = new THREE.WebGLRenderer({antialias: false});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        window.addEventListener('resize', _windowResize, false);

        // add light
        var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(0, 15, 0);
        dirLight.lookAt(0, 0, 0);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        var d = 50;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.far = 3500;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);

        // add stats
        stats = new Stats();
        console.log(stats);
        document.body.appendChild(stats.domElement);

        // start render loop
        _render();


        // todo: refactor
        var p1 = _createPlayer(0xff0000, 0);
        players.push(p1);
    };

    return {
        init: init
    };
})();